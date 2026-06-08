'use client';

import { useState } from 'react';
import { mergeWorkStatusIntoSnapshot } from '../lib/mergeWorkStatusSnapshot';
import { pushDashboardSnapshot } from '../lib/dashboardSync';
import type { DashboardSnapshot } from '../lib/types';

type AgentUpdatePanelProps = {
  readonly dashboard: DashboardSnapshot;
  readonly onUpdated: (snapshot: DashboardSnapshot, source: string) => void;
};

const STATUS_OPTIONS = ['running', 'success', 'warning', 'blocked', 'pending', 'error', 'info'];

const emptyForm = {
  status: 'running',
  step: '',
  phase: '',
  title: '',
  message: '',
  pre: '',
  automationId: '',
  runId: '',
  agentName: '',
  nextStep: ''
};

export default function AgentUpdatePanel({ dashboard, onUpdated }: AgentUpdatePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snapshotJson, setSnapshotJson] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'form' | 'json'>('form');

  const applySnapshot = (snapshot: DashboardSnapshot) => {
    const result = pushDashboardSnapshot(snapshot);
    onUpdated(result.snapshot, result.source);
    setError('');
  };

  const submitWorkStatus = () => {
    if (!form.message.trim()) {
      setError('Message is required.');
      return;
    }

    const snapshot = mergeWorkStatusIntoSnapshot(dashboard, {
      status: form.status,
      step: form.step || undefined,
      phase: form.phase || undefined,
      title: form.title || form.message,
      message: form.message.trim(),
      pre: form.pre || undefined,
      automationId: form.automationId || undefined,
      runId: form.runId || undefined,
      agentName: form.agentName || undefined,
      nextStep: form.nextStep || undefined,
      source: 'automation-report',
      updatedAt: new Date().toISOString()
    });

    applySnapshot(snapshot);
    setForm(emptyForm);
    setIsOpen(false);
  };

  const submitSnapshotJson = () => {
    try {
      const parsed = JSON.parse(snapshotJson) as DashboardSnapshot;
      applySnapshot(parsed);
      setSnapshotJson('');
      setIsOpen(false);
    } catch {
      setError('Paste valid dashboard JSON.');
    }
  };

  return (
    <section className="panel agent-update">
      <div className="panel-head">
        <h2>Agent update</h2>
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            setIsOpen((value) => !value);
            setError('');
          }}
        >
          {isOpen ? 'Close' : 'Log work status'}
        </button>
      </div>

      <p className="muted agent-update_lead">
        Open this page in the browser, click Log work status, and submit an update. Data is saved in this browser&apos;s localStorage only.
      </p>

      {isOpen ? (
        <div className="agent-update_body">
          <div className="agent-update_modes">
            <button
              className={mode === 'form' ? 'button-primary' : ''}
              type="button"
              onClick={() => setMode('form')}
            >
              Work status form
            </button>
            <button
              className={mode === 'json' ? 'button-primary' : ''}
              type="button"
              onClick={() => setMode('json')}
            >
              Paste full snapshot
            </button>
          </div>

          {mode === 'form' ? (
            <div className="agent-update_form">
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Step
                <input
                  value={form.step}
                  onChange={(event) => setForm((current) => ({ ...current, step: event.target.value }))}
                  placeholder="2.1"
                />
              </label>
              <label>
                Phase
                <input
                  value={form.phase}
                  onChange={(event) => setForm((current) => ({ ...current, phase: event.target.value }))}
                  placeholder="cursor"
                />
              </label>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short headline"
                />
              </label>
              <label className="agent-update_full">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="What you are doing right now"
                  rows={3}
                />
              </label>
              <label>
                PRE
                <input
                  value={form.pre}
                  onChange={(event) => setForm((current) => ({ ...current, pre: event.target.value }))}
                  placeholder="PRE-4401"
                />
              </label>
              <label>
                Automation ID
                <input
                  value={form.automationId}
                  onChange={(event) => setForm((current) => ({ ...current, automationId: event.target.value }))}
                  placeholder="my-automation-id"
                />
              </label>
              <label>
                Run ID
                <input
                  value={form.runId}
                  onChange={(event) => setForm((current) => ({ ...current, runId: event.target.value }))}
                  placeholder="20260608T120000Z"
                />
              </label>
              <label>
                Agent
                <input
                  value={form.agentName}
                  onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))}
                  placeholder="Codex"
                />
              </label>
              <label>
                Next step
                <input
                  value={form.nextStep}
                  onChange={(event) => setForm((current) => ({ ...current, nextStep: event.target.value }))}
                  placeholder="2.2"
                />
              </label>
              <button className="button-primary agent-update_submit" type="button" onClick={submitWorkStatus}>
                Save to report
              </button>
            </div>
          ) : (
            <div className="agent-update_json">
              <label className="agent-update_full">
                Dashboard JSON
                <textarea
                  value={snapshotJson}
                  onChange={(event) => setSnapshotJson(event.target.value)}
                  placeholder='{"workStatus": {...}, "automations": [], "recentEvents": [], "report": {...}}'
                  rows={12}
                />
              </label>
              <button className="button-primary agent-update_submit" type="button" onClick={submitSnapshotJson}>
                Save snapshot
              </button>
            </div>
          )}

          {error ? <p className="agent-update_error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
