import { NodemailerProvider } from './providers/nodemailer';
import { ConsoleProvider } from './providers/console';
import type { EmailProvider } from './types';

// ponytail: add new provider here when needed, e.g. case 'resend': return new ResendProvider()
function createProvider(): EmailProvider {
  switch (process.env.EMAIL_BACKEND) {
    case 'smtp':
      return new NodemailerProvider();
    case 'console':
    default:
      return new ConsoleProvider();
  }
}

export const email: EmailProvider = createProvider();
