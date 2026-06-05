import { NextRequest, NextResponse } from 'next/server';
import { listItems } from '../../../../../../../lib/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ automationId: string; runId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { automationId, runId } = await context.params;
  const items = listItems(automationId, runId, request.nextUrl.searchParams);
  if (!items) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  return NextResponse.json(items);
}
