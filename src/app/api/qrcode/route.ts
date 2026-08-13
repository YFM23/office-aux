import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

// Generates the "JOIN THE OFFICE JUKEBOX" QR code as an SVG so it can be
// displayed near the speakers (or on the Party Mode TV screen) at any size
// without pixelation. No Spotify login is required to follow this link —
// it lands straight on the home screen / onboarding.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? req.nextUrl.origin;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b0e16', light: '#ffffff' } });
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
}
