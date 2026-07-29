import { useState } from "react";
import { Check, Key, Minus, Plus, Zap, Sliders, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
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
    duration: "Validade de 7 Dias",
    costCents: 1490,
    suggestedCents: 3499,
    perks: ["1 Dispositivo simultâneo", "Giro rápido de estoque", "Ideal para testes de clientes"],
  },
  {
    slug: "mensal",
    name: "Chave Mensal",
    duration: "Validade de 30 Dias",
    costCents: 2990,
    suggestedCents: 6990,
    highlight: true,
    perks: ["2 Dispositivos simultâneos", "Maior volume de vendas", "Alta taxa de renovação"],
  },
  {
    slug: "vitalicia",
    name: "Chave Vitalícia",
    duration: "Acesso Permanente",
    costCents: 14990,
    suggestedCents: 29990,
    perks: ["3 Dispositivos simultâneos", "Sem limite de expiração", "Maior margem bruta por venda"],
  },
];

const WEEK_CENTS = 1490;
const MONTH_CENTS = 2990;
const LIFETIME_CENTS = 14990;
const MIN_ORDER_CENTS = 990;

/**
 * Preço proporcional ancorado nas faixas oficiais:
 * até 7 dias  -> R$ 14,90 / 7 dias (R$ 2,13/dia)
 * 8 a 30 dias -> interpolado entre R$ 14,90 e R$ 29,90
 * acima de 30 -> R$ 29,90 + ~R$ 1,00/dia extra, limitado à vitalícia
 */
export function customKeyPriceCents(days: number) {
  const d = Math.max(1, Math.floor(days) || 1);
  let cents: number;
  if (d <= 7) {
    cents = (WEEK_CENTS / 7) * d;
  } else if (d <= 30) {
    cents = WEEK_CENTS + ((MONTH_CENTS - WEEK_CENTS) / 23) * (d - 7);
  } else {
    cents = MONTH_CENTS + 100 * (d - 30);
  }
  cents = Math.min(LIFETIME_CENTS, Math.max(MIN_ORDER_CENTS, cents));
  // arredonda para os 10 centavos mais próximos (para cima)
  return Math.ceil(cents / 10) * 10;
}

export function KeyStore() {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [customDays, setCustomDays] = useState("30");
  const [customQty, setCustomQty] = useState("1");



  const setQuantity = (slug: string, value: number) =>
    setQty((prev) => ({ ...prev, [slug]: Math.max(1, Math.min(500, value)) }));

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--rv-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rv-badge rv-badge-red font-mono uppercase text-[10px]">
              <Key className="h-3 w-3" /> Catálogo de Licenças
            </span>
          </div>
          <h2 className="text-xl font-bold text-[var(--rv-text-main)] tracking-tight">Adquirir Licenças de Revenda</h2>
          <p className="text-xs text-[var(--rv-text-muted)]">
            Adquira chaves no atacado com desconto direto de distribuidor. Suas chaves geradas ficam disponíveis instantaneamente.
          </p>
        </div>
      </div>

      {/* Main Catalog Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {KEY_PRODUCTS.map((p) => {
          const count = qty[p.slug] ?? 1;
          const profitMargin = p.suggestedCents - p.costCents;
          const totalCost = p.costCents * count;

          return (
            <div
              key={p.slug}
              className={`rv-card relative p-6 flex flex-col justify-between ${
                p.highlight ? "border-red-600/80 shadow-md" : ""
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 right-4">
                  <span className="rv-badge rv-badge-red text-[10px] uppercase font-mono shadow-md">
                    Mais Vendida
                  </span>
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-[var(--rv-text-main)]">{p.name}</h3>
                  <span className="text-[11px] font-mono text-[var(--rv-text-subtle)]">{p.duration}</span>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-[var(--rv-text-main)]">
                      {formatPrice(p.costCents)}
                    </span>
                    <span className="text-xs text-[var(--rv-text-subtle)]">/ custo un.</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-[var(--rv-text-muted)]">Venda: {formatPrice(p.suggestedCents)}</span>
                    <span className="text-emerald-500 font-semibold">
                      + {formatPrice(profitMargin)} lucro
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--rv-border)] pt-4 mb-6">
                  <ul className="space-y-2 text-xs">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-[var(--rv-text-muted)]">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {/* Quantity selector */}
                <div className="flex items-center justify-between bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(p.slug, count - 1)}
                    className="h-7 w-7 flex items-center justify-center rounded text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)] hover:bg-[var(--rv-border)] transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-semibold font-mono text-[var(--rv-text-main)]">{count} un.</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(p.slug, count + 1)}
                    className="h-7 w-7 flex items-center justify-center rounded text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)] hover:bg-[var(--rv-border)] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Purchase Button */}
                <button
                  type="button"
                  className="rv-btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Comprar • {formatPrice(totalCost)}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Key Generator Section */}
      <div className="rv-card p-6 border-dashed border-[var(--rv-border)] bg-[var(--rv-card-alt-bg)]">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="h-4 w-4 text-red-600" />
          <h3 className="text-base font-bold text-[var(--rv-text-main)]">Gerador de Licenças Sob Medida</h3>
        </div>
        <p className="text-xs text-[var(--rv-text-muted)] mb-5 max-w-2xl">
          Configure prazos customizados conforme a demanda específica do seu cliente. O custo é calculado proporcionalmente ao período em dias.
        </p>

        <div className="grid gap-4 sm:grid-cols-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--rv-text-subtle)] uppercase tracking-wider mb-1.5">
              Validade (Dias)
            </label>
            <Input
              type="number"
              min={1}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="rv-input w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--rv-text-subtle)] uppercase tracking-wider mb-1.5">
              Quantidade
            </label>
            <Input
              type="number"
              min={1}
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              className="rv-input w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--rv-text-subtle)] uppercase tracking-wider mb-1.5">
              Estimativa Total
            </label>
            <div className="text-xl font-bold font-mono text-[var(--rv-text-main)] h-9 flex items-center">
              {formatPrice(
                Math.max(1, Number(customDays) || 0) * 100 * Math.max(1, Number(customQty) || 0)
              )}
            </div>
          </div>

          <div>
            <button
              type="button"
              className="rv-btn-secondary w-full flex items-center justify-center gap-2 h-9"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Emitir Pedido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
