# Agent Report

A small local WebSocket application that reads initial report data from `data/messages.json`, receives terminal messages over WebSocket, persists each message back to the JSON file, and updates every open browser window in real time.

## Run it

```bash
cd /Users/thien.nguyen/thiennp.github.io/agent-report
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or another browser.

## Send terminal input

In a second terminal:

```bash
cd /Users/thien.nguyen/thiennp.github.io/agent-report
npm run send -- --automation-name "Daily-vulnerabilities-fix" --title "Build check" --status success "Build finished successfully"
```

The message is appended to `data/messages.json` and broadcast immediately to connected browsers.

Reports can include:

- `automationName`: automation that produced the report, such as `Daily-vulnerabilities-fix`
- `title`: short headline shown above the message
- `status`: rendered as a colored chip; common values include `success`, `warning`, `error`, `running`, `pending`, and `info`
- `text`: the message body

Direct WebSocket JSON can send `automationName`, `title`, `status`, and `text`. For compatibility, if an older sender still puts an automation name in `source`, the server moves that value into `automationName` and stores the source as `terminal`.

## Automation reporting contract

Every automation should report to this page at the start of a run or heartbeat, after major step completion, when every individual item finishes, when blocked or paused, and at the final state.

Item-finished reports are mandatory. Whenever a ticket, PR, vulnerability, listing, persona review, file sync, subagent assignment, scan row, or other discrete work item completes, send a report immediately before moving to the next item. Include the item name/key, status, evidence/output, whether the automation continues or stops, and the next item or next step.

At the start of each automation, ensure this server is running quietly, then send that automation's own start message:

```bash
AGENT_REPORT_SEND_STATUS=0 /Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh
```

Use this command shape from the automation:

```bash
cd /Users/thien.nguyen/thiennp.github.io/agent-report
AGENT_REPORT_WS=ws://localhost:3100/stream npm run send -- --automation-name "<automation name>" --title "<item or step title>" --status <running|success|warning|blocked|error|pending|info> "<concise update>"
```

Always send `automationName`, `title`, `status`, and `text`. Keep `source` as `terminal` or `browser`; do not put the automation name in `source`.

## Daily autostart

The LaunchAgent at `~/Library/LaunchAgents/com.thiennp.agent-report.autostart.plist` runs `scripts/ensure-agent-report-server.sh` every day at 7:30 AM. It starts the server on port `3100` if needed and sends an `Agent Report Autostart` status message to the page.

## Edit an existing message

Open the report page in the browser, choose **Edit** on a message row, change the text, then choose **Save**. The server updates the matching entry in `data/messages.json`, broadcasts the edited message to connected browsers, forwards it to configured WebSocket targets, and automatically asks Claude to evaluate the edited text.

## Remove a message

Open the report page in the browser, choose **Delete** on a message row, then confirm the browser prompt. The server removes the matching entry from `data/messages.json`, broadcasts the removal to connected browsers, and forwards a delete event to configured WebSocket targets.

## Cleanup all messages

Choose **Cleanup everything** in the page header, then confirm the browser prompt. This removes all report messages from `data/messages.json` and every connected browser. Forward targets and settings are kept. If forwarding targets are configured, the cleanup event is forwarded so other Agent Report pages can clear their message lists too.

## Evaluate a message with Claude

Open the report page in the browser and choose **Evaluate with Claude** on any message row. The server sends that message to a local Claude agent command, asks for a short Vietnamese explanation/evaluation, stores the evaluation on the message in `data/messages.json`, and broadcasts the result back to connected browsers.

By default, the app runs:

```bash
claude -p "<generated evaluation prompt>"
```

If your Claude agent uses a different command or arguments, set these when starting the server:

```bash
AGENT_REPORT_CLAUDE_CMD=claude AGENT_REPORT_CLAUDE_ARGS="-p" PORT=3100 npm start
```

For agents that read the prompt from standard input instead of a command argument:

```bash
AGENT_REPORT_CLAUDE_PROMPT_MODE=stdin AGENT_REPORT_CLAUDE_CMD=claude AGENT_REPORT_CLAUDE_ARGS="-p" PORT=3100 npm start
```

If the Claude command is not installed or not visible to the server process, the page will show a setup-needed evaluation result.

If the page says **Claude login needed**, open a normal terminal and run:

```bash
claude
```

Then type this at the Claude prompt:

```text
/login
```

Complete the browser login flow, return to the report page, and choose **Re-evaluate with Claude**.

## Forward reports to another WebSocket port

Use the **Forward reports** form on the page to add a target port, such as `3200`, or a full WebSocket URL, such as `ws://localhost:3200/stream`.

When you add a plain port number, the app forwards to:

```bash
ws://localhost:<port>/stream
```

New report messages, saved edits, and delete events are forwarded as JSON payloads:

```json
{
  "type": "forwarded-message",
  "action": "append",
  "message": {
    "id": "message-id",
    "automationName": "Daily-vulnerabilities-fix",
    "title": "Report title",
    "status": "success",
    "text": "Report text",
    "source": "terminal",
    "createdAt": "2026-06-02T00:00:00.000Z"
  },
  "forwardedFrom": "agent-report:3100",
  "forwardedAt": "2026-06-02T00:00:00.000Z"
}
```

Forward targets are saved in `data/forward-targets.json`. If another Agent Report app receives a forwarded message, it displays and persists it without forwarding it onward.

You can change the server port with `PORT=3100 npm start`. If you do, point the sender at the matching WebSocket URL:

```bash
AGENT_REPORT_WS=ws://localhost:3100/stream npm run send -- "Running on a custom port"
```
