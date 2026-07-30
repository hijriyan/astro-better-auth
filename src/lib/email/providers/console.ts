import { render } from '@react-email/render';
import type { EmailProvider, SendEmailOptions } from '../types';

export class ConsoleProvider implements EmailProvider {
  async send({ to, subject, react }: SendEmailOptions): Promise<void> {
    const text = await render(react, { plainText: true });
    console.log('[EMAIL] =====================================');
    console.log('[EMAIL] To:', to);
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] Body:', text);
    console.log('[EMAIL] =====================================');
  }
}
