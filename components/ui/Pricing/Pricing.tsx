'use client';

import Button from '@/components/ui/Button';
import type { Tables } from '@/types_db';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { getErrorRedirect } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

type BillingInterval = 'lifetime' | 'year' | 'month';

export default function Pricing({ user, products, subscription }: Props) {
  const subscriptionProducts = products.filter((p) =>
    p.prices?.some((price) => price.interval !== null)
  );
  const oneTimeProducts = products.filter((p) =>
    p.prices?.every((price) => price.interval === null)
  );

  const intervals = Array.from(
    new Set(
      subscriptionProducts.flatMap((product) =>
        product?.prices?.map((price) => price?.interval)
      )
    )
  );
  const router = useRouter();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('month');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const currentPath = usePathname();

  const handleStripeCheckout = async (price: Price, productName?: string) => {
    setPriceIdLoading(price.id);

    const successPath = productName
      ? `/success?product=${encodeURIComponent(productName)}`
      : '/success';

    const { errorRedirect, sessionId } = await checkoutWithStripe(
      price,
      currentPath,
      successPath
    );

    if (errorRedirect) {
      setPriceIdLoading(undefined);
      return router.push(errorRedirect);
    }

    if (!sessionId) {
      setPriceIdLoading(undefined);
      return router.push(
        getErrorRedirect(
          currentPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      );
    }

    const stripe = await getStripe();
    stripe?.redirectToCheckout({ sessionId });

    setPriceIdLoading(undefined);
  };

  if (!products.length) {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-pink-500 underline"
              href="https://dashboard.stripe.com/products"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Dashboard
            </a>
            .
          </p>
        </div>
        <LogoCloud />
      </section>
    );
  } else {
    return (
      <section className="bg-black">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold text-white text-center sm:text-6xl">
              Pacotes
            </h1>
            <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 text-center sm:text-2xl">
              Contrate um dos nossos planos para começar o seu tratamento de recuperação de alta performance!
            </p>
            <div className="relative self-center mt-6 bg-zinc-900 rounded-lg p-0.5 flex sm:mt-8 border border-zinc-800">
              {intervals.includes('month') && (
                <button
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  className={`${
                    billingInterval === 'month'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Mensal
                </button>
              )}
              {intervals.includes('year') && (
                <button
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  className={`${
                    billingInterval === 'year'
                      ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                      : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                  } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                >
                  Anual
                </button>
              )}
            </div>
          </div>
          {/* Subscription plans */}
          <div className="mt-12 space-y-0 sm:mt-16 flex flex-wrap justify-center gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {subscriptionProducts.map((product) => {
              const price = product?.prices?.find(
                (price) => price.interval === billingInterval
              );
              if (!price) return null;
              const priceString = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: price.currency!,
                minimumFractionDigits: 0
              }).format((price?.unit_amount || 0) / 100);
              return (
                <div
                  key={product.id}
                  className={cn(
                    'flex flex-col rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900',
                    {
                      'border border-pink-500': subscription
                        ? product.name === subscription?.prices?.products?.name
                        : false
                    },
                    'flex-1',
                    'basis-1/3',
                    'max-w-xs'
                  )}
                >
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold leading-6 text-white">
                      {product.name}
                    </h2>
                    <p className="mt-4 text-zinc-300">{product.description}</p>
                    <p className="mt-8">
                      <span className="text-5xl font-extrabold white">
                        {priceString}
                      </span>
                      <span className="text-base font-medium text-zinc-100">
                        /{billingInterval === 'month' ? 'mês' : 'ano'}
                      </span>
                    </p>
                    <Button
                      variant="slim"
                      type="button"
                      loading={priceIdLoading === price.id}
                      onClick={() => handleStripeCheckout(price, product.name ?? undefined)}
                      className="block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md hover:bg-zinc-900"
                    >
                      {subscription ? 'Gerenciar' : 'Assinar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* One-time purchase */}
          {oneTimeProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-white text-center mb-8">
                Ou experimente uma sessão avulsa
              </h2>
              <div className="flex flex-wrap justify-center gap-6">
                {oneTimeProducts.map((product) => {
                  const price = product?.prices?.find(
                    (price) => price.type === 'one_time'
                  );
                  if (!price) return null;
                  const priceString = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: price.currency!,
                    minimumFractionDigits: 0
                  }).format((price?.unit_amount || 0) / 100);
                  return (
                    <div
                      key={product.id}
                      className="flex flex-col rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900 border border-zinc-700 flex-1 basis-1/3 max-w-xs"
                    >
                      <div className="p-6">
                        <h2 className="text-2xl font-semibold leading-6 text-white">
                          {product.name}
                        </h2>
                        <p className="mt-4 text-zinc-300">
                          {product.description}
                        </p>
                        <p className="mt-8">
                          <span className="text-5xl font-extrabold white">
                            {priceString}
                          </span>
                          <span className="text-base font-medium text-zinc-100">
                            {' '}/ sessão
                          </span>
                        </p>
                        <Button
                          variant="slim"
                          type="button"
                          loading={priceIdLoading === price.id}
                          onClick={() => handleStripeCheckout(price, product.name ?? undefined)}
                          className="block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md hover:bg-zinc-900"
                        >
                          Comprar sessão
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>
    );
  }
}
