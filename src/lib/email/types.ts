import type { ReactElement } from 'react';

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}
