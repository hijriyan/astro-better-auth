import { useEffect, useState } from "react";
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
import { CircleAlert, Cloud as CloudIcon, Fingerprint, Smartphone } from "lucide-react";
import { getAuthenticatorName } from "@better-auth/passkey";

interface Passkey {
  id: string;
  name?: string;
  aaguid?: string;
  createdAt: Date;
  transports?: string;
  backedUp?: boolean;
}

const passkeySchema = z.object({
  name: z.string().min(1, "Passkey name is required"),
});

type PasskeyFormValues = z.infer<typeof passkeySchema>;

export function PasskeysSection() {
  const [error, setError] = useState<{ message?: string; code?: string } | null>(null);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [showPasskeyNameInput, setShowPasskeyNameInput] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);

  useEffect(() => {
    const loadPasskeys = async () => {
      setIsLoadingPasskeys(true);
      try {
        const { data, error: apiError } = await (authClient as any).passkey.listUserPasskeys();
        if (apiError) throw new Error(apiError.message);
        setPasskeys(data ?? []);
      } catch (err: any) {
        console.error("Failed to load passkeys:", err);
      } finally {
        setIsLoadingPasskeys(false);
      }
    };
    loadPasskeys();
  }, []);

  const form = useForm<PasskeyFormValues>({
    resolver: zodResolver(passkeySchema),
    defaultValues: { name: "" },
  });

  const TRANSPORT_LABELS: Record<string, string> = {
    internal: "Built-in biometric",
    hybrid: "Phone / tablet",
    usb: "USB key",
    nfc: "NFC key",
    ble: "Bluetooth key",
  };

  const formatTransports = (transports?: string) => {
    if (!transports) return null;
    return transports
      .split(",")
      .map((t) => TRANSPORT_LABELS[t.trim()] ?? t.trim())
      .join(", ");
  };

  const handleAddPasskey = async (values: PasskeyFormValues) => {
    setError(null);
    setIsAddingPasskey(true);
    try {
      const { error: apiError } = await (authClient as any).passkey.addPasskey({
        name: values.name,
      });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Passkey added successfully", type: "success" });
      setShowPasskeyNameInput(false);
      form.reset();

      // reload passkeys
      const { data } = await (authClient as any).passkey.listUserPasskeys();
      setPasskeys(data ?? []);
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to add passkey" });
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    setError(null);
    try {
      const { error: apiError } = await (authClient as any).passkey.deletePasskey({ id });
      if (apiError) {
        setError({ message: apiError.message, code: (apiError as any).code });
        return;
      }
      toast.add({ title: "Passkey deleted", type: "success" });
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to delete passkey" });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Passkeys</h2>
        </div>
        
        {error && (
          <Alert variant="destructive" className="my-4">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error {error.code ? `(${error.code})` : ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        
        <p className="text-sm text-muted-foreground">
          Use passkeys for passwordless authentication with Face ID, Touch ID, or security keys.
        </p>

        {isLoadingPasskeys ? (
          <p className="text-sm text-muted-foreground">Loading passkeys...</p>
        ) : passkeys.length > 0 ? (
          <div className="space-y-3">
            {passkeys.map((pk) => {
              const label = pk.name || getAuthenticatorName(pk.aaguid ?? "") || "Passkey";
              const transport = formatTransports(pk.transports);
              return (
                <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                      <Smartphone className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {transport && (
                          <span className="text-xs text-muted-foreground">{transport}</span>
                        )}
                        {pk.backedUp && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <CloudIcon className="size-3" /> Synced
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : "Recently added"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeletePasskey(pk.id)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        )}

        {showPasskeyNameInput ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddPasskey)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1 max-w-sm">
                    <FormControl>
                      <Input autoFocus placeholder="Name this passkey (e.g. MacBook, iPhone)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isAddingPasskey}>
                {isAddingPasskey ? "Adding..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowPasskeyNameInput(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            </form>
          </Form>
        ) : (
          <Button onClick={() => setShowPasskeyNameInput(true)} variant="outline">
            Add passkey
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
