import { stripe } from '@/utils/stripe/config';
import {
  upsertProductRecord,
  upsertPriceRecord
} from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Sync all active products from Stripe to Supabase
    const products = await stripe.products.list({ active: true, limit: 100 });
    for (const product of products.data) {
      await upsertProductRecord(product);
    }

    // Sync all active prices from Stripe to Supabase
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    for (const price of prices.data) {
      await upsertPriceRecord(price);
    }

    return NextResponse.json({
      synced: {
        products: products.data.length,
        prices: prices.data.length
      }
    });
  } catch (error) {
    console.error('Stripe sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
