import { NextResponse } from 'next/server';
import { listAutomations } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ automations: listAutomations() });
}
