import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/ui/phone-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CircleAlert, KeyRound, Link, Mail } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { socialProviderMaps, type SocialProviderType } from '@/lib/constants';
import { getCallbackUrl } from '@/lib/utils';

type View = 'form' | 'magic-link-sent' | 'otp-input' | '2fa-totp' | '2fa-otp';

export function SignInForm({ socialProviders = {} }: {
  socialProviders?: Record<string, Omit<SocialProviderType, 'icon'>>
}) {
  const [view, setView] = useState<View>('form');
  const [loginMethod, setLoginMethod] = useState<'email' | 'username' | 'phone'>('email');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>([]);
  const [lastUsedMethod, setLastUsedMethod] = useState<string | null>(null);

  useEffect(() => {
    // Run on client to avoid hydration mismatch
    const method = authClient.getLastUsedLoginMethod?.() || null;
    setLastUsedMethod(method);

    if (method === 'username') {
      setLoginMethod('username');
    } else if (method === 'phone' || method === 'phoneNumber') {
      setLoginMethod('phone');
    }
  }, []);

  const formSchema = z.object({
    identifier: z.string().min(1, 'Required'),
    password: z.string().min(1, 'Required'),
  }).superRefine((data, ctx) => {
    if (loginMethod === 'email' && !z.email().safeParse(data.identifier).success) {
      ctx.addIssue({
        code: "custom",
        path: ['identifier'],
        message: 'Invalid email address',
      });
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
    mode: 'onChange',
  });

  // Clear identifier error when method changes
  useEffect(() => {
    form.clearErrors('identifier');
  }, [loginMethod, form]);

  const identifier = form.watch('identifier');

  const maybeHandleTwoFactorRedirect = (data: unknown) => {
    if (!(data as any)?.twoFactorRedirect) return false;
    const methods: string[] = (data as any).twoFactorMethods ?? [];
    setTwoFactorMethods(methods);
    setView(methods.includes('totp') ? '2fa-totp' : '2fa-otp');
    return true;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    try {
      let result;
      const fetchOptions = { onSuccess: () => {} }; // Prevent Better Auth from redirecting automatically

      if (loginMethod === 'email') {
        result = await authClient.signIn.email({ email: values.identifier, password: values.password, fetchOptions });
      } else if (loginMethod === 'username') {
        result = await authClient.signIn.username({ username: values.identifier, password: values.password, fetchOptions });
      } else {
        result = await authClient.signIn.phoneNumber({ phoneNumber: values.identifier, password: values.password, fetchOptions });
      }

      if (result.error) {
        setError({
          message: result.error.message || 'Invalid identifier or password. Please try again.',
          code: (result.error as any).code,
        });
      } else if (!maybeHandleTwoFactorRedirect(result.data)) {
        window.location.href = getCallbackUrl();
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.magicLink({
        email: identifier,
        callbackURL: getCallbackUrl(),
      });

      if (result.error) {
        setError({
          message: result.error.message || 'Failed to send magic link. Please check the email and try again.',
          code: (result.error as any).code,
        });
      } else {
        setView('magic-link-sent');
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (authClient as any).emailOtp.sendVerificationOtp({
        email: identifier,
        type: 'sign-in',
      });

      if (result.error) {
        setError({
          message: result.error.message || 'Failed to send OTP. Please check the email and try again.',
          code: (result.error as any).code,
        });
      } else {
        setView('otp-input');
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.emailOtp({
        email: identifier,
        otp,
        fetchOptions: { onSuccess: () => {} }
      });

      if (result.error) {
        setError({
          message: result.error.message || 'Invalid or expired code. Please try again.',
          code: (result.error as any).code,
        });
      } else if (!maybeHandleTwoFactorRedirect(result.data)) {
        window.location.href = getCallbackUrl();
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactorTotp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.verifyTotp({ 
        code: twoFactorCode,
        fetchOptions: {
          onSuccess: () => {
            window.location.href = getCallbackUrl();
          }
        }
      });
      if (result.error) {
        setError({
          message: result.error.message || 'Invalid authenticator code. Please try again.',
          code: (result.error as any).code,
        });
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTwoFactorOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.sendOtp();
      if (result.error) setError({ message: 'Failed to send code. Please try again.' });
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactorOtp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.verifyOtp({ 
        code: twoFactorCode,
        fetchOptions: {
          onSuccess: () => {
            window.location.href = getCallbackUrl();
          }
        }
      });
      if (result.error) {
        setError({
          message: result.error.message || 'Invalid code. Please try again.',
          code: (result.error as any).code,
        });
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.passkey({
        fetchOptions: { onSuccess: () => {} }
      });
      if (result?.error) setError({ message: result?.error?.message || 'Passkey sign in failed. Please try again.' });
      else if (!maybeHandleTwoFactorRedirect(result?.data)) window.location.href = getCallbackUrl();
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({ provider, callbackURL: getCallbackUrl() });
    } catch {
      setError({ message: `Failed to sign in with ${provider}.` });
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
              onClick={() => { setView('form'); setError(null); }}
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setOtp(''); setError(null); }}
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
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

            <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length < 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            {twoFactorMethods.includes('otp') && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setView('2fa-otp'); setTwoFactorCode(''); setError(null); handleSendTwoFactorOtp(); }}
              >
                Use email code instead
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setTwoFactorCode(''); setError(null); }}
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
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

            <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length < 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setView('form'); setTwoFactorCode(''); setError(null); }}
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error {error.code ? `(${error.code})` : ''}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      {loginMethod === 'email' ? 'Email' : loginMethod === 'username' ? 'Username' : 'Phone Number'}
                    </FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="outline" size="sm" type="button" />}
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
                  <FormControl>
                    {loginMethod === 'phone' ? (
                      <PhoneInput
                        id="identifier"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    ) : (
                      <Input
                        id="identifier"
                        type={loginMethod === 'email' ? 'email' : 'text'}
                        placeholder={loginMethod === 'email' ? 'you@example.com' : 'username'}
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <a href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Form>

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
                className="w-full relative overflow-visible"
                onClick={handleMagicLink}
                disabled={loading || !identifier}
              >
                <Link className="size-4" />
                {loading ? 'Sending...' : 'Continue with Magic Link'}
                {lastUsedMethod === 'magic-link' && (
                  <span className="absolute -top-2.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Last used
                  </span>
                )}
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
          className="w-full relative overflow-visible"
          onClick={handlePasskeySignIn}
          disabled={loading}
        >
          <KeyRound className="size-4" />
          {loading ? 'Waiting...' : 'Continue with Passkey'}
          {lastUsedMethod === 'passkey' && (
            <span className="absolute -top-2.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Last used
            </span>
          )}
        </Button>

        {Object.keys(socialProviders).length > 0 && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <div className={`grid gap-4 ${Object.keys(socialProviders).length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {Object.entries(socialProviders).map(([providerId, provider]) => {
                const providerMap = socialProviderMaps[providerId];
                const Icon = providerMap?.icon || Link;
                const iconColor = providerMap?.color || undefined;
                const isLastUsed = lastUsedMethod === providerId;
                return (
                  <Button key={providerId} variant="outline" type="button" onClick={() => handleOAuth(providerId)} disabled={loading} className="relative overflow-visible">
                    {Icon && <Icon className="size-4" style={{ color: iconColor }} />}
                    {provider.label}
                    {isLastUsed && (
                      <span className="absolute -top-2.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Last used
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a 
            href={`/sign-up${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} 
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
