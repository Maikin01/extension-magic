import { useState } from "react";
import { Check, KeyRound, Minus, Plus, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/license-utils";

type KeyProduct = {
  slug: string;
  name: string;
  duration: string;
  costCents: number;
  suggestedCents: number;
  highlight?: boolean;
  perks: string[];
};

const KEY_PRODUCTS: KeyProduct[] = [
  {
    slug: "semanal",
    name: "Chave Semanal",
    duration: "7 dias",
    costCents: 1490,
    suggestedCents: 3499,
    perks: ["1 dispositivo", "Ativação imediata", "Ideal para testes"],
  },
  {
    slug: "mensal",
    name: "Chave Mensal",
    duration: "30 dias",
    costCents: 2990,
    suggestedCents: 6990,
    highlight: true,
    perks: ["2 dispositivos", "Melhor giro de venda", "Suporte prioritário"],
  },
  {
    slug: "trimestral",
    name: "Chave Trimestral",
    duration: "90 dias",
    costCents: 5990,
    suggestedCents: 11990,
    perks: ["2 dispositivos", "Margem maior", "Cliente fideliza"],
  },
  {
    slug: "anual",
    name: "Chave Anual",
    duration: "365 dias",
    costCents: 8990,
    suggestedCents: 19790,
    perks: ["3 dispositivos", "Ticket alto", "Menos suporte"],
  },
];

export function KeyStore() {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [customDays, setCustomDays] = useState("30");
  const [customQty, setCustomQty] = useState("1");

  const setQuantity = (slug: string, value: number) =>
    setQty((prev) => ({ ...prev, [slug]: Math.max(1, Math.min(500, value)) }));

  return (
    <div className="space-y-10">
      <section>
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <KeyRound className="h-3.5 w-3.5" /> Loja de chaves
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Compre chaves com preço de revenda</h2>
          <p className="text-sm text-muted-foreground">
            Você paga o valor de custo e revende pelo preço que quiser. As chaves ficam disponíveis
            na aba “Minhas chaves” logo após o pagamento.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {KEY_PRODUCTS.map((p) => {
            const count = qty[p.slug] ?? 1;
            const margin = p.suggestedCents - p.costCents;
            return (
              <div
                key={p.slug}
                className={`plan-card relative flex flex-col rounded-2xl p-6 ${
                  p.highlight ? "plan-card--highlight" : ""
                }`}
              >
                <span className="plan-top-glow" />
                {p.highlight && <span className="plan-ribbon">mais vendida</span>}

                <div className="mb-4">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {p.duration}
                  </p>
                </div>

                <div className="mb-1 flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {formatPrice(p.costCents)}
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">/ chave</span>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Venda sugerida{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(p.suggestedCents)}
                  </span>{" "}
                  • lucro {formatPrice(margin)}
                </p>

                <ul className="mb-5 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2">
                      <span className="plan-check">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between rounded-full border border-border/60 bg-background/40 p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQuantity(p.slug, count - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-semibold tabular-nums">{count} un.</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQuantity(p.slug, count + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button className={p.highlight ? "btn-glossy-red w-full" : "btn-glossy-dark w-full"}>
                    <span className="inline-flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Comprar {formatPrice(p.costCents * count)}
                    </span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <Card className="relative overflow-hidden border-border/60 bg-card/60 p-6 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 100% 0%, oklch(0.63 0.245 25 / 0.12), transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Chave personalizada</h3>
            </div>
            <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
              Precisa de uma duração fora do padrão? Monte a chave do jeito que o seu cliente pede —
              o valor é calculado proporcionalmente.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-32 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Duração (dias)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Quantidade
                </label>
                <Input
                  type="number"
                  min={1}
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                />
              </div>
              <div className="min-w-40 space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Estimativa
                </span>
                <span className="text-2xl font-extrabold tracking-tight">
                  {formatPrice(
                    Math.max(1, Number(customDays) || 0) *
                      100 *
                      Math.max(1, Number(customQty) || 0),
                  )}
                </span>
              </div>
              <Button className="btn-neon">
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Gerar cobrança
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
