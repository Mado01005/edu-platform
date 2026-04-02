import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Robust migration utility to unify the content hierarchy.
 * 1. Corrects corrupt 'folder' metadata.
 * 2. Recursively parses implied paths in filenames (e.g., "Folder/Subfolder/Image.jpg")
 *    and transforms them into actual 'folder' records with correct parent_id links.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting hierarchy standardization migration...');

    // 1. Fix 'folder' metadata (ensure NULL file_type)
    await supabaseAdmin
      .from('content_items')
      .update({ file_type: null })
      .eq('item_type', 'folder');

    // 2. Fetch all content items that might have implied paths or need restructuring
    const { data: allItems, error: fetchError } = await supabaseAdmin
      .from('content_items')
      .select('*');

    if (fetchError || !allItems) {
      return NextResponse.json({ error: fetchError?.message || 'Failed to fetch items' }, { status: 500 });
    }

    let foldersCreatedCount = 0;
    let pathsFixedCount = 0;

    // Cache to store folders by (lesson_id, parent_id, name) to avoid redundant DB calls/inserts
    const folderCache = new Map<string, string>();

    // Helper to find or create a folder by name and parent
    const getOrCreateFolderId = async (name: string, lessonId: string, parentId: string | null): Promise<string> => {
      const cacheKey = `${lessonId}:${parentId}:${name}`;
      if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;

      // Check existing in DB
      const { data: existing } = await supabaseAdmin
        .from('content_items')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('name', name)
        .eq('item_type', 'folder')
        .is('parent_id', parentId)
        .maybeSingle();

      if (existing) {
        folderCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new
      const { data: created, error } = await supabaseAdmin
        .from('content_items')
        .insert({
          lesson_id: lessonId,
          name: name,
          item_type: 'folder',
          parent_id: parentId,
          file_type: null
        })
        .select('id')
        .single();

      if (error || !created) {
        console.error(`Failed to create folder ${name}:`, error);
        throw new Error(`Failed to create folder ${name}: ${error?.message}`);
      }
      
      foldersCreatedCount++;
      folderCache.set(cacheKey, created.id);
      return created.id;
    };

    // Iterate through items to find implied paths (slashes in name)
    for (const item of allItems) {
      if (item.name && item.name.includes('/')) {
        const parts = item.name.split('/');
        const fileName = parts.pop()!; // The actual file name
        const folderPathSegments = parts; // The segments representing folders

        console.log(`Fixing implied path for item: ${item.name}`);

        try {
          let currentParentId: string | null = item.parent_id;

          // Recursively ensure the folder structure exists
          for (const segment of folderPathSegments) {
            // Clean segment (remove trailing/leading whitespace)
            const cleanSegment = segment.trim();
            if (!cleanSegment) continue;
            
            currentParentId = await getOrCreateFolderId(cleanSegment, item.lesson_id, currentParentId);
          }

          // Update the item: set the new name (file only) and the new parent_id
          const { error: updateError } = await supabaseAdmin
            .from('content_items')
            .update({
              name: fileName.trim(),
              parent_id: currentParentId
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`Failed to update item ${item.id}:`, updateError);
          } else {
            pathsFixedCount++;
          }
        } catch (err) {
          console.error(`Error processing path for ${item.name}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalItemsProcessed: allItems.length,
        pathsFixed: pathsFixedCount,
        foldersCreated: foldersCreatedCount,
        message: 'Hierarchy standardization complete.'
      }
    });

  } catch (error: unknown) {
    console.error('Migration failed:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
