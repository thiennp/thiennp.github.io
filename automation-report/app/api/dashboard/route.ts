import { NextResponse } from 'next/server';
import { getDashboardSnapshot } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}
