'use client';

import { useState } from 'react';
import { mergeWorkStatusIntoSnapshot } from '../lib/mergeWorkStatusSnapshot';
import { pushDashboardSnapshot } from '../lib/dashboardSync';
import type { DashboardSnapshot } from '../lib/types';

type AgentUpdatePanelProps = {
  readonly dashboard: DashboardSnapshot;
  readonly onUpdated: (snapshot: DashboardSnapshot, source: string) => void;
};

function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as DashboardSnapshot;
  return Boolean(record.workStatus && record.report && Array.isArray(record.automations) && Array.isArray(record.recentEvents));
}

function isWorkStatusPayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as { status?: unknown; message?: unknown };
  return typeof record.status === 'string' && typeof record.message === 'string';
}

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
        setError('Send dashboard JSON or a workStatus object with status and message.');
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
    <section className="agent-log" aria-label="Log work status">
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
        placeholder='{"status":"running","message":"Applying patch",...} or full dashboard JSON'
        spellCheck={false}
      />
      <button className="agent-log_submit" type="button" onClick={submitPayload}>
        Submit
      </button>
      {error ? <span className="agent-log_error">{error}</span> : null}
    </section>
  );
}
