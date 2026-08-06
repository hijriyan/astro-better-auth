import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { authClient } from '@/lib/auth-client';
import { normaliseUserCode } from '../../lib/device-utils';
import { CircleAlert } from 'lucide-react';

interface DeviceFormProps {
  initialUserCode?: string;
}

function mapError(code: string | undefined, status: number | undefined): string {
  const errCode = code?.toUpperCase();
  if (errCode === 'EXPIRED_USER_CODE' || errCode === 'EXPIRED_TOKEN') {
    return 'This code has expired. Please ask the device to restart the authorization flow.';
  }
  if (errCode === 'DEVICE_CODE_ALREADY_PROCESSED') {
    return 'This code has already been used.';
  }
  if (errCode === 'INVALID_USER_CODE' || errCode === 'INVALID_REQUEST' || status === 400) {
    return 'This code is invalid or has expired.';
  }
  return 'An unexpected error occurred. Please try again.';
}

export function DeviceForm({ initialUserCode = '' }: DeviceFormProps) {
  const [userCode, setUserCode] = useState(initialUserCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authClient.device({ query: { user_code: normaliseUserCode(userCode) } });

      if (result?.error) {
        setError(mapError(result.error.error || (result.error as any).code, result.error.status));
      } else {
        window.location.href = `/device/approve?user_code=${encodeURIComponent(normaliseUserCode(userCode))}`;
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Device Authorization</CardTitle>
        <CardDescription>
          Enter the code displayed on your device to authorize it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div aria-live="polite" aria-atomic="true">
          {error && (
            <Alert variant="destructive" className="mb-4" id="device-form-error">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="user-code" className="text-sm font-medium">
              Device Code
            </label>
            <InputOTP
              id="user-code"
              maxLength={8}
              value={userCode}
              onChange={(value) => setUserCode(value.toUpperCase())}
              autoFocus
              disabled={loading}
              containerClassName="justify-center pt-2"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={1} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={2} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={3} className="w-10 h-12 text-lg" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={4} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={5} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={6} className="w-10 h-12 text-lg" />
                <InputOTPSlot index={7} className="w-10 h-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || userCode.length < 8}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
