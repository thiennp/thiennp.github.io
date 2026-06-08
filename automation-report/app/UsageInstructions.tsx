import type { RuntimeMode } from '../lib/clientRuntime';

type UsageInstructionsProps = {
  readonly runtimeMode: RuntimeMode;
};

const wsExample = `const ws = new WebSocket('ws://127.0.0.1:3120/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'work-status.update',
    payload: {
      status: 'running',
      step: '2.1',
      phase: 'cursor',
      title: 'Cursor fix',
      message: 'Applying the bug fix',
      pre: 'PRE-4401',
      automationId: 'my-automation',
      runId: '20260608T120000Z'
    }
  }));
};

ws.onmessage = (event) => console.log(event.data);`;

const httpExample = `curl -fsS -X POST http://127.0.0.1:3120/api/work-status \\
  -H 'Content-Type: application/json' \\
  -d '{
    "status": "running",
    "step": "2.1",
    "title": "Cursor fix",
    "message": "Applying the bug fix",
    "pre": "PRE-4401"
  }'`;

const cliExample = `node bin/send-work-status.mjs \\
  --status running \\
  --step 2.1 \\
  --title "Cursor fix" \\
  --pre PRE-4401 \\
  "Applying the bug fix"`;

const pagesIngestExample = `window.__AUTOMATION_REPORT__?.pushDashboard(snapshot);
// or postMessage from another tab:
// window.postMessage({ type: 'dashboard.update', payload: snapshot }, '*');`;

export default function UsageInstructions({ runtimeMode }: UsageInstructionsProps) {
  const isLive = runtimeMode === 'live';

  return (
    <section className="panel instructions">
      <div className="panel-head">
        <h2>How to update this dashboard</h2>
        <span className="muted">{isLive ? 'Live server' : 'GitHub Pages snapshot'}</span>
      </div>

      <ol className="instructions_steps">
        <li>
          <strong>Start the local server</strong>
          <p className="muted">
            From <code>automation-report/</code>: <code>npm install</code>, then{' '}
            <code>AUTOMATION_REPORT_PORT=3120 npm run start</code>. Open{' '}
            <a href="http://127.0.0.1:3120/">http://127.0.0.1:3120/</a> for live WebSocket updates.
          </p>
        </li>
        <li>
          <strong>Send a WebSocket message</strong>
          <p className="muted">
            Connect to <code>ws://127.0.0.1:3120/ws</code> and send JSON with{' '}
            <code>type: &quot;work-status.update&quot;</code> and a <code>payload</code> object. The UI
            refreshes automatically when the server accepts the update.
          </p>
          <pre className="instructions_code">
            <code>{wsExample}</code>
          </pre>
        </li>
        <li>
          <strong>Or use HTTP instead of WebSocket</strong>
          <p className="muted">
            POST the same fields to <code>/api/work-status</code>. Successful writes are broadcast to
            connected WebSocket clients.
          </p>
          <pre className="instructions_code">
            <code>{httpExample}</code>
          </pre>
        </li>
        <li>
          <strong>CLI shortcut</strong>
          <pre className="instructions_code">
            <code>{cliExample}</code>
          </pre>
        </li>
        <li>
          <strong>Clear the dashboard</strong>
          <p className="muted">
            Use the <strong>Clear report</strong> button on the live server, or send{' '}
            <code>DELETE /api/dashboard</code>. Activity history is capped at 200 events; older entries are
            trimmed automatically.
          </p>
        </li>
      </ol>

      <div className="instructions_note">
        <p>
          <strong>GitHub Pages:</strong> this public URL cannot accept WebSocket connections. Run the local
          server, push updates there, then publish a snapshot with <code>npm run deploy:pages</code> and
          commit <code>report/dashboard.json</code>. For a one-off browser update without redeploying,
          paste a dashboard snapshot into the console:
        </p>
        <pre className="instructions_code">
          <code>{pagesIngestExample}</code>
        </pre>
        <p className="muted">
          Generate the ingest script with <code>node bin/push-dashboard-to-browser.mjs</code>. The page also
          caches the latest snapshot in <code>localStorage</code> under{' '}
          <code>automation-report-dashboard-v1</code>.
        </p>
      </div>
    </section>
  );
}
