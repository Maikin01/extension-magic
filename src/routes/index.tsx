import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Card } from "@/components/ui/card";
import riseLogo from "@/assets/rise-logo.jpg.asset.json";
import {
  ChevronRight,
  Sparkles,
  Cpu,
  Mic,
  Infinity as InfinityIcon,
  Shield,
  Wand2,
  BrainCircuit,
  MousePointerClick,
  UploadCloud,
  Zap,
  Eraser,
  MessageSquare,
  Bot,
  Puzzle,
  StickyNote,
  Boxes,
  Check,
  Download,
  CheckCircle2,
  LifeBuoy,
} from "lucide-react";
import { getPublicPlans } from "@/lib/license.functions";
import { formatPrice } from "@/lib/license-utils";
import { PixCheckoutDialog } from "@/components/checkout/PixCheckoutDialog";

const PENDING_CHECKOUT_KEY = "rise_lovable_pending_checkout";

function savePendingCheckout(planSlug: string) {
  window.localStorage.setItem(PENDING_CHECKOUT_KEY, planSlug);
  window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, planSlug);
}

function readPendingCheckout() {
  return (
    window.localStorage.getItem(PENDING_CHECKOUT_KEY) ??
    window.sessionStorage.getItem(PENDING_CHECKOUT_KEY)
  );
}

function clearPendingCheckout() {
  window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
  window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}

function getAuthHashParams() {
  const rawHash = window.location.hash.replace(/^#/, "");
  const authParamStart = rawHash.search(/(?:^|[#&?])(access_token|refresh_token|token_hash|type)=/);
  const paramsSource = authParamStart >= 0 ? rawHash.slice(authParamStart).replace(/^[#&?]/, "") : rawHash;
  return new URLSearchParams(paramsSource);
}

function readEmailConfirmationParams() {
  const url = new URL(window.location.href);
  const hash = getAuthHashParams();
  const tokenHash = url.searchParams.get("token_hash") ?? hash.get("token_hash");
  const type = url.searchParams.get("type") ?? hash.get("type") ?? "signup";
  return {
    code: url.searchParams.get("code"),
    tokenHash,
    type,
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
  };
}

function hasEmailConfirmationParams() {
  const url = new URL(window.location.href);
  const hash = getAuthHashParams();
  return (
    url.searchParams.has("code") ||
    url.searchParams.has("token_hash") ||
    window.location.hash.includes("access_token=") ||
    window.location.hash.includes("refresh_token=") ||
    hash.has("access_token") ||
    hash.has("refresh_token")
  );
}

async function finishEmailConfirmationFromUrl() {
  const authUrl = readEmailConfirmationParams();

  if (authUrl.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: authUrl.tokenHash,
      type: authUrl.type as any,
    });
    if (error) console.warn("[checkout] Falha ao confirmar token do email", error);
  }

  if (authUrl.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(authUrl.code);
    if (error) console.warn("[checkout] Falha ao concluir confirmação por código", error);
  }

  if (authUrl.accessToken && authUrl.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: authUrl.accessToken,
      refresh_token: authUrl.refreshToken,
    });
    if (error) console.warn("[checkout] Falha ao restaurar sessão da confirmação", error);
  }
}

async function waitForVerifiedCheckoutUser(attempts: number) {
  for (let i = 0; i < attempts; i++) {
    // getSession é local (lê do storage) — instantâneo, sem round-trip de rede.
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user;
    await new Promise((resolve) => window.setTimeout(resolve, 60));
  }
  return null;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rise Lovable — Domine o Lovable em outro nível" },
      {
        name: "description",
        content:
          "A extensão definitiva para power-users do Lovable.dev. Sidebar IA, prompt por voz, uso ilimitado e licenças validadas em tempo real.",
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
        <HowItWorks />
        <Features />
        <Plans />
        <FinalCTA />
        <SupportCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. HERO                                                             */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="rise-bg overflow-hidden border-b border-white/5">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="chip-neon mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            <Sparkles className="h-3 w-3" />
            Ferramenta secreta dos usuários avançados de IA
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            USE O LOVABLE
            <br />
            EM <span className="text-gradient-red">OUTRO NÍVEL.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
            A extensão definitiva para{" "}
            <span className="font-medium text-white">produtividade com IA</span>
            , automação e uso avançado do Lovable.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#plans"
              className="btn-neon group inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold uppercase tracking-wider text-white"
            >
              Obter acesso
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              to="/auth"
              search={{ claim: "trial" } as any}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Testar grátis
            </Link>
          </div>


          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Cpu, label: "Sidebar IA" },
              { icon: Mic, label: "Prompt por Voz" },
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

        {/* Mockup */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="pointer-events-none absolute -inset-10 -z-0 rounded-[40px] bg-primary/25 blur-[90px]" />
          <div className="ring-glow relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
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
            </div>
          </div>

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

/* ------------------------------------------------------------------ */
/* 2. COMO FUNCIONA                                                    */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Baixe o instalador",
      desc: "Um clique no botão, download imediato. Sem cadastro, sem espera, sem loja de extensões.",
    },
    {
      n: "02",
      title: "Instale no navegador",
      desc: "Ative o modo desenvolvedor, arraste o ZIP e pronto. Funciona em Chrome, Edge, Brave, Opera, Arc.",
    },
    {
      n: "03",
      title: "Pronto pra usar",
      desc: "Abra o Lovable, ative a extensão com sua Key e envie quantos comandos quiser. Sem gastar créditos.",
    },
  ];

  return (
    <section className="bg-panel-alt border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary">
            Como funciona
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Instale, ative e domine em
            <br />
            menos de <span className="text-gradient-red">60 segundos.</span>
          </h2>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3">
          {/* linha conectora */}
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-[62px] hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />

          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-sm transition hover:border-primary/30"
            >
              <div className="ring-glow mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/40 bg-black">
                <span className="font-display text-3xl font-black text-gradient-red">
                  {s.n}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
            Comece agora mesmo
          </div>
          <a
            href="#plans"
            className="btn-neon inline-flex h-14 items-center gap-3 rounded-2xl px-8 text-sm font-bold uppercase tracking-wider text-white"
          >
            <Download className="h-5 w-5" />
            Baixar extensão grátis
          </a>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/50">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Grátis para baixar
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Última versão v20.5.2
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Chrome · Edge · Brave · Opera · Arc
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. RECURSOS CORE (bento grid 12)                                    */
/* ------------------------------------------------------------------ */

function Features() {
  const items = [
    {
      icon: Wand2,
      title: "Reescrever",
      desc: "Refine seus prompts com IA antes de enviar. Transforme ideias soltas em comandos cirúrgicos que geram resultados perfeitos na primeira tentativa.",
    },
    {
      icon: BrainCircuit,
      title: "Modo Pensar",
      desc: "Ative o raciocínio profundo da IA com um clique. Ideal para arquiteturas complexas, debugging avançado e decisões técnicas críticas.",
    },
    {
      icon: UploadCloud,
      title: "Upload de Arquivos & Imagens",
      desc: "Envie imagens, PDFs e referências de design direto no chat. A IA usa esses arquivos para construir interfaces fiéis ao seu desejo.",
    },
    {
      icon: Zap,
      title: "Funções Especiais",
      desc: "Atalhos, automações e ações rápidas integradas ao Lovable. Acelere tarefas repetitivas e mantenha o foco no que importa: criar.",
    },
    {
      icon: Eraser,
      title: "Remoção de Marca D'água",
      desc: "Entregue projetos 100% limpos para seus clientes. Sem branding externo, sem identificação de terceiros — apenas a sua marca.",
    },
    {
      icon: MessageSquare,
      title: "Chat Ao Vivo (Anti-Créditos)",
      desc: "Envie comandos diretamente pelo chat oficial do Lovable. Nossa tecnologia intercepta as mensagens e processa tudo sem tocar nos créditos.",
    },
    {
      icon: Puzzle,
      title: "Sistema de Skills",
      desc: "Ative skills especialistas (SEO, Performance, UI/UX, Copy) ou crie as suas próprias. Transforme a IA num especialista em segundos.",
    },
  ];

  return (
    <section className="bg-deep border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 grid gap-6 md:grid-cols-2 md:items-end">
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary">
              Recursos Core
            </div>
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
              Tecnologia de elite para
              <br />
              performance absoluta.
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-white/50 md:text-right">
            Desenvolvemos a Rise Lovable para ser o núcleo operacional
            <br className="hidden md:block" />
            do seu fluxo no Lovable. Sem ruído, apenas resultados.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const num = String(i + 1).padStart(2, "0");
            return (
              <Card
                key={it.title}
                className="group relative overflow-hidden border-white/5 bg-white/[0.015] p-6 transition-all hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
                <div className="mb-6 flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-[0_0_20px_oklch(0.63_0.245_25/0.2)]">
                    <it.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-display text-2xl font-black text-white/10">
                    {num}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{it.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. PLANOS                                                           */
/* ------------------------------------------------------------------ */

function Plans() {
  const getPlans = useServerFn(getPublicPlans);
  const { data: plans = [] } = useQuery({
    queryKey: ["plans", "public"],
    queryFn: () => getPlans(),
  });

  const [checkoutPlan, setCheckoutPlan] = useState<
    { slug: string; name: string; price_cents: number } | null
  >(null);

  function sendToSignup(planSlug: string) {
    if (typeof window !== "undefined") {
      savePendingCheckout(planSlug);
    }
    const search = new URLSearchParams({
      next: `/?checkout=${planSlug}#plans`,
      plan: planSlug,
      tab: "signup",
    });
    window.location.assign(`/auth?${search.toString()}`);
  }

  async function handleSubscribe(plan: { slug: string; name: string; price_cents: number }) {
    try {
      // getSession é local (sem rede) — evita falsos negativos que mandavam o
      // usuário logado para /auth e faziam o ping-pong de volta para os planos.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        setCheckoutPlan(plan);
        return;
      }
      toast.info("Crie sua conta para comprar — sua chave fica salva no painel.");
      sendToSignup(plan.slug);
    } catch {
      sendToSignup(plan.slug);
    }
  }


  // Auto-abre o checkout ao voltar da verificação de email (?checkout=<slug>)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let processing = false;
    let opened = false;
    const params = new URLSearchParams(window.location.search);
    const urlSlug = params.get("checkout");
    const hasAuthCallback = hasEmailConfirmationParams();
    // Só considera storage se houve intenção explícita, para o link puro abrir no topo.
    const hasIntent = !!urlSlug || window.location.hash === "#plans" || hasAuthCallback;
    const slug =
      urlSlug ??
      (hasIntent
        ? readPendingCheckout()
        : null);
    if (!slug) {
      // limpa storage stale para não afetar futuras aberturas puras do site
      clearPendingCheckout();
      return;
    }
    if (!plans) return;
    const plan = plans.find((p) => p.slug === slug);
    if (!plan || plan.price_cents === 0) return;
    const openCheckout = async () => {
      if (processing || opened || cancelled) return;
      processing = true;
      const user = await waitForVerifiedCheckoutUser(urlSlug || hasAuthCallback ? 28 : 2);
      processing = false;
      if (!user || cancelled || opened) return;
      opened = true;
      clearPendingCheckout();
      // limpa o query param sem recarregar
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("code");
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      // Se veio do fluxo de verificação, força a seção de planos e remove tokens do endereço.
      window.history.replaceState({}, "", url.pathname + url.search + "#plans");
      requestAnimationFrame(() => {
        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setCheckoutPlan({ slug: plan.slug, name: plan.name, price_cents: plan.price_cents });
      });
    };

    finishEmailConfirmationFromUrl().then(openCheckout);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || cancelled) return;
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        openCheckout();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [plans]);

  const highlightSlug = "monthly";

  return (
    <section id="plans" className="bg-panel scroll-mt-20 border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary">
            Planos
          </div>
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
            Escolha o plano que combina
            <br />
            com <span className="text-gradient-red">seu ritmo.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.slice(0, 6).map((plan) => {
            const highlight = plan.slug === highlightSlug;
            const features = (plan.features as string[]) ?? [];
            const isLifetime = plan.slug === "lifetime";
            const durationLabel = plan.duration_minutes
              ? `${plan.duration_minutes} min`
              : isLifetime
                ? "Vitalício"
                : `${plan.duration_days} ${plan.duration_days === 1 ? "dia" : "dias"}`;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col overflow-hidden p-8 transition-all ${
                  highlight
                    ? "ring-glow border-primary/50 bg-gradient-to-b from-[#180606] to-black"
                    : "border-white/5 bg-white/[0.02] hover:border-primary/30"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-primary to-primary/60 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_20px_oklch(0.63_0.245_25/0.6)]">
                    Mais popular
                  </div>
                )}

                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                  {durationLabel}
                  {" · "}
                  {plan.max_devices} disp.
                </div>
                <h3 className="font-display text-2xl font-extrabold">{plan.name}</h3>


                <div className="my-6 flex items-baseline gap-1">
                  {plan.price_cents === 0 ? (
                    <span className="font-display text-5xl font-black">Grátis</span>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-white/60">R$</span>
                      <span className="font-display text-5xl font-black tracking-tight">
                        {formatPrice(plan.price_cents).replace(/^R\$\s?/, "")}
                      </span>
                    </>
                  )}
                </div>

                {plan.description && (
                  <p className="mb-6 text-sm text-white/55">{plan.description}</p>
                )}

                <ul className="mb-8 flex-1 space-y-2.5 text-sm">
                  <li className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" />
                    </div>
                    Acesso ilimitado
                  </li>
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3 w-3" />
                      </div>
                      {FEATURE_LABEL[f] ?? f}
                    </li>
                  ))}
                </ul>

                {plan.slug === "trial" ? (
                  <Link
                    to="/auth"
                    search={{ claim: "trial" } as any}
                    className={`inline-flex h-12 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest transition ${
                      highlight
                        ? "btn-neon text-white"
                        : "border border-white/10 bg-white/5 text-white hover:border-primary/40 hover:bg-white/10"
                    }`}
                  >
                    Testar grátis
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      handleSubscribe({
                        slug: plan.slug,
                        name: plan.name,
                        price_cents: plan.price_cents,
                      })
                    }
                    className={`inline-flex h-12 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest transition ${
                      highlight
                        ? "btn-neon text-white"
                        : "border border-white/10 bg-white/5 text-white hover:border-primary/40 hover:bg-white/10"
                    }`}
                  >
                    Assinar com Pix
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <PixCheckoutDialog
        plan={checkoutPlan}
        open={!!checkoutPlan}
        onOpenChange={(v) => !v && setCheckoutPlan(null)}
      />
    </section>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  unlimited: "Recursos ilimitados",
  key_daily: "Chaves diárias",
  key_weekly: "Chaves semanais",
  key_monthly: "Chaves mensais",
};

/* ------------------------------------------------------------------ */
/* 5. CTA FINAL                                                        */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="bg-band py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="chip-neon mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-primary dot-pulse" />
          Última chamada
        </div>

        <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Pare de queimar créditos.
          <br />
          <span className="text-gradient-red">Comece a dominar.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
          15 dias de garantia. Setup em 60 segundos. Sem cartão, sem enrolação.
          Se não gostar, devolvemos cada centavo.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#plans"
            className="btn-neon group inline-flex h-14 items-center gap-2 rounded-2xl px-8 text-sm font-bold uppercase tracking-wider text-white"
          >
            Ativar Rise Lovable agora
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#plans"
            className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
          >
            Ver todos os planos
          </a>
        </div>


        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-bold uppercase tracking-widest text-white/50">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Garantia 15 dias
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Suporte humano
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Setup em 60s
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                              */
/* ------------------------------------------------------------------ */

function SupportCTA() {
  const href =
    "https://wa.me/5561992039398?text=Ol%C3%A1%21%20Tudo%20bem%3F%20Tenho%20algumas%20d%C3%BAvidas%20sobre%20a%20extens%C3%A3o.%20Pode%20me%20ajudar%2C%20por%20favor%3F";
  return (
    <section className="border-t border-white/5 bg-gradient-to-b from-black to-black/60 py-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_40px_oklch(0.63_0.245_25/0.35)]">
          <LifeBuoy className="h-7 w-7" />
        </span>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Ficou com <span className="text-gradient-red">dúvidas?</span>
        </h2>
        <p className="max-w-xl text-sm text-white/60 md:text-base">
          Fale direto com o nosso suporte no WhatsApp. Respondemos rápido e
          ajudamos você a instalar, ativar e tirar o máximo da extensão.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-neon inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-bold text-white"
        >
          <LifeBuoy className="h-4 w-4" />
          Falar com o Suporte
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-white/40 md:flex-row">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_24px_oklch(0.63_0.245_25/0.55)]">
            <img src={riseLogo.url} alt="Rise Lovable" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            RISE <span className="text-gradient-red">LOVABLE</span>
          </span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </Link>
        <div className="flex items-center gap-6">
          <a href="/#plans" className="hover:text-white">Planos</a>
          <Link to="/auth" className="hover:text-white">Entrar</Link>
        </div>
      </div>
    </footer>
  );
}
