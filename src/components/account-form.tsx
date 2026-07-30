import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { User, Lock, GithubIcon, Key, Shield, Fingerprint, Smartphone, QrCode, CloudIcon, MonitorIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getAuthenticatorName } from "@better-auth/passkey";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/toast";

interface Account {
  id: string;
  providerId: string;
  accountId: string;
}

interface ActiveSession {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface Passkey {
  id: string;
  name?: string;
  publicKey: string;
  userId: string;
  credentialID: string;
  counter: number;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  transports?: string;
  createdAt: Date;
  aaguid?: string;
}

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
  accounts: Account[];
  socialProviders: {
    google: { enabled: boolean };
    github: { enabled: boolean };
  };
}

export function AccountForm({ user, accounts, socialProviders }: AccountFormProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email);
  // emailStep: idle | verify-current | verify-new
  const [emailStep, setEmailStep] = useState<"idle" | "verify-current" | "verify-new">("idle");
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [phone, setPhone] = useState(user.phoneNumber ?? "");
  const [phoneOtp, setPhoneOtp] = useState("");
  // phoneStep: idle | verify-phone
  const [phoneStep, setPhoneStep] = useState<"idle" | "verify-phone">("idle");
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Two-factor state
  const [is2FAEnabled, setIs2FAEnabled] = useState(user.twoFactorEnabled ?? false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Passkey state
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [showPasskeyNameInput, setShowPasskeyNameInput] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);

  const hasPassword = accounts.some((a) => a.providerId === "credential");

  const linkedProviders = accounts.map((a) => a.providerId);

  const profileDirty =
    name !== user.name ||
    username !== (user.username ?? "");

  const phoneDirty = phone !== (user.phoneNumber ?? "");

  // Load passkeys and sessions on mount
  useEffect(() => {
    const loadPasskeys = async () => {
      setIsLoadingPasskeys(true);
      try {
        const { data, error } = await (authClient as any).passkey.listUserPasskeys();
        if (error) throw new Error(error.message);
        setPasskeys(data ?? []);
      } catch (err: any) {
        console.error("Failed to load passkeys:", err);
      } finally {
        setIsLoadingPasskeys(false);
      }
    };

    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const { data: sessionData } = await authClient.getSession();
        setCurrentSessionToken((sessionData as any)?.session?.token ?? null);
        const { data, error } = await authClient.listSessions();
        if (error) throw new Error(error.message);
        setSessions((data ?? []) as ActiveSession[]);
      } catch (err: any) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadPasskeys();
    loadSessions();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (name !== user.name || username !== (user.username ?? "")) {
        const { error } = await authClient.updateUser({
          name: name !== user.name ? name : undefined,
          ...(username !== (user.username ?? "") ? { username } : {}),
        } as any);
        if (error) throw new Error(error.message);
      }
      toast.add({ title: "Profile updated", type: "success" });
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to save profile", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!email || email === user.email) return;
    setIsSendingEmailOtp(true);
    try {
      // verifyCurrentEmail: true — send OTP to current email first
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: user.email,
        type: "email-verification",
      });
      if (error) throw new Error(error.message);
      setEmailStep("verify-current");
      toast.add({ title: `Verification code sent to ${user.email}`, type: "success" });
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to send code", type: "error" });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Step 1: user submits OTP from current email → requestEmailChange sends OTP to new email
  const handleVerifyCurrentEmail = async () => {
    if (emailOtp.length < 6) return;
    setIsChangingEmail(true);
    try {
      const { error } = await authClient.emailOtp.requestEmailChange({
        newEmail: email,
        otp: emailOtp,
      });
      if (error) throw new Error(error.message);
      setEmailOtp("");
      setEmailStep("verify-new");
      toast.add({ title: `Verification code sent to ${email}`, type: "success" });
    } catch (err: any) {
      toast.add({ title: err.message ?? "Verification failed", type: "error" });
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Step 2: user submits OTP from new email → email updated
  const handleConfirmEmailChange = async () => {
    if (emailOtp.length < 6) return;
    setIsChangingEmail(true);
    try {
      const { error } = await authClient.emailOtp.changeEmail({ newEmail: email, otp: emailOtp });
      if (error) throw new Error(error.message);
      toast.add({ title: "Email updated", type: "success" });
      setEmailStep("idle");
      setEmailOtp("");
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Verification failed", type: "error" });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleCancelEmailChange = () => {
    setEmailStep("idle");
    setEmailOtp("");
    setEmail(user.email);
  };

  // Step 1: send email OTP to current email to verify identity
  const handleSendPhoneOtp = async () => {
    if (!phone) return;
    setIsSendingPhoneOtp(true);
    try {
      const { error } = await (authClient as any).phoneNumber.sendOtp({ phoneNumber: phone });
      if (error) throw new Error(error.message);
      setPhoneStep("verify-phone");
      toast.add({ title: `Verification code sent to ${phone}`, type: "success" });
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to send code", type: "error" });
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // Step 2: verify phone OTP and update
  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length < 6) return;
    setIsVerifyingPhone(true);
    try {
      const { error } = await (authClient as any).phoneNumber.verify({
        phoneNumber: phone,
        code: phoneOtp,
        updatePhoneNumber: true,
      });
      if (error) throw new Error(error.message);
      toast.add({ title: "Phone number updated", type: "success" });
      setPhoneStep("idle");
      setPhoneOtp("");
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Verification failed", type: "error" });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    setPhoneStep("idle");
    setPhoneOtp("");
    setPhone(user.phoneNumber ?? "");
  };

  const handleConnectProvider = async (provider: "google" | "github") => {
    try {
      await authClient.linkSocial({ provider, callbackURL: "/account" });
    } catch {
      toast.add({ title: `Failed to link ${provider}`, type: "error" });
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    try {
      await authClient.unlinkAccount({ providerId });
      toast.add({ title: `${providerId} unlinked`, type: "success" });
      window.location.reload();
    } catch {
      toast.add({ title: `Failed to unlink ${providerId}`, type: "error" });
    }
  };

  // Password change handler
  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.add({ title: "Please fill in all fields", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.add({ title: "Passwords do not match", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      toast.add({ title: "Password must be at least 8 characters", type: "error" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set password");
      toast.add({ title: "Password set successfully", type: "success" });
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to set password", type: "error" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.add({ title: "Please fill in all password fields", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.add({ title: "New passwords do not match", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      toast.add({ title: "Password must be at least 8 characters", type: "error" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) throw new Error(error.message);
      toast.add({ title: "Password changed successfully", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to change password", type: "error" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Two-factor handlers
  const handleEnable2FA = async () => {
    if (!disablePassword) {
      toast.add({ title: "Please enter your password", type: "error" });
      return;
    }
    setIsEnabling2FA(true);
    try {
      const { data, error } = await (authClient as any).twoFactor.enable({
        password: disablePassword,
      });
      if (error) throw new Error(error.message);
      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setShow2FASetup(true);
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to enable 2FA", type: "error" });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (totpCode.length < 6) {
      toast.add({ title: "Please enter a valid code", type: "error" });
      return;
    }
    setIsEnabling2FA(true);
    try {
      const { error } = await (authClient as any).twoFactor.verifyTotp({
        code: totpCode,
      });
      if (error) throw new Error(error.message);
      toast.add({ title: "Two-factor authentication enabled", type: "success" });
      setIs2FAEnabled(true);
      setShow2FASetup(false);
      setDisablePassword("");
      setTotpCode("");
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Invalid code", type: "error" });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.add({ title: "Please enter your password", type: "error" });
      return;
    }
    setIsDisabling2FA(true);
    try {
      const { error } = await (authClient as any).twoFactor.disable({
        password: disablePassword,
      });
      if (error) throw new Error(error.message);
      toast.add({ title: "Two-factor authentication disabled", type: "success" });
      setIs2FAEnabled(false);
      setDisablePassword("");
      window.location.reload();
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to disable 2FA", type: "error" });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    const text = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: "Backup codes copied", type: "success" });
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) toast.add({ title: "Backup codes copied", type: "success" });
        else toast.add({ title: "Failed to copy backup codes", type: "error" });
      } catch {
        toast.add({ title: "Failed to copy backup codes", type: "error" });
      }
    }
  };

  // Session handlers
  const handleRevokeSession = async (token: string) => {
    try {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw new Error(error.message);
      setSessions((s) => s.filter((x) => x.token !== token));
      toast.add({ title: "Session revoked", type: "success" });
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to revoke session", type: "error" });
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message);
      setSessions((s) => s.filter((x) => x.token === currentSessionToken));
      toast.add({ title: "All other sessions revoked", type: "success" });
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to revoke sessions", type: "error" });
    }
  };

  // Passkey handlers
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

  const handleAddPasskey = async () => {
    if (!newPasskeyName.trim()) {
      toast.add({ title: "Please enter a name for this passkey", type: "error" });
      return;
    }
    setIsAddingPasskey(true);
    try {
      const { error } = await (authClient as any).passkey.addPasskey({
        name: newPasskeyName.trim(),
      });
      if (error) throw new Error(error.message);
      toast.add({ title: "Passkey added successfully", type: "success" });
      setNewPasskeyName("");
      setShowPasskeyNameInput(false);
      const { data } = await (authClient as any).passkey.listUserPasskeys();
      setPasskeys(data ?? []);
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to add passkey", type: "error" });
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      const { error } = await (authClient as any).passkey.deletePasskey({ id });
      if (error) throw new Error(error.message);
      toast.add({ title: "Passkey deleted", type: "success" });
      setPasskeys(passkeys.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.add({ title: err.message ?? "Failed to delete passkey", type: "error" });
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList variant="line" className="h-auto w-full justify-start gap-6 bg-transparent p-0 border-b">
          <TabsTrigger value="general" className="gap-2">
            <User className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-semibold">Profile</h2>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="size-12">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" disabled>
                    Change avatar
                  </Button>
                </div>
              </div>

              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={isSaving || !profileDirty}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-semibold">Email Address</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="email">Email</Label>
                  {user.emailVerified ? (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Unverified</Badge>
                  )}
                </div>
                {user.emailVerified ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled={emailStep !== "idle"}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {emailStep === "idle" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRequestEmailChange}
                          disabled={isSendingEmailOtp || email === user.email || !email}
                        >
                          {isSendingEmailOtp ? "Sending..." : "Send code"}
                        </Button>
                      )}
                    </div>

                    {/* Step 1: verify current email */}
                    {emailStep === "verify-current" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Enter the code sent to <strong>{user.email}</strong> to confirm the change.
                        </p>
                        <div className="flex gap-2 items-center flex-wrap">
                          <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} autoFocus>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <Button type="button" onClick={handleVerifyCurrentEmail} disabled={isChangingEmail || emailOtp.length < 6}>
                            {isChangingEmail ? "Verifying..." : "Confirm"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={handleCancelEmailChange}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: verify new email */}
                    {emailStep === "verify-new" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Enter the code sent to <strong>{email}</strong> to complete the change.
                        </p>
                        <div className="flex gap-2 items-center flex-wrap">
                          <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} autoFocus>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <Button type="button" onClick={handleConfirmEmailChange} disabled={isChangingEmail || emailOtp.length < 6}>
                            {isChangingEmail ? "Updating..." : "Verify & save"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={handleCancelEmailChange}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Input id="email" value={user.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      Your email is not verified yet.{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-4 hover:no-underline"
                        onClick={async () => {
                          const { error } = await authClient.sendVerificationEmail({
                            email: user.email,
                            callbackURL: "/account",
                          });
                          if (error) toast.add({ title: error.message, type: "error" });
                          else toast.add({ title: "Verification email sent", type: "success" });
                        }}
                      >
                        Resend verification email
                      </button>
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phone Number Section */}
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-semibold">Phone Number</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  {user.phoneNumber && (
                    user.phoneNumberVerified ? (
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Unverified</Badge>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  <PhoneInput
                    id="phone"
                    value={phone}
                    disabled={phoneStep !== "idle"}
                    onChange={(v) => {
                      setPhone(v ?? "");
                      setPhoneStep("idle");
                      setPhoneOtp("");
                    }}
                  />
                  {phoneStep === "idle" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendPhoneOtp}
                      disabled={isSendingPhoneOtp || !phoneDirty || !phone}
                    >
                      {isSendingPhoneOtp ? "Sending..." : "Send code"}
                    </Button>
                  )}
                </div>

                {/* Verify phone number */}
                {phoneStep === "verify-phone" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Enter the code sent to <strong>{phone}</strong>.
                    </p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp} autoFocus>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <Button type="button" onClick={handleVerifyPhoneOtp} disabled={isVerifyingPhone || phoneOtp.length < 6}>
                        {isVerifyingPhone ? "Verifying..." : "Verify & save"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleCancelPhone}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts Section */}
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-semibold">Connected Accounts</h2>
              <div>
                {/* GitHub */}
                {socialProviders.github.enabled && (
                  <div className="flex flex-col items-start justify-between gap-4 py-3 sm:flex-row sm:items-center border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                        <GithubIcon className="text-muted-foreground size-5" />
                      </div>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-muted-foreground text-sm">
                          {linkedProviders.includes("github") ? "Linked" : "Not linked"}
                        </p>
                      </div>
                    </div>
                    {linkedProviders.includes("github") ? (
                      <Button variant="outline" onClick={() => handleUnlinkProvider("github")}>
                        Unlink
                      </Button>
                    ) : (
                      <Button onClick={() => handleConnectProvider("github")}>Link</Button>
                    )}
                  </div>
                )}

                {/* Google */}
                {socialProviders.google.enabled && (
                  <div className="flex flex-col items-start justify-between gap-4 py-3 sm:flex-row sm:items-center border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                        <svg className="text-muted-foreground size-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Google</p>
                        <p className="text-muted-foreground text-sm">
                          {linkedProviders.includes("google") ? "Linked" : "Not linked"}
                        </p>
                      </div>
                    </div>
                    {linkedProviders.includes("google") ? (
                      <Button variant="outline" onClick={() => handleUnlinkProvider("google")}>
                        Unlink
                      </Button>
                    ) : (
                      <Button onClick={() => handleConnectProvider("google")}>Link</Button>
                    )}
                  </div>
                )}

                {!socialProviders.github.enabled && !socialProviders.google.enabled && (
                  <p className="text-sm text-muted-foreground">No OAuth providers configured.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Password Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Password</h2>
              </div>
              <div className="space-y-4">
                {hasPassword ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm new password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {isChangingPassword ? "Updating..." : "Update password"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You signed up with a social account. Set a password to also enable email sign-in.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Choose a password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSetPassword}
                        disabled={isChangingPassword || !newPassword || !confirmPassword}
                      >
                        {isChangingPassword ? "Setting..." : "Set password"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                {is2FAEnabled
                  ? <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-transparent">Enabled</Badge>
                  : <Badge variant="destructive" className="text-xs">Disabled</Badge>
                }
              </div>

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
                        </button>
                        {" "}first before enabling two-factor authentication.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="2fa-password">Password</Label>
                        <Input
                          id="2fa-password"
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Enter your password to enable 2FA"
                        />
                      </div>
                      <Button
                        onClick={handleEnable2FA}
                        disabled={isEnabling2FA || !disablePassword}
                      >
                        {isEnabling2FA ? "Enabling..." : "Enable two-factor authentication"}
                      </Button>
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
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                          alt="2FA QR Code"
                          className="size-48"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="totp-code" className="w-full justify-center">Enter the code from your app</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="disable-2fa-password">Password</Label>
                    <Input
                      id="disable-2fa-password"
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Enter your password to disable 2FA"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                    disabled={isDisabling2FA || !disablePassword}
                  >
                    {isDisabling2FA ? "Disabling..." : "Disable two-factor authentication"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passkeys Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Fingerprint className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Passkeys</h2>
              </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePasskey(pk.id)}
                        >
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
                <div className="flex gap-2 items-center">
                  <Input
                    autoFocus
                    placeholder="Name this passkey (e.g. MacBook, iPhone)"
                    value={newPasskeyName}
                    onChange={(e) => setNewPasskeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPasskey()}
                    className="max-w-sm"
                  />
                  <Button onClick={handleAddPasskey} disabled={isAddingPasskey || !newPasskeyName.trim()}>
                    {isAddingPasskey ? "Adding..." : "Add"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowPasskeyNameInput(false); setNewPasskeyName(""); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowPasskeyNameInput(true)} variant="outline">
                  Add passkey
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions Section */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
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
              <p className="text-sm text-muted-foreground">
                These devices are currently signed in to your account.
              </p>

              {isLoadingSessions ? (
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions
                    .slice()
                    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
                    .map((session) => {
                      const isCurrent = session.token === currentSessionToken;
                      const ua = session.userAgent ?? "";
                      // ponytail: naive UA label — good enough for 99% of browsers
                      const browser =
                        ua.includes("Edg/") ? "Edge" :
                        ua.includes("OPR/") || ua.includes("Opera") ? "Opera" :
                        ua.includes("Chrome/") ? "Chrome" :
                        ua.includes("Firefox/") ? "Firefox" :
                        ua.includes("Safari/") ? "Safari" :
                        "Browser";
                      const os =
                        ua.includes("iPhone") ? "iPhone" :
                        ua.includes("iPad") ? "iPad" :
                        ua.includes("Android") ? "Android" :
                        ua.includes("Mac OS X") ? "macOS" :
                        ua.includes("Windows") ? "Windows" :
                        ua.includes("Linux") ? "Linux" :
                        "Unknown OS";
                      return (
                        <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                              <MonitorIcon className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{browser} on {os}</p>
                                {isCurrent && (
                                  <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-transparent">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {session.ipAddress && (
                                  <span className="text-xs text-muted-foreground">{session.ipAddress}</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {!isCurrent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeSession(session.token)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
