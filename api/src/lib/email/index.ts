import { config } from '@/configs/env';
import logger from '@/configs/logger/winston';

import type { EmailProviderName, SendEmailOptions } from './types';

import { isNodemailerConfigured, sendViaNodemailer } from './nodemailer';
import { isResendConfigured, sendViaResend } from './resend';

export type { SendEmailOptions } from './types';

function resolveProvider(): EmailProviderName | null {
  const mode = config.email.provider;

  if (mode === 'resend') {
    return isResendConfigured() ? 'resend' : null;
  }

  if (mode === 'nodemailer') {
    return isNodemailerConfigured() ? 'nodemailer' : null;
  }

  // auto: prefer explicit Resend key, otherwise SMTP
  if (isResendConfigured()) {
    return 'resend';
  }
  if (isNodemailerConfigured()) {
    return 'nodemailer';
  }
  return null;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = resolveProvider();

  if (!provider) {
    logger.info('Email skipped (no provider configured)', {
      mode: config.email.provider,
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    if (provider === 'resend') {
      await sendViaResend(options);
    }
    else {
      await sendViaNodemailer(options);
    }
    logger.info('Email sent', { provider, to: options.to, subject: options.subject });
  }
  catch (error) {
    // Auth flows must not fail because of mail delivery in non-production.
    if (config.nodeEnv === 'production') {
      throw error;
    }
    logger.error('Email send failed (non-production: continuing)', {
      provider,
      error,
      to: options.to,
    });
  }
}
