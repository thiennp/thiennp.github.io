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
            Data stays in browser localStorage on{' '}
            <a href={REPORT_URL}>{REPORT_URL}</a>. The most reliable local-first path is the Chrome DevTools bridge
            command: it writes into the open report tab and does not call an API on <code>thiennp.github.io</code>.
            Browser hook logging and the bottom <strong>Log work status</strong> field remain fallbacks. Choose Cursor,
            Codex, Claude, Antigravity, or Other for setup steps and copy blocks. Include <code>tokensUsed</code> only
            when the exact count is available from the runtime; omit it rather than estimating.
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
                <h3 className="instructions_subhead">{activeProfile.setupTitle}</h3>
                <ol className="instructions_steps">
                  {activeProfile.setupSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <CopyableBlock label={activeProfile.ruleLabel} text={activeProfile.ruleText} />

              <CopyableBlock label={activeProfile.hookLabel} text={activeProfile.hookExample} compact />

              <CopyableBlock label={activeProfile.exampleLabel} text={activeProfile.workStatusExample} compact />
            </>
          ) : (
            <p className="instructions_pick muted">Choose an agent app above to see setup steps and copy blocks.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
