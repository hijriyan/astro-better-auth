import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CircleAlert, Phone } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const phoneSchema = z.object({
  phone: z.string().min(5, "Please enter a valid phone number"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

interface PhoneFormProps {
  user: {
    phoneNumber?: string;
    phoneNumberVerified?: boolean;
  };
}

export function PhoneForm({ user }: PhoneFormProps) {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);
  
  const [phoneStep, setPhoneStep] = useState<"idle" | "verify-phone">("idle");
  const [phoneOtp, setPhoneOtp] = useState("");
  
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: user.phoneNumber ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  const newPhone = form.watch("phone");

  const handleSendPhoneOtp = async (values: PhoneFormValues) => {
    setError(null);
    if (!values.phone) return;
    setIsSendingPhoneOtp(true);
    try {
      const { error: apiError } = await (authClient as any).phoneNumber.sendOtp({
        phoneNumber: values.phone,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      setPhoneStep("verify-phone");
      toast.add({ title: `Verification code sent to ${values.phone}`, type: "success" });
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to send code" });
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setError(null);
    if (phoneOtp.length < 6) return;
    setIsVerifyingPhone(true);
    try {
      const { error: apiError } = await (authClient as any).phoneNumber.verify({
        phoneNumber: newPhone,
        code: phoneOtp,
        updatePhoneNumber: true,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Phone number updated", type: "success" });
      setPhoneStep("idle");
      setPhoneOtp("");
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Verification failed" });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    setPhoneStep("idle");
    setPhoneOtp("");
    form.reset({ phone: user.phoneNumber ?? "" });
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Phone Number</h2>
          {user.phoneNumberVerified ? (
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

        {phoneStep === "idle" ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendPhoneOtp)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput id="phone" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSendingPhoneOtp || !isDirty}>
                {isSendingPhoneOtp ? "Sending verification..." : "Update phone number"}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter code sent to {newPhone}</Label>
              <InputOTP
                maxLength={6}
                value={phoneOtp}
                onChange={(value) => setPhoneOtp(value)}
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
                onClick={handleVerifyPhoneOtp}
                disabled={isVerifyingPhone || phoneOtp.length < 6}
              >
                {isVerifyingPhone ? "Verifying..." : "Verify"}
              </Button>
              <Button variant="outline" onClick={handleCancelPhone}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
