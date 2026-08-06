import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { authClient } from '@/lib/auth-client';
import { CircleAlert } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type View = 'totp' | 'otp';

const formSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits'),
});

export function TwoFactorForm() {
  const [view, setView] = useState<View>('totp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [callbackURL, setCallbackURL] = useState('/');
  const [methods, setMethods] = useState<string[]>(['totp', 'otp']);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('callbackURL');
    if (next && /^\/[^/]/.test(next)) setCallbackURL(next);
    const m = params.get('methods');
    if (m) setMethods(m.split(',').map(s => s.trim()).filter(Boolean));
  }, []);

  const preferredView = useMemo<View>(() => (methods.includes('totp') ? 'totp' : 'otp'), [methods]);

  useEffect(() => {
    setView(preferredView);
  }, [preferredView]);

  const sendOtp = async () => {
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);
    try {
      let result;
      const fetchOptions = {
        onSuccess: () => {
          window.location.href = callbackURL;
        }
      };

      if (view === 'totp') {
        result = await authClient.twoFactor.verifyTotp({ code: values.code, fetchOptions });
      } else {
        result = await authClient.twoFactor.verifyOtp({ code: values.code, fetchOptions });
      }
      
      if (result.error) {
        setError({
          message: result.error.message || (view === 'totp' ? 'Invalid authenticator code. Please try again.' : 'Invalid code. Please try again.'),
          code: (result.error as any).code,
        });
      }
    } catch {
      setError({ message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: View) => {
    setView(newView);
    form.reset();
    setError(null);
    if (newView === 'otp') {
      void sendOtp();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {view === 'totp' 
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Enter the code sent to your email.'}
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{view === 'totp' ? 'Authenticator code' : 'Email code'}</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} value={field.value} onChange={field.onChange} autoFocus>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            


            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            {view === 'otp' && (
              <Button type="button" variant="ghost" className="w-full" onClick={sendOtp} disabled={loading}>
                Send code again
              </Button>
            )}

            {view === 'totp' && methods.includes('otp') && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => switchView('otp')}
                disabled={loading}
              >
                Use email code instead
              </Button>
            )}

            {view === 'otp' && methods.includes('totp') && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => switchView('totp')}
                disabled={loading}
              >
                Use authenticator app instead
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { window.location.href = '/sign-in'; }}
              disabled={loading}
            >
              Back to sign in
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
