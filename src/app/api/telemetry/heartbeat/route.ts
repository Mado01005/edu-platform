import { NextResponse } from 'next/server';
import { upsertLiveSession } from 'src/lib/sessions';

export async function POST() {
  const telemetryData = {
    currentPage: 'dashboard',
    isIdle: false,
  };
  await upsertLiveSession(telemetryData);
  return NextResponse.json({ status: 'success' });
}