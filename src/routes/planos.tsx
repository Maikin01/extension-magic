import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPlans, createManualLicense } from "@/lib/license.functions";
import { formatPrice } from "@/lib/license-utils";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Lovable" },
      {
        name: "description",
        content:
          "Planos flexíveis para a extensão Lovable: teste, semanal, mensal, trimestral, semestral e anual.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Planos</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Escolha o tempo de acesso que faz sentido pra você. Cancele quando quiser.
          </p>
        </header>
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted-foreground">Carregando planos…</div>
          }
        >
          <PlansGrid />
        </Suspense>
      </main>
    </div>
  );
}

function PlansGrid() {
  const getPlans = useServerFn(getPublicPlans);
  const createLic = useServerFn(createManualLicense);
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: plans } = useSuspenseQuery({
    queryKey: ["plans", "public"],
    queryFn: () => getPlans(),
  });

  const mutation = useMutation({
    mutationFn: (slug: string) => createLic({ data: { plan_slug: slug } }),
    onSuccess: () => {
      toast.success("Licença criada! Veja no painel.");
      qc.invalidateQueries();
      setTimeout(() => (window.location.href = "/dashboard"), 500);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const highlight = plan.slug === "monthly";
        const features = (plan.features as string[]) ?? [];
        return (
          <Card
            key={plan.id}
            className={`flex flex-col p-6 ${
              highlight ? "border-primary shadow-lg ring-1 ring-primary/20" : ""
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              {highlight && <Badge>Mais popular</Badge>}
            </div>
            <div className="mb-1 text-4xl font-bold">
              {plan.price_cents === 0 ? "Grátis" : formatPrice(plan.price_cents)}
            </div>
            <div className="text-sm text-muted-foreground">
              {plan.duration_days} {plan.duration_days === 1 ? "dia" : "dias"} de acesso
            </div>
            {plan.description && (
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
            )}
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {plan.max_devices} {plan.max_devices === 1 ? "dispositivo" : "dispositivos"}
              </li>
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {FEATURE_LABEL[f] ?? f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {authed ? (
                <Button
                  className="w-full"
                  variant={highlight ? "default" : "outline"}
                  onClick={() => mutation.mutate(plan.slug)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && mutation.variables === plan.slug ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…
                    </>
                  ) : plan.price_cents === 0 ? (
                    "Gerar chave grátis"
                  ) : (
                    "Assinar (gerar chave)"
                  )}
                </Button>
              ) : (
                <Button className="w-full" variant={highlight ? "default" : "outline"} asChild>
                  <Link to="/auth">Entrar para assinar</Link>
                </Button>
              )}
            </div>
          </Card>
        );
      })}
      <div className="col-span-full mt-6 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Nota: enquanto o gateway de pagamento não está ativo, o botão gera a chave
        imediatamente para testes. Depois de configurar o Stripe, o fluxo passa pelo
        checkout e a chave é criada automaticamente após o pagamento aprovado.
      </div>
    </div>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  unlimited: "Recursos ilimitados",
  key_daily: "Geração de chaves diárias",
  key_weekly: "Geração de chaves semanais",
  key_monthly: "Geração de chaves mensais",
};
