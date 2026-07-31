import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { CircleAlert, QrCode, Shield } from "lucide-react";
import { Label } from "@/components/ui/label";

const getPasswordSchema = (hasPassword: boolean) =>
  z.object({
    password: hasPassword
      ? z.string().min(1, "Password is required")
      : z.string().optional(),
  });

type PasswordFormValues = z.infer<ReturnType<typeof getPasswordSchema>>;

interface TwoFactorSectionProps {
  user: {
    twoFactorEnabled?: boolean;
  };
  hasPassword: boolean;
}

export function TwoFactorSection({ user, hasPassword }: TwoFactorSectionProps) {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);

  const [is2FAEnabled, setIs2FAEnabled] = useState(user.twoFactorEnabled ?? false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(getPasswordSchema(hasPassword)),
    defaultValues: { password: "" },
  });

  const handleEnable2FA = async (values: PasswordFormValues) => {
    setError(null);
    setIsEnabling2FA(true);
    try {
      const { data, error: apiError } = await (authClient as any).twoFactor.enable({
        ...(hasPassword ? { password: values.password } : {}),
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setShow2FASetup(true);
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to enable 2FA" });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerifyTotp = async () => {
    setError(null);
    if (totpCode.length < 6) {
      setError({ message: "Please enter a valid code" });
      return;
    }
    setIsEnabling2FA(true);
    try {
      const { error: apiError } = await (authClient as any).twoFactor.verifyTotp({
        code: totpCode,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Two-factor authentication enabled", type: "success" });
      setIs2FAEnabled(true);
      setShow2FASetup(false);
      passwordForm.reset();
      setTotpCode("");
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Invalid code" });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async (values: PasswordFormValues) => {
    setError(null);
    setIsDisabling2FA(true);
    try {
      const { error: apiError } = await (authClient as any).twoFactor.disable({
        ...(hasPassword ? { password: values.password } : {}),
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Two-factor authentication disabled", type: "success" });
      setIs2FAEnabled(false);
      passwordForm.reset();
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to disable 2FA" });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    const text = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: "Backup codes copied to clipboard", type: "success" });
    } catch (err) {
      toast.add({ title: "Failed to copy to clipboard", type: "error" });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
          {is2FAEnabled ? (
            <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-transparent">
              Enabled
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Disabled
            </Badge>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="my-4">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error {error.code ? `(${error.code})` : ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!show2FASetup && !is2FAEnabled && (
          <div className="space-y-4">
            {!hasPassword ? (
              <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</span>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  You need to{" "}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-4 hover:no-underline"
                    onClick={() => {
                      const el = document.getElementById("new-password");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      el?.focus();
                    }}
                  >
                    set a password
                  </button>{" "}
                  first before enabling two-factor authentication.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handleEnable2FA)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password to enable 2FA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isEnabling2FA}>
                      {isEnabling2FA ? "Enabling..." : "Enable two-factor authentication"}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </div>
        )}

        {show2FASetup && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-muted-foreground" />
                <h3 className="font-medium">Scan QR Code</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {totpUri && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      totpUri
                    )}`}
                    alt="2FA QR Code"
                    className="size-48"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="totp-code" className="w-full justify-center">
                  Enter the code from your app
                </Label>
                <div className="flex flex-col items-center gap-3">
                  <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button onClick={handleVerifyTotp} disabled={isEnabling2FA || totpCode.length < 6}>
                    {isEnabling2FA ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </div>

            {backupCodes.length > 0 && (
              <Collapsible
                open={showBackupCodes}
                onOpenChange={setShowBackupCodes}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">Backup Codes</h3>
                  <CollapsibleTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {showBackupCodes ? "Hide" : "View"}
                  </CollapsibleTrigger>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save these codes in a safe place. You can use them to access your account if you lose your authenticator.
                </p>
                <CollapsibleContent>
                  <button
                    type="button"
                    className="grid w-full grid-cols-2 gap-2 rounded bg-muted p-3 font-mono text-left text-sm"
                    onClick={handleCopyBackupCodes}
                  >
                    {backupCodes.map((code, i) => (
                      <span key={i}>{code}</span>
                    ))}
                  </button>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {is2FAEnabled && !show2FASetup && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication is currently enabled for your account.
            </p>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handleDisable2FA)} className="space-y-4">
                {hasPassword && (
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password to disable 2FA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Button type="submit" variant="destructive" disabled={isDisabling2FA}>
                  {isDisabling2FA ? "Disabling..." : "Disable two-factor authentication"}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
