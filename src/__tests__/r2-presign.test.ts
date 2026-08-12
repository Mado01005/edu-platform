const mockGetSignedUrl = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import type { PutObjectCommand } from '@aws-sdk/client-s3';
import { getPresignedUploadUrl } from '@/lib/r2';

describe('R2 presigned PUT enforcement', () => {
  beforeEach(() => {
    mockGetSignedUrl.mockResolvedValue(
      'https://account.r2.cloudflarestorage.com/signed',
    );
  });

  it('signs the exact content type, content length, and expiration', async () => {
    const result = await getPresignedUploadUrl(
      'lms/teacher/lesson/random-file.pdf',
      'application/pdf',
      300,
      4_096,
    );

    expect(result).toBe('https://account.r2.cloudflarestorage.com/signed');
    const [, command, options] = mockGetSignedUrl.mock.calls[0] as [
      unknown,
      PutObjectCommand,
      { expiresIn: number; signableHeaders: Set<string> },
    ];
    expect(command.input).toEqual(
      expect.objectContaining({
        ContentLength: 4_096,
        ContentType: 'application/pdf',
        Key: 'lms/teacher/lesson/random-file.pdf',
      }),
    );
    expect(options.expiresIn).toBe(300);
    expect(options.signableHeaders).toEqual(new Set(['content-type']));
  });
});
