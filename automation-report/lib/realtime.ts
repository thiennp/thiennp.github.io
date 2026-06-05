import { WsMessage } from './types';

type Hub = {
  ready: boolean;
  clients: () => number;
  broadcast: (message: WsMessage) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __AUTOMATION_REPORT_WS__: Hub | undefined;
}

export function getRealtimeStatus() {
  return {
    ready: Boolean(globalThis.__AUTOMATION_REPORT_WS__?.ready),
    clients: globalThis.__AUTOMATION_REPORT_WS__?.clients() ?? 0
  };
}

export function broadcast(message: WsMessage) {
  globalThis.__AUTOMATION_REPORT_WS__?.broadcast(message);
}
