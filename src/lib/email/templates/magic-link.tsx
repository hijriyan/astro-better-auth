import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

interface MagicLinkEmailProps {
  url: string;
  email: string;
  description?: string;
}

export function MagicLinkEmail({ url, email, description }: MagicLinkEmailProps) {
  const body = description ?? `Click the button below to sign in as <strong>${email}</strong>. This link expires in 15 minutes.`;

  return (
    <Html>
      <Head />
      <Preview>Your magic sign-in link</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ fontSize: '20px', marginBottom: '8px' }}>Sign in to your account</Heading>
          <Text
            style={{ color: '#6b7280', marginBottom: '24px' }}
            dangerouslySetInnerHTML={{ __html: body }}
          />

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button href={url} style={{ backgroundColor: '#111827', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Sign In
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
