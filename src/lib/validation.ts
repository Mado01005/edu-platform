/**
 * Input validation utilities for admin API endpoints
 */

/**
 * Validates UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates slug format (alphanumeric, hyphens, underscores)
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-_]+$/i;
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Validates URL format and ensures it belongs to allowed domains
 */
export function isValidR2Url(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    const publicBase = process.env.R2_PUBLIC_URL || '';
    
    // Check if URL belongs to R2 public URL
    if (publicBase && url.startsWith(publicBase)) {
      return true;
    }
    
    // For safety, reject URLs that don't match our R2 domain
    return false;
  } catch {
    return false;
  }
}

/**
 * Validates deletion type parameter
 */
export function isValidDeletionType(type: string): type is 'subject' | 'lesson' | 'item' {
  return ['subject', 'lesson', 'item'].includes(type);
}

/**
 * Sanitizes and validates input for delete operations
 */
export function validateDeleteInput(input: {
  type?: string;
  id?: string;
  lessonSlug?: string;
  subjectSlug?: string;
  itemId?: string;
  fileUrl?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields based on context
  if (input.type) {
    if (!isValidDeletionType(input.type)) {
      errors.push(`Invalid deletion type: ${input.type}`);
    }
    
    if (input.type === 'subject' || input.type === 'lesson' || input.type === 'item') {
      if (!input.id || !isValidUUID(input.id)) {
        errors.push(`Invalid or missing ID for type ${input.type}`);
      }
    }
  }

  if (input.lessonSlug && !isValidSlug(input.lessonSlug)) {
    errors.push('Invalid lesson slug format');
  }

  if (input.subjectSlug && !isValidSlug(input.subjectSlug)) {
    errors.push('Invalid subject slug format');
  }

  if (input.itemId && !isValidUUID(input.itemId)) {
    errors.push('Invalid item ID format');
  }

  if (input.fileUrl && !isValidR2Url(input.fileUrl)) {
    errors.push('Invalid file URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extracts R2 key from URL with validation
 */
export function extractR2Key(url: string): string | null {
  if (!isValidR2Url(url)) return null;
  
  const publicBase = process.env.R2_PUBLIC_URL || '';
  if (!publicBase) return null;
  
  try {
    let key = url.replace(publicBase, '');
    if (key.startsWith('/')) key = key.substring(1);
    key = decodeURIComponent(key);
    
    // Additional safety checks
    if (!key || key.includes('..') || key.includes('//')) {
      return null;
    }
    
    return key;
  } catch {
    return null;
  }
}