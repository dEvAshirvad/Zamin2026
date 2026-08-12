import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import nodemailer from 'nodemailer';

import { config } from '@/configs/env';
import logger from '@/configs/logger/winston';

import type { SendEmailOptions } from './types';

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null
  = null;

function getTransporter() {
  const { smtp } = config.email;
  if (!smtp.host || !smtp.user || !smtp.password) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    });
  }

  return transporter;
}

export function isNodemailerConfigured(): boolean {
  const { smtp } = config.email;
  return Boolean(smtp.host?.trim() && smtp.user?.trim() && smtp.password?.trim());
}

export async function sendViaNodemailer(
  options: SendEmailOptions,
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    throw new Error(
      'SMTP is not configured (need SMTP_HOST, SMTP_USER, SMTP_PASSWORD)',
    );
  }

  const from
    = config.email.fromFormatted
      ?? config.email.resendFromEmail
      ?? 'projectZamin <noreply@projectzamin.local>';

  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
  catch (error) {
    logger.error('Nodemailer send failed', { error, to: options.to });
    throw error;
  }
}
