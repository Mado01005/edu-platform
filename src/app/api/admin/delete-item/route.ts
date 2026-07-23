import { NextResponse } from 'next/server';
import { handleDeletion, DeletionOptions } from '@/lib/deletion';
import { isValidUUID, isValidR2Url } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const { itemId, fileUrl } = await req.json();

    // C3: Validate UUID format for itemId
    if (!itemId || !isValidUUID(itemId)) {
      return NextResponse.json({ error: 'Missing or invalid item ID' }, { status: 400 });
    }

    // C3: Validate file URL if provided
    if (fileUrl && !isValidR2Url(fileUrl)) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }

    // Use common deletion handler
    const deletionOptions: DeletionOptions = {
      type: 'item',
      id: itemId,
      fileUrl
    };

    return await handleDeletion(deletionOptions);
  } catch (error: unknown) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
