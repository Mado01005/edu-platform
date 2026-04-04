import { NextResponse } from 'next/server';
import { handleDeletion, DeletionOptions } from '@/lib/deletion';

export async function POST(req: Request) {
  try {
    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    // Use common deletion handler
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
