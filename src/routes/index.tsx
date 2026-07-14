import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Key,
  Shield,
  Zap,
  ChevronRight,
  Sparkles,
  Infinity as InfinityIcon,
  Cpu,
  Mic,
  History,
  Code2,
  Lock,
  Rocket,
  Star,
  Users,
  Timer,
  MonitorSmartphone,
  Wand2,
  BrainCircuit,
  MessageSquare,
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
        <Marquee />
        <Features />
        <Showcase />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <Suspense fallback={<PlansPlaceholder />}>
          <PlansPreview />
        </Suspense>
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="rise-bg overflow-hidden border-b border-white/5">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
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
            <span className="font-medium text-white">produtividade com IA</span>
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

        {/* Right — extension mockup */}
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

          <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/70 p-3 pr-4 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_20px_oklch(0.63_0.245_25/0.6)]">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div className="text-[11px] leading-tight">
              <div className="font-bold">Licença ativa</div>
              <div className="text-white/50">Validada em tempo real</div>
            </div>
          </div>

          <div className="absolute -right-4 top-8 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-xl">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <div className="text-[10px] font-semibold uppercase tracking-widest">
              IA · GPT-5 Ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MARQUEE — logos / palavras-chave                                    */
/* ------------------------------------------------------------------ */

function Marquee() {
  const items = [
    "SIDEBAR IA",
    "PROMPT POR VOZ",
    "HISTÓRICO INFINITO",
    "MULTI-CONTA",
    "AUTOMAÇÃO",
    "COMANDOS RÁPIDOS",
    "CHAT AVANÇADO",
    "ANEXOS",
    "MODO PRO",
    "GPT-5 READY",
  ];
  return (
    <section className="border-b border-white/5 bg-black/60">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-6">
        <div className="flex items-center gap-8 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.35em] text-white/30">
          {[...items, ...items].map((w, i) => (
            <span key={i} className="flex items-center gap-8">
              {w}
              <span className="h-1 w-1 rounded-full bg-primary/60" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURES                                                            */
/* ------------------------------------------------------------------ */

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
      icon: MonitorSmartphone,
      title: "Controle total de dispositivos",
      desc: "Veja em quais navegadores sua chave está ativa e revogue com um clique.",
    },
    {
      icon: Zap,
      title: "Respostas em tempo real",
      desc: "Revalidação a cada 30 segundos. Se algo mudar, a extensão trava na hora.",
    },
    {
      icon: Lock,
      title: "Anti-fraude nativo",
      desc: "Fingerprint de dispositivo, rate-limit e detecção automática de compartilhamento.",
    },
    {
      icon: Rocket,
      title: "Feito para produtividade",
      desc: "Sidebar de IA, prompts por voz, histórico e comandos rápidos direto no Lovable.",
    },
  ];
  return (
    <section className="bg-panel border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Por que Rise Lovable
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Rígido, rápido e{" "}
            <span className="text-gradient-red">à prova de fraude.</span>
          </h2>
          <p className="mt-4 max-w-xl text-white/60">
            Cada detalhe da Rise Lovable foi pensado para quem trabalha sério
            com Lovable.dev — do licenciamento à experiência dentro do editor.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

/* ------------------------------------------------------------------ */
/* SHOWCASE — feature cards com visuais diferentes                     */
/* ------------------------------------------------------------------ */

function Showcase() {
  return (
    <section className="bg-deep border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Recursos exclusivos
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Um arsenal dentro do{" "}
            <span className="text-gradient-red">seu navegador.</span>
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-6">
          {/* Big card — Sidebar IA */}
          <Card className="ring-glow relative overflow-hidden border-white/5 bg-gradient-to-br from-black to-[#170606] p-8 lg:col-span-4">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              <BrainCircuit className="mr-1 h-3 w-3" /> Sidebar IA
            </div>
            <h3 className="font-display text-3xl font-extrabold tracking-tight">
              Um copiloto encaixado ao Lovable.
            </h3>
            <p className="mt-3 max-w-md text-sm text-white/60">
              Chat lateral, comandos rápidos, histórico persistente e ações
              contextuais. Tudo com um clique — sem sair do editor.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: MessageSquare, label: "Chat com contexto" },
                { icon: History, label: "Histórico infinito" },
                { icon: Wand2, label: "Ações rápidas" },
                { icon: Code2, label: "Injetar código" },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-white/80">{r.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Voice */}
          <Card className="relative overflow-hidden border-white/5 bg-white/[0.02] p-8 lg:col-span-2">
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
            <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              <Mic className="mr-1 h-3 w-3" /> Prompt por voz
            </div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight">
              Fale. A IA escuta.
            </h3>
            <p className="mt-3 text-sm text-white/60">
              Transcrição em tempo real direto para o prompt do Lovable.
            </p>

            <div className="mt-8 flex items-end gap-1">
              {[24, 40, 16, 52, 32, 60, 20, 44, 28, 48, 18, 36].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-primary/40 to-primary"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </Card>

          {/* Multi devices */}
          <Card className="relative overflow-hidden border-white/5 bg-white/[0.02] p-8 lg:col-span-2">
            <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              <MonitorSmartphone className="mr-1 h-3 w-3" /> Multi-dispositivo
            </div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight">
              Sua licença, seus aparelhos.
            </h3>
            <p className="mt-3 text-sm text-white/60">
              Ative em vários navegadores conforme seu plano. Revogue quando
              quiser.
            </p>
            <div className="mt-6 space-y-2">
              {["Chrome · Desktop", "Edge · Notebook", "Brave · Home"].map(
                (d, i) => (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-[11px]"
                  >
                    <span className="font-mono text-white/70">{d}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        i === 0
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-white/50"
                      }`}
                    >
                      {i === 0 ? "Ativo" : "Ocioso"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </Card>

          {/* Security */}
          <Card className="ring-glow relative overflow-hidden border-white/5 bg-gradient-to-tr from-black to-[#170606] p-8 lg:col-span-4">
            <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              <Lock className="mr-1 h-3 w-3" /> Segurança
            </div>
            <h3 className="font-display text-3xl font-extrabold tracking-tight">
              Licenciamento nível empresarial.
            </h3>
            <p className="mt-3 max-w-md text-sm text-white/60">
              Revalidação constante, detecção de compartilhamento, revogação
              instantânea. Se sua chave for cortada, a extensão trava — sem
              refresh, sem drama.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Revalidação", value: "30s" },
                { label: "Uptime", value: "99,9%" },
                { label: "Latência", value: "<120ms" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/5 bg-black/40 p-4"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    {s.label}
                  </div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-gradient-red">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* HOW IT WORKS                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Users,
      title: "Crie sua conta",
      desc: "Cadastre-se em segundos. Sem cartão, sem fricção.",
    },
    {
      n: "02",
      icon: Key,
      title: "Escolha um plano",
      desc: "Do teste grátis ao anual — pague só pelo que usar.",
    },
    {
      n: "03",
      icon: Rocket,
      title: "Ative a extensão",
      desc: "Cole sua chave, valide e comece a usar em segundos.",
    },
  ];
  return (
    <section className="bg-panel-alt border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Como funciona
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            3 passos.{" "}
            <span className="text-gradient-red">Zero complicação.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute left-full top-10 hidden h-px w-full -translate-x-1/2 bg-gradient-to-r from-primary/40 to-transparent md:block" />
              )}
              <Card className="relative overflow-hidden border-white/5 bg-white/[0.02] p-7 backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                    Passo {s.n}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/60">{s.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* STATS                                                               */
/* ------------------------------------------------------------------ */

function Stats() {
  const stats = [
    { icon: Users, label: "Usuários ativos", value: "12.500+" },
    { icon: Zap, label: "Prompts processados", value: "3,8M" },
    { icon: Timer, label: "Tempo médio de setup", value: "38s" },
    { icon: Star, label: "Satisfação", value: "4,9 / 5" },
  ];
  return (
    <section className="border-b border-white/5 bg-black py-16">
      <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-3xl font-extrabold tracking-tight">
              {s.value}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/40">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TESTIMONIALS                                                        */
/* ------------------------------------------------------------------ */

function Testimonials() {
  const items = [
    {
      name: "Rafael M.",
      role: "Founder · SaaS",
      text: "Depois da Rise Lovable eu economizo pelo menos 2h por dia. A sidebar de IA sozinha já paga o plano anual.",
    },
    {
      name: "Larissa P.",
      role: "Product Designer",
      text: "Prompt por voz muda o jogo. Uso enquanto desenho no Figma e a coisa flui igual conversa.",
    },
    {
      name: "Diego S.",
      role: "Dev Freelancer",
      text: "Testei outras extensões e todas caíram. Essa nunca dá pau, valida na hora e é rápida absurda.",
    },
  ];
  return (
    <section className="bg-deep border-b border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            Quem usa, aprova
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Feedback de{" "}
            <span className="text-gradient-red">quem já rodou.</span>
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <Card
              key={t.name}
              className="relative overflow-hidden border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/80">
                “{t.text}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-black">
                  {t.name.charAt(0)}
                </div>
                <div className="text-xs">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-white/50">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PLANS                                                               */
/* ------------------------------------------------------------------ */

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

  const highlightId = plans.find((p) => /mensal/i.test(p.name))?.id;

  return (
    <section className="bg-band relative border-b border-white/5 py-24">
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

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function FAQ() {
  const items = [
    {
      q: "Em quantos navegadores posso ativar minha chave?",
      a: "Depende do plano. O teste grátis libera 1 dispositivo; os planos pagos vão de 2 a 5. Você pode revogar dispositivos a qualquer momento no painel.",
    },
    {
      q: "O que acontece se minha chave for revogada?",
      a: "A extensão trava na hora. Nossa validação server-side roda a cada 30 segundos e ao abrir o popup — não tem como continuar usando com uma chave cancelada.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Você pode cancelar dentro do painel e continuar usando até o final do período pago. Sem multa, sem burocracia.",
    },
    {
      q: "A extensão funciona em qual navegador?",
      a: "Qualquer navegador baseado em Chromium — Chrome, Edge, Brave, Opera, Arc, Vivaldi.",
    },
    {
      q: "Meus dados ficam salvos onde?",
      a: "Tudo criptografado no nosso backend. A extensão nunca decide sozinha se você tem acesso: cada validação passa pelo servidor.",
    },
  ];
  return (
    <section className="bg-panel border-b border-white/5 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <div className="chip-neon mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            FAQ
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Dúvidas <span className="text-gradient-red">frequentes.</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {items.map((it, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] px-5 backdrop-blur-sm data-[state=open]:border-primary/40"
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-white/60">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FINAL CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="rise-bg relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 mx-auto h-72 w-[70%] -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div className="chip-neon mb-6 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="mr-1 h-3 w-3" /> Última chamada
        </div>
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
          Pronto pra ativar a{" "}
          <span className="text-gradient-red">extensão?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-white/60">
          Crie sua conta, escolha um plano e receba sua chave imediatamente.
          Setup em menos de um minuto.
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

/* ------------------------------------------------------------------ */
/* FOOTER                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_24px_oklch(0.63_0.245_25/0.55)]">
              <span className="text-sm font-black tracking-tighter text-white">
                R
              </span>
            </span>
            <span className="font-display text-base tracking-tight">
              RISE <span className="text-gradient-red">LOVABLE</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-white/50">
            A extensão definitiva para quem leva Lovable.dev a sério. Feita por
            power-users, para power-users.
          </p>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
            Produto
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/planos" className="hover:text-white">Planos</Link></li>
            <li><Link to="/auth" className="hover:text-white">Entrar</Link></li>
            <li><Link to="/auth" className="hover:text-white">Criar conta</Link></li>
          </ul>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
            Suporte
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Central de ajuda</li>
            <li>Contato</li>
            <li>Status</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Rise Lovable. Todos os direitos reservados.
      </div>
    </footer>
  );
}
