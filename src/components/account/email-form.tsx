import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CircleAlert, Mail } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const emailSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface EmailFormProps {
  user: {
    email: string;
    emailVerified?: boolean;
  };
}

export function EmailForm({ user }: EmailFormProps) {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);
  
  const [emailStep, setEmailStep] = useState<"idle" | "verify-current" | "verify-new">("idle");
  const [emailOtp, setEmailOtp] = useState("");
  
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user.email,
    },
  });

  const isDirty = form.formState.isDirty;
  const newEmail = form.watch("email");

  const handleRequestEmailChange = async (values: EmailFormValues) => {
    setError(null);
    if (values.email === user.email) return;
    setIsSendingEmailOtp(true);
    try {
      const { error: apiError } = await authClient.emailOtp.sendVerificationOtp({
        email: user.email,
        type: "email-verification",
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      setEmailStep("verify-current");
      toast.add({ title: `Verification code sent to ${user.email}`, type: "success" });
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to send code" });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyCurrentEmail = async () => {
    setError(null);
    if (emailOtp.length < 6) return;
    setIsChangingEmail(true);
    try {
      const { error: apiError } = await authClient.emailOtp.requestEmailChange({
        newEmail: newEmail,
        otp: emailOtp,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      setEmailOtp("");
      setEmailStep("verify-new");
      toast.add({ title: `Verification code sent to ${newEmail}`, type: "success" });
    } catch (err: any) {
      setError({ message: err.message ?? "Verification failed" });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setError(null);
    if (emailOtp.length < 6) return;
    setIsChangingEmail(true);
    try {
      const { error: apiError } = await authClient.emailOtp.changeEmail({
        newEmail: newEmail,
        otp: emailOtp,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Email updated", type: "success" });
      setEmailStep("idle");
      setEmailOtp("");
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Verification failed" });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleCancelEmailChange = () => {
    setEmailStep("idle");
    setEmailOtp("");
    form.reset({ email: user.email });
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Email Address</h2>
          {user.emailVerified ? (
            <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-transparent">
              Verified
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Unverified
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

        {!user.emailVerified && emailStep === "idle" && (
          <div className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="flex gap-3">
              <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</span>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Please verify your email address to secure your account.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit ml-8 bg-background"
              disabled={isResending}
              onClick={async () => {
                setIsResending(true);
                const { error: apiError } = await authClient.sendVerificationEmail({
                  email: user.email,
                  callbackURL: "/account",
                });
                if (apiError) setError({ message: apiError.message, code: (apiError as any).code });
                else toast.add({ title: "Verification email sent", type: "success" });
                setIsResending(false);
              }}
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </Button>
          </div>
        )}

        {emailStep === "idle" ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRequestEmailChange)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSendingEmailOtp || !isDirty}>
                {isSendingEmailOtp ? "Sending verification..." : "Change email"}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {emailStep === "verify-current"
                  ? `Enter code sent to ${user.email}`
                  : `Enter code sent to ${newEmail}`}
              </Label>
              <InputOTP
                maxLength={6}
                value={emailOtp}
                onChange={(value) => setEmailOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={
                  emailStep === "verify-current"
                    ? handleVerifyCurrentEmail
                    : handleConfirmEmailChange
                }
                disabled={isChangingEmail || emailOtp.length < 6}
              >
                {isChangingEmail ? "Verifying..." : "Verify"}
              </Button>
              <Button variant="outline" onClick={handleCancelEmailChange}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
