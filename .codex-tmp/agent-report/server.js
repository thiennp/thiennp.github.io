import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.AGENT_REPORT_HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');
const FORWARD_TARGETS_FILE = path.join(DATA_DIR, 'forward-targets.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CLAUDE_COMMAND = process.env.AGENT_REPORT_CLAUDE_CMD || 'claude';
const CLAUDE_ARGS = parseCommandArgs(process.env.AGENT_REPORT_CLAUDE_ARGS || '-p');
const CLAUDE_PROMPT_MODE = process.env.AGENT_REPORT_CLAUDE_PROMPT_MODE || 'arg';
const CLAUDE_TIMEOUT_MS = Number(process.env.AGENT_REPORT_CLAUDE_TIMEOUT_MS || 45000);
const KNOWN_MESSAGE_SOURCES = new Set(['browser', 'forwarded', 'system', 'terminal']);
let writeQueue = Promise.resolve();
let forwardTargetsQueue = Promise.resolve();

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await writeMessages([
      {
        id: randomUUID(),
        text: 'Agent report is ready. Send a message from the terminal to see live updates here.',
        source: 'system',
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}

async function ensureForwardTargetsFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(FORWARD_TARGETS_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await writeForwardTargets([]);
  }
}

async function readMessages() {
  await ensureDataFile();
  const contents = await readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(contents);

  if (!Array.isArray(parsed)) {
    throw new Error('data/messages.json must contain an array.');
  }

  return parsed;
}

async function readForwardTargets() {
  await ensureForwardTargetsFile();
  const contents = await readFile(FORWARD_TARGETS_FILE, 'utf8');
  const parsed = JSON.parse(contents);

  if (!Array.isArray(parsed)) {
    throw new Error('data/forward-targets.json must contain an array.');
  }

  return parsed;
}

async function writeMessages(messages) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(messages, null, 2)}\n`);
}

async function writeForwardTargets(targets) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FORWARD_TARGETS_FILE, `${JSON.stringify(targets, null, 2)}\n`);
}

function createMessage(input, fallbackSource = 'terminal') {
  const text = getMessageText(input);
  const source = getMessageSource(input, fallbackSource);

  if (!text || !String(text).trim()) {
    throw new Error('Message text is required.');
  }

  return {
    id: randomUUID(),
    automationName: getAutomationName(input),
    title: getOptionalText(input?.title),
    status: getOptionalText(input?.status),
    text: text.trim(),
    source,
    createdAt: new Date().toISOString(),
  };
}

function createForwardedMessage(input, forwardedFrom = 'unknown') {
  const text = getMessageText(input);

  if (!text) {
    throw new Error('Forwarded message text is required.');
  }

  return {
    id: typeof input?.id === 'string' && input.id ? input.id : randomUUID(),
    automationName: getAutomationName(input),
    title: getOptionalText(input?.title),
    status: getOptionalText(input?.status),
    text,
    source: getMessageSource(input, 'forwarded'),
    createdAt:
      typeof input?.createdAt === 'string' && input.createdAt ? input.createdAt : new Date().toISOString(),
    editedAt: typeof input?.editedAt === 'string' && input.editedAt ? input.editedAt : undefined,
    editedBy: typeof input?.editedBy === 'string' && input.editedBy ? input.editedBy : undefined,
    evaluation: typeof input?.evaluation === 'object' && input.evaluation ? input.evaluation : undefined,
    forwardedAt: new Date().toISOString(),
    forwardedFrom,
  };
}

function createMessageUpdate(input, fallbackSource = 'browser') {
  const id = typeof input?.id === 'string' ? input.id : '';
  const text = getMessageText(input);
  const editedBy = typeof input?.source === 'string' ? input.source : fallbackSource;

  if (!id) {
    throw new Error('Message id is required.');
  }

  if (!text) {
    throw new Error('Message text is required.');
  }

  return {
    id,
    automationName: getAutomationName(input),
    title: getOptionalText(input?.title),
    status: getOptionalText(input?.status),
    text,
    editedBy,
    editedAt: new Date().toISOString(),
  };
}

function getMessageText(input) {
  if (typeof input === 'string') {
    return input.trim();
  }

  if (typeof input?.text === 'string') {
    return input.text.trim();
  }

  if (typeof input?.message === 'string') {
    return input.message.trim();
  }

  return '';
}

function getOptionalText(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const text = value.trim();
  return text || undefined;
}

function getAutomationName(input) {
  const explicitAutomationName = getExplicitAutomationName(input);

  if (explicitAutomationName) {
    return explicitAutomationName;
  }

  const source = getOptionalText(input?.source);
  return isAutomationNameSource(source) ? source : undefined;
}

function getMessageSource(input, fallbackSource) {
  const source = getOptionalText(input?.source);

  if (!source || (!getExplicitAutomationName(input) && isAutomationNameSource(source))) {
    return fallbackSource;
  }

  return source;
}

function getExplicitAutomationName(input) {
  return getOptionalText(input?.automationName) || getOptionalText(input?.automation) || getOptionalText(input?.name);
}

function isAutomationNameSource(source) {
  if (!source) {
    return false;
  }

  return !KNOWN_MESSAGE_SOURCES.has(source.toLowerCase());
}

function normalizeForwardTarget(input) {
  const value = String(input?.target || input?.endpoint || input?.port || '').trim();

  if (!value) {
    throw new Error('WebSocket port or URL is required.');
  }

  if (/^\d+$/.test(value)) {
    const port = Number(value);

    if (port < 1 || port > 65535) {
      throw new Error('Port must be between 1 and 65535.');
    }

    return `ws://localhost:${port}/stream`;
  }

  const endpoint = new URL(value);

  if (endpoint.protocol !== 'ws:' && endpoint.protocol !== 'wss:') {
    throw new Error('Forward target must use ws:// or wss://.');
  }

  return endpoint.toString();
}

function isSelfEndpoint(endpoint) {
  const url = new URL(endpoint);
  const hostname = url.hostname.toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const endpointPort = Number(url.port || (url.protocol === 'wss:' ? 443 : 80));

  return isLocalHost && endpointPort === PORT && url.pathname === '/stream';
}

function parseCommandArgs(value) {
  const args = [];
  let current = '';
  let quote = '';

  for (const character of value) {
    if (quote) {
      if (character === quote) {
        quote = '';
      } else {
        current += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

function parseIncomingMessage(rawMessage) {
  const text = rawMessage.toString('utf8');

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    sendJson(client, payload);
  }
}

function enqueueWrite(operation) {
  const queuedOperation = writeQueue.catch(() => undefined).then(operation);
  writeQueue = queuedOperation.catch(() => undefined);

  return queuedOperation;
}

function enqueueForwardTargetsWrite(operation) {
  const queuedOperation = forwardTargetsQueue.catch(() => undefined).then(operation);
  forwardTargetsQueue = queuedOperation.catch(() => undefined);

  return queuedOperation;
}

function appendMessage(message) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    messages.push(message);
    await writeMessages(messages);
    return messages;
  });
}

function updateMessage(update) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    const messageIndex = messages.findIndex((message) => message.id === update.id);

    if (messageIndex === -1) {
      throw new Error('Message not found.');
    }

    const updatedMessage = {
      ...messages[messageIndex],
      automationName: update.automationName,
      title: update.title,
      status: update.status,
      text: update.text,
      editedAt: update.editedAt,
      editedBy: update.editedBy,
      evaluation: undefined,
    };

    messages[messageIndex] = updatedMessage;
    await writeMessages(messages);

    return updatedMessage;
  });
}

function deleteMessage(messageId, options = {}) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    const messageIndex = messages.findIndex((message) => message.id === messageId);

    if (messageIndex === -1) {
      if (options.allowMissing) {
        return undefined;
      }

      throw new Error('Message not found.');
    }

    const [removedMessage] = messages.splice(messageIndex, 1);
    await writeMessages(messages);

    return removedMessage;
  });
}

function clearMessages() {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    await writeMessages([]);
    return messages;
  });
}

function getMessageById(messageId) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    const message = messages.find((existingMessage) => existingMessage.id === messageId);

    if (!message) {
      throw new Error('Message not found.');
    }

    return message;
  });
}

function saveMessageEvaluation(messageId, evaluation) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    const messageIndex = messages.findIndex((message) => message.id === messageId);

    if (messageIndex === -1) {
      throw new Error('Message not found.');
    }

    if (evaluation.evaluatedText && messages[messageIndex].text !== evaluation.evaluatedText) {
      return messages[messageIndex];
    }

    const updatedMessage = {
      ...messages[messageIndex],
      evaluation,
    };

    messages[messageIndex] = updatedMessage;
    await writeMessages(messages);

    return updatedMessage;
  });
}

async function evaluateAndBroadcastMessage(messageId, wss) {
  broadcast(wss, { type: 'evaluation-start', id: messageId });

  try {
    const messageToEvaluate = await getMessageById(messageId);
    const evaluation = await createClaudeEvaluation(messageToEvaluate);
    const message = await saveMessageEvaluation(messageId, evaluation);

    if (message.evaluation?.id === evaluation.id) {
      broadcast(wss, { type: 'update', message });
    }
  } catch (error) {
    broadcast(wss, {
      type: 'evaluation-error',
      id: messageId,
      message: error.message,
    });
  }
}

function buildClaudePrompt(message) {
  return `You are a Claude agent evaluating a single live report message.

Explain and evaluate the message in Vietnamese.

Be as short and effective as possible.
Use plain Vietnamese, no markdown, no long preamble.

Return only these 3 short lines:
Ý nghĩa: what the message says.
Đánh giá: whether it is important, actionable, unclear, risky, or informational.
Bước tiếp theo: the most useful next action.

Keep the response under 70 Vietnamese words.

Message metadata:
- Automation: ${message.automationName || 'None'}
- Title: ${message.title || 'None'}
- Status: ${message.status || 'None'}
- Source: ${message.source}
- Created at: ${message.createdAt}

Message:
${message.text}`;
}

function runClaudeCommand(prompt) {
  if (process.env.AGENT_REPORT_CLAUDE_MODE === 'mock') {
    return Promise.resolve(
      'Ý nghĩa: Đây là tin nhắn kiểm tra.\nĐánh giá: Mang tính thông tin, không rủi ro.\nBước tiếp theo: Xác nhận có cần theo dõi thêm không.',
    );
  }

  return new Promise((resolve, reject) => {
    const args = CLAUDE_PROMPT_MODE === 'stdin' ? CLAUDE_ARGS : [...CLAUDE_ARGS, prompt];
    const child = spawn(CLAUDE_COMMAND, args, {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Claude agent timed out after ${CLAUDE_TIMEOUT_MS}ms.`));
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.once('error', (error) => {
      clearTimeout(timeout);

      if (error.code === 'ENOENT') {
        reject(
          new Error(
            `Claude agent command "${CLAUDE_COMMAND}" was not found. Install the Claude CLI or start the server with AGENT_REPORT_CLAUDE_CMD set to your Claude agent command.`,
          ),
        );
        return;
      }

      reject(error);
    });

    child.once('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Claude agent exited with code ${code}.`));
        return;
      }

      const output = stdout.trim();

      if (!output) {
        reject(new Error('Claude agent returned an empty response.'));
        return;
      }

      resolve(output);
    });

    if (CLAUDE_PROMPT_MODE === 'stdin') {
      child.stdin.end(prompt);
    } else {
      child.stdin.end();
    }
  });
}

async function createClaudeEvaluation(message) {
  const evaluatedAt = new Date().toISOString();

  try {
    const explanation = await runClaudeCommand(buildClaudePrompt(message));

    return {
      id: randomUUID(),
      provider: 'claude',
      status: 'complete',
      evaluatedAt,
      evaluatedText: message.text,
      explanation,
    };
  } catch (error) {
    const setupHelp = formatClaudeSetupHelp(error.message);

    return {
      id: randomUUID(),
      provider: 'claude',
      status: 'error',
      evaluatedAt,
      evaluatedText: message.text,
      setupIssue: setupHelp.issue,
      explanation: setupHelp.explanation,
    };
  }
}

function formatClaudeSetupHelp(errorMessage) {
  const message = String(errorMessage || '').trim();
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('not logged in') || lowerMessage.includes('/login')) {
    return {
      issue: 'login',
      explanation: `Claude Code is installed, but it is not logged in for this Mac yet.

What to do:
1. Open a normal terminal window.
2. Run: claude
3. At the Claude prompt, type: /login
4. Complete the browser login flow.
5. Come back to this report page and click "Re-evaluate with Claude".

The /login command is for the Claude CLI terminal, not for this report page.

Claude said: ${message}`,
    };
  }

  if (lowerMessage.includes('command') && lowerMessage.includes('not found')) {
    return {
      issue: 'missing-command',
      explanation: `The report server cannot find the Claude CLI command.

What to do:
1. Install Claude Code: npm install -g @anthropic-ai/claude-code
2. Check that this works in a terminal: claude --version
3. Restart this report server.
4. Click "Re-evaluate with Claude" again.

If Claude is installed in a custom location, start the server with:
AGENT_REPORT_CLAUDE_CMD=/path/to/claude PORT=3100 npm start

Claude error: ${message}`,
    };
  }

  return {
    issue: 'command-error',
    explanation: `Claude could not evaluate this message yet.

What to do:
1. Open a terminal.
2. Run: claude -p "Reply with OK"
3. Fix any login, permission, or setup issue shown by the Claude CLI.
4. Restart this report server if you changed your Claude setup.
5. Click "Re-evaluate with Claude" again.

Claude error: ${message || 'No error details were returned.'}`,
  };
}

function upsertForwardedMessage(message) {
  return enqueueWrite(async () => {
    const messages = await readMessages();
    const messageIndex = messages.findIndex((existingMessage) => existingMessage.id === message.id);

    if (messageIndex === -1) {
      messages.push(message);
      await writeMessages(messages);
      return { eventType: 'append', message };
    }

    const updatedMessage = {
      ...messages[messageIndex],
      ...message,
    };

    messages[messageIndex] = updatedMessage;
    await writeMessages(messages);

    return { eventType: 'update', message: updatedMessage };
  });
}

function addForwardTarget(input) {
  return enqueueForwardTargetsWrite(async () => {
    const endpoint = normalizeForwardTarget(input);

    if (isSelfEndpoint(endpoint)) {
      throw new Error('Forward target cannot be this app endpoint.');
    }

    const targets = await readForwardTargets();
    const existingTarget = targets.find((target) => target.endpoint === endpoint);

    if (existingTarget) {
      return targets;
    }

    targets.push({
      id: randomUUID(),
      endpoint,
      createdAt: new Date().toISOString(),
    });
    await writeForwardTargets(targets);

    return targets;
  });
}

function removeForwardTarget(targetId) {
  return enqueueForwardTargetsWrite(async () => {
    if (!targetId) {
      throw new Error('Forward target id is required.');
    }

    const targets = await readForwardTargets();
    const nextTargets = targets.filter((target) => target.id !== targetId);
    await writeForwardTargets(nextTargets);

    return nextTargets;
  });
}

function forwardToTarget(target, payload) {
  return new Promise((resolve) => {
    const client = new WebSocket(target.endpoint);
    const timeout = setTimeout(() => {
      client.terminate();
      resolve({ target, ok: false, error: 'Timed out' });
    }, 2000);

    client.once('open', () => {
      client.send(JSON.stringify(payload), (error) => {
        clearTimeout(timeout);
        client.close(1000, 'forwarded');
        resolve({ target, ok: !error, error: error?.message });
      });
    });

    client.once('error', (error) => {
      clearTimeout(timeout);
      resolve({ target, ok: false, error: error.message });
    });
  });
}

async function forwardReportEvent(eventType, message) {
  const targets = await readForwardTargets();

  if (targets.length === 0) {
    return [];
  }

  const payload = {
    type: 'forwarded-message',
    action: eventType,
    message,
    forwardedFrom: `agent-report:${PORT}`,
    forwardedAt: new Date().toISOString(),
  };

  return Promise.all(targets.map((target) => forwardToTarget(target, payload)));
}

function isSafePublicPath(filePath) {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath === PUBLIC_DIR || resolvedPath.startsWith(`${PUBLIC_DIR}${path.sep}`);
}

function serveStaticFile(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const normalizedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(normalizedPath));

  if (!isSafePublicPath(filePath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const extension = path.extname(filePath);
  const contentType = contentTypes.get(extension) || 'application/octet-stream';
  const stream = createReadStream(filePath);

  stream.on('open', () => {
    response.writeHead(200, { 'Content-Type': contentType });
  });

  stream.on('error', () => {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });

  stream.pipe(response);
}

await ensureDataFile();
await ensureForwardTargetsFile();

const server = createServer(serveStaticFile);
const wss = new WebSocketServer({ server, path: '/stream' });

wss.on('connection', async (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const source = url.searchParams.get('source') || 'terminal';

  socket.on('message', async (rawMessage) => {
    try {
      const incomingMessage = parseIncomingMessage(rawMessage);

      if (incomingMessage?.type === 'add-forward-target') {
        const forwardTargets = await addForwardTarget(incomingMessage);
        broadcast(wss, { type: 'forward-targets', forwardTargets });
        return;
      }

      if (incomingMessage?.type === 'remove-forward-target') {
        const forwardTargets = await removeForwardTarget(incomingMessage.id);
        broadcast(wss, { type: 'forward-targets', forwardTargets });
        return;
      }

      if (incomingMessage?.type === 'forwarded-message') {
        const forwardedFrom = incomingMessage.forwardedFrom || 'unknown';

        if (incomingMessage.action === 'cleanup') {
          const removedMessages = await clearMessages();
          broadcast(wss, { type: 'cleanup', removedCount: removedMessages.length });
          return;
        }

        if (incomingMessage.action === 'delete') {
          const messageId = typeof incomingMessage.message?.id === 'string' ? incomingMessage.message.id : '';
          const removedMessage = await deleteMessage(messageId, { allowMissing: true });

          if (removedMessage) {
            broadcast(wss, { type: 'remove', id: messageId });
          }

          return;
        }

        const forwardedMessage = createForwardedMessage(incomingMessage.message, forwardedFrom);
        const { eventType, message } = await upsertForwardedMessage(forwardedMessage);
        broadcast(wss, { type: eventType, message });
        return;
      }

      if (incomingMessage?.type === 'delete-message') {
        const messageId = typeof incomingMessage.id === 'string' ? incomingMessage.id : '';

        if (!messageId) {
          throw new Error('Message id is required.');
        }

        const removedMessage = await deleteMessage(messageId);
        broadcast(wss, { type: 'remove', id: messageId });
        void forwardReportEvent('delete', removedMessage).then((results) => {
          broadcast(wss, { type: 'forward-results', results });
        });
        return;
      }

      if (incomingMessage?.type === 'cleanup-messages') {
        const removedMessages = await clearMessages();
        const removedCount = removedMessages.length;

        broadcast(wss, { type: 'cleanup', removedCount });
        void forwardReportEvent('cleanup', {
          id: randomUUID(),
          text: `Cleaned up ${removedCount} report message${removedCount === 1 ? '' : 's'}.`,
          source,
          createdAt: new Date().toISOString(),
          removedCount,
        }).then((results) => {
          broadcast(wss, { type: 'forward-results', results });
        });
        return;
      }

      if (incomingMessage?.type === 'evaluate-message') {
        const messageId = typeof incomingMessage.id === 'string' ? incomingMessage.id : '';

        if (!messageId) {
          throw new Error('Message id is required.');
        }

        await evaluateAndBroadcastMessage(messageId, wss);
        return;
      }

      if (incomingMessage?.type === 'update') {
        const update = createMessageUpdate(incomingMessage, source);
        const message = await updateMessage(update);
        broadcast(wss, { type: 'update', message });
        void evaluateAndBroadcastMessage(message.id, wss);
        void forwardReportEvent('update', message).then((results) => {
          broadcast(wss, { type: 'forward-results', results });
        });
        return;
      }

      const message = createMessage(incomingMessage, source);

      await appendMessage(message);
      broadcast(wss, { type: 'append', message });
      void forwardReportEvent('append', message).then((results) => {
        broadcast(wss, { type: 'forward-results', results });
      });
    } catch (error) {
      sendJson(socket, { type: 'error', message: error.message });
    }
  });

  try {
    sendJson(socket, {
      type: 'init',
      messages: await readMessages(),
      forwardTargets: await readForwardTargets(),
      claudeAgent: {
        command: CLAUDE_COMMAND,
        args: CLAUDE_ARGS,
        promptMode: CLAUDE_PROMPT_MODE,
      },
    });
  } catch (error) {
    sendJson(socket, { type: 'error', message: error.message });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try PORT=${PORT + 1} npm start`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`Agent Report running at http://${HOST}:${PORT}`);
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/stream`);
  console.log(`Send a message: npm run send -- "hello from terminal"`);
});
