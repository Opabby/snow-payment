/**
 * E2E tests for the Pricing / Homepage (GET /)
 *
 * The page is a Next.js Server Component that fetches products and prices
 * from Supabase on every request.  Two states are possible:
 *
 *   a) Products exist in the DB  → full pricing UI is rendered
 *   b) No products in the DB     → empty-state message is rendered
 *
 * Tests cover both states gracefully.  Run `npm run stripe:fixtures` followed
 * by `npm run stripe:listen` (to forward webhooks) to populate the DB.
 */

import { test, expect } from '@playwright/test';

test.describe('Pricing page (/) — structure', () => {
  test('returns HTTP 200', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
  });

  test('renders a <section> containing the Pricing component', async ({ page }) => {
    await page.goto('/');
    // Both the "has products" and "no products" branch render a <section class="bg-black">
    await expect(page.locator('section.bg-black')).toBeVisible();
  });
});

test.describe('Pricing page (/) — with products', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows "Pacotes" heading when products are loaded', async ({ page }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    const hasEmptyState = await page
      .locator('text=No subscription pricing plans found')
      .isVisible();
    // Exactly one of the two states must be visible
    expect(hasProducts || hasEmptyState).toBe(true);

    test.skip(!hasProducts, 'No products in DB — skipping product UI tests');
  });

  test('billing interval toggle is rendered when subscription products exist', async ({
    page,
  }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    // At least one of "Mensal" or "Anual" buttons must be present
    const mensal = page.getByRole('button', { name: 'Mensal' });
    const anual = page.getByRole('button', { name: 'Anual' });
    const hasMensal = await mensal.isVisible();
    const hasAnual = await anual.isVisible();
    expect(hasMensal || hasAnual).toBe(true);
  });

  test('clicking "Anual" switch changes active interval', async ({ page }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    const anualBtn = page.getByRole('button', { name: 'Anual' });
    const isAnualVisible = await anualBtn.isVisible();
    if (!isAnualVisible) test.skip(true, 'No annual prices configured');

    await anualBtn.click();

    // After clicking Anual the button should have the active styling
    await expect(anualBtn).toHaveClass(/bg-zinc-700/);
  });

  test('clicking "Mensal" switch changes active interval', async ({ page }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    const mensalBtn = page.getByRole('button', { name: 'Mensal' });
    const isVisible = await mensalBtn.isVisible();
    if (!isVisible) test.skip(true, 'No monthly prices configured');

    // Switch to annual first, then back to monthly
    const anualBtn = page.getByRole('button', { name: 'Anual' });
    if (await anualBtn.isVisible()) await anualBtn.click();

    await mensalBtn.click();
    await expect(mensalBtn).toHaveClass(/bg-zinc-700/);
  });

  test('subscription plan cards are displayed with price and subscribe button', async ({
    page,
  }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    // Each subscription plan card has an "Assinar" or "Gerenciar" button
    const subscribeButtons = page.getByRole('button', { name: /Assinar|Gerenciar/ });
    const count = await subscribeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('one-time product section is displayed when one-time products exist', async ({
    page,
  }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    const oneTimeSection = page.locator('h2:has-text("Ou experimente uma sessão avulsa")');
    const hasOneTime = await oneTimeSection.isVisible();

    if (hasOneTime) {
      // One-time products have "Comprar sessão" buttons
      const buyButtons = page.getByRole('button', { name: 'Comprar sessão' });
      expect(await buyButtons.count()).toBeGreaterThan(0);
    }
    // If no one-time products, this is also valid — no assertion needed
  });

  test('empty state shows Stripe Dashboard link when no products', async ({ page }) => {
    const hasEmptyState = await page
      .locator('text=No subscription pricing plans found')
      .isVisible();
    if (!hasEmptyState) test.skip(true, 'Products exist — not in empty state');

    await expect(
      page.locator('a[href="https://dashboard.stripe.com/products"]')
    ).toBeVisible();
  });

  test('prices are formatted in BRL currency', async ({ page }) => {
    const hasProducts = await page.locator('h1:has-text("Pacotes")').isVisible();
    if (!hasProducts) test.skip(true, 'No products in DB');

    // Prices in pt-BR format look like "R$\u00a099" or "R$\u00a0100"
    const priceEl = page.locator('span.text-5xl').first();
    const priceText = await priceEl.textContent();
    expect(priceText).toMatch(/R\$/);
  });
});
