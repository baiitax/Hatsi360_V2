'use client';

/**
 * Hatsi360 Markets — the UI capability helper.
 *
 * Phase 10 §14 is explicit that this exists and what it is for:
 *
 *   "Frontend helpers are UX only and never the security boundary."
 *   "A frontend-only authorization result must never override the server's."
 *
 * So this module answers exactly one question — *what should the interface show
 * this visitor?* — and it must never be used to decide whether an operation is
 * permitted. Every protected capability calls `authorize` on the server; this
 * helper only decides whether to render an upgrade prompt instead of a button
 * that would be refused.
 *
 * The distinction is not pedantry. A UI that hides a button a user is entitled
 * to is a bug; a UI that shows a button a user is not entitled to is a bug that
 * the server then fixes. Only the first is a product failure, and only the
 * second is a security failure.
 */

import { useMemo } from 'react';

import {
  DENIAL_REASON_LABELS,
  DENIAL_REMEDY,
  type Action,
  type DenialReason,
  type EntitlementDecision,
} from './types';
import { getFeature } from './registry';
import { describeDenial } from './policy';

/** What the interface needs to know to render a capability. */
export interface UiCapability {
  /** Whether to render the working control rather than a prompt. */
  available: boolean;
  /** The human-readable name of the feature, for the prompt. */
  featureName: string;
  /** A customer-facing explanation, when access is refused. */
  reason: string | null;
  /** What the visitor can do about it, when anything. */
  remedy: 'sign_in' | 'upgrade' | 'wait' | 'contact' | 'none';
  /** The allowance to display, when the feature is metered. */
  allowance: { used: number; limit: number | null; remaining: number | null } | null;
}

/**
 * Resolve a capability for rendering.
 *
 * `decision` is a decision the server already made and passed down. The
 * component must not re-derive it, and must not override it — §7: *"A
 * frontend-only authorization result must never override the server's."* If the
 * server said no, this shows the prompt.
 */
export function useCapability(
  featureKey: string,
  action: Action,
  decision: EntitlementDecision | null,
): UiCapability {
  return useMemo(() => {
    const feature = getFeature(featureKey);
    const featureName = feature?.name ?? featureKey;

    if (decision === null) {
      // No decision was supplied, which means the server has not been asked.
      // The safe direction is to show the prompt, never the control.
      return {
        available: false,
        featureName,
        reason: 'This capability has not been checked yet.',
        remedy: 'none',
        allowance: null,
      } satisfies UiCapability;
    }

    const allowance =
      decision.used !== undefined && decision.limit !== undefined
        ? {
            used: decision.used,
            limit: decision.limit,
            remaining: decision.remaining ?? null,
          }
        : null;

    if (decision.allowed) {
      return {
        available: true,
        featureName,
        reason: null,
        remedy: 'none',
        allowance,
      } satisfies UiCapability;
    }

    const reason = decision.reasonCode as DenialReason;
    return {
      available: false,
      featureName,
      reason: describeDenial(decision),
      remedy: DENIAL_REMEDY[reason] ?? 'none',
      allowance,
    } satisfies UiCapability;
  }, [featureKey, decision]);
}

/**
 * The label for a denial reason, for a component that needs the short form.
 *
 * Exported separately because a badge and a paragraph want different lengths
 * of the same fact, and two copies of the string would drift.
 */
export function denialLabel(reason: DenialReason): string {
  return DENIAL_REASON_LABELS[reason];
}
