import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

interface ResetPasswordEmailProps {
  url: string;
  email: string;
  description?: string;
}

export function ResetPasswordEmail({ url, email, description }: ResetPasswordEmailProps) {
  const body = description ?? `We received a request to reset the password for <strong>${email}</strong>. Click the button below to choose a new password. This link expires in 1 hour.`;

  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ fontSize: '20px', marginBottom: '8px' }}>Reset your password</Heading>
          <Text
            style={{ color: '#6b7280', marginBottom: '24px' }}
            dangerouslySetInnerHTML={{ __html: body }}
          />

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button href={url} style={{ backgroundColor: '#111827', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Reset Password
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
            If you didn't request a password reset, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
