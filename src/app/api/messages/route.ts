import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';

// Admin GET request to fetch all inbox messages
export async function GET(request: Request) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin || (session?.user as any)?.isTeacher;
  
  if (!session || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  // Fetch all messages globally for Admin Inbox
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

// Student & Admin POST request to send a message
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Must be logged in to send messages.' }, { status: 401 });
  }

  try {
    const { receiver_email, subject, body } = await request.json();

    if (!receiver_email || !subject || !body) {
      return NextResponse.json({ error: 'Missing required message parameters' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('messages').insert({
      sender_email: session.user.email,
      receiver_email,
      subject,
      body,
      is_read: false
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Admin PATCH request to mark a message as read
export async function PATCH(request: Request) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin || (session?.user as any)?.isTeacher;
  
  if (!session || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    const { message_id, is_read } = await request.json();
    if (!message_id) return NextResponse.json({ error: 'Message ID required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read })
      .eq('id', message_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
