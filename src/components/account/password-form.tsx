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
import { CircleAlert, Key } from "lucide-react";

const getPasswordSchema = (hasPassword: boolean) =>
  z
    .object({
      currentPassword: hasPassword
        ? z.string().min(1, "Current password is required")
        : z.string().optional(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(8, "Please confirm your password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

type PasswordFormValues = z.infer<ReturnType<typeof getPasswordSchema>>;

interface PasswordFormProps {
  hasPassword: boolean;
}

export function PasswordForm({ hasPassword }: PasswordFormProps) {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const schema = getPasswordSchema(hasPassword);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setError(null);
    setIsChangingPassword(true);

    if (!hasPassword) {
      try {
        const res = await fetch("/api/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: values.newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to set password");
        toast.add({ title: "Password set successfully", type: "success" });
        window.location.reload();
      } catch (err: any) {
        setError({ message: err.message ?? "Failed to set password" });
      } finally {
        setIsChangingPassword(false);
      }
    } else {
      try {
        const { error: apiError } = await authClient.changePassword({
          currentPassword: values.currentPassword!,
          newPassword: values.newPassword,
        });
        if (apiError) {
          setError({ message: apiError.message, code: (apiError as any).code });
          return;
        }
        toast.add({ title: "Password changed successfully", type: "success" });
        form.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (err: any) {
        setError({ message: err.message ?? "Failed to change password" });
      } finally {
        setIsChangingPassword(false);
      }
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Password</h2>
        </div>

        {error && (
          <Alert variant="destructive" className="my-4">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error {error.code ? `(${error.code})` : ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {hasPassword && (
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{hasPassword ? "New Password" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword
                ? hasPassword
                  ? "Changing..."
                  : "Setting..."
                : hasPassword
                ? "Change password"
                : "Set password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
