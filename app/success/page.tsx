import Link from 'next/link';

export default function SuccessPage() {
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

          <Link
            href="/"
            className="mt-10 inline-block px-8 py-3 text-sm font-semibold text-white bg-zinc-700 rounded-md hover:bg-zinc-600 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </section>
  );
}
