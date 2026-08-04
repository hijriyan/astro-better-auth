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
import { CircleAlert, User as UserIcon, Copy, Check } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const copyUserId = () => {
    navigator.clipboard.writeText(user.id);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      username: user.username ?? "",
    },
  });

  const isDirty = form.formState.isDirty;

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null);
    setIsSaving(true);
    try {
      const { error: apiError } = await authClient.updateUser({
        name: values.name !== user.name ? values.name : undefined,
        ...(values.username !== (user.username ?? "") ? { username: values.username } : {}),
      } as any);

      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }

      toast.add({ title: "Profile updated", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to save profile" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        
        {error && (
          <Alert variant="destructive" className="my-4">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>User ID</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Input value={user.id} disabled readOnly className="font-mono text-xs bg-muted/50" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={copyUserId}
                    title="Copy User ID"
                  >
                    {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
