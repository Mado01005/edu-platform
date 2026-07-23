import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const subject =
      body && typeof body === 'object' ? Reflect.get(body, 'subject') : null;
    const message =
      body && typeof body === 'object' ? Reflect.get(body, 'body') : null;

    if (
      typeof subject !== 'string' ||
      !subject.trim() ||
      subject.length > 200 ||
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 5_000
    ) {
      return NextResponse.json(
        { error: 'A valid subject and message are required.' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from('messages').insert({
      sender_email: session.user.email.toLowerCase(),
      receiver_email: ADMIN_EMAIL,
      subject: subject.trim(),
      body: message.trim(),
      is_read: false,
    });

    if (error) {
      console.error('[Support message]', error);
      return NextResponse.json(
        { error: 'Unable to send this message.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    console.error('[Support message]', error);
    return NextResponse.json(
      { error: 'Unable to send this message.' },
      { status: 500 },
    );
  }
}
