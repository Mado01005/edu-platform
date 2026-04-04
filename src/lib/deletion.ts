/**
 * Common utilities for deletion operations
 */

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Object } from '@/lib/r2';
import { validateDeleteInput, extractR2Key, isValidUUID, isValidSlug } from '@/lib/validation';
import { ApiErrors, createSuccessResponse, handleDatabaseError } from '@/lib/errors';

/**
 * Deletion options configuration
 */
export interface DeletionOptions {
  /** Type of deletion: 'subject', 'lesson', 'item' */
  type: 'subject' | 'lesson' | 'item';
  /** Identifier for the resource */
  id: string;
  /** Optional file URL for R2 cleanup */
  fileUrl?: string;
  /** User session for authorization */
  session?: any;
}

/**
 * Common deletion handler with proper error handling and R2 cleanup
 */
export async function handleDeletion(options: DeletionOptions): Promise<Response> {
  try {
    // 1. Authorization check
    const session = options.session || await auth();
    if (!session || !session.user?.isAdmin) {
      return ApiErrors.UNAUTHORIZED();
    }

    // 2. Input validation
    const validation = validateDeleteInput(options);
    if (!validation.isValid) {
      return ApiErrors.INVALID_INPUT(validation.errors);
    }

    const { type, id, fileUrl } = options;

    // 3. Determine table based on type
    let table: string;
    switch (type) {
      case 'subject':
        table = 'subjects';
        break;
      case 'lesson':
        table = 'lessons';
        break;
      case 'item':
        table = 'content_items';
        break;
      default:
        return ApiErrors.INVALID_INPUT(['Invalid deletion type']);
    }

    // 4. Delete from database first (atomic operation)
    const { error: dbError } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (dbError) {
      return handleDatabaseError(dbError);
    }

    // 5. Handle R2 cleanup based on deletion type
    await handleR2Cleanup(type, id, fileUrl);

    // 6. Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: `${type.toUpperCase()}_DELETED`,
      details: { id, type, fileUrl },
    });

    // 7. Return success response
    return createSuccessResponse({ success: true });

  } catch (error: unknown) {
    console.error(`Deletion error (${options.type}):`, error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * Handle R2 cleanup based on deletion type
 */
async function handleR2Cleanup(type: 'subject' | 'lesson' | 'item', id: string, fileUrl?: string): Promise<void> {
  // For item deletions with explicit file URL
  if (type === 'item' && fileUrl) {
    const r2Key = extractR2Key(fileUrl);
    if (r2Key) {
      try {
        await deleteR2Object(r2Key);
      } catch (r2Err) {
        console.warn(`[Delete] R2 cleanup failed for key "${r2Key}":`, r2Err);
      }
    }
    return;
  }

  // For subject or lesson deletions, fetch and delete all nested content items
  if (type === 'lesson' || type === 'subject') {
    let lessonIds: string[] = [];

    if (type === 'lesson') {
      lessonIds.push(id);
    } else {
      // Find all lessons in this subject
      const { data: lessons } = await supabaseAdmin.from('lessons').select('id').eq('subject_id', id);
      if (lessons) lessonIds = lessons.map(l => l.id);
    }

    if (lessonIds.length > 0) {
      const { data: items } = await supabaseAdmin.from('content_items').select('url').in('lesson_id', lessonIds);
      if (items && items.length > 0) {
        for (const item of items) {
          const r2Key = extractR2Key(item.url || '');
          if (r2Key) {
            try {
              await deleteR2Object(r2Key);
            } catch (r2Err) {
              console.warn(`[Cascade Delete] R2 cleanup failed for key "${r2Key}":`, r2Err);
            }
          }
        }
      }
    }
  }
}

/**
 * Validate admin session
 */
export async function validateAdminSession(): Promise<{ session: any; errorResponse?: Response }> {
  const session = await auth();
  if (!session || !session.user?.isAdmin) {
    return { session: null, errorResponse: ApiErrors.UNAUTHORIZED() };
  }
  return { session, errorResponse: undefined };
}

/**
 * Common deletion response helper
 */
export function createDeletionResponse(success: boolean, error?: string): Response {
  if (error) {
    return ApiErrors.INTERNAL_ERROR(error);
  }
  return createSuccessResponse({ success });
}