import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../../../../lib/auth';
import { getRun, patchRun } from '../../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string; runId: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { automationId, runId } = await context.params;
  const run = getRun(automationId, runId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  return NextResponse.json({ run });
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId, runId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await patchRun(automationId, runId, body));
}
