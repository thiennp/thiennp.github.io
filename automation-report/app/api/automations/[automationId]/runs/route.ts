import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../../../lib/auth';
import { createRun, listRuns } from '../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { automationId } = await context.params;
  const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
  const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
  return NextResponse.json(listRuns(automationId, limit, offset));
}

export async function POST(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await createRun(automationId, body), { status: 201 });
}
