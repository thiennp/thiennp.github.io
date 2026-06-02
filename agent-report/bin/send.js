#!/usr/bin/env node

import WebSocket from 'ws';

const messageParts = [];
const options = {
  automationName: '',
  title: '',
  status: '',
};

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];

  if (argument === '--automation-name' || argument === '--automation' || argument === '-a') {
    options.automationName = process.argv[index + 1] || '';
    index += 1;
    continue;
  }

  if (argument.startsWith('--automation-name=')) {
    options.automationName = argument.slice('--automation-name='.length);
    continue;
  }

  if (argument.startsWith('--automation=')) {
    options.automationName = argument.slice('--automation='.length);
    continue;
  }

  if (argument === '--title' || argument === '-t') {
    options.title = process.argv[index + 1] || '';
    index += 1;
    continue;
  }

  if (argument.startsWith('--title=')) {
    options.title = argument.slice('--title='.length);
    continue;
  }

  if (argument === '--status' || argument === '-s') {
    options.status = process.argv[index + 1] || '';
    index += 1;
    continue;
  }

  if (argument.startsWith('--status=')) {
    options.status = argument.slice('--status='.length);
    continue;
  }

  messageParts.push(argument);
}

const message = messageParts.join(' ').trim();
const endpoint = process.env.AGENT_REPORT_WS || 'ws://localhost:3000/stream?source=terminal';

if (!message) {
  console.error(
    'Usage: npm run send -- --automation-name "Daily-vulnerabilities-fix" --title "Report title" --status success "message to append"',
  );
  process.exit(1);
}

const socket = new WebSocket(endpoint);
let sent = false;

socket.once('open', () => {
  socket.send(
    JSON.stringify({
      automationName: options.automationName.trim() || undefined,
      title: options.title.trim() || undefined,
      status: options.status.trim() || undefined,
      text: message,
      source: 'terminal',
    }),
    (error) => {
      if (error) {
        console.error(`Could not send message: ${error.message}`);
        process.exit(1);
      }

      sent = true;
      socket.close(1000, 'message sent');
    },
  );
});

socket.once('close', () => {
  if (sent) {
    process.exit(0);
  }
});

socket.once('error', () => {
  console.error(`Could not connect to ${endpoint}. Is the Agent Report server running?`);
  process.exit(1);
});
