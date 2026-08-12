export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export type EmailProviderName = 'resend' | 'nodemailer';
