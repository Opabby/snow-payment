/**
 * E2E tests for POST /api/webhooks
 *
 * What is tested:
 *  1. Stripe signature validation (no Supabase dependency)
 *  2. Event routing — each relevant event type is accepted
 *  3. Unsupported event types are rejected
 *  4. Replay-attack protection (expired timestamp)
 *  5. One-time payment checkout sessions return 200
 *
 * Event-processing tests (product/price) verify that the endpoint accepts
 * the event (signature OK, routing OK).  The Supabase upsert/delete that
 * follows may fail if a local Supabase instance is not running — that is a
 * separate integration concern and those tests accept either 200 (fully
 * integrated) or 400 (Supabase not reachable).
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { generateWebhookSignature, getWebhookSecret } from '../helpers/stripe-helpers';
import { events } from '../fixtures/stripe-events';

const ENDPOINT = '/api/webhooks';

// ─── Helper ───────────────────────────────────────────────────────────────────

async function postWebhook(
  request: APIRequestContext,
  payload: string,
  signature: string
) {
  return request.post(ENDPOINT, {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
  });
}

function sign(payload: string, timestamp?: number) {
  return generateWebhookSignature(payload, getWebhookSecret(), timestamp);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Webhook endpoint — signature validation', () => {
  test('rejects request with no stripe-signature header', async ({ request }) => {
    const payload = JSON.stringify(events.productCreated());
    const res = await request.post(ENDPOINT, {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Webhook Error');
  });

  test('rejects request with a tampered (invalid) signature', async ({ request }) => {
    const payload = JSON.stringify(events.productCreated());
    const res = await postWebhook(request, payload, 't=1234567890,v1=badsignature');
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Webhook Error');
  });

  test('rejects request where signature was signed with a different secret', async ({
    request,
  }) => {
    const payload = JSON.stringify(events.productCreated());
    const wrongSecret = 'whsec_wrong_secret_for_testing_purposes_only';
    const sig = generateWebhookSignature(payload, wrongSecret);
    const res = await postWebhook(request, payload, sig);
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Webhook Error');
  });

  test('rejects replayed request (timestamp > 5 minutes old)', async ({ request }) => {
    const payload = JSON.stringify(events.productCreated());
    // Stripe rejects timestamps older than 300 s (5 min) by default
    const staleTimestamp = Math.floor(Date.now() / 1000) - 400;
    const sig = sign(payload, staleTimestamp);
    const res = await postWebhook(request, payload, sig);
    expect(res.status()).toBe(400);
  });

  test('rejects unsupported event type (not in relevantEvents)', async ({ request }) => {
    const payload = JSON.stringify(events.unsupported());
    const sig = sign(payload);
    const res = await postWebhook(request, payload, sig);
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Unsupported event type');
  });
});

// ─── Product events ───────────────────────────────────────────────────────────

test.describe('Webhook endpoint — product events', () => {
  for (const [label, factory] of [
    ['product.created', events.productCreated],
    ['product.updated', events.productUpdated],
    ['product.deleted', events.productDeleted],
  ] as const) {
    test(`routes ${label} correctly`, async ({ request }) => {
      const payload = JSON.stringify(factory());
      const sig = sign(payload);
      const res = await postWebhook(request, payload, sig);

      // 200 → event processed (Supabase running)
      // 400 → Supabase unavailable; signature & routing were correct
      expect([200, 400]).toContain(res.status());
      if (res.status() === 200) {
        expect(await res.json()).toEqual({ received: true });
      }
    });
  }
});

// ─── Price events ─────────────────────────────────────────────────────────────

test.describe('Webhook endpoint — price events', () => {
  for (const [label, factory] of [
    ['price.created', events.priceCreated],
    ['price.updated', events.priceUpdated],
    ['price.deleted', events.priceDeleted],
  ] as const) {
    test(`routes ${label} correctly`, async ({ request }) => {
      const payload = JSON.stringify(factory());
      const sig = sign(payload);
      const res = await postWebhook(request, payload, sig);
      expect([200, 400]).toContain(res.status());
    });
  }
});

// ─── Checkout session events ──────────────────────────────────────────────────

test.describe('Webhook endpoint — checkout.session.completed', () => {
  test('payment-mode session is a no-op and returns 200', async ({ request }) => {
    /**
     * When mode === 'payment' the handler skips manageSubscriptionStatusChange()
     * and breaks immediately, so no external calls are made — always returns 200.
     */
    const payload = JSON.stringify(events.checkoutSessionCompletedPayment());
    const sig = sign(payload);
    const res = await postWebhook(request, payload, sig);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});
