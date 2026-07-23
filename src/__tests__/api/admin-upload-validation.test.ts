import {
  isSafeR2Key,
  validateAdminUploadMetadata,
  validateMultipartPartCount,
} from '@/lib/admin-upload-validation';

describe('legacy admin upload validation', () => {
  const validUpload = {
    fileName: 'lecture.pdf',
    relativeFilePath: 'week-1/lecture.pdf',
    subjectSlug: 'physics',
    lessonSlug: 'mechanics',
    contentType: 'application/pdf',
    size: 1_024,
  };

  it('accepts safe educational assets and builds a scoped R2 key', () => {
    const result = validateAdminUploadMetadata(validUpload, false);

    expect(result.storagePath).toMatch(
      /^physics\/mechanics\/week-1\/\d+_lecture\.pdf$/,
    );
  });

  it('rejects traversal paths, active content, and oversized files', () => {
    expect(() =>
      validateAdminUploadMetadata(
        { ...validUpload, relativeFilePath: '../lecture.pdf' },
        false,
      ),
    ).toThrow(/path segment/);
    expect(() =>
      validateAdminUploadMetadata(
        {
          ...validUpload,
          fileName: 'payload.html',
          relativeFilePath: 'payload.html',
          contentType: 'text/html',
        },
        false,
      ),
    ).toThrow(/not permitted/);
    expect(() =>
      validateAdminUploadMetadata(
        { ...validUpload, size: 500 * 1024 * 1024 + 1 },
        false,
      ),
    ).toThrow(/500 MB/);
  });

  it('validates multipart counts and R2 keys', () => {
    expect(validateMultipartPartCount(3, 30)).toBe(3);
    expect(() => validateMultipartPartCount(0, 30)).toThrow();
    expect(isSafeR2Key('physics/mechanics/file.pdf')).toBe(true);
    expect(isSafeR2Key('physics/../file.pdf')).toBe(false);
  });
});
