#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ARTIFACT_DIR = path.join(__dirname, 'artifacts');
const DEFAULT_STATUS = path.join(DEFAULT_ARTIFACT_DIR, 'current-sentry-issue-status.json');
const DEFAULT_HTML = path.join(DEFAULT_ARTIFACT_DIR, 'current-sentry-issue-list.html');

const usage = () => {
  console.log(`Usage: issue-list-status-server.mjs <command> [options]

Commands:
  serve [--port 8797] [--host 127.0.0.1] [--dir artifacts]
      Serve the generated issue app and expose /api/status.
  set --issue-id ID --status STATUS [--message TEXT] [--status-file PATH]
      Update the sidecar status JSON without starting a server.
  get [--status-file PATH]
      Print the current status JSON.

Statuses: not-started, selected, working, blocked, done`);
};

const args = process.argv.slice(2);
const command = args.shift();
if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command ? 0 : 2);
}

const takeOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined) throw new Error(`${name} requires a value`);
  args.splice(index, 2);
  return value;
};

const normalizeStatus = (value) => {
  const status = value || 'not-started';
  if (!['not-started', 'selected', 'working', 'blocked', 'done'].includes(status)) {
    throw new Error(`Unsupported status: ${status}`);
  }
  return status;
};

const readJson = (file) => {
  if (!fs.existsSync(file)) {
    return { generatedAt: new Date().toISOString(), issues: {} };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const writeJsonAtomic = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
};

const updateStatus = ({ statusFile, issueId, status, message }) => {
  if (!issueId) throw new Error('--issue-id is required');
  const data = readJson(statusFile);
  data.issues ||= {};
  const previous = data.issues[issueId] || { id: issueId };
  data.issues[issueId] = {
    ...previous,
    id: issueId,
    status: normalizeStatus(status),
    message: message ?? previous.message ?? '',
    updatedAt: new Date().toISOString(),
  };
  data.lastUpdated = data.issues[issueId].updatedAt;
  writeJsonAtomic(statusFile, data);
  return data;
};

const readBodyJson = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 128 * 1024) {
      reject(new Error('Request body too large'));
      request.destroy();
    }
  });
  request.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
  request.on('error', reject);
});

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(data, null, 2));
};

const contentType = (file) => {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
};

if (command === 'set') {
  const statusFile = takeOption('--status-file', DEFAULT_STATUS);
  const issueId = takeOption('--issue-id', null);
  const status = takeOption('--status', null);
  const message = takeOption('--message', '');
  const data = updateStatus({ statusFile, issueId, status, message });
  console.log(JSON.stringify({
    statusFile,
    issueId,
    status: data.issues[issueId].status,
    updatedAt: data.issues[issueId].updatedAt,
  }, null, 2));
} else if (command === 'get') {
  const statusFile = takeOption('--status-file', DEFAULT_STATUS);
  console.log(JSON.stringify(readJson(statusFile), null, 2));
} else if (command === 'serve') {
  const port = Number(takeOption('--port', '8797'));
  const host = takeOption('--host', '127.0.0.1');
  const dir = path.resolve(takeOption('--dir', DEFAULT_ARTIFACT_DIR));
  const statusFile = takeOption('--status-file', path.join(dir, path.basename(DEFAULT_STATUS)));

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        response.end();
        return;
      }
      if (url.pathname === '/api/status') {
        if (request.method === 'GET') {
          sendJson(response, 200, readJson(statusFile));
          return;
        }
        if (request.method === 'POST') {
          const body = await readBodyJson(request);
          const data = updateStatus({
            statusFile,
            issueId: body.issueId || body.id,
            status: body.status,
            message: body.message || '',
          });
          sendJson(response, 200, data);
          return;
        }
      }

      const requested = url.pathname === '/' ? path.basename(DEFAULT_HTML) : decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(dir, requested);
      if (!file.startsWith(`${dir}${path.sep}`) && file !== dir) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(response);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });

  server.listen(port, host, () => {
    console.log(JSON.stringify({
      url: `http://${host}:${port}/`,
      statusApi: `http://${host}:${port}/api/status`,
      statusFile,
    }, null, 2));
  });
} else {
  throw new Error(`Unknown command: ${command}`);
}
