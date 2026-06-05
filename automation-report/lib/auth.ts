import { NextRequest } from 'next/server';

export function requireMutationAuth(request: NextRequest): Response | null {
  const token = process.env.AUTOMATION_REPORT_TOKEN;
  if (!token) {
    return null;
  }
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const direct = request.headers.get('x-automation-report-token') || '';
  if (bearer === token || direct === token) {
    return null;
  }
  return Response.json({ error: 'Automation Report token required' }, { status: 401 });
}
