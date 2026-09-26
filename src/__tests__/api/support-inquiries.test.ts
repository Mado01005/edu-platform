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
  operatingSystem: 'iOS',
  phone: '+20 155 422 5979',
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
  let consoleLog: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockSupportInquiryCreate.mockReset();
    mockSupportInquiryCreate.mockResolvedValue({ id: 'cm12345678ABCDEFGH' });
    mockSendSupportInquiryEmail.mockReset();
    mockSendSupportInquiryEmail.mockResolvedValue({
      providerMessageId: 'email_123',
      status: 'sent',
    });
  });

  afterEach(() => {
    consoleLog.mockRestore();
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
        phone: '+201554225979',
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
      operatingSystem: 'iOS',
      phone: '+201554225979',
      reference: 'ABCDEFGH',
    });
    expect(consoleLog).toHaveBeenCalledWith('[SUPPORT_INQUIRY_RECEIVED]', {
      reference: 'ABCDEFGH',
      name: 'Amina Hassan',
      email: 'parent@example.com',
      phone: '+201554225979',
      message: validBody.message,
      operatingSystem: 'iOS',
    });
    expect(consoleLog).toHaveBeenCalledWith(
      '[SUPPORT_INQUIRY_DISPATCH_ACCEPTED]',
      { reference: 'ABCDEFGH', providerMessageId: 'email_123' },
    );
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
    expect(consoleLog).toHaveBeenCalledWith(
      '[SUPPORT_INQUIRY_RECEIVED]',
      expect.objectContaining({ reference: 'ABCDEFGH', message: validBody.message }),
    );
  });

  it('keeps the stored inquiry successful when Resend rejects the sender', async () => {
    mockSendSupportInquiryEmail.mockResolvedValueOnce({ status: 'failed' });

    const response = await POST(supportRequest(validBody));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      emailDelivery: 'pending',
      ok: true,
      reference: 'ABCDEFGH',
    });
    expect(mockSupportInquiryCreate).toHaveBeenCalledTimes(1);
    expect(mockSupportInquiryCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mockSendSupportInquiryEmail.mock.invocationCallOrder[0] ?? 0,
    );
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
