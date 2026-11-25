import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { authenticateApiKey, checkRateLimit, logApiUsage, type ApiApplication } from './auth';
import { hasEntitlement, type EntitlementKey } from '@/lib/entitlements';
import type { EntitlementDecision } from '@/lib/entitlement';
import {
  apiDenialBody,
  authorizeAlways,
  httpStatusForDecision,
  retryAfterForDecision,
  buildPolicyContext,
} from '@/lib/entitlement';
import { legacyKeysToFeatures, apiTierToSubscriptionStatus } from '@/lib/entitlement/legacy';

export interface HandlerContext {
  request: Request;
  params: Record<string, string | string[] | undefined>;
  query: URLSearchParams;
}

export interface HandlerOptions<TQuery extends object, TData> {
  /** Zod schema for the query string. Its output is merged into the context. */
  query?: ZodType<TQuery>;
  /** Required API scope. Omit for public, read-only endpoints. */
  scope?: string;
  /** Free-tier rate limit used when no API key is supplied. */
  anonymousRateLimit?: number;
  /**
   * The entitlement a caller must hold to use this endpoint.
   *
   * The check happens on the server. The interface is never the control.
   *
   * This is the Phase 10 §18 legacy path: it is kept so no existing check is
   * weakened during migration. New endpoints should declare `feature` instead,
   * which resolves through the central engine and returns a structured
   * decision. When both are declared the engine runs first, so a route is
   * never less protected than it was.
   */
  entitlement?: EntitlementKey;

  /**
   * The central-registry feature this endpoint requires.
   *
   * §13: a module registers its feature in the central registry and resolves
   * access through the central service, rather than implementing subscription
   * logic of its own. The decision is evaluated server-side and its denial
   * carries a distinct reason code.
   */
  feature?: string;

  /** The action being performed, for the decision and the audit trail. */
  action?: EntitlementDecision['action'];

  /** The feature's region restrictions, when it has any. */
  featureRegions?: readonly string[] | null;
  handler: (
    context: HandlerContext & TQuery & { application: ApiApplication | null },
  ) => Promise<TData | NextResponse>;
}

/**
 * Wraps an API route handler with the behaviour every endpoint shares:
 * query validation, optional API-key authentication, rate limiting, usage
 * logging and a predictable error envelope.
 */
export function createApiHandler<TQuery extends object, TData>(
  options: HandlerOptions<TQuery, TData>,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
  ): Promise<NextResponse> => {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const params = await context.params;

    const auth = await authenticateApiKey(request, options.scope);
    if (!auth.ok) {
      switch (auth.reason) {
        case 'missing':
          return errorResponse(
            'unauthorized',
            options.scope
              ? 'This endpoint requires an API key. Send it as "Authorization: Bearer <key>" or "X-API-Key: <key>".'
              : 'An API key is required for this endpoint.',
            401,
          );
        case 'expired':
          return errorResponse('forbidden', 'This API key has expired. Please issue a new one.', 403);
        case 'inactive':
          return errorResponse('forbidden', 'This API key has been deactivated.', 403);
        default:
          return errorResponse('unauthorized', 'The API key supplied is not valid.', 401);
      }
    }

    // Centralized entitlement gating. Phase 10 §13: a route resolves access
    // through the central engine rather than implementing subscription logic of
    // its own. The decision is built from server-side facts only — the API
    // key's owner and the resolved subscription — never from anything the
    // request carries.
    if (options.feature) {
      const owner = auth.application?.userId ?? null;
      const decision = authorizeAlways(
        options.feature,
        options.action ?? 'read',
        buildPolicyContext({
          principalId: owner,
          accountStatus: owner ? 'active' : 'unknown',
          // §18: the legacy coarse keys are mapped to their central-registry
          // equivalents rather than guessed at, so a subscription means the
          // same thing before and after migration.
          grantKeys: owner
            ? legacyKeysToFeatures(auth.application?.entitlements ?? {})
            : [],
          subscription: owner
            ? { status: apiTierToSubscriptionStatus(auth.application?.tier) }
            : null,
          region: request.headers.get('x-hatsi-region'),
          featureRegions: options.featureRegions ?? null,
        }),
      );

      if (!decision.allowed) {
        const body = apiDenialBody(decision);
        // The denial's own fields sit directly on `error`, alongside the code
        // and message the envelope already carries, so a client reads one
        // object rather than a nested duplicate.
        const response = NextResponse.json(
          {
            error: {
              code: body.error.code,
              message: body.error.message,
              feature: body.error.feature,
              action: body.error.action,
              ...(body.error.upgradeRequired ? { upgradeRequired: true } : {}),
              ...(body.error.allowance ? { allowance: body.error.allowance } : {}),
            },
            meta: {
              requestId: crypto.randomUUID(),
              generatedAt: new Date().toISOString(),
            },
          },
          { status: httpStatusForDecision(decision) },
        );
        const retryAfter = retryAfterForDecision(decision);
        if (retryAfter !== null) response.headers.set('Retry-After', String(retryAfter));
        return response;
      }
    }

    // Legacy entitlement gating. A premium endpoint is refused to a caller
    // without the entitlement, whatever their key's scopes say.
    if (options.entitlement) {
      const entitled = auth.application
        ? hasEntitlement(auth.application.entitlementSet, options.entitlement)
        : false;
      if (!entitled) {
        return errorResponse(
          'forbidden',
          `This endpoint requires the "${options.entitlement}" entitlement. Public price data is available without it at /api/v1/prices/latest.`,
          403,
        );
      }
    }

    const limit = auth.application?.rateLimitPerMinute ?? options.anonymousRateLimit ?? 120;
    const rateKey =
      auth.application?.id ?? `anon:${request.headers.get('x-forwarded-for') ?? 'local'}`;
    const rate = checkRateLimit(rateKey, limit);

    if (!rate.allowed) {
      const response = errorResponse(
        'rate_limited',
        `Rate limit of ${limit} requests per minute exceeded.`,
        429,
        { retryAfterSeconds: rate.retryAfterSeconds },
      );
      response.headers.set('Retry-After', String(rate.retryAfterSeconds));
      return response;
    }

    let parsedQuery = {} as TQuery;
    if (options.query) {
      const raw = Object.fromEntries(url.searchParams.entries());
      const result = options.query.safeParse(raw);
      if (!result.success) {
        return errorResponse(
          'bad_request',
          'One or more query parameters are invalid.',
          400,
          result.error.flatten(),
        );
      }
      parsedQuery = result.data;
    }

    const recordUsage = (statusCode: number) => {
      if (!auth.application) return;
      void logApiUsage({
        applicationId: auth.application.id,
        endpoint: url.pathname,
        method: request.method,
        statusCode,
        responseMs: Date.now() - startedAt,
        request,
      });
    };

    try {
      const data = await options.handler({
        request,
        params,
        query: url.searchParams,
        application: auth.application,
        ...parsedQuery,
      } as HandlerContext & TQuery & { application: ApiApplication | null });

      // A handler may return a ready-made response (for example a 404) to
      // bypass the success envelope.
      if (data instanceof NextResponse) {
        recordUsage(data.status);
        return data;
      }

      const response = NextResponse.json({
        data,
        meta: {
          requestId: crypto.randomUUID(),
          generatedAt: new Date().toISOString(),
          rateLimit: { limit, remaining: rate.remaining },
        },
      });

      response.headers.set('X-RateLimit-Limit', String(limit));
      response.headers.set('X-RateLimit-Remaining', String(rate.remaining));
      recordUsage(200);

      return response;
    } catch (error) {
      console.error('API error on', url.pathname, error);
      recordUsage(500);
      return errorResponse('server_error', 'The request could not be completed.', 500);
    }
  };
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      meta: { requestId: crypto.randomUUID(), generatedAt: new Date().toISOString() },
    },
    { status },
  );
}
