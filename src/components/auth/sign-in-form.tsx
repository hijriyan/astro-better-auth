import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/ui/phone-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { GithubIcon, KeyRound, Link, Mail, Fingerprint } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

type View = 'form' | 'magic-link-sent' | 'otp-input' | '2fa-totp' | '2fa-otp';

export function SignInForm({ socialProviders = { google: false, github: false } }: {
  socialProviders?: { google: boolean; github: boolean }
}) {
  const [view, setView] = useState<View>('form');
  const [loginMethod, setLoginMethod] = useState<'email' | 'username' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>([]);

  const maybeHandleTwoFactorRedirect = (data: unknown) => {
    if (!(data as any)?.twoFactorRedirect) return false;
    const methods: string[] = (data as any).twoFactorMethods ?? [];
    setTwoFactorMethods(methods);
    setView(methods.includes('totp') ? '2fa-totp' : '2fa-otp');
    return true;
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (loginMethod === 'email') {
        result = await authClient.signIn.email({ email: identifier, password });
      } else if (loginMethod === 'username') {
        result = await authClient.signIn.username({ username: identifier, password });
      } else {
        result = await authClient.signIn.phoneNumber({ phoneNumber: identifier, password });
      }

      if (result.error) {
        setError(result.error.message || 'Sign in failed');
      } else if (!maybeHandleTwoFactorRedirect(result.data)) {
        window.location.href = '/';
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await authClient.signIn.magicLink({
        email: identifier,
        callbackURL: '/',
      });

      if (result.error) {
        setError(result.error.message || 'Magic link failed');
      } else {
        setView('magic-link-sent');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await (authClient as any).emailOtp.sendVerificationOtp({
        email: identifier,
        type: 'sign-in',
      });

      if (result.error) {
        setError(result.error.message || 'Failed to send OTP');
      } else {
        setView('otp-input');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await (authClient as any).signIn.emailOtp({
        email: identifier,
        otp,
      });

      if (result.error) {
        setError(result.error.message || 'OTP verification failed');
      } else if (!maybeHandleTwoFactorRedirect(result.data)) {
        window.location.href = '/';
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactorTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await (authClient as any).twoFactor.verifyTotp({ code: twoFactorCode });
      if (result.error) {
        setError(result.error.message || '2FA verification failed');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTwoFactorOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await (authClient as any).twoFactor.sendOtp();
      if (result.error) setError(result.error.message || 'Failed to send code');
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactorOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await (authClient as any).twoFactor.verifyOtp({ code: twoFactorCode });
      if (result.error) {
        setError(result.error.message || '2FA verification failed');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await (authClient as any).signIn.passkey();
      if (result?.error) setError(result.error.message || 'Passkey sign in failed');
      else if (!maybeHandleTwoFactorRedirect(result?.data)) window.location.href = '/';
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      await authClient.signIn.social({ provider, callbackURL: '/' });
    } catch {
      setError('OAuth failed');
      setLoading(false);
    }
  };

  // Magic link sent view
  if (view === 'magic-link-sent') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to{' '}
            <span className="font-medium text-foreground">{identifier}</span>.
            Click the link to sign in instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or{' '}
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => { setView('form'); setError(''); }}
            >
              try again
            </button>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  // OTP input view
  if (view === 'otp-input') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter your code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{identifier}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Code</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                autoFocus
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setOtp(''); setError(''); }}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // 2FA TOTP view
  if (view === '2fa-totp') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyTwoFactorTotp} className="space-y-4">
            <div className="space-y-2">
              <Label>Authenticator code</Label>
              <InputOTP maxLength={6} value={twoFactorCode} onChange={setTwoFactorCode} autoFocus>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length < 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            {twoFactorMethods.includes('otp') && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setView('2fa-otp'); setTwoFactorCode(''); setError(''); handleSendTwoFactorOtp(); }}
              >
                Use email code instead
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setTwoFactorCode(''); setError(''); }}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // 2FA OTP view
  if (view === '2fa-otp') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the code sent to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyTwoFactorOtp} className="space-y-4">
            <div className="space-y-2">
              <Label>Email code</Label>
              <InputOTP maxLength={6} value={twoFactorCode} onChange={setTwoFactorCode} autoFocus>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length < 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setTwoFactorCode(''); setError(''); }}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Main sign-in form
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Choose your preferred sign in method</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="identifier">
                {loginMethod === 'email' ? 'Email' : loginMethod === 'username' ? 'Username' : 'Phone Number'}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" />}
                >
                  Switch
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  <DropdownMenuRadioGroup value={loginMethod} onValueChange={(v) => setLoginMethod(v as typeof loginMethod)}>
                    <DropdownMenuLabel>Sign in method</DropdownMenuLabel>
                    <DropdownMenuRadioItem value="email">Email</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="username">Username</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="phone">Phone</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {loginMethod === 'phone' ? (
              <PhoneInput
                id="identifier"
                value={identifier}
                onChange={(v) => setIdentifier(v ?? '')}
                required
              />
            ) : (
              <Input
                id="identifier"
                type={loginMethod === 'email' ? 'email' : 'text'}
                placeholder={loginMethod === 'email' ? 'you@example.com' : 'username'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {loginMethod === 'email' && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">OR</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleMagicLink}
                disabled={loading || !identifier}
              >
                <Link className="size-4" />
                {loading ? 'Sending...' : 'Continue with Magic Link'}
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleSendOtp}
                disabled={loading || !identifier}
              >
                <Mail className="size-4" />
                {loading ? 'Sending...' : 'Continue with Email Code'}
              </Button>
            </div>
          </>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
          </div>
        </div>
        <Button
          variant="outline"
          type="button"
          className="w-full"
          onClick={handlePasskeySignIn}
          disabled={loading}
        >
          <KeyRound className="size-4" />
          {loading ? 'Waiting...' : 'Continue with Passkey'}
        </Button>

        {(socialProviders.google || socialProviders.github) && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <div className={`grid gap-4 ${socialProviders.google && socialProviders.github ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {socialProviders.google && (
                <Button variant="outline" type="button" onClick={() => handleOAuth('google')} disabled={loading}>
                  <GoogleIcon className="size-4" />
                  Google
                </Button>
              )}
              {socialProviders.github && (
                <Button variant="outline" type="button" onClick={() => handleOAuth('github')} disabled={loading}>
                  <GithubIcon className="size-4" />
                  GitHub
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a href="/sign-up" className="text-primary underline-offset-4 hover:underline">
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
