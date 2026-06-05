import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../../../../../lib/auth';
import { appendEvent, listEvents } from '../../../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string; runId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { automationId, runId } = await context.params;
  const order = request.nextUrl.searchParams.get('order') === 'desc' ? 'desc' : 'asc';
  const events = listEvents(automationId, runId, order);
  if (!events) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  return NextResponse.json(events);
}

export async function POST(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId, runId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await appendEvent(automationId, runId, body), { status: 201 });
}
