import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Key,
  Shield,
  Zap,
  ChevronRight,
  Sparkles,
  Infinity as InfinityIcon,
  Cpu,
} from "lucide-react";
import { getPublicPlans } from "@/lib/license.functions";
import { formatPrice } from "@/lib/license-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rise Lovable — Licenciamento profissional para a extensão" },
      {
        name: "description",
        content:
          "A extensão definitiva para power-users do Lovable.dev. Chaves únicas, validação em tempo real e planos flexíveis com controle total de dispositivos.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Suspense fallback={<PlansPlaceholder />}>
          <PlansPreview />
        </Suspense>
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="rise-bg overflow-hidden border-b border-white/5">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        {/* Left */}
        <div>
          <div className="chip-neon mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Ferramenta secreta dos usuários avançados
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            USE O LOVABLE
            <br />
            EM <span className="text-gradient-red">OUTRO NÍVEL.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
            A extensão definitiva para{" "}
            <span className="font-medium text-white">
              produtividade com IA
            </span>
            , automação e uso avançado do Lovable.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/planos"
              className="btn-neon group inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold uppercase tracking-wider text-white"
            >
              Obter acesso
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Testar grátis
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Cpu, label: "Sidebar IA" },
              { icon: Zap, label: "Prompt por Voz" },
              { icon: InfinityIcon, label: "Uso Infinito" },
              { icon: Shield, label: "Licença PRO" },
            ].map((f) => (
              <div
                key={f.label}
                className="chip-neon inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right — extension mockup */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="pointer-events-none absolute -inset-10 -z-0 rounded-[40px] bg-primary/25 blur-[90px]" />
          <div className="ring-glow relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
            {/* window chrome */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-primary/50 bg-primary/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Rise Lovable · Extension
              </span>
              <div className="h-3 w-3" />
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-white/50">&gt; RISE LOVABLE 7.0</span>
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  AUTH
                </span>
              </div>

              {[
                { label: "Sessão", value: "PH Teste 2" },
                { label: "Status", value: "Sincronizado" },
                { label: "Workspace", value: "Lovable" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs"
                >
                  <span className="text-white/50">{row.label}</span>
                  <span className="font-semibold text-white/90">{row.value}</span>
                </div>
              ))}

              <div className="flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1 text-[11px]">
                <div className="flex-1 rounded-lg bg-primary/15 py-1.5 text-center font-semibold text-primary">
                  Comando
                </div>
                <div className="flex-1 py-1.5 text-center text-white/50">Ações</div>
                <div className="flex-1 py-1.5 text-center text-white/50">Histórico</div>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Insira seu prompt
                  </span>
                  <span className="chip-neon rounded-full px-2 py-0.5 text-[10px] font-bold">
                    Assistido
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-4/5 rounded bg-white/10" />
                  <div className="h-1.5 w-3/5 rounded bg-white/10" />
                  <div className="h-1.5 w-2/3 rounded bg-white/10" />
                </div>
                <button className="btn-neon mt-4 w-full rounded-lg py-2 text-[11px] font-bold uppercase tracking-widest text-white">
                  Enviar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["Anexar", "Voz", "Código"].map((k) => (
                  <div
                    key={k}
                    className="rounded-lg border border-white/5 bg-white/[0.02] py-2 text-center text-[10px] font-semibold text-white/70"
                  >
                    {k}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* floating badge */}
          <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/70 p-3 pr-4 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_20px_oklch(0.63_0.245_25/0.6)]">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div className="text-[11px] leading-tight">
              <div className="font-bold">Licença ativa</div>
              <div className="text-white/50">Validada em tempo real</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Key,
      title: "Chaves únicas por usuário",
      desc: "Formato LVBL-XXXX-XXXX-XXXX-XXXX, geradas com criptografia forte e vinculadas à sua conta.",
    },
    {
      icon: Shield,
      title: "Validação server-side",
      desc: "A extensão nunca decide sozinha se você tem acesso — toda validação passa pelo nosso servidor.",
    },
    {
      icon: CheckCircle2,
      title: "Controle total de dispositivos",
      desc: "Veja em quais navegadores sua chave está ativa e revogue com um clique.",
    },
  ];
  return (
    <section className="rise-bg border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Por que Rise Lovable
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Rígido, rápido e{" "}
            <span className="text-gradient-red">à prova de fraude.</span>
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((it) => (
            <Card
              key={it.title}
              className="group relative overflow-hidden border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white/[0.04]"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_oklch(0.63_0.245_25/0.25)]">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{it.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlansPlaceholder() {
  return (
    <div className="py-24 text-center text-sm text-white/40">Carregando planos…</div>
  );
}

function PlansPreview() {
  const getPlans = useServerFn(getPublicPlans);
  const { data: plans } = useSuspenseQuery({
    queryKey: ["plans", "public"],
    queryFn: () => getPlans(),
  });

  // destaque o plano mensal (índice ~3) como popular
  const highlightId = plans.find((p) => /mensal/i.test(p.name))?.id;

  return (
    <section className="rise-bg border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Planos
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Escolha seu <span className="text-gradient-red">plano</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Do teste grátis ao anual — sem letra miúda, cancela quando quiser.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {plans.map((p) => {
            const isFree = p.price_cents === 0;
            const isHighlight = p.id === highlightId;
            return (
              <Card
                key={p.id}
                className={`relative flex flex-col overflow-hidden border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm transition ${
                  isHighlight
                    ? "ring-glow border-primary/50"
                    : "hover:border-primary/30 hover:bg-white/[0.04]"
                }`}
              >
                {isHighlight && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-[0_0_18px_oklch(0.63_0.245_25/0.7)]">
                    Popular
                  </span>
                )}
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                  {p.name}
                </div>
                <div className="mt-3 font-display text-3xl font-extrabold">
                  {isFree ? (
                    <span className="text-gradient-red">Grátis</span>
                  ) : (
                    formatPrice(p.price_cents)
                  )}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  {p.duration_days} {p.duration_days === 1 ? "dia" : "dias"}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-white/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {p.max_devices} disp.
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button asChild className="btn-neon rounded-full px-6 font-bold uppercase tracking-wider">
            <Link to="/planos">
              Comparar planos completos <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="rise-bg py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Pronto pra ativar a{" "}
          <span className="text-gradient-red">extensão?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Crie sua conta, escolha um plano e receba sua chave imediatamente.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="btn-neon inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-bold uppercase tracking-wider text-white"
          >
            Começar agora <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/planos"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/60 py-10 text-center text-sm text-white/40">
      <p>© {new Date().getFullYear()} Rise Lovable. Todos os direitos reservados.</p>
    </footer>
  );
}
