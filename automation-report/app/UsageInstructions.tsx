'use client';

import { useState } from 'react';
import CopyableBlock from './CopyableBlock';
import { INSTRUCTION_PROFILES, REPORT_URL } from './instructionProfiles';

export default function UsageInstructions() {
  const [activeProfileId, setActiveProfileId] = useState(INSTRUCTION_PROFILES[0]?.id || 'cursor');
  const activeProfile =
    INSTRUCTION_PROFILES.find((profile) => profile.id === activeProfileId) || INSTRUCTION_PROFILES[0];

  if (!activeProfile) {
    return null;
  }

  return (
    <section className="panel instructions">
      <div className="panel-head">
        <h2>Agent logging instructions</h2>
        <span className="muted">
          <a href={REPORT_URL}>{REPORT_URL}</a>
        </span>
      </div>

      <p className="instructions_lead muted">
        Choose the agent app you use. Each tab has setup steps, the rule to paste, and a JSON example with the
        correct <strong>appName</strong>.
      </p>

      <div className="instructions_tabs" role="tablist" aria-label="Agent app instructions">
        {INSTRUCTION_PROFILES.map((profile) => (
          <button
            key={profile.id}
            className={`instructions_tab ${profile.id === activeProfileId ? 'instructions_tab___active' : ''}`}
            type="button"
            role="tab"
            aria-selected={profile.id === activeProfileId}
            onClick={() => setActiveProfileId(profile.id)}
          >
            {profile.label}
          </button>
        ))}
      </div>

      <div className="instructions_note" role="tabpanel">
        <h3 className="instructions_subhead">{activeProfile.setupTitle}</h3>
        <ol className="instructions_steps">
          {activeProfile.setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <CopyableBlock label={activeProfile.ruleLabel} text={activeProfile.ruleText} />

      <CopyableBlock label={activeProfile.exampleLabel} text={activeProfile.workStatusExample} compact />
    </section>
  );
}
