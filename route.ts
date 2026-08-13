import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/session';

export async function GET() {
  return NextResponse.json({ isAdmin: isAdminSession() });
}
