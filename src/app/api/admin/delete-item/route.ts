import { NextResponse } from 'next/server';
import { handleDeletion, DeletionOptions } from '@/lib/deletion';

export async function POST(req: Request) {
  try {
    const { itemId, fileUrl } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
