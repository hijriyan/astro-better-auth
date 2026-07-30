import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

interface VerifyEmailProps {
  url: string;
  email: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  preview?: string;
}

export function VerifyEmail({
  url,
  email,
  title = 'Verify your email',
  description,
  buttonLabel = 'Verify Email',
  preview,
}: VerifyEmailProps) {
  const body = description ?? `Thanks for signing up! Please verify <strong>${email}</strong> to activate your account.`;

  return (
    <Html>
      <Head />
      <Preview>{preview ?? title}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ fontSize: '20px', marginBottom: '8px' }}>{title}</Heading>
          <Text
            style={{ color: '#6b7280', marginBottom: '24px' }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button href={url} style={{ backgroundColor: '#111827', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              {buttonLabel}
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
            If you didn't request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
