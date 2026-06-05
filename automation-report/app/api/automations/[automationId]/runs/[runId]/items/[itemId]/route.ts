import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../../../../../../lib/auth';
import { upsertItem } from '../../../../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string; runId: string; itemId: string }> };

export async function PUT(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId, runId, itemId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await upsertItem(automationId, runId, itemId, body));
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId, runId, itemId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await upsertItem(automationId, runId, itemId, body, true));
}
