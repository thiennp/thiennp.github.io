'use client';

import { useState } from 'react';
import CopyableBlock from './CopyableBlock';
import { INSTRUCTION_PROFILES, REPORT_URL } from './instructionProfiles';

export default function UsageInstructions() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const activeProfile = activeProfileId
    ? INSTRUCTION_PROFILES.find((profile) => profile.id === activeProfileId)
    : null;

  return (
    <section className={`panel instructions ${isExpanded ? 'instructions___expanded' : ''}`}>
      <button
        className="instructions_summary"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className="instructions_chevron" aria-hidden="true">
          {isExpanded ? '▾' : '▸'}
        </span>
        <span className="instructions_summary_main">
          <h2>Agent logging instructions</h2>
          <span className="muted">
            <a
              href={REPORT_URL}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {REPORT_URL}
            </a>
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div className="instructions_body">
          <p className="instructions_lead muted">
            Choose an agent and copy the prompt into that agent. The prompt asks it to update the right persistent
            instruction location and remove old duplicate report rules.
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

          {activeProfile ? (
            <>
              <div className="instructions_note" role="tabpanel">
                <h3 className="instructions_subhead">{activeProfile.promptTitle}</h3>
                <p className="muted">
                  Paste this prompt into {activeProfile.label}. It asks the agent to update the right persistent
                  instruction location and keep only one current report rule.
                </p>
              </div>

              <CopyableBlock label={activeProfile.promptLabel} text={activeProfile.promptText} />
            </>
          ) : (
            <p className="instructions_pick muted">Choose an agent app above to copy its self-update prompt.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
