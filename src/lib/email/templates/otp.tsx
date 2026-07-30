import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

interface OtpEmailProps {
  otp: string;
  email: string;
  title?: string;
  description?: string;
  expiresInMinutes?: number;
}

export function OtpEmail({
  otp,
  email,
  title = 'Your verification code',
  description,
  expiresInMinutes = 5,
}: OtpEmailProps) {
  const body = description ?? `Use the code below for <strong>${email}</strong>. It expires in ${expiresInMinutes} minutes.`;

  return (
    <Html>
      <Head />
      <Preview>{title}: {otp}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#fff', borderRadius: '8px', padding: '32px' }}>
          <Heading style={{ fontSize: '20px', marginBottom: '8px' }}>{title}</Heading>
          <Text
            style={{ color: '#6b7280', marginBottom: '24px' }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Text style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '8px', color: '#111827', margin: '0' }}>
              {otp}
            </Text>
          </Section>
          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
            If you didn't request this code, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
