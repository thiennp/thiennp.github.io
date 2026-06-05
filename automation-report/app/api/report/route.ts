import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../lib/auth';
import { getReport, replaceReport } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ report: getReport() });
}

export async function POST(request: NextRequest) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const body = await request.json();
  return NextResponse.json(await replaceReport(body), { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const body = await request.json();
  return NextResponse.json(await replaceReport(body));
}
