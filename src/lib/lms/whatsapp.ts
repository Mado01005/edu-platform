import 'server-only';

import { getPrisma } from '@/lib/prisma';

const WEBHOOK_TIMEOUT_MS = 8_000;

export async function dispatchPaymentWhatsApp(paymentId: string) {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  const dispatches = await getPrisma().whatsAppDispatch.findMany({
    where: { paymentId, status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 } },
    select: { id: true, message: true, phoneNumber: true },
  });

  await Promise.all(dispatches.map(async (dispatch) => {
    if (!webhookUrl) {
      await getPrisma().whatsAppDispatch.update({
        where: { id: dispatch.id },
        data: {
          attempts: { increment: 1 },
          lastError: 'WHATSAPP_WEBHOOK_URL is not configured.',
          status: 'FAILED',
        },
      });
      return;
    }
    try {
      const response = await fetch(webhookUrl, {
        body: JSON.stringify({
          event: 'oqool.payment.approved',
          message: dispatch.message,
          paymentId,
          phoneNumber: dispatch.phoneNumber,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
        },
        method: 'POST',
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}.`);
      await getPrisma().whatsAppDispatch.update({
        where: { id: dispatch.id },
        data: {
          attempts: { increment: 1 },
          lastError: null,
          sentAt: new Date(),
          status: 'SENT',
        },
      });
    } catch (error) {
      await getPrisma().whatsAppDispatch.update({
        where: { id: dispatch.id },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Webhook dispatch failed.',
          status: 'FAILED',
        },
      });
    }
  }));
}
