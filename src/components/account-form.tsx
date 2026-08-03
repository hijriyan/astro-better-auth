import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, Link as LinkIcon, MonitorIcon, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { socialProviderMaps } from "@/lib/constants";

import { ProfileForm } from "./account/profile-form";
import { EmailForm } from "./account/email-form";
import { PhoneForm } from "./account/phone-form";
import { PasswordForm } from "./account/password-form";
import { TwoFactorSection } from "./account/two-factor-section";
import { PasskeysSection } from "./account/passkeys-section";

// import type { Account, ActiveSession } from "@/lib/auth-client";

interface AccountFormProps {
  user: {
    name: string;
    email: string;
    image?: string;
    emailVerified?: boolean;
    username?: string;
    phoneNumber?: string;
    phoneNumberVerified?: boolean;
    twoFactorEnabled?: boolean;
  };
  accounts: any[];
  socialProviders: Record<string, { label: string; color: string | false }>;
}

export function AccountForm({ user, accounts, socialProviders }: AccountFormProps) {
  const [error, setError] = useState<{ message?: string; code?: string; section: string } | null>(null);

  // Session state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);

  const hasPassword = accounts.some((a) => a.providerId === "credential");
  const linkedProviders = accounts.map((a) => a.providerId);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const { data: sessionData } = await authClient.getSession();
        setCurrentSessionToken((sessionData as any)?.session?.token ?? null);
        const { data, error: apiError } = await authClient.listSessions();
        if (apiError) throw new Error(apiError.message);
        setSessions((data ?? []) as any[]);
      } catch (err: any) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    loadSessions();
  }, []);

  const handleConnectProvider = async (provider: string) => {
    setError(null);
    try {
      await authClient.linkSocial({ provider: provider as any, callbackURL: "/account" });
    } catch {
      setError({ message: `Failed to link ${provider}`, section: "connected-accounts" });
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    setError(null);
    try {
      const { error: apiError } = await authClient.unlinkAccount({ providerId });
      if (apiError) { setError({ message: apiError.message, code: (apiError as any).code, section: "connected-accounts" }); return; }
      toast.add({ title: "Account unlinked", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to unlink account", section: "connected-accounts" });
    }
  };

  const handleRevokeSession = async (token: string) => {
    setError(null);
    try {
      const { error: apiError } = await authClient.revokeSession({ token });
      if (apiError) { setError({ message: apiError.message, code: (apiError as any).code, section: "sessions" }); return; }
      setSessions((s) => s.filter((x) => x.token !== token));
      toast.add({ title: "Session revoked", type: "success" });
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to revoke session", section: "sessions" });
    }
  };

  const handleRevokeOtherSessions = async () => {
    setError(null);
    try {
      const { error: apiError } = await authClient.revokeOtherSessions();
      if (apiError) { setError({ message: apiError.message, code: (apiError as any).code, section: "sessions" }); return; }
      setSessions((s) => s.filter((x) => x.token === currentSessionToken));
      toast.add({ title: "All other sessions revoked", type: "success" });
    } catch (err: any) {
      setError({ message: err.message ?? "Failed to revoke sessions", section: "sessions" });
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList variant="line" className="h-auto w-full justify-start gap-6 bg-transparent p-0 border-b overflow-x-auto flex-nowrap whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="general" className="gap-2">
            <User className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <ProfileForm user={user} />
          <EmailForm user={user} />
          <PhoneForm user={user} />

          {/* Connected Accounts Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Connected Accounts</h2>
              </div>
              {error?.section === 'connected-accounts' && (
                <Alert variant="destructive" className="my-4">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                {Object.entries(socialProviders).map(([providerId, provider]) => {
                  const providerMap = socialProviderMaps[providerId];
                  const Icon = providerMap?.icon || LinkIcon;
                  const iconColor = providerMap?.color || undefined;
                  const isConnected = linkedProviders.includes(providerId);

                  return (
                    <div key={providerId} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="size-5" style={{ color: iconColor }} />}
                        <div>
                          <p className="font-medium">{provider.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {isConnected ? "Connected" : "Not connected"}
                          </p>
                        </div>
                      </div>
                      {isConnected ? (
                        <Button variant="outline" size="sm" onClick={() => handleUnlinkProvider(providerId)}>
                          Disconnect
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleConnectProvider(providerId)}>
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PasswordForm hasPassword={hasPassword} />
          <TwoFactorSection user={user} hasPassword={hasPassword} />
          <PasskeysSection />

          {/* Active Sessions Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MonitorIcon className="size-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Active Sessions</h2>
                </div>
                {sessions.length > 1 && (
                  <Button variant="outline" size="sm" onClick={handleRevokeOtherSessions}>
                    Revoke all others
                  </Button>
                )}
              </div>
              {error?.section === 'sessions' && (
                <Alert variant="destructive" className="my-4">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                These devices are currently signed in to your account.
              </p>
              
              {isLoadingSessions ? (
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {session.userAgent ? (
                              // extract basic device/browser info from user agent
                              session.userAgent.includes("Mac") ? "Mac" :
                              session.userAgent.includes("Windows") ? "Windows" :
                              session.userAgent.includes("iPhone") ? "iPhone" :
                              session.userAgent.includes("Android") ? "Android" : "Device"
                            ) : "Unknown device"}
                          </p>
                          {session.token === currentSessionToken && (
                            <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-transparent hover:bg-green-500/20">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.ipAddress || "Unknown IP"} • Last active: {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {session.token !== currentSessionToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevokeSession(session.token)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
