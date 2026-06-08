import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Automation-Report-Token'
  );
  return response;
}

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }));
  }

  return withCors(NextResponse.next());
}

export const config = {
  matcher: '/api/:path*'
};
