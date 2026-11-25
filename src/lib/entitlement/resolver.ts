import 'server-only';

/**
 * Hatsi360 Markets — the EntitlementResolver.
 *
 * Phase 10 §3 lists the five layers, and this is the first one: identity.
 * *"Resolve the principal server-side. Never trust a browser-supplied user,
 * organization, plan, or role identifier."*
 *
 * Every fact a `PolicyContext` carries therefore comes from a server-side
 * record — the session, the API key's owner, the subscription row — and never
 * from a request parameter, header or body the caller controls. A caller who
 * POSTs `{"plan":"enterprise"` has changed nothing.
 *
 * The function below is pure so it can be tested without a database: the
 * caller gathers the facts, and this assembles them into a context the policy
 * evaluator can act on. The gathering is where the trust boundary is enforced,
 * and it is deliberately not hidden inside a helper.
 */

import type { PolicyContext } from './policy';

/** What the resolver needs to know about the caller's identity. */
export interface PrincipalFacts {
  /** The authenticated principal, or null for an anonymous caller. */
  principalId: string | null;
  /** The account's state, from the profile record. */
  accountStatus?: PolicyContext['accountStatus'];

  /** Active organization membership, when the caller acts within one. */
  organization?: PolicyContext['organization'];

  /** Entitlement keys held, from every eligible source. */
  grantKeys?: readonly string[];
  /** Which source produced each key, for the decision's `source` field. */
  grantSources?: Record<string, string>;

  /** The subscription record, when one exists. */
  subscription?: PolicyContext['subscription'];

  /** Whether the caller may act on the specific record requested. */
  resourceAuthorized?: boolean;
  /** Whether the caller's role permits the action. */
  rolePermitsAction?: boolean;
  /** The caller's region, when a feature is region-limited. */
  region?: string | null;
  /** Measured usage in the current period. */
  usage?: PolicyContext['usage'];
  /** Regions a feature may be used in, when it is region-limited. */
  featureRegions?: readonly string[] | null;
  /** A service-wide or feature-wide temporary block. */
  serviceRestriction?: PolicyContext['serviceRestriction'];
}

/**
 * Assemble a policy context from server-side facts.
 *
 * The defaults are all the restrictive direction, because §17 requires a
 * protected operation *fail closed*: an unknown account status is not an active
 * one, an absent grant is not an implied one, and an unknown usage figure is
 * not an unlimited one. A caller who forgets to supply a fact gets a denial
 * rather than a silent pass.
 */
export function buildPolicyContext(facts: PrincipalFacts): PolicyContext {
  return {
    principalId: facts.principalId,
    accountStatus: facts.accountStatus ?? 'unknown',
    organization: facts.organization ?? null,
    grantKeys: facts.grantKeys ?? [],
    grantSources: facts.grantSources,
    subscription: facts.subscription ?? null,
    resourceAuthorized: facts.resourceAuthorized,
    rolePermitsAction: facts.rolePermitsAction,
    region: facts.region ?? null,
    featureRegions: facts.featureRegions ?? null,
    usage: facts.usage ?? null,
    serviceRestriction: facts.serviceRestriction ?? null,
  };
}

/**
 * A context for an anonymous caller.
 *
 * Explicit rather than an empty object, so the denial they receive is
 * `unauthenticated` — which tells them to sign in — instead of `unauthorized`,
 * which tells them they are not allowed. §7 distinguishes the two for exactly
 * this reason.
 */
export function anonymousPolicyContext(): PolicyContext {
  return buildPolicyContext({ principalId: null });
}

/**
 * The context for a service-role caller, such as a background job.
 *
 * A job has no human session, so its identity is the job itself. It carries no
 * grants of its own: §12 requires service-role access stay server-side, and a
 * job that could act as any user would be a way around every restriction in
 * the system.
 */
export function systemPolicyContext(
  jobId: string,
  overrides: Partial<PrincipalFacts> = {},
): PolicyContext {
  return buildPolicyContext({
    principalId: `system:${jobId}`,
    accountStatus: 'active',
    ...overrides,
  });
}
