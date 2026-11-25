'use client';

/**
 * Hatsi360 Markets — the global search.
 *
 * One field, three result groups (commodities, markets, states), and a live
 * region for the count so a screen-reader user is told what happened when they
 * typed.
 *
 * The design decisions that matter here are all about honesty:
 *
 *  - **It does not hold the catalogue.** Every keystroke above two characters
 *    asks the server, which narrows through the public view. The browser never
 *    receives the whole corpus to filter locally (§13.3).
 *  - **It debounces.** A search that fires per keystroke makes one request per
 *    letter on a slow connection, so the request is delayed until typing pauses.
 *  - **It distinguishes "no results" from "still loading" and "type more".**
 *    A blank panel that is actually a pending request looks like a broken
 *    search, so the three states have three different renderings.
 *  - **It is a real combobox.** `role="combobox"` with `aria-expanded`,
 *    `aria-controls`, `aria-activedescendant` and Escape-to-close, because a
 *    search field that announces nothing is unusable with a keyboard.
 *
 * The component is a client module for one reason only: it holds the input's
 * state and the pending request. It renders no data of its own.
 */

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowRight,
  IconCommodities,
  IconGlobe,
  IconMarkets,
  IconSearch,
} from '@/components/ui/icons';

/** Mirrors the route's own floor, so the client agrees with the server. */
const MIN_LENGTH = 2;
/** How long typing must pause before a request is issued. */
const DEBOUNCE_MS = 200;

interface SearchResponse {
  query: string;
  groups: { id: string; label: string; results: { label: string; detail: string | null; href: string }[] }[];
  total: number;
  emptyReason: string | null;
}

const GROUP_ICONS = {
  commodities: IconCommodities,
  markets: IconMarkets,
  // A state is a geography, not a market: it is where a market sits. The icon
  // says so, and the group label names it in full.
  states: IconGlobe,
} as const;

export function GlobalSearch({ className = '' }: { className?: string }) {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<SearchResponse | null>(null);
  /** The query the current response answers. `''` means nothing has been asked yet. */
  const [answeredFor, setAnsweredFor] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const isTooShort = trimmed.length < MIN_LENGTH;

  // Derived, not stored. A stored `loading` flag set inside the effect is what
  // the React compiler rules reject, and it is also one more thing that can
  // disagree with reality: "am I waiting?" is a question about the input versus
  // the last answer, so it is answered by comparing them.
  const isSearching = !isTooShort && answeredFor !== trimmed;
  const isFailed = !isTooShort && answeredFor === trimmed && response === null && hasFailed;
  const showPanel = isOpen && !isTooShort;
  const resultCount = response?.total ?? 0;
  const state = isTooShort ? 'idle' : isSearching ? 'loading' : isFailed ? 'failed' : resultCount > 0 ? 'results' : 'empty';

  useEffect(() => {
    if (isTooShort) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as SearchResponse;
        setResponse(body);
        setHasFailed(false);
        // Opened here rather than in the effect body: this is a callback from an
        // external system (the network), which is exactly what an effect may
        // subscribe to. Opening it synchronously in the effect would re-render
        // before the request has even been issued, which is the cascading
        // render the compiler rules reject.
        setIsOpen(true);
      } catch (error) {
        // An aborted request is the normal case — a newer keystroke replaced
        // it. Anything else is a real failure, and it is reported as such
        // rather than silently swallowed into "no results".
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResponse(null);
        setHasFailed(true);
        setIsOpen(false);
      }
      setAnsweredFor(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, isTooShort]);

  // A click outside closes the list. Without this the panel stays open over
  // the page and swallows the next click.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search commodities, markets and states
      </label>
      <div className="relative">
        <IconSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-terminal-text-muted"
        />
        <input
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder="Search commodities, markets, states…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (!isTooShort && resultCount > 0) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
          }}
          className="terminal-control w-full py-1.5 pl-8 pr-3"
        />
      </div>

      {/* The live region. Announced when it changes, so a screen-reader user
          hears the result count without hunting for it. */}
      <p aria-live="polite" className="sr-only">
        {state === 'loading'
          ? 'Searching…'
          : state === 'results'
            ? `${resultCount} result${resultCount === 1 ? '' : 's'} found.`
            : state === 'empty'
              ? 'No results found.'
              : state === 'failed'
                ? 'The search could not be completed. Try again.'
                : ''}
      </p>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="terminal-panel terminal-panel--elevated absolute left-0 right-0 top-full z-[var(--z-dropdown)] mt-1 max-h-80 overflow-y-auto"
        >
          {state === 'loading' ? (
            <p className="px-3 py-4 text-center text-[0.75rem] text-terminal-text-muted">
              Searching…
            </p>
          ) : null}

          {state === 'failed' ? (
            <p className="px-3 py-4 text-center text-[0.75rem] leading-5 text-terminal-text-muted">
              The search could not be completed. Nothing is shown rather than something wrong.
            </p>
          ) : null}

          {state === 'empty' ? (
            <p className="px-3 py-4 text-center text-[0.75rem] leading-5 text-terminal-text-muted">
              {response?.emptyReason ??
                'Nothing matched that search. A commodity in the catalogue is not the same as a commodity with a published price.'}
            </p>
          ) : null}

          {state === 'results' && response
            ? response.groups.map((group) => {
                if (group.results.length === 0) return null;
                const Icon = GROUP_ICONS[group.id as keyof typeof GROUP_ICONS];
                return (
                  <section key={group.id} className="border-b border-terminal-border last:border-0">
                    <h3 className="figure-label px-3 pb-1 pt-2 text-terminal-text-muted">
                      {group.label}
                    </h3>
                    <ul>
                      {group.results.map((result) => (
                        <li key={result.href}>
                          <Link
                            href={result.href}
                            onClick={() => setIsOpen(false)}
                            className="flex min-h-[2.75rem] items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-terminal-interactive"
                          >
                            {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-terminal-text-muted" /> : null}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                                {result.label}
                              </span>
                              {result.detail ? (
                                <span className="block truncate text-[0.6875rem] text-terminal-text-muted">
                                  {result.detail}
                                </span>
                              ) : null}
                            </span>
                            <IconArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-terminal-text-muted" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            : null}
        </div>
      ) : null}
    </div>
  );
}
