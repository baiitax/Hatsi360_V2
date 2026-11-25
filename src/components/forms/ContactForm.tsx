'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { submitEnquiry } from '@/lib/forms/actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';
import { IconArrowRight, IconCheck } from '@/components/ui/icons';

/**
 * The enquiry form.
 *
 * Three things make it more than a list of inputs:
 *
 *  1. **The topic is a choice, not a dropdown.** Each topic says what it is for,
 *     and choosing one changes the guidance under the message box and offers
 *     the shortcut that usually answers the question without a round trip
 *     (the plan page, the API reference, the methodology).
 *  2. **It answers while you type.** Required fields and the email shape are
 *     checked on blur, the message has a live character count, and the error is
 *     attached to the field it belongs to with `aria-describedby` — so a screen
 *     reader hears "Email address, error: enter the part after the @".
 *  3. **Nothing is lost on failure.** The server action's error is shown beside
 *     the submit control with the alternative mailbox offered, and the fields
 *     keep their values.
 *
 * The server action is still the only thing that stores anything: the client
 * checks are a courtesy, and the same rules run again on the server.
 */

const TOPICS = [
  {
    id: 'market-partnership',
    label: 'Bring a market in',
    hint: 'Add a market, a cooperative or a collection route to the network.',
    placeholder:
      'Which market or route? Which commodities trade there, on which days, and who should we speak to?',
    shortcut: { href: '/coverage', label: 'See the markets already covered' },
  },
  {
    id: 'data-correction',
    label: 'Report a price',
    hint: 'A published figure looks wrong, or a market has moved.',
    placeholder:
      'Commodity, market, grade and date, and the price you believe is correct. We trace it through the verification trail and reply with what we found.',
    shortcut: { href: '/methodology', label: 'How a price is collected and verified' },
  },
  {
    id: 'api',
    label: 'API access',
    hint: 'Keys, rate limits, endpoint coverage and integration questions.',
    placeholder:
      'What are you building, which endpoints do you need, and what volume do you expect?',
    shortcut: { href: '/api-docs', label: 'Read the API reference first' },
  },
  {
    id: 'pricing',
    label: 'Plans',
    hint: 'Professional or Enterprise access, entitlements and invoicing.',
    placeholder: 'Which plan are you considering, and what would you need it to cover?',
    shortcut: { href: '/pricing', label: 'Compare the plans' },
  },
  {
    id: 'report',
    label: 'Research',
    hint: 'A custom report, a dataset export or an analysis engagement.',
    placeholder:
      'The commodities, markets and period you need, and how the output will be used.',
    shortcut: { href: '/reports', label: 'See the published reports' },
  },
  {
    id: 'general',
    label: 'Something else',
    hint: 'Press, partnership, careers or anything not covered above.',
    placeholder: 'Tell us what you need and who you are.',
  },
] as const;

type TopicId = (typeof TOPICS)[number]['id'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 5000;

const fieldBase =
  'w-full rounded-[0.5rem] border bg-terminal-bg px-3 py-2.5 text-sm text-terminal-text placeholder:text-terminal-text-muted/70 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-harvest-400/70';

function fieldTone(invalid: boolean) {
  return invalid
    ? 'border-move-down/70 focus:border-move-down'
    : 'border-terminal-border hover:border-terminal-text-muted/50 focus:border-harvest-500';
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, {});
  const [topic, setTopic] = useState<TopicId>('general');
  const [values, setValues] = useState({ name: '', email: '', organisation: '', message: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const uid = useId();

  const errors: Record<string, string> = {
    name: values.name.trim().length < 2 ? 'Tell us who you are — two characters or more.' : '',
    email: !values.email.trim()
      ? 'We need an address to reply to.'
      : !EMAIL.test(values.email.trim())
        ? 'That does not look like an email address.'
        : '',
    message:
      values.message.trim().length < 10
        ? 'A sentence or two is enough, but we need a little more than that.'
        : '',
  };
  const showError = (field: keyof typeof errors) => touched[field] && Boolean(errors[field]);
  // The count appears only once a field has been visited: announcing three
  // problems before the reader has typed anything is a scolding, not help.
  const invalidCount = Object.keys(errors).filter(
    (field) => touched[field] && errors[field],
  ).length;

  const active = TOPICS.find((entry) => entry.id === topic) ?? TOPICS[TOPICS.length - 1];

  if (state.success) {
    return (
      <div className="terminal-panel p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-move-up/40 bg-move-up/10 text-move-up">
            <IconCheck className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-terminal-text">
              Thank you — your message is with us.
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-terminal-text-secondary">
              {state.success} We reply within one business day, to the address you gave us.
            </p>
          </div>
        </div>

        <ol className="mt-6 space-y-3 border-t border-terminal-border pt-5">
          {[
            ['Logged', 'Your message is stored against the topic you chose.'],
            ['Routed', 'It goes to the person who owns that topic — markets, data or commercial.'],
            ['Answered', 'One business day, from a named member of the team.'],
          ].map(([title, detail], index) => (
            <li key={title} className="flex gap-3 text-sm">
              <span className="figure-num mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-terminal-border text-[0.625rem] font-semibold text-terminal-text-muted">
                {index + 1}
              </span>
              <span>
                <span className="font-semibold text-terminal-text">{title}. </span>
                <span className="text-terminal-text-secondary">{detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/prices" className="terminal-control">
            Back to the price directory
            <IconArrowRight className="size-3.5" />
          </Link>
          <Link href="/faq" className="terminal-control">
            Read the FAQs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="terminal-panel p-5 sm:p-7" noValidate>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-lg font-bold text-terminal-text">Send us a message</h2>
        <p className="text-[0.6875rem] uppercase tracking-wider text-terminal-text-muted">
          Reply within one business day
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="mt-5 rounded-[0.5rem] border border-move-down/40 bg-move-down/10 px-4 py-3 text-sm text-terminal-text"
        >
          <p className="font-semibold">Your message was not sent.</p>
          <p className="mt-1 text-terminal-text-secondary">{state.error}</p>
        </div>
      ) : null}

      {/* ------------------------------------------------------ the topic */}
      <fieldset className="mt-6">
        <legend className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-terminal-text-muted">
          What is this about?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map((entry) => {
            const selected = entry.id === topic;
            return (
              <label
                key={entry.id}
                className={`group flex cursor-pointer items-start gap-2.5 rounded-[0.5rem] border p-2.5 transition-colors ${
                  selected
                    ? 'border-harvest-500/70 bg-harvest-500/10'
                    : 'border-terminal-border bg-terminal-bg/40 hover:border-terminal-text-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={entry.id}
                  checked={selected}
                  onChange={() => setTopic(entry.id)}
                  className="mt-0.5 size-3.5 shrink-0 accent-harvest-500"
                />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-semibold text-terminal-text">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] leading-snug text-terminal-text-secondary">
                    {entry.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ------------------------------------------------------ the fields */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[0.8125rem] font-semibold text-terminal-text">
            Full name <span className="text-move-down">*</span>
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={values.name}
            onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={showError('name') || undefined}
            aria-describedby={showError('name') ? `${uid}-name-error` : undefined}
            className={`${fieldBase} ${fieldTone(showError('name'))}`}
          />
          {showError('name') ? (
            <p id={`${uid}-name-error`} className="mt-1.5 text-[0.6875rem] text-move-down">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${uid}-email`} className="mb-1.5 block text-[0.8125rem] font-semibold text-terminal-text">
            Email address <span className="text-move-down">*</span>
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={showError('email') || undefined}
            aria-describedby={showError('email') ? `${uid}-email-error` : undefined}
            className={`${fieldBase} ${fieldTone(showError('email'))}`}
          />
          {showError('email') ? (
            <p id={`${uid}-email-error`} className="mt-1.5 text-[0.6875rem] text-move-down">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor={`${uid}-organisation`}
            className="mb-1.5 block text-[0.8125rem] font-semibold text-terminal-text"
          >
            Organisation <span className="font-normal text-terminal-text-muted">optional</span>
          </label>
          <input
            id={`${uid}-organisation`}
            name="organisation"
            maxLength={120}
            autoComplete="organization"
            value={values.organisation}
            onChange={(event) => setValues((v) => ({ ...v, organisation: event.target.value }))}
            className={`${fieldBase} border-terminal-border hover:border-terminal-text-muted/50 focus:border-harvest-500`}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={`${uid}-message`} className="block text-[0.8125rem] font-semibold text-terminal-text">
              Message <span className="text-move-down">*</span>
            </label>
            <span
              className={`figure-num text-[0.625rem] tabular-nums ${
                values.message.length > MAX_MESSAGE * 0.9
                  ? 'text-harvest-400'
                  : 'text-terminal-text-muted'
              }`}
            >
              {values.message.length.toLocaleString()} / {MAX_MESSAGE.toLocaleString()}
            </span>
          </div>
          <textarea
            id={`${uid}-message`}
            name="message"
            required
            rows={6}
            maxLength={MAX_MESSAGE}
            placeholder={active.placeholder}
            value={values.message}
            onChange={(event) => setValues((v) => ({ ...v, message: event.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, message: true }))}
            aria-invalid={showError('message') || undefined}
            aria-describedby={`${uid}-message-hint${showError('message') ? ` ${uid}-message-error` : ''}`}
            className={`${fieldBase} resize-y leading-relaxed ${fieldTone(showError('message'))}`}
          />
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <p id={`${uid}-message-hint`} className="text-[0.6875rem] text-terminal-text-muted">
              {active.hint}
            </p>
            {'shortcut' in active && active.shortcut ? (
              <Link
                href={active.shortcut.href}
                className="text-[0.6875rem] font-medium text-harvest-400 underline decoration-harvest-500/40 underline-offset-4 hover:decoration-harvest-400"
              >
                {active.shortcut.label} →
              </Link>
            ) : null}
          </div>
          {showError('message') ? (
            <p id={`${uid}-message-error`} className="mt-1.5 text-[0.6875rem] text-move-down">
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------ the submit */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-terminal-border pt-5">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-[0.5rem] bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-harvest-300 disabled:opacity-60"
        >
          {pending ? (
            <>
              <HatsiSpinner />
              Sending your message…
            </>
          ) : (
            <>
              Send message
              <IconArrowRight className="size-3.5" />
            </>
          )}
        </button>

        <p className="text-[0.6875rem] text-terminal-text-muted">
          {invalidCount > 0
            ? invalidCount === 1
              ? 'One field needs attention.'
              : `${invalidCount} fields need attention.`
            : 'We use your details only to answer this enquiry.'}
        </p>
      </div>
    </form>
  );
}
