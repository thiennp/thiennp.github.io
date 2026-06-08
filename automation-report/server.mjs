import http from 'node:http';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.AUTOMATION_REPORT_HOST || '127.0.0.1';
const port = Number(process.env.AUTOMATION_REPORT_PORT || 3120);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });

globalThis.__AUTOMATION_REPORT_WS__ = {
  ready: true,
  clients: () => wss.clients.size,
  broadcast: (message) => {
    const data = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  }
};

function mutationHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.AUTOMATION_REPORT_TOKEN) {
    headers['X-Automation-Report-Token'] = process.env.AUTOMATION_REPORT_TOKEN;
  }
  return headers;
}

async function handleSocketMessage(raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    return;
  }

  const type = String(message.type || '').toLowerCase();
  const payload = message.payload && typeof message.payload === 'object' ? message.payload : message;
  const isWorkStatus =
    type === 'work-status.update' ||
    type === 'workflow-status.update' ||
    type === 'work.status' ||
    (payload.status && (payload.title || payload.message || payload.step || payload.phase));

  if (!isWorkStatus) {
    return;
  }

  const response = await fetch(`http://${hostname}:${port}/api/work-status`, {
    method: 'POST',
    headers: mutationHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`WebSocket work-status update failed: HTTP ${response.status} ${body}`);
  }
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'connection.ready',
    version: 0,
    createdAt: new Date().toISOString(),
    payload: { message: 'Automation Report WebSocket connected' }
  }));

  socket.on('message', (raw) => {
    handleSocketMessage(raw).catch((error) => {
      console.error('WebSocket message handler failed', error);
    });
  });
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${hostname}:${port}`}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(port, hostname, () => {
  console.log(`Automation Report ready on http://${hostname}:${port}`);
  console.log(`Automation Report API ready on http://${hostname}:${port}/api`);
  console.log(`Automation Report WS ready on ws://${hostname}:${port}/ws`);
});
