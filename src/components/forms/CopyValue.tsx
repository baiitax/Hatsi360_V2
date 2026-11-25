'use client';

/**
 * A value the reader will want to reuse: a phone number, a mailbox, an address.
 *
 * It is a button, not a paragraph with a hidden script — the copy action is the
 * primary affordance, so it is reachable by keyboard and announced when it
 * fires. The fallback (no clipboard permission, an old browser) shows the value
 * selected instead of pretending to have copied it.
 */

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@/components/ui/icons';

export function CopyValue({
  value,
  label,
  href,
  wrap = false,
  className = '',
}: {
  /** The exact string that will be copied. */
  value: string;
  /** What the value is, for the accessible name: "Copy the phone number". */
  label: string;
  /** An optional destination — the value can be dialled or opened as well. */
  href?: string;
  /**
   * Long values — an address — wrap onto a second line. A short value stays on
   * one line and truncates, so a phone number never breaks mid-digit.
   */
  wrap?: boolean;
  className?: string;
}) {
  const textClass = wrap ? 'whitespace-normal' : 'truncate';
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // The old path: a temporary selection. It is a fallback, not a trick.
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setState('copied');
    } catch {
      setState('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2200);
  }

  return (
    <span className={`group inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {href ? (
        <a
          href={href}
          className={`min-w-0 font-medium text-terminal-text underline decoration-terminal-border underline-offset-4 transition-colors hover:decoration-harvest-400 ${textClass}`}
        >
          {value}
        </a>
      ) : (
        <span className={`min-w-0 font-medium text-terminal-text ${textClass}`}>{value}</span>
      )}

      <button
        type="button"
        onClick={copy}
        className="grid size-6 shrink-0 place-items-center rounded-[0.375rem] border border-terminal-border text-terminal-text-muted transition-colors hover:border-harvest-500/60 hover:text-terminal-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-harvest-300"
        aria-label={`${label}: copy ${value}`}
      >
        {state === 'copied' ? (
          <IconCheck className="size-3.5 text-move-up" />
        ) : (
          <IconCopy className="size-3.5" />
        )}
      </button>

      <span
        role="status"
        aria-live="polite"
        className={`text-[0.625rem] uppercase tracking-wider ${
          state === 'failed' ? 'text-move-down' : 'text-move-up'
        }`}
      >
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : ''}
      </span>
    </span>
  );
}
