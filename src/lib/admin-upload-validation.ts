const REGULAR_ADMIN_MAX_BYTES = 500 * 1024 * 1024;
const SUPER_ADMIN_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_PARTS = 10_000;

const BLOCKED_EXTENSIONS = new Set([
  'bat',
  'cjs',
  'cmd',
  'dll',
  'exe',
  'htm',
  'html',
  'js',
  'mjs',
  'php',
  'sh',
  'svg',
]);

const BLOCKED_CONTENT_TYPES = new Set([
  'application/javascript',
  'application/x-httpd-php',
  'image/svg+xml',
  'text/html',
  'text/javascript',
]);

type UploadMetadata = {
  fileName?: unknown;
  relativeFilePath?: unknown;
  subjectSlug?: unknown;
  lessonSlug?: unknown;
  contentType?: unknown;
  subfolder?: unknown;
  size?: unknown;
};

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${label} is invalid.`);
  }
  return value.trim();
}
function sanitizeSlug(value: unknown, label: string): string {
  const slug = requiredText(value, label, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return slug;
}

function sanitizePath(value: unknown, fallback: string, label: string): string {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  if (raw.length > 1_024 || raw.startsWith('/') || raw.includes('\\')) {
    throw new Error(`${label} is invalid.`);
  }

  const segments = raw.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`${label} contains an invalid path segment.`);
  }

  const sanitized = segments
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/');

  if (!sanitized || sanitized.includes('..')) {
    throw new Error(`${label} is invalid.`);
  }
  return sanitized;
}

function validateFileType(fileName: string, contentType: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.has(extension) || BLOCKED_CONTENT_TYPES.has(contentType.toLowerCase())) {
    throw new Error('This file type is not permitted.');
  }
}

export function validateAdminUploadMetadata(input: UploadMetadata, isSuperAdmin: boolean) {
  const fileName = requiredText(input.fileName, 'File name', 255);
  const subjectSlug = sanitizeSlug(input.subjectSlug, 'Subject slug');
  const lessonSlug = sanitizeSlug(input.lessonSlug, 'Lesson slug');
  const contentType =
    typeof input.contentType === 'string' && input.contentType.length <= 255
      ? input.contentType.trim() || 'application/octet-stream'
      : 'application/octet-stream';
  const size = Number(input.size);
  const maxBytes = isSuperAdmin ? SUPER_ADMIN_MAX_BYTES : REGULAR_ADMIN_MAX_BYTES;

  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
    throw new Error(`File size must be between 1 byte and ${isSuperAdmin ? '5 GB' : '500 MB'}.`);
  }

  validateFileType(fileName, contentType);

  const relativePath = sanitizePath(input.relativeFilePath, fileName, 'Relative file path');
  const subfolder =
    typeof input.subfolder === 'string' && input.subfolder.trim()
      ? sanitizePath(input.subfolder, '', 'Subfolder')
      : '';
  const pathSegments = relativePath.split('/');
  const finalIndex = pathSegments.length - 1;
  const originalName = pathSegments[finalIndex];
  const extensionIndex = originalName.lastIndexOf('.');
  const normalizedName =
    extensionIndex > 0
      ? `${originalName.slice(0, extensionIndex)}${originalName.slice(extensionIndex).toLowerCase()}`
      : originalName;
  pathSegments[finalIndex] = `${Date.now()}_${normalizedName}`;

  const storagePath = [
    subjectSlug,
    lessonSlug,
    ...(subfolder ? subfolder.split('/') : []),
    ...pathSegments,
  ].join('/');

  return { contentType, size, storagePath };
}

export function validateMultipartPartCount(totalParts: unknown, size: number) {
  const count = Number(totalParts);
  if (!Number.isInteger(count) || count < 1 || count > MAX_PARTS) {
    throw new Error('Multipart part count is invalid.');
  }

  if (count > size) {
    throw new Error('Multipart part count exceeds the file size.');
  }
  return count;
}

export function isSafeR2Key(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 2 &&
    value.length <= 1_024 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  );
}
