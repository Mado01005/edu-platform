export const MAX_MATERIAL_UPLOAD_BYTES = 100 * 1024 * 1024;

export const MATERIAL_FILE_TYPES = [
  'PDF',
  'DOC',
  'DOCX',
  'SLIDES',
  'ZIP',
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
    extensions: ['doc'],
    fileType: 'DOC',
    mimeTypes: ['application/msword'],
  },
  {
    extensions: ['docx'],
    fileType: 'DOCX',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    extensions: ['ppt'],
    fileType: 'SLIDES',
    mimeTypes: ['application/vnd.ms-powerpoint'],
  },
  {
    extensions: ['pptx'],
    fileType: 'SLIDES',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  {
    extensions: ['xls'],
    fileType: 'WORKSHEET',
    mimeTypes: ['application/vnd.ms-excel'],
  },
  {
    extensions: ['xlsx'],
    fileType: 'WORKSHEET',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  {
    extensions: ['zip'],
    fileType: 'ZIP',
    mimeTypes: ['application/zip', 'application/x-zip-compressed'],
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

  const browserDidNotDetectType =
    !normalizedContentType || normalizedContentType === 'application/octet-stream';

  return browserDidNotDetectType || rule.mimeTypes.includes(normalizedContentType)
    ? rule.fileType
    : null;
}

export function formatMaterialFileSize(fileSize: number | null) {
  if (!fileSize) return 'File';
  if (fileSize < 1024 * 1024) return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}
