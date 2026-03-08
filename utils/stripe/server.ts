'use server';

import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import {
  getURL,
  getErrorRedirect,
  calculateTrialEndUnixTimestamp
} from '@/utils/helpers';
import { Tables } from '@/types_db';

export async function createStripePortal(currentPath: string): Promise<string> {
  return getURL(currentPath);
}

type Price = Tables<'prices'>;

type CheckoutResponse = {
  errorRedirect?: string;
  sessionId?: string;
};

export async function checkoutWithStripe(
  price: Price,
  redirectPath: string = '/',
  successPath: string = '/success'
): Promise<CheckoutResponse> {
  try {
    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      cancel_url: getURL(),
      success_url: getURL(successPath)
    };

    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
        subscription_data: {
          trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days)
        }
      };
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment'
      };
    }

    // Create a checkout session in Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err) {
      console.error(err);
      throw new Error('Unable to create checkout session.');
    }

    if (session) {
      return { sessionId: session.id };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}
