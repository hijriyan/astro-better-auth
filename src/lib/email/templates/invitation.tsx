import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

interface InvitationEmailProps {
  url: string;
  email: string;
  inviterName?: string;
  organizationName?: string;
}

export function InvitationEmail({ url, email, inviterName, organizationName }: InvitationEmailProps) {
  const orgText = organizationName ? `the <strong>${organizationName}</strong> organization` : 'our organization';
  const inviterText = inviterName ? ` by <strong>${inviterName}</strong>` : '';
  const body = `You have been invited to join ${orgText}${inviterText}. Click the button below to accept the invitation and sign in.`;

  return (
    <Html>
      <Head />
      <Preview>You have been invited to join an organization</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ fontSize: '20px', marginBottom: '8px' }}>Organization Invitation</Heading>
          <Text
            style={{ color: '#6b7280', marginBottom: '24px' }}
            dangerouslySetInnerHTML={{ __html: body }}
          />

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button href={url} style={{ backgroundColor: '#111827', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
            If you didn't expect this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
