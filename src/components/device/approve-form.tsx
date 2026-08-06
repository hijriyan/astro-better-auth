import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { CircleAlert } from 'lucide-react';

type View = 'pending' | 'approved' | 'denied' | 'error' | 'invalid';

interface ApproveFormProps {
  userCode: string;
}

function mapError(code: string | undefined): string {
  const errCode = code?.toUpperCase();
  if (errCode === 'ACCESS_DENIED') return 'Authorization was denied.';
  if (
    errCode === 'INVALID_DEVICE_CODE' ||
    errCode === 'INVALID_REQUEST' ||
    errCode === 'EXPIRED_TOKEN' ||
    errCode === 'UNAUTHORIZED' ||
    errCode === 'DEVICE_CODE_ALREADY_PROCESSED' ||
    errCode === 'INVALID_GRANT'
  ) return 'This code is no longer valid.';
  return 'An unexpected error occurred. Please try again.';
}

export function ApproveForm({ userCode }: ApproveFormProps) {
  const [view, setView] = useState<View>(userCode ? 'pending' : 'invalid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (view === 'invalid') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Device Authorization</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Invalid Request</AlertTitle>
            <AlertDescription>This request is invalid or has expired.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.device.approve({ userCode });
      if (result?.error) {
        setError(mapError(result.error.error || (result.error as any).code));
      } else {
        setView('approved');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.device.deny({ userCode });
      if (result?.error) {
        setError(mapError(result.error.error || (result.error as any).code));
      } else {
        setView('denied');
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
        <CardTitle>Device Authorization Request</CardTitle>
        <CardDescription>
          A device is requesting access to your account. Review the code above and approve or deny.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium">
          Authorization code: <span className="font-mono tracking-widest">{userCode}</span>
        </p>

        {error && (
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {view === 'approved' && (
          <Alert>
            <AlertTitle>Access Granted</AlertTitle>
            <AlertDescription>Access granted. The device has been authorized.</AlertDescription>
          </Alert>
        )}

        {view === 'denied' && (
          <Alert>
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>Access denied. The device will not receive access.</AlertDescription>
          </Alert>
        )}

      </CardContent>
      {view === 'pending' && (
        <CardFooter className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Approve'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDeny}
            disabled={loading}
          >
            Deny
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
