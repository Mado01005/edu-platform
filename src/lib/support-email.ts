import 'server-only';

import { Resend } from 'resend';
import type { Locale } from '@/lib/landing/types';
import { siteConfig } from '@/lib/siteConfig';

export type SupportEmailDeliveryResult =
  | { status: 'sent'; providerMessageId: string }
  | { status: 'not_configured' }
  | { status: 'failed' };

export type SupportEmailInput = {
  email: string;
  firstName: string;
  inquiryId: string;
  lastName: string;
  locale: Locale;
  message: string;
  phone: string;
  reference: string;
};

const DEFAULT_SUPPORT_FROM =
  'Oqool Academy Support <support@oqoolacademy.com>';

function supportEmailText(input: SupportEmailInput) {
  return [
    'A new support inquiry was submitted through Oqool Academy.',
    '',
    `Reference: ${input.reference}`,
    `Submitted language: ${input.locale}`,
    `First name: ${input.firstName}`,
    `Last name: ${input.lastName}`,
    `Phone: ${input.phone}`,
    `Email: ${input.email}`,
    '',
    'Message:',
    input.message,
    '',
    'Reply directly to this email to contact the parent.',
  ].join('\n');
}

export async function sendSupportInquiryEmail(
  input: SupportEmailInput,
): Promise<SupportEmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.warn('[SUPPORT_EMAIL_NOT_CONFIGURED]', {
      reason: 'missing_resend_api_key',
      reference: input.reference,
    });
    return { status: 'not_configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: process.env.SUPPORT_EMAIL_FROM?.trim() || DEFAULT_SUPPORT_FROM,
        replyTo: input.email,
        subject: `New Oqool support inquiry — ${input.reference}`,
        tags: [
          { name: 'source', value: 'public-support-form' },
          { name: 'locale', value: input.locale },
        ],
        text: supportEmailText(input),
        to: [siteConfig.support.email],
      },
      { idempotencyKey: `support-inquiry/${input.inquiryId}` },
    );

    if (error || !data?.id) {
      console.warn('[SUPPORT_EMAIL_DISPATCH_PENDING]', {
        code: error?.name,
        reason: error ? 'provider_rejected' : 'missing_provider_message_id',
        reference: input.reference,
      });
      return { status: 'failed' };
    }

    return { providerMessageId: data.id, status: 'sent' };
  } catch {
    console.warn('[SUPPORT_EMAIL_DISPATCH_PENDING]', {
      reason: 'provider_exception',
      reference: input.reference,
    });
    return { status: 'failed' };
  }
}
