/**
 * Hatsi360 Markets — the authorization helpers.
 *
 * Phase 10 §14 asks for a server authorization helper, an API middleware or
 * route wrapper, server-action authorization, background-job authorization,
 * API-client authorization and a React UI capability helper — with the standing
 * rule that *"frontend helpers are UX only and never the security boundary."*
 *
 * The helpers here exist to carry an `EntitlementDecision` from the evaluator to
 * wherever it is enforced, without each call site reinventing the mapping from
 * a denial reason to an HTTP status or a message. That mapping is where §7's
 * twelve distinguished reasons either reach the customer or get flattened back
 * into one generic error, so it lives in one place.
 */

import type { DenialReason, EntitlementDecision } from './types';
import { DENIAL_REASON_LABELS } from './types';
import { evaluatePolicy, type PolicyContext } from './policy';

/* ------------------------------------------------- the HTTP mapping -- */

/**
 * The status code a denial maps to.
 *
 * The mapping is deliberate and is not a flat 403. An unauthenticated caller
 * gets 401, because the fix is to sign in; a caller whose plan lacks the
 * feature gets 403, because the fix is to pay; a caller who has exhausted a
 * period allowance gets 429, because the fix is to wait. §7: *"Do not use one
 * generic error for every denied request."* A client that retries a 403, or
 * that prompts a sign-in on a 429, is a client that works.
 */
export function httpStatusForDecision(decision: EntitlementDecision): number {
  if (decision.allowed) return 200;

  switch (decision.reasonCode) {
    case 'unauthenticated':
      return 401;
    case 'usage_exhausted':
      return 429;
    case 'temporary_service_restriction':
      return 503;
    default:
      return 403;
  }
}

/** The `Retry-After` value, when a denial is time-based. */
export function retryAfterForDecision(decision: EntitlementDecision): number | null {
  if (decision.reasonCode !== 'usage_exhausted') return null;
  if (!decision.resetAt) return null;
  const resetAt = Date.parse(decision.resetAt);
  if (Number.isNaN(resetAt)) return null;
  return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * The denial body an API returns.
 *
 * §16 requires the denied user be told the feature, the reason, their plan, the
 * required entitlement, their allowance, usage, remaining and reset date — *"do
 * not expose internal security details."* So the body carries the facts a
 * customer can act on and nothing about how the decision was reached.
 */
export interface ApiDenialBody {
  error: {
    code: DenialReason;
    message: string;
    feature: string;
    action: string;
    /** Present when an upgrade would resolve the denial. */
    upgradeRequired?: boolean;
    allowance?: { limit: number; used: number; remaining: number; resetAt?: string };
  };
}

export function apiDenialBody(decision: EntitlementDecision): ApiDenialBody {
  const label = DENIAL_REASON_LABELS[decision.reasonCode as DenialReason] ??
    'Access denied.';

  const body: ApiDenialBody = {
    error: {
      code: decision.reasonCode as DenialReason,
      message: label,
      feature: decision.feature,
      action: decision.action,
    },
  };

  if (decision.upgradeRequired) body.error.upgradeRequired = true;

  if (
    decision.limit !== undefined &&
    decision.used !== undefined &&
    decision.remaining !== undefined
  ) {
    body.error.allowance = {
      limit: decision.limit,
      used: decision.used,
      remaining: decision.remaining,
      ...(decision.resetAt ? { resetAt: decision.resetAt } : {}),
    };
  }

  return body;
}

/* ------------------------------------------- the server-side helper -- */

/**
 * Authorize a server-side capability.
 *
 * This is the helper §14 asks for. It evaluates the policy and returns either
 * `null` — meaning proceed — or the decision, which the caller must honour.
 *
 * Returning a decision rather than throwing keeps the caller in control of the
 * failure shape: a page renders an access-denied panel, an API returns a JSON
 * envelope, a job logs and exits.
 */
export function authorize(
  feature: string,
  action: EntitlementDecision['action'],
  context: PolicyContext,
): EntitlementDecision | null {
  const decision = evaluatePolicy(feature, action, context);
  return decision.allowed ? null : decision;
}

/**
 * Authorize and always return the decision, allowed or not.
 *
 * §7's step 12 requires sensitive decisions be audited, so a caller that logs
 * every evaluation needs the allow path too. This is that variant.
 */
export function authorizeAlways(
  feature: string,
  action: EntitlementDecision['action'],
  context: PolicyContext,
): EntitlementDecision {
  return evaluatePolicy(feature, action, context);
}

/**
 * Authorize a background job.
 *
 * A job runs without a user session, so the principal is the system rather
 * than a person — and a job must never be able to act as an arbitrary user to
 * get around a restriction. §12: *"service-role access stays server-side."*
 * The caller therefore supplies the job's own identity and the record it is
 * acting on, and the policy is applied exactly as it would be for a person.
 */
export function authorizeJob(
  feature: string,
  action: EntitlementDecision['action'],
  context: PolicyContext,
): EntitlementDecision {
  return authorizeAlways(feature, action, context);
}
