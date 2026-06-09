#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { WebSocket } from 'ws';

const defaultPagesUrl = 'https://thiennp.github.io/report/';
const defaultDebugUrl = 'http://127.0.0.1:9222';

const options = {
  status: '',
  step: '',
  phase: '',
  title: '',
  message: '',
  pre: '',
  repo: '',
  pr: '',
  url: '',
  source: 'automation',
  automationId: '',
  runId: '',
  appName: '',
  agentName: '',
  llm: '',
  modelToken: '',
  tokensUsed: '',
  nextStep: '',
  pagesUrl: process.env.AUTOMATION_REPORT_PAGES_URL || defaultPagesUrl,
  debugUrl: process.env.AUTOMATION_REPORT_CHROME_DEBUG_URL || defaultDebugUrl,
  open: false
};

const messageParts = [];

function usage(exitCode = 1) {
  const command = 'node automation-report/bin/log-to-pages-tab.mjs';
  console.error('Log work status into the open GitHub Pages report tab via local Chrome DevTools.');
  console.error('No request is sent to thiennp.github.io; the payload is written to that tab localStorage.');
  console.error('');
  console.error('Prerequisite: Chrome must be running with local debugging enabled, for example:');
  console.error('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --profile-directory=Default');
  console.error('');
  console.error('Usage:');
  console.error(`  ${command} --status running --appName Codex --llm GPT-5 --modelToken gpt-5-codex --title "Fix PR" "Checking pipeline"`);
  console.error('');
  console.error('Useful options: --pages-url, --debug-url, --open, --tokens-used, --automation-id, --run-id, --step, --phase, --next-step');
  process.exit(exitCode);
}

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === '--help' || argument === '-h') {
    usage(0);
  }
  if (argument === '--open') {
    options.open = true;
    continue;
  }
  const assign = argument.match(/^--([^=]+)=(.*)$/);
  if (assign) {
    const key = assign[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key in options) {
      options[key] = assign[2];
      continue;
    }
  }
  if (argument.startsWith('--')) {
    const key = argument.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key in options) {
      options[key] = process.argv[index + 1] || '';
      index += 1;
      continue;
    }
  }
  messageParts.push(argument);
}

if (!options.message && messageParts.length) {
  options.message = messageParts.join(' ').trim();
}

if (!options.status || !options.message) {
  usage();
}

function numericToken(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

function buildWorkStatus() {
  const tokensUsed = numericToken(options.tokensUsed);
  const payload = {};
  for (const [key, value] of Object.entries(options)) {
    if (['pagesUrl', 'debugUrl', 'open', 'tokensUsed'].includes(key)) {
      continue;
    }
    if (value !== '') {
      payload[key] = value;
    }
  }
  payload.title = payload.title || payload.message;
  payload.updatedAt = new Date().toISOString();
  if (tokensUsed !== undefined) {
    payload.tokensUsed = tokensUsed;
  }
  return payload;
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return response.json();
}

function normalizeReportUrl(value) {
  return String(value || defaultPagesUrl).replace(/[?#].*$/, '').replace(/\/$/, '');
}

function tabMatches(tab, pagesUrl) {
  const target = normalizeReportUrl(pagesUrl);
  return normalizeReportUrl(tab.url).startsWith(target);
}

async function findReportTab() {
  let tabs;
  try {
    tabs = await readJson(`${options.debugUrl.replace(/\/$/, '')}/json`);
  } catch (error) {
    throw new Error(
      `Cannot reach Chrome DevTools at ${options.debugUrl}: ${error.message}. Start Chrome with --remote-debugging-port=9222.`
    );
  }

  const tab = tabs.find((candidate) => candidate.type === 'page' && tabMatches(candidate, options.pagesUrl));
  if (!tab) {
    if (options.open && process.platform === 'darwin') {
      spawnSync('open', ['-a', 'Google Chrome', options.pagesUrl], { stdio: 'ignore' });
    }
    throw new Error(`No open report tab found for ${options.pagesUrl}. Open it in the Chrome profile exposed on ${options.debugUrl}.`);
  }
  if (!tab.webSocketDebuggerUrl) {
    throw new Error(`Report tab is missing webSocketDebuggerUrl: ${tab.id || tab.url}`);
  }
  return tab;
}

function evaluateInTab(webSocketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Timed out waiting for Chrome DevTools evaluation.'));
    }, 10000);

    socket.on('open', () => {
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression,
          awaitPromise: true,
          returnByValue: true
        }
      }));
    });

    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (message.id !== 1) {
        return;
      }
      clearTimeout(timer);
      socket.close();
      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }
      const exception = message.result?.exceptionDetails;
      if (exception) {
        reject(new Error(exception.text || exception.exception?.description || 'Runtime evaluation failed.'));
        return;
      }
      resolve(message.result?.result?.value);
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

const payload = buildWorkStatus();
const tab = await findReportTab();
const expression = `(() => {
  const payload = ${JSON.stringify(payload)};
  const bridge = window.__AUTOMATION_REPORT__;
  if (!bridge?.ready || typeof bridge.pushWorkStatus !== 'function') {
    return { ok: false, reason: 'report_bridge_not_ready' };
  }
  return { ok: bridge.pushWorkStatus(payload), reason: 'pushWorkStatus' };
})()`;

const result = await evaluateInTab(tab.webSocketDebuggerUrl, expression);
if (!result?.ok) {
  console.error(JSON.stringify(result || { ok: false, reason: 'unknown' }));
  process.exit(1);
}

if (process.env.AUTOMATION_REPORT_DEBUG_PAYLOAD === '1') {
  fs.writeFileSync(1, `${JSON.stringify(payload, null, 2)}\n`);
}
console.log(`Logged ${payload.status} to ${tab.url}`);
