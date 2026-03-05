import * as crypto from 'crypto';

/**
 * Generates a valid Stripe webhook `stripe-signature` header for testing.
 *
 * Implements the same HMAC-SHA256 scheme that `stripe.webhooks.constructEvent()`
 * validates:  t={timestamp},v1={hmac_sha256(timestamp.payload, secret)}
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Returns the STRIPE_WEBHOOK_SECRET from the environment.
 * Falls back to a dummy value that will produce valid signatures for locally-faked events
 * but will still be rejected by the real Stripe SDK when the secret doesn't match.
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local before running tests.'
    );
  }
  return secret;
}

/**
 * Returns the SUPABASE_SERVICE_ROLE_KEY from the environment.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local before running tests.'
    );
  }
  return key;
}
