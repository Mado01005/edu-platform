const mockResendSend = jest.fn();
const mockResendConstructor = jest.fn(() => ({
  emails: { send: mockResendSend },
}));

jest.mock('server-only', () => ({}));
jest.mock('resend', () => ({ Resend: mockResendConstructor }));

import { sendSupportInquiryEmail } from '@/lib/support-email';

const emailInput = {
  email: 'parent@example.com',
  firstName: 'Amina',
  inquiryId: 'cm12345678ABCDEFGH',
  lastName: 'Hassan',
  locale: 'ar' as const,
  message: 'I need help choosing the right learning plan.',
  phone: '+201555920686',
  reference: 'ABCDEFGH',
};

describe('support inquiry email delivery', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.SUPPORT_EMAIL_FROM;
  let consoleWarn: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SUPPORT_EMAIL_FROM;
    mockResendConstructor.mockClear();
    mockResendSend.mockReset();
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarn.mockRestore();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;

    if (originalFrom === undefined) delete process.env.SUPPORT_EMAIL_FROM;
    else process.env.SUPPORT_EMAIL_FROM = originalFrom;
  });

  it('logs a non-PII fallback and reports pending when Resend is not configured', async () => {
    await expect(sendSupportInquiryEmail(emailInput)).resolves.toEqual({
      status: 'not_configured',
    });

    expect(mockResendConstructor).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[SUPPORT_EMAIL_NOT_CONFIGURED]',
      {
        reason: 'missing_resend_api_key',
        reference: 'ABCDEFGH',
      },
    );
  });

  it('sends every submitted detail to the fixed support recipient', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockResendSend.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    });

    await expect(sendSupportInquiryEmail(emailInput)).resolves.toEqual({
      providerMessageId: 'email_123',
      status: 'sent',
    });

    expect(mockResendConstructor).toHaveBeenCalledWith('re_test_key');
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Oqool Academy Support <support@oqoolacademy.com>',
        replyTo: 'parent@example.com',
        subject: 'New Oqool support inquiry — ABCDEFGH',
        text: expect.stringContaining('Phone: +201555920686'),
        to: ['support@oqoolacademy.com'],
      }),
      { idempotencyKey: 'support-inquiry/cm12345678ABCDEFGH' },
    );
    const payload = mockResendSend.mock.calls[0]?.[0];
    expect(payload?.text).toContain('First name: Amina');
    expect(payload?.text).toContain('Last name: Hassan');
    expect(payload?.text).toContain('Email: parent@example.com');
    expect(payload?.text).toContain(emailInput.message);
  });

  it('reports a provider failure without throwing away the stored inquiry', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockResendSend.mockResolvedValue({
      data: null,
      error: { message: 'Domain is not verified.', name: 'validation_error' },
    });

    await expect(sendSupportInquiryEmail(emailInput)).resolves.toEqual({
      status: 'failed',
    });
    expect(consoleWarn).toHaveBeenCalledWith(
      '[SUPPORT_EMAIL_DISPATCH_PENDING]',
      {
        code: 'validation_error',
        reason: 'provider_rejected',
        reference: 'ABCDEFGH',
      },
    );
    const serializedWarnings = JSON.stringify(consoleWarn.mock.calls);
    expect(serializedWarnings).not.toContain(emailInput.email);
    expect(serializedWarnings).not.toContain(emailInput.message);
    expect(serializedWarnings).not.toContain(emailInput.phone);
  });
});
