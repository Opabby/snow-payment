import Link from 'next/link';
import { redirect } from 'next/navigation';
import { stripe } from '@/utils/stripe/config';

const WHATSAPP_NUMBER = '5511972820088';
const WHATSAPP_NAME = 'André Yoshimura';

// Map product names (from Stripe) to a follow-up message.
// Keys are matched case-insensitively via .toLowerCase().
const PRODUCT_MESSAGES: Record<string, string> = {
  // Add your exact Stripe product names here, e.g.:
  // 'plano mensal': 'Entre em contato para agendar suas sessões mensais.',
  // 'plano anual': 'Entre em contato para agendar suas sessões anuais.',
  // 'sessão avulsa': 'Entre em contato para agendar a sua sessão.',
};

const DEFAULT_MESSAGE =
  'Entre em contato para agendar suas sessões.';

function getFollowUpMessage(product: string | undefined): string {
  if (!product) return DEFAULT_MESSAGE;
  const key = Object.keys(PRODUCT_MESSAGES).find(
    (k) => k.toLowerCase() === product.toLowerCase()
  );
  return key ? PRODUCT_MESSAGES[key] : DEFAULT_MESSAGE;
}

function buildWhatsAppUrl(product: string | undefined): string {
  const text = product
    ? `Olá ${WHATSAPP_NAME}! Acabei de adquirir o produto "${product}" e gostaria de agendar minhas sessões.`
    : `Olá ${WHATSAPP_NAME}! Acabei de realizar um pagamento e gostaria de agendar minhas sessões.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

interface Props {
  searchParams: Promise<{ product?: string; session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
  const { product, session_id } = await searchParams;

  if (!session_id) return redirect('/');

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.status !== 'complete') return redirect('/');
  } catch {
    return redirect('/');
  }
  const followUp = getFollowUpMessage(product);
  const whatsappUrl = buildWhatsAppUrl(product);

  return (
    <section className="bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-green-500/20">
            <svg
              className="w-10 h-10 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold text-white sm:text-6xl">
            Pagamento confirmado!
          </h1>

          <p className="max-w-xl mt-6 text-xl text-zinc-300">
            Obrigado pela sua compra. Em breve você receberá um e-mail de confirmação com os detalhes da sua sessão.
          </p>

          <p className="max-w-xl mt-4 text-lg text-zinc-400">
            {followUp}
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 px-8 py-3 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar com {WHATSAPP_NAME}
          </a>

          <Link
            href="/"
            className="mt-4 inline-block px-8 py-3 text-sm font-semibold text-white bg-zinc-700 rounded-md hover:bg-zinc-600 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </section>
  );
}
