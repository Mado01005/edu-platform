import 'server-only';

import { z } from 'zod';
import { normalizePhoneNumber } from '@/lib/phone';
import { withPrismaRetry } from '@/lib/prisma';

const normalizedPhoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .transform((value, context) => {
    const normalized = normalizePhoneNumber(value);

    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid phone number with its country code.',
      });
      return z.NEVER;
    }

    return normalized;
  });

export const publicSupportInquirySchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  locale: z.enum(['en', 'ar']),
  message: z.string().trim().min(10).max(4_000),
  phone: normalizedPhoneSchema,
  website: z.string().max(200).optional().default(''),
});

export type PublicSupportInquiryInput = z.infer<
  typeof publicSupportInquirySchema
>;

export async function createPublicSupportInquiry(
  input: PublicSupportInquiryInput,
) {
  return withPrismaRetry((database) =>
    database.supportInquiry.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        locale: input.locale,
        message: input.message,
        phone: input.phone,
      },
      select: { id: true },
    }),
  );
}

export async function getRecentPublicSupportInquiries(limit = 12) {
  return withPrismaRetry((database) =>
    database.supportInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        locale: true,
        message: true,
        phone: true,
        status: true,
      },
      take: Math.max(1, Math.min(limit, 50)),
    }),
  );
}
