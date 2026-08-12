import { Resend } from 'resend';

import { config } from '@/configs/env';
import logger from '@/configs/logger/winston';

import type { SendEmailOptions } from './types';

let client: Resend | null = null;

function getResend(): Resend | null {
  if (!config.email.resendApiKey) {
    return null;
  }
  if (!client) {
    client = new Resend(config.email.resendApiKey);
  }
  return client;
}

export function isResendConfigured(): boolean {
  return Boolean(config.email.resendApiKey?.trim());
}

export async function sendViaResend(options: SendEmailOptions): Promise<void> {
  const resend = getResend();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const from
    = config.email.resendFromEmail
      ?? config.email.fromFormatted
      ?? 'Simankan <noreply@projectzamin.local>';

  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    logger.error('Resend send failed', { error, to: options.to });
    throw error;
  }
}
