'use client';

import { useState } from 'react';

type CopyableBlockProps = {
  readonly label: string;
  readonly text: string;
  readonly compact?: boolean;
};

export default function CopyableBlock({ label, text, compact = false }: CopyableBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Could not copy to clipboard.');
    }
  };

  return (
    <div className="copyable-block">
      <div className="copyable-block_head">
        <p className="muted copyable-block_label">{label}</p>
        <button className="copyable-block_button" type="button" onClick={() => void copyText()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={`instructions_code ${compact ? 'copyable-block_code_compact' : 'instructions_prompt'}`}>
        <code>{text}</code>
      </pre>
    </div>
  );
}
