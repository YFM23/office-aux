import { NextRequest, NextResponse } from 'next/server';

// Very deliberately simple: a single shared admin passcode set via env var.
// This is an internal single-host tool, not a multi-tenant SaaS product —
// see README for why this is an appropriate level of auth here, and how to
// harden it (e.g. behind company SSO) if you outgrow it.
export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSCODE is not set on the server. Set it in your environment and restart.' },
      { status: 500 }
    );
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: 'Incorrect passcode.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('office_aux_admin', '1', { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 12, path: '/' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('office_aux_admin', '', { maxAge: 0, path: '/' });
  return res;
}
