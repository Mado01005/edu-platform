import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// DEPRECATED: Binary Beats / FocusTimer feature removed.
// This route returns empty data to prevent 500 errors in any remaining consumers.
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalFocusMinutes: 0,
        globalCompletionRate: 0,
        frictionList: []
      }
    });
  } catch (error: any) {
    console.error('[FOCUS_ANALYTICS] Deprecated route error:', error);
    return NextResponse.json({
      success: true,
      data: {
        totalFocusMinutes: 0,
        globalCompletionRate: 0,
        frictionList: []
      }
    });
  }
}
