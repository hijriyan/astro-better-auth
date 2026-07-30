import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import type { EmailProvider, SendEmailOptions } from './types';

export class NodemailerProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async send({ to, subject, react }: SendEmailOptions): Promise<void> {
    const html = await render(react);
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  }
}
