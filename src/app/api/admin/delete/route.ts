import { NextResponse } from 'next/server';
import { handleDeletion, DeletionOptions } from '@/lib/deletion';
import { isValidUUID, isValidDeletionType } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    // C2: Validate type before unsafe cast
    if (!isValidDeletionType(type)) {
      return NextResponse.json({ error: 'Invalid deletion type' }, { status: 400 });
    }

    // C2: Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const deletionOptions: DeletionOptions = {
      type: type as 'subject' | 'lesson' | 'item',
      id
    };

    return await handleDeletion(deletionOptions);
  } catch (error: unknown) {
    console.error('Delete crash:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
