/**
 * Mock Stripe event payloads for webhook testing.
 *
 * IDs are intentionally fake — the webhook handler routes events to Supabase
 * handlers which may fail on unknown IDs.  That is expected behaviour: the
 * signature-validation and event-routing layers (the parts under test here)
 * still work correctly.
 */

const now = () => Math.floor(Date.now() / 1000);

// ─── Shared mock objects ──────────────────────────────────────────────────────

export const TEST_PRODUCT_ID = 'prod_test_snow_e2e_001';
export const TEST_PRICE_ID = 'price_test_snow_e2e_monthly';
export const TEST_CUSTOMER_ID = 'cus_test_snow_e2e_001';
export const TEST_SUBSCRIPTION_ID = 'sub_test_snow_e2e_001';
export const TEST_SESSION_ID = 'cs_test_snow_e2e_001';

export const mockProduct = {
  id: TEST_PRODUCT_ID,
  object: 'product',
  active: true,
  created: now(),
  default_price: null,
  description: 'Plano de recuperação Snow E2E',
  images: [],
  livemode: false,
  metadata: { index: '0' },
  name: 'Snow E2E Plan',
  type: 'service',
  updated: now(),
};

export const mockPrice = {
  id: TEST_PRICE_ID,
  object: 'price',
  active: true,
  billing_scheme: 'per_unit',
  created: now(),
  currency: 'brl',
  livemode: false,
  lookup_key: null,
  metadata: {},
  nickname: null,
  product: TEST_PRODUCT_ID,
  recurring: {
    aggregate_usage: null,
    interval: 'month',
    interval_count: 1,
    trial_period_days: null,
    usage_type: 'licensed',
  },
  tax_behavior: 'unspecified',
  tiers_mode: null,
  transform_quantity: null,
  type: 'recurring',
  unit_amount: 9900,
  unit_amount_decimal: '9900',
};

export const mockOneTimePrice = {
  ...mockPrice,
  id: 'price_test_snow_e2e_onetime',
  type: 'one_time',
  recurring: null,
};

export const mockSubscription = {
  id: TEST_SUBSCRIPTION_ID,
  object: 'subscription',
  application: null,
  application_fee_percent: null,
  automatic_tax: { enabled: false },
  billing_cycle_anchor: now(),
  billing_thresholds: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  collection_method: 'charge_automatically',
  created: now(),
  currency: 'brl',
  current_period_end: now() + 2_592_000,
  current_period_start: now(),
  customer: TEST_CUSTOMER_ID,
  default_payment_method: null,
  description: null,
  discount: null,
  ended_at: null,
  items: {
    object: 'list',
    data: [
      {
        id: 'si_test_snow_e2e_001',
        object: 'subscription_item',
        billing_thresholds: null,
        created: now(),
        metadata: {},
        price: mockPrice,
        quantity: 1,
        subscription: TEST_SUBSCRIPTION_ID,
        tax_rates: [],
      },
    ],
    has_more: false,
    total_count: 1,
    url: `/v1/subscription_items?subscription=${TEST_SUBSCRIPTION_ID}`,
  },
  latest_invoice: null,
  livemode: false,
  metadata: {},
  next_pending_invoice_item_invoice: null,
  on_behalf_of: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: null,
    payment_method_types: null,
    save_default_payment_method: 'off',
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  plan: mockPrice,
  quantity: 1,
  schedule: null,
  start_date: now(),
  status: 'active',
  test_clock: null,
  transfer_data: null,
  trial_end: null,
  trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } },
  trial_start: null,
};

export const mockCheckoutSessionSubscription = {
  id: TEST_SESSION_ID,
  object: 'checkout.session',
  after_expiration: null,
  allow_promotion_codes: true,
  amount_subtotal: 9900,
  amount_total: 9900,
  automatic_tax: { enabled: false, status: null },
  billing_address_collection: 'required',
  cancel_url: 'http://localhost:3000',
  client_reference_id: null,
  consent: null,
  consent_collection: null,
  created: now(),
  currency: 'brl',
  custom_fields: [],
  custom_text: { shipping_address: null, submit: null },
  customer: TEST_CUSTOMER_ID,
  customer_creation: null,
  customer_details: {
    address: null,
    email: 'test@snow-e2e.com',
    name: null,
    phone: null,
    tax_exempt: 'none',
    tax_ids: [],
  },
  customer_email: null,
  expires_at: now() + 3600,
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: null,
  metadata: {},
  mode: 'subscription',
  payment_intent: null,
  payment_link: null,
  payment_method_collection: 'always',
  payment_method_options: {},
  payment_method_types: ['card'],
  payment_status: 'unpaid',
  phone_number_collection: { enabled: false },
  recovered_from: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_details: null,
  shipping_options: [],
  status: 'complete',
  submit_type: null,
  subscription: TEST_SUBSCRIPTION_ID,
  success_url: 'http://localhost:3000/account',
  total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
  url: null,
};

export const mockCheckoutSessionPayment = {
  ...mockCheckoutSessionSubscription,
  mode: 'payment',
  subscription: null,
  payment_intent: 'pi_test_snow_e2e_001',
};

// ─── Event factory ────────────────────────────────────────────────────────────

function makeEvent(type: string, object: Record<string, unknown>) {
  return {
    id: `evt_test_${type.replace(/\./g, '_')}_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: now(),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  };
}

// ─── Pre-built event payloads ────────────────────────────────────────────────

export const events = {
  productCreated: () => makeEvent('product.created', mockProduct),
  productUpdated: () =>
    makeEvent('product.updated', { ...mockProduct, name: 'Snow E2E Plan Updated' }),
  productDeleted: () => makeEvent('product.deleted', mockProduct),

  priceCreated: () => makeEvent('price.created', mockPrice),
  priceUpdated: () => makeEvent('price.updated', { ...mockPrice, unit_amount: 14900 }),
  priceDeleted: () => makeEvent('price.deleted', mockPrice),

  subscriptionCreated: () => makeEvent('customer.subscription.created', mockSubscription),
  subscriptionUpdated: () =>
    makeEvent('customer.subscription.updated', {
      ...mockSubscription,
      status: 'past_due',
    }),
  subscriptionDeleted: () =>
    makeEvent('customer.subscription.deleted', {
      ...mockSubscription,
      status: 'canceled',
      ended_at: now(),
    }),

  checkoutSessionCompletedSubscription: () =>
    makeEvent('checkout.session.completed', mockCheckoutSessionSubscription),

  /** Payment-mode session — handler should be a no-op (no subscription to sync). */
  checkoutSessionCompletedPayment: () =>
    makeEvent('checkout.session.completed', mockCheckoutSessionPayment),

  /** An event type not in the `relevantEvents` set — should return 400. */
  unsupported: () => makeEvent('invoice.paid', { id: 'in_test_snow_e2e_001' }),
};
