import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load local env vars so STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, etc. are available
dotenv.config({ path: '.env.local' });

export default defineConfig({
  testDir: './tests/e2e',
  // Run tests sequentially – Stripe/Supabase state is shared
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Allow navigating to external Stripe pages (they'll be intercepted/aborted in tests)
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run dev',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
