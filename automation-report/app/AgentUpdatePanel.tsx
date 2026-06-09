'use client';

import { useState } from 'react';
import { isDashboardSnapshot, isWorkStatusPayload } from '../lib/dashboardIngestApi';
import { pushDashboardSnapshot } from '../lib/dashboardSync';
import { mergeWorkStatusIntoSnapshot } from '../lib/mergeWorkStatusSnapshot';
import type { DashboardSnapshot } from '../lib/types';

type AgentUpdatePanelProps = {
  readonly dashboard: DashboardSnapshot;
  readonly onUpdated: (snapshot: DashboardSnapshot, source: string) => void;
};

export default function AgentUpdatePanel({ dashboard, onUpdated }: AgentUpdatePanelProps) {
  const [payloadJson, setPayloadJson] = useState('');
  const [error, setError] = useState('');

  const submitPayload = () => {
    const trimmed = payloadJson.trim();
    if (!trimmed) {
      setError('JSON is required.');
      return;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const snapshot = isDashboardSnapshot(parsed)
        ? parsed
        : isWorkStatusPayload(parsed)
          ? mergeWorkStatusIntoSnapshot(dashboard, parsed as Parameters<typeof mergeWorkStatusIntoSnapshot>[1])
          : null;

      if (!snapshot) {
        setError('Send dashboard JSON or a work-status object with status and message.');
        return;
      }

      const result = pushDashboardSnapshot(snapshot);
      onUpdated(result.snapshot, result.source);
      setPayloadJson('');
      setError('');
    } catch {
      setError('Invalid JSON.');
    }
  };

  return (
    <section className="agent-log">
      <label className="agent-log_label" htmlFor="agent-log-json">
        Log work status
      </label>
      <input
        className="agent-log_input"
        id="agent-log-json"
        value={payloadJson}
        onChange={(event) => setPayloadJson(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submitPayload();
          }
        }}
        placeholder='{"status":"running","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","message":"Applying patch",...}'
        spellCheck={false}
      />
      <button className="agent-log_submit" type="button" onClick={submitPayload}>
        Submit
      </button>
      {error ? <span className="agent-log_error">{error}</span> : null}
    </section>
  );
}
