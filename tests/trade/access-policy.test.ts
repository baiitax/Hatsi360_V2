import { describe, expect, it } from 'vitest';
import {
  hasPaidIntelligenceSubscription,
  isTradeAdministrator,
} from '@/lib/trade/access-policy';

describe('Trade Intelligence subscription access', () => {
  const now = Date.parse('2026-10-22T12:00:00.000Z');

  it('recognizes only admin roles as the administrator bypass', () => {
    expect(isTradeAdministrator('admin')).toBe(true);
    expect(isTradeAdministrator('super_admin')).toBe(true);
    expect(isTradeAdministrator('analyst')).toBe(false);
    expect(isTradeAdministrator('customer')).toBe(false);
    expect(isTradeAdministrator(null)).toBe(false);
  });

  it('allows an active paid Professional subscription', () => {
    expect(
      hasPaidIntelligenceSubscription(
        [{ status: 'active', entitlements: { reports: true } }],
        now,
      ),
    ).toBe(true);
  });

  it('allows an active paid Enterprise subscription', () => {
    expect(
      hasPaidIntelligenceSubscription(
        [{ status: 'active', entitlements: { reports: true, api: true, bulk: true } }],
        now,
      ),
    ).toBe(true);
  });

  it('does not treat public, unpaid or trial accounts as paid', () => {
    for (const status of ['none', 'past_due', 'canceled', 'trialing']) {
      expect(
        hasPaidIntelligenceSubscription([{ status, entitlements: { reports: true } }], now),
      ).toBe(false);
    }
    expect(hasPaidIntelligenceSubscription([{ status: 'active', entitlements: {} }], now)).toBe(
      false,
    );
  });

  it('rejects subscriptions that have not started or have expired', () => {
    expect(
      hasPaidIntelligenceSubscription(
        [{ status: 'active', starts_at: '2026-10-23T00:00:00.000Z', entitlements: { reports: true } }],
        now,
      ),
    ).toBe(false);
    expect(
      hasPaidIntelligenceSubscription(
        [{ status: 'active', ends_at: '2026-10-22T11:59:59.000Z', entitlements: { reports: true } }],
        now,
      ),
    ).toBe(false);
  });

  it('does not grant access from malformed or browser-shaped entitlement data', () => {
    expect(
      hasPaidIntelligenceSubscription([{ status: 'active', entitlements: ['reports'] }], now),
    ).toBe(false);
    expect(
      hasPaidIntelligenceSubscription(
        [{ status: 'active', entitlements: { reports: 'true', api: 1 } }],
        now,
      ),
    ).toBe(false);
  });

  it('finds an eligible active subscription among multiple rows', () => {
    expect(
      hasPaidIntelligenceSubscription(
        [
          { status: 'canceled', entitlements: { reports: true } },
          { status: 'active', entitlements: { reports: true } },
        ],
        now,
      ),
    ).toBe(true);
  });
});
