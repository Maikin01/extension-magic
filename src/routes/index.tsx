import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Key, Shield, Zap, ChevronRight } from "lucide-react";
import { getPublicPlans } from "@/lib/license.functions";
import { formatPrice } from "@/lib/license-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lovable — Sistema de licenciamento profissional para extensões" },
      {
        name: "description",
        content:
          "Assine, receba sua chave e libere a extensão Lovable em segundos. Validação em tempo real, dispositivos controlados, planos flexíveis.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
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
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:py-32">
        <Badge variant="secondary" className="mb-6">
          <Zap className="mr-1 h-3 w-3" /> Sistema completo de licenciamento
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          A extensão <span className="text-primary">Lovable</span> agora com
          <br />
          licenças profissionais.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Escolha um plano, receba sua chave única, cole na extensão e libere todos os
          recursos. Toda validação acontece em tempo real no nosso servidor.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/planos">
              Ver planos <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth">Criar conta grátis</Link>
          </Button>
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
      desc: "Formato `LVBL-XXXX-XXXX-XXXX-XXXX`, geradas com criptografia forte e vinculadas à sua conta.",
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
    <section className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <Card key={it.title} className="p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlansPlaceholder() {
  return <div className="py-20 text-center text-muted-foreground">Carregando planos…</div>;
}

function PlansPreview() {
  const getPlans = useServerFn(getPublicPlans);
  const { data: plans } = useSuspenseQuery({
    queryKey: ["plans", "public"],
    queryFn: () => getPlans(),
  });

  return (
    <section className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Escolha seu plano</h2>
          <p className="mt-3 text-muted-foreground">Do teste grátis ao anual — sem letra miúda.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
              <div className="mt-2 text-2xl font-bold">
                {p.price_cents === 0 ? "Grátis" : formatPrice(p.price_cents)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.duration_days} {p.duration_days === 1 ? "dia" : "dias"}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {p.max_devices} disp.
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild>
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
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Pronto pra ativar a extensão?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Crie sua conta, escolha um plano e receba sua chave imediatamente.
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link to="/auth">Começar agora</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} Lovable. Todos os direitos reservados.</p>
    </footer>
  );
}
