import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, Link as LinkIcon, MonitorIcon, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  socialProviders: {
    google: { enabled: boolean };
    github: { enabled: boolean };
  };
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

  const handleConnectProvider = async (provider: "google" | "github") => {
    setError(null);
    try {
      await authClient.linkSocial({ provider, callbackURL: "/account" });
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
        <TabsList variant="line" className="h-auto w-full justify-start gap-6 bg-transparent p-0 border-b">
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
                {socialProviders.google.enabled && (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="size-5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <div>
                        <p className="font-medium">Google</p>
                        <p className="text-sm text-muted-foreground">
                          {linkedProviders.includes("google") ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {linkedProviders.includes("google") ? (
                      <Button variant="outline" size="sm" onClick={() => handleUnlinkProvider("google")}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleConnectProvider("google")}>
                        Connect
                      </Button>
                    )}
                  </div>
                )}
                {socialProviders.github.enabled && (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="size-5 fill-current">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-sm text-muted-foreground">
                          {linkedProviders.includes("github") ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {linkedProviders.includes("github") ? (
                      <Button variant="outline" size="sm" onClick={() => handleUnlinkProvider("github")}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleConnectProvider("github")}>
                        Connect
                      </Button>
                    )}
                  </div>
                )}
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
