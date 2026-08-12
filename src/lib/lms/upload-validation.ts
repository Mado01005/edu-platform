const MEBIBYTE = 1024 * 1024;

export const STANDARD_MAX_UPLOAD_BYTES = 50 * MEBIBYTE;
export const VIDEO_MAX_UPLOAD_BYTES = 500 * MEBIBYTE;
export const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 5 * 60;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.pptx',
  '.docx',
  '.xlsx',
  '.mp4',
  '.png',
  '.jpg',
] as const;

export type AllowedUploadExtension =
  (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

type UploadRule = {
  contentType: string;
  maximumBytes: number;
};

const UPLOAD_RULES: Record<AllowedUploadExtension, UploadRule> = {
  '.pdf': {
    contentType: 'application/pdf',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
  '.pptx': {
    contentType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
  '.docx': {
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
  '.xlsx': {
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
  '.mp4': {
    contentType: 'video/mp4',
    maximumBytes: VIDEO_MAX_UPLOAD_BYTES,
  },
  '.png': {
    contentType: 'image/png',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
  '.jpg': {
    contentType: 'image/jpeg',
    maximumBytes: STANDARD_MAX_UPLOAD_BYTES,
  },
};

const BLOCKED_FILE_NAME_EXTENSION =
  /\.(?:exe|bat|sh|php|js|html|svg)(?:\.|$)/i;

type UploadValidationResult =
  | {
      ok: true;
      value: {
        contentType: string;
        extension: AllowedUploadExtension;
        maximumBytes: number;
      };
    }
  | {
      error: string;
      ok: false;
      status: 413 | 415;
    };

function readExtension(fileName: string): string {
  const trimmedName = fileName.trim();
  const lastDot = trimmedName.lastIndexOf('.');
  return lastDot >= 0 ? trimmedName.slice(lastDot).toLowerCase() : '';
}

export function validateUploadFile(
  fileName: string,
  declaredContentType: string,
  size: number,
): UploadValidationResult {
  if (BLOCKED_FILE_NAME_EXTENSION.test(fileName)) {
    return {
      error: 'Executable and script file names are not allowed.',
      ok: false,
      status: 415,
    };
  }

  const extension = readExtension(fileName);
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension as AllowedUploadExtension)) {
    return {
      error: 'Only PDF, PPTX, DOCX, XLSX, MP4, PNG, and JPG files are allowed.',
      ok: false,
      status: 415,
    };
  }

  const typedExtension = extension as AllowedUploadExtension;
  const rule = UPLOAD_RULES[typedExtension];
  const contentType = declaredContentType.trim().toLowerCase();

  if (contentType !== rule.contentType) {
    return {
      error: 'The file extension does not match its declared content type.',
      ok: false,
      status: 415,
    };
  }

  if (size <= 0 || size > rule.maximumBytes) {
    return {
      error:
        typedExtension === '.mp4'
          ? 'Videos must be larger than 0 bytes and no larger than 500 MiB.'
          : 'Documents and images must be larger than 0 bytes and no larger than 50 MiB.',
      ok: false,
      status: 413,
    };
  }

  return {
    ok: true,
    value: {
      contentType: rule.contentType,
      extension: typedExtension,
      maximumBytes: rule.maximumBytes,
    },
  };
}

export function sanitizeUploadFileStem(fileName: string) {
  const extension = readExtension(fileName);
  const withoutExtension = extension
    ? fileName.trim().slice(0, -extension.length)
    : fileName.trim();
  const normalized = withoutExtension
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toLowerCase();

  return (normalized || 'upload').slice(0, 80);
}
