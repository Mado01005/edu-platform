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
  operatingSystem: 'iOS' as const,
  phone: '+201554225979',
  reference: 'ABCDEFGH',
};

describe('support inquiry email delivery', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.SUPPORT_EMAIL_FROM;
  const originalInbox = process.env.SUPPORT_INBOX_EMAIL;
  let consoleError: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SUPPORT_EMAIL_FROM;
    delete process.env.SUPPORT_INBOX_EMAIL;
    mockResendConstructor.mockClear();
    mockResendSend.mockReset();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;

    if (originalFrom === undefined) delete process.env.SUPPORT_EMAIL_FROM;
    else process.env.SUPPORT_EMAIL_FROM = originalFrom;

    if (originalInbox === undefined) delete process.env.SUPPORT_INBOX_EMAIL;
    else process.env.SUPPORT_INBOX_EMAIL = originalInbox;
  });

  it('logs the missing credential and reports pending when Resend is not configured', async () => {
    await expect(sendSupportInquiryEmail(emailInput)).resolves.toEqual({
      status: 'not_configured',
    });

    expect(mockResendConstructor).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[SUPPORT_INQUIRY_DISPATCH_ERROR]',
      expect.objectContaining({ message: 'RESEND_API_KEY is missing' }),
      { reference: 'ABCDEFGH' },
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
        from: 'Nodrek Support <support@nodrekhub.com>',
        replyTo: 'parent@example.com',
        subject: 'New Nodrek support inquiry — ABCDEFGH',
        text: expect.stringContaining('Phone: +201554225979'),
        to: ['support@nodrekhub.com'],
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
    expect(consoleError).toHaveBeenCalledWith(
      '[SUPPORT_INQUIRY_DISPATCH_ERROR]',
      { message: 'Domain is not verified.', name: 'validation_error' },
      { reference: 'ABCDEFGH' },
    );
  });

  it('honors an explicitly configured support inbox', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.SUPPORT_INBOX_EMAIL = 'other-inbox@example.com';
    mockResendSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    await sendSupportInquiryEmail(emailInput);

    expect(mockResendSend.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ to: ['other-inbox@example.com'] }),
    );
  });

  it('logs the exact provider exception and reports pending', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const failure = new Error('SMTP auth failure');
    mockResendSend.mockRejectedValue(failure);

    await expect(sendSupportInquiryEmail(emailInput)).resolves.toEqual({
      status: 'failed',
    });
    expect(consoleError).toHaveBeenCalledWith(
      '[SUPPORT_INQUIRY_DISPATCH_ERROR]',
      failure,
      { reference: 'ABCDEFGH' },
    );
  });
});
