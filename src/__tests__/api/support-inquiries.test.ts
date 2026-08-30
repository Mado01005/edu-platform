const mockSupportInquiryCreate = jest.fn();
const mockSendSupportInquiryEmail = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/prisma', () => ({
  withPrismaRetry: (
    operation: (database: {
      supportInquiry: { create: typeof mockSupportInquiryCreate };
    }) => Promise<unknown>,
  ) => operation({ supportInquiry: { create: mockSupportInquiryCreate } }),
}));
jest.mock('@/lib/support-email', () => ({
  sendSupportInquiryEmail: mockSendSupportInquiryEmail,
}));

import { POST } from '@/app/api/support/inquiries/route';

const validBody = {
  email: ' Parent@Example.com ',
  firstName: 'Amina',
  lastName: 'Hassan',
  locale: 'ar',
  message: 'I need help choosing the right learning plan.',
  phone: '+20 155 592 0686',
  website: '',
};

function supportRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request('https://www.oqoolacademy.com/api/support/inquiries', {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.oqoolacademy.com',
      ...headers,
    },
    method: 'POST',
  });
}

describe('public support inquiry API', () => {
  beforeEach(() => {
    mockSupportInquiryCreate.mockReset();
    mockSupportInquiryCreate.mockResolvedValue({ id: 'cm12345678ABCDEFGH' });
    mockSendSupportInquiryEmail.mockReset();
    mockSendSupportInquiryEmail.mockResolvedValue({
      providerMessageId: 'email_123',
      status: 'sent',
    });
  });

  it('validates, normalizes, and stores a same-origin inquiry', async () => {
    const response = await POST(supportRequest(validBody));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      emailDelivery: 'sent',
      ok: true,
      reference: 'ABCDEFGH',
    });
    expect(mockSupportInquiryCreate).toHaveBeenCalledWith({
      data: {
        email: 'parent@example.com',
        firstName: 'Amina',
        lastName: 'Hassan',
        locale: 'ar',
        message: 'I need help choosing the right learning plan.',
        phone: '+201555920686',
      },
      select: { id: true },
    });
    expect(mockSendSupportInquiryEmail).toHaveBeenCalledWith({
      email: 'parent@example.com',
      firstName: 'Amina',
      inquiryId: 'cm12345678ABCDEFGH',
      lastName: 'Hassan',
      locale: 'ar',
      message: 'I need help choosing the right learning plan.',
      phone: '+201555920686',
      reference: 'ABCDEFGH',
    });
  });

  it('keeps the stored inquiry successful while reporting pending email delivery', async () => {
    mockSendSupportInquiryEmail.mockResolvedValueOnce({
      status: 'not_configured',
    });

    const response = await POST(supportRequest(validBody));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      emailDelivery: 'pending',
      ok: true,
      reference: 'ABCDEFGH',
    });
    expect(mockSupportInquiryCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid fields without writing', async () => {
    const response = await POST(
      supportRequest({ ...validBody, email: 'not-an-email', message: 'short' }),
    );

    expect(response.status).toBe(400);
    expect(mockSupportInquiryCreate).not.toHaveBeenCalled();
    expect(mockSendSupportInquiryEmail).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin browser submission', async () => {
    const response = await POST(
      supportRequest(validBody, { origin: 'https://phishing.example' }),
    );

    expect(response.status).toBe(403);
    expect(mockSupportInquiryCreate).not.toHaveBeenCalled();
    expect(mockSendSupportInquiryEmail).not.toHaveBeenCalled();
  });

  it('silently discards a honeypot submission', async () => {
    const response = await POST(
      supportRequest({ ...validBody, website: 'https://spam.example' }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      reference: 'RECEIVED',
    });
    expect(mockSupportInquiryCreate).not.toHaveBeenCalled();
    expect(mockSendSupportInquiryEmail).not.toHaveBeenCalled();
  });

  it('rejects an oversized request before parsing it', async () => {
    const response = await POST(
      supportRequest(validBody, { 'content-length': '16385' }),
    );

    expect(response.status).toBe(413);
    expect(mockSupportInquiryCreate).not.toHaveBeenCalled();
    expect(mockSendSupportInquiryEmail).not.toHaveBeenCalled();
  });
});
