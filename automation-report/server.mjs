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

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'connection.ready',
    version: 0,
    createdAt: new Date().toISOString(),
    payload: { message: 'Automation Report WebSocket connected' }
  }));
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
