import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ isAdmin: isAdminSession() });
}
