import { useState, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/ui/phone-input';
import { CircleAlert, Link } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { socialProviderMaps, type SocialProviderType } from '@/lib/constants';
import { getCallbackUrl } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  username: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function SignUpForm({ socialProviders = {}, captchaOptions }: {
  socialProviders?: Record<string, Omit<SocialProviderType, 'icon'>>;
  captchaOptions?: { provider: 'cloudflare-turnstile'; siteKey: string };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const handleOAuth = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({ provider, callbackURL: getCallbackUrl() });
    } catch {
      setError({ message: `Failed to continue with ${provider}` });
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        username: values.username || undefined,
        phoneNumber: values.phoneNumber || undefined,
        callbackURL: getCallbackUrl(),
        fetchOptions: {
          headers: { 'x-captcha-response': turnstileToken }
        }
      });

      if (result.error) {
        setError({
          message: result.error.message || 'Registration failed. Please check your details.',
          code: (result.error as any).code,
        });
        turnstileRef.current?.reset();
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError({ message: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent a verification link to {form.getValues('email')}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            After verification, you can{' '}
            <a 
              href={`/sign-in${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} 
              className="text-primary underline-offset-4 hover:underline"
            >
              sign in
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Fill in your details to get started</CardDescription>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
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
                    <Input placeholder="johndoe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="phone"
                      value={field.value}
                      onChange={field.onChange}
                    />
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
                  <FormLabel>Password *</FormLabel>
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
                  <FormLabel>Confirm Password *</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {captchaOptions?.provider === 'cloudflare-turnstile' && captchaOptions.siteKey && (
              <div className="flex justify-center" data-action="turnstile-spin-v2">
                <Turnstile
                  siteKey={captchaOptions.siteKey}
                  ref={turnstileRef}
                  onSuccess={(token) => setTurnstileToken(token)}
                  options={{ theme: 'auto' }}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (!!captchaOptions && !turnstileToken)}>
              {loading ? 'Creating account...' : 'Create Account'}
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
                    return (
                      <Button key={providerId} variant="outline" type="button" onClick={() => handleOAuth(providerId)} disabled={loading}>
                        {Icon && <Icon className="size-4" style={{ color: iconColor }} />}
                        {provider.label}
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <a 
            href={`/sign-in${typeof window !== 'undefined' && window.location.search ? window.location.search : ''}`} 
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
