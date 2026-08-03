import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type InvitationData = NonNullable<Awaited<ReturnType<typeof authClient.organization.getInvitation>>['data']>;

export function AcceptInvitationClient({ invitationId }: { invitationId: string }) {
  const [status, setStatus] = useState<'fetching' | 'pending' | 'processing' | 'success' | 'error'>('fetching');
  const [errorMsg, setErrorMsg] = useState('');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const result = await authClient.organization.getInvitation({
          query: { id: invitationId },
        });
        if (result.error) {
          setStatus('error');
          setErrorMsg(result.error.message || 'Failed to fetch invitation details.');
        } else {
          setInvitation(result.data);
          setStatus('pending');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('An unexpected error occurred while fetching the invitation.');
      }
    }
    fetchInvitation();
  }, [invitationId]);

  const handleAccept = async () => {
    setStatus('processing');
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        setStatus('error');
        setErrorMsg(result.error.message || 'Failed to accept invitation.');
      } else {
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('An unexpected error occurred.');
    }
  };

  const handleReject = async () => {
    setStatus('processing');
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) {
        setStatus('error');
        setErrorMsg(result.error.message || 'Failed to reject invitation.');
      } else {
        setStatus('error');
        setErrorMsg('Invitation declined. You can now leave this page.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('An unexpected error occurred.');
    }
  };

  // Extract relevant info with fallbacks based on typical Better Auth structures
  const orgName = invitation?.organizationName || invitation?.organization?.name || 'an organization';
  const inviterEmail = invitation?.inviterEmail || invitation?.inviter?.email || 'Someone';

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Organization Invitation</CardTitle>
        <CardDescription>
          {status === 'fetching' && 'Loading invitation details...'}
          {status === 'pending' && 'You have been invited to join an organization.'}
          {status === 'processing' && 'Please wait...'}
          {status === 'success' && 'Welcome to the team!'}
          {status === 'error' && 'Something went wrong.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'fetching' || status === 'processing' ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {status === 'pending' && invitation && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2 bg-muted/50 p-6 rounded-lg border">
              <div className="text-muted-foreground text-sm">
                <strong>{inviterEmail}</strong> has invited you to join
              </div>
              <div className="text-2xl font-bold">{orgName}</div>
              {invitation.role && (
                <div className="pt-2">
                  <Badge variant="secondary" className="capitalize">
                    Role: {invitation.role}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4 py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-center font-medium">Invitation accepted successfully.</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4 py-6">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
            </div>
            <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}
      </CardContent>
      {status === 'pending' && (
        <CardFooter className="flex gap-4 w-full">
          <Button variant="outline" className="flex-1" onClick={handleReject}>
            Decline
          </Button>
          <Button className="flex-1" onClick={handleAccept}>
            Accept Invitation
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
