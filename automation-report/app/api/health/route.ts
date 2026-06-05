import { NextResponse } from 'next/server';
import { getRealtimeStatus } from '../../../lib/realtime';
import { getStoreInfo } from '../../../lib/store';

export const runtime = 'nodejs';

export async function GET() {
  const store = getStoreInfo();
  return NextResponse.json({
    status: store.readable && store.writable ? 'healthy' : 'degraded',
    version: '0.1.0',
    serverTime: new Date().toISOString(),
    storePath: store.storePath,
    dataDir: store.dataDir,
    storeReadable: store.readable,
    storeWritable: store.writable,
    storeVersion: store.version,
    websocket: getRealtimeStatus()
  });
}
