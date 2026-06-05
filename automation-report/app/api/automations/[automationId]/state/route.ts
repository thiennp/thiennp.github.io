import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../../../lib/auth';
import { getState, patchState, replaceState } from '../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { automationId } = await context.params;
  return NextResponse.json({ state: getState(automationId) });
}

export async function PUT(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await replaceState(automationId, body));
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = requireMutationAuth(request);
  if (auth) return auth;
  const { automationId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await patchState(automationId, body));
}
