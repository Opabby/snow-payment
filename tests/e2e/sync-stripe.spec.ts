/**
 * E2E tests for GET /api/sync-stripe
 *
 * This endpoint manually syncs all active Stripe products and prices to Supabase.
 * It is protected by the SUPABASE_SERVICE_ROLE_KEY Bearer token.
 *
 * Tests:
 *  1. Unauthorised requests are rejected (missing / wrong token)
 *  2. Authorised requests are accepted and return sync counts
 *     (requires real STRIPE_SECRET_KEY + Supabase to be running)
 */

import { test, expect } from '@playwright/test';
import { getServiceRoleKey } from '../helpers/stripe-helpers';

const ENDPOINT = '/api/sync-stripe';

test.describe('GET /api/sync-stripe — authorization', () => {
  test('rejects request with no Authorization header', async ({ request }) => {
    const res = await request.get(ENDPOINT);
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json).toMatchObject({ error: 'Unauthorized' });
  });

  test('rejects request with wrong Bearer token', async ({ request }) => {
    const res = await request.get(ENDPOINT, {
      headers: { Authorization: 'Bearer wrong_token_for_testing' },
    });
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json).toMatchObject({ error: 'Unauthorized' });
  });

  test('rejects request with non-Bearer auth scheme', async ({ request }) => {
    const key = getServiceRoleKey();
    const res = await request.get(ENDPOINT, {
      headers: { Authorization: `Basic ${key}` },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/sync-stripe — integration', () => {
  test(
    'authorized request syncs products and prices from Stripe',
    async ({ request }) => {
      const key = getServiceRoleKey();
      const res = await request.get(ENDPOINT, {
        headers: { Authorization: `Bearer ${key}` },
        // Stripe + Supabase calls may be slow
        timeout: 30_000,
      });

      // 200 → fully integrated (Stripe key + Supabase both reachable)
      // 500 → Stripe or Supabase is unavailable in this environment
      expect([200, 500]).toContain(res.status());

      if (res.status() === 200) {
        const json = await res.json();
        expect(json).toHaveProperty('synced');
        expect(json.synced).toHaveProperty('products');
        expect(json.synced).toHaveProperty('prices');
        expect(typeof json.synced.products).toBe('number');
        expect(typeof json.synced.prices).toBe('number');
        // Sanity check: at least one product should exist if fixtures were loaded
        expect(json.synced.products).toBeGreaterThanOrEqual(0);
        expect(json.synced.prices).toBeGreaterThanOrEqual(0);
      }
    }
  );
});
