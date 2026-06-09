#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

const DEFAULT_ALLOWED_ENV = [
  'HOME',
  'PATH',
  'SHELL',
  'TERM',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'USER',
  'LOGNAME',
  'XPC_SERVICE_NAME',
  'XPC_FLAGS',
];

const SECRET_NAME_PATTERN =
  /(TOKEN|SECRET|PASSWORD|PASS|KEY|COOKIE|SESSION|AUTH|CREDENTIAL|PRIVATE|BEARER|JIRA_API_TOKEN|BB_API_TOKEN|SENTRY_AUTH_TOKEN)/i;

function usage() {
  return `Usage: node safe-delegate-cli.mjs [--allow-env NAME] -- <command> [args...]

Runs a delegated CLI such as claude or cursor-agent with a scrubbed environment.
By default, token-like environment variables are not inherited. Do not pass
secret values in command arguments or prompts.`;
}

function parseArgs(argv) {
  const args = { allowEnv: [] };
  let i = 0;
  for (; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      i += 1;
      break;
    }
    if (arg === '--allow-env') {
      args.allowEnv.push(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument before --: ${arg}`);
    }
  }
  args.command = argv[i];
  args.commandArgs = argv.slice(i + 1);
  return args;
}

function buildSafeEnv(extraAllowed) {
  const names = new Set([...DEFAULT_ALLOWED_ENV, ...extraAllowed].filter(Boolean));
  const safe = {};
  for (const name of names) {
    if (SECRET_NAME_PATTERN.test(name)) {
      throw new Error(`Refusing to pass secret-looking environment variable to delegated CLI: ${name}`);
    }
    if (process.env[name] !== undefined) safe[name] = process.env[name];
  }
  safe.CODEX_DELEGATED_SAFE_ENV = '1';
  return safe;
}

function rejectSecretLookingArgs(commandArgs) {
  for (const arg of commandArgs) {
    if (/Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(arg)) {
      throw new Error('Refusing to pass a Bearer token-looking argument to delegated CLI');
    }
    if (/(SENTRY_AUTH_TOKEN|JIRA_API_TOKEN|BB_API_TOKEN)\s*=\s*\S+/i.test(arg)) {
      throw new Error('Refusing to pass token assignment-looking argument to delegated CLI');
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.command) throw new Error('Missing command after --');
  rejectSecretLookingArgs(args.commandArgs);
  const env = buildSafeEnv(args.allowEnv);
  const child = spawn(args.command, args.commandArgs, {
    env,
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: false,
  });
  child.on('error', (error) => {
    console.error(`Failed to start delegated CLI ${path.basename(args.command)}: ${error.message}`);
    process.exitCode = 127;
  });
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  process.exitCode = exitCode ?? 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
