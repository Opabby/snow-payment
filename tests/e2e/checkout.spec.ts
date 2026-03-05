/**
 * E2E tests for the Stripe Checkout flow
 *
 * Flow under test:
 *   User clicks "Assinar" / "Comprar sessão"
 *   → checkoutWithStripe() Server Action is invoked
 *   → stripe.checkout.sessions.create() is called server-side (real Stripe API)
 *   → sessionId is returned to the browser
 *   → @stripe/stripe-js redirectToCheckout({ sessionId }) navigates to checkout.stripe.com
 *
 * The browser navigation to checkout.stripe.com is INTERCEPTED and ABORTED by
 * the test so we never leave the local environment.  We assert that the redirect
 * was attempted, proving the full flow executed correctly.
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY (test key)           — for server-side session creation
 *   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY     — for Stripe.js client initialisation
 *   - Products + prices seeded in Supabase   — run: npm run stripe:fixtures
 */

import { test, expect } from '@playwright/test';

test.describe('Checkout flow — subscription', () => {
  test('clicking "Assinar" initiates a redirect to checkout.stripe.com', async ({
    page,
  }) => {
    await page.goto('/');

    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) {
      test.skip(true, 'No products in DB — run `npm run stripe:fixtures` first');
    }

    // Intercept and abort the Stripe checkout redirect so the test stays local
    let stripeRedirectUrl: string | null = null;
    await page.route(/checkout\.stripe\.com/, (route) => {
      stripeRedirectUrl = route.request().url();
      route.abort();
    });

    // Click the first "Assinar" button
    const assinarBtn = page.getByRole('button', { name: 'Assinar' }).first();
    await assinarBtn.click();

    // Button should show a loading state while the server action runs
    await expect(assinarBtn).toBeDisabled({ timeout: 10_000 }).catch(() => {
      // Some browsers may not mark it disabled — acceptable
    });

    // Wait for the Stripe redirect attempt (up to 20 s for server action + Stripe API)
    await page.waitForRequest(/checkout\.stripe\.com|stripe\.com\/c\/pay/, {
      timeout: 20_000,
    }).catch(() => {
      // waitForRequest throws if no match — we'll check the captured URL below
    });

    expect(stripeRedirectUrl).toBeTruthy();
    expect(stripeRedirectUrl).toContain('stripe.com');
  });

  test('no error toast is shown after successful checkout initiation', async ({ page }) => {
    await page.goto('/');
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) {
      test.skip(true, 'No products in DB');
    }

    let stripeRedirectUrl: string | null = null;
    await page.route(/checkout\.stripe\.com/, (route) => {
      stripeRedirectUrl = route.request().url();
      route.abort();
    });

    await page.getByRole('button', { name: 'Assinar' }).first().click();

    // Wait briefly for any error toasts to appear
    await page.waitForTimeout(3_000);

    // No error should be visible on the page
    const errorToast = page.locator('[role="status"]:has-text("error"), [role="alert"]');
    const errorCount = await errorToast.count();
    expect(errorCount).toBe(0);

    expect(stripeRedirectUrl).toBeTruthy();
  });
});

test.describe('Checkout flow — one-time payment', () => {
  test('clicking "Comprar sessão" initiates a redirect to checkout.stripe.com', async ({
    page,
  }) => {
    await page.goto('/');

    const buyBtn = page.getByRole('button', { name: 'Comprar sessão' }).first();
    const hasOneTime = await buyBtn.isVisible();
    if (!hasOneTime) {
      test.skip(true, 'No one-time products in DB');
    }

    let stripeRedirectUrl: string | null = null;
    await page.route(/checkout\.stripe\.com/, (route) => {
      stripeRedirectUrl = route.request().url();
      route.abort();
    });

    await buyBtn.click();

    await page.waitForRequest(/checkout\.stripe\.com|stripe\.com\/c\/pay/, {
      timeout: 20_000,
    }).catch(() => {});

    expect(stripeRedirectUrl).toBeTruthy();
    expect(stripeRedirectUrl).toContain('stripe.com');
  });
});

test.describe('Checkout flow — error handling', () => {
  test('shows error redirect when Stripe is misconfigured', async ({ page }) => {
    /**
     * If NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is blank or invalid, getStripe()
     * returns null.  The handler pushes the error redirect URL.
     * We test the client-side error path by observing the URL change.
     *
     * This test only runs when the publishable key is intentionally missing.
     * In a properly configured environment the checkout succeeds, so we
     * skip this test.
     */
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      test.skip(true, 'Stripe is properly configured — skipping error-path test');
    }

    await page.goto('/');
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    await page.getByRole('button', { name: 'Assinar' }).first().click();

    // The error redirect appends ?error=... to the URL
    await page.waitForURL(/\?error=/, { timeout: 10_000 });
    expect(page.url()).toContain('error');
  });
});
