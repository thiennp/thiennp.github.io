import { NextRequest, NextResponse } from 'next/server';
import { search } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ query: q, results: [] });
  }
  return NextResponse.json(search(q));
}
