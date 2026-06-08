import { NextRequest, NextResponse } from 'next/server';
import { requireMutationAuth } from '../../../lib/auth';
import { clearDashboard, getDashboardSnapshot, importDashboardSnapshot } from '../../../lib/store';
import type { DashboardSnapshot } from '../../../lib/types';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}

export async function POST(request: NextRequest) {
  const auth = requireMutationAuth(request);
  if (auth) {
    return auth;
  }

  const body = await request.json();
  const snapshot = (body.snapshot || body) as DashboardSnapshot;
  const result = await importDashboardSnapshot(snapshot);
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const auth = requireMutationAuth(request);
  if (auth) {
    return auth;
  }
  const result = await clearDashboard();
  return NextResponse.json(result);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Automation-Report-Token'
    }
  });
}
