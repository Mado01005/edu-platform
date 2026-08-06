export const ASSIGNMENT_SUBMISSION_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_ASSIGNMENT_SUBMISSION_BYTES = 25 * 1024 * 1024;
export const ASSIGNMENT_SUBMISSION_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

export function assignmentFileType(fileName: string, contentType: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (contentType === 'application/pdf' && extension === 'pdf') return 'PDF';
  if (contentType === 'image/jpeg' && (extension === 'jpg' || extension === 'jpeg')) return 'JPG';
  if (contentType === 'image/png' && extension === 'png') return 'PNG';
  return null;
}
