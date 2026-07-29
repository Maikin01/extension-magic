import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/obrigado")({
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-12 text-[#0f172a]">
      <section
        aria-labelledby="thank-you-title"
        className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white px-6 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-10"
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[rgba(220,38,38,0.08)]">
          <Check className="size-8 text-[#dc2626]" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#dc2626]">
          Compra confirmada
        </p>
        <h1
          id="thank-you-title"
          className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Obrigado pela sua compra!
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#475569]">
          Seu acesso está disponível. Crie sua conta usando o mesmo e-mail informado na compra.
        </p>

        <Link
          to="/revenda/criar-conta"
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#dc2626] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#b91c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626] focus-visible:ring-offset-2"
        >
          Acessar meu produto
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>

        <p className="mt-5 text-sm text-[#64748b]">
          Você será direcionado para criar sua senha de acesso.
        </p>
      </section>
    </main>
  );
}
