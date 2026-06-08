import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../lib/auth';
import { clearDashboard, getDashboardSnapshot } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}

export async function DELETE(request: NextRequest) {
  const auth = requireMutationAuth(request);
  if (auth) {
    return auth;
  }
  const result = await clearDashboard();
  return NextResponse.json(result);
}
