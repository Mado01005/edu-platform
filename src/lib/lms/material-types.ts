import { STANDARD_MAX_UPLOAD_BYTES } from '@/lib/lms/upload-validation';

export const MAX_MATERIAL_UPLOAD_BYTES = STANDARD_MAX_UPLOAD_BYTES;

export const MATERIAL_FILE_TYPES = [
  'PDF',
  'DOCX',
  'SLIDES',
  'WORKSHEET',
] as const;

export type MaterialFileType = (typeof MATERIAL_FILE_TYPES)[number];

type MaterialRule = {
  extensions: readonly string[];
  fileType: MaterialFileType;
  mimeTypes: readonly string[];
};

const MATERIAL_RULES: readonly MaterialRule[] = [
  {
    extensions: ['pdf'],
    fileType: 'PDF',
    mimeTypes: ['application/pdf'],
  },
  {
    extensions: ['docx'],
    fileType: 'DOCX',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    extensions: ['pptx'],
    fileType: 'SLIDES',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  {
    extensions: ['xlsx'],
    fileType: 'WORKSHEET',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
];

export const MATERIAL_ACCEPT = MATERIAL_RULES.flatMap((rule) => [
  ...rule.mimeTypes,
  ...rule.extensions.map((extension) => `.${extension}`),
]).join(',');

export function getMaterialFileType(
  fileName: string,
  contentType: string,
): MaterialFileType | null {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const normalizedContentType = contentType.toLowerCase();
  const rule = MATERIAL_RULES.find((candidate) =>
    candidate.extensions.includes(extension),
  );

  if (!rule) return null;

  return rule.mimeTypes.includes(normalizedContentType)
    ? rule.fileType
    : null;
}

export function formatMaterialFileSize(fileSize: number | null) {
  if (!fileSize) return 'File';
  if (fileSize < 1024 * 1024) return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}
