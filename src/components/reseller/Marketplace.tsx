import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Filter,
  PackageCheck,
  ShoppingBag,
  Store,
  Zap,
} from "lucide-react";
import { formatPrice } from "@/lib/license-utils";
import {
  listMarketplaceProducts,
  listMyMarketplaceOrders,
  ORDER_STATUS_LABELS,
  type MarketplaceProduct,
} from "@/lib/api/marketplace-api";
import { QueryErrorState } from "@/components/QueryErrorState";
import { MarketplacePixDialog } from "@/components/checkout/MarketplacePixDialog";
import lovableCover from "@/assets/lovable-12-meses.png.asset.json";
import youtubeCover from "@/assets/youtube-premium.png.asset.json";
import nordVpnCover from "@/assets/nord-vpn.png.asset.json";

const CATEGORIES = ["Todos", "IA", "Ferramentas", "Assinaturas"] as const;

function safeCents(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function discountPercent(price: number, old: number | null) {
  if (!old || old <= price) return null;
  return Math.round(((old - price) / old) * 100);
}

const COVER_FALLBACKS: { match: RegExp; url: string }[] = [
  { match: /nord\s*vpn/i, url: nordVpnCover.url },
  { match: /youtube/i, url: youtubeCover.url },
  { match: /lovable/i, url: lovableCover.url },
];

function resolveCover(product: MarketplaceProduct) {
  if (product.cover_url) return product.cover_url;
  return COVER_FALLBACKS.find((f) => f.match.test(product.name))?.url ?? null;
}

function ProductCover({
  product,
  className = "",
}: {
  product: MarketplaceProduct;
  className?: string;
}) {
  const cover = resolveCover(product);
  if (cover) {
    return (
      <img
        src={cover}
        alt={product.name}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[var(--rv-card-alt-bg)] ${className}`}
    >
      <Store className="h-10 w-10 text-[var(--rv-text-subtle)]" />
    </div>
  );
}

export function Marketplace() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarketplaceProduct | null>(null);
  const [checkout, setCheckout] = useState<MarketplaceProduct | null>(null);

  const products = useQuery({
    queryKey: ["marketplace", "products"],
    queryFn: listMarketplaceProducts,
    retry: false,
  });

  const orders = useQuery({
    queryKey: ["marketplace", "my-orders"],
    queryFn: listMyMarketplaceOrders,
    retry: false,
  });

  const rawList = products.data?.products ?? [];
  const list = rawList.filter((i) => cat === "Todos" || i.category === cat);

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const soldOut = (p: MarketplaceProduct) => p.stock !== null && p.stock <= 0;

  const buy = (p: MarketplaceProduct) => {
    if (soldOut(p)) return;
    setCheckout(p);
  };

  const ordersBlock = (
    <div className="rv-card p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-[var(--rv-border)] pb-4">
        <PackageCheck className="h-5 w-5 text-red-600" />
        <div>
          <h3 className="text-base font-bold text-[var(--rv-text-main)]">
            Histórico de Compras no Marketplace
          </h3>
          <p className="text-xs text-[var(--rv-text-muted)]">
            Gerencie seus entregáveis e chaves liberadas de produtos do marketplace.
          </p>
        </div>
      </div>

      {orders.isError ? (
        <QueryErrorState
          error={orders.error}
          title="Não foi possível carregar suas compras"
          onRetry={() => void orders.refetch()}
          isRetrying={orders.isRefetching}
        />
      ) : (orders.data?.orders ?? []).length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--rv-border)] rounded-xl">
          <p className="text-xs text-[var(--rv-text-muted)]">
            Você ainda não realizou compras neste módulo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(orders.data?.orders ?? []).map((o) => (
            <div
              key={o.id}
              className="bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--rv-text-main)]">
                    {o.product_name}
                  </h4>
                  <p className="text-xs font-mono text-[var(--rv-text-muted)]">
                    {formatPrice(safeCents(o.amount_cents))} ·{" "}
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`rv-badge ${
                    o.status === "delivered" ? "rv-badge-emerald" : "rv-badge-neutral"
                  }`}
                >
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>

              {o.delivered_content && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 break-all rounded-lg bg-[var(--rv-input-bg)] border border-[var(--rv-border)] p-2.5 font-mono text-xs text-red-600 font-bold">
                    {o.delivered_content}
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(o.delivered_content!, o.id)}
                    className="rv-btn-secondary h-9 px-3 text-xs flex items-center gap-1.5"
                  >
                    {copiedId === o.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              )}
              {o.delivered_content && o.delivery_instructions && (
                <p className="mt-2 text-xs text-[var(--rv-text-muted)]">{o.delivery_instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const pixDialog = (
    <MarketplacePixDialog
      product={checkout}
      open={!!checkout}
      onOpenChange={(v) => !v && setCheckout(null)}
      onPaid={() => {
        void qc.invalidateQueries({ queryKey: ["marketplace", "my-orders"] });
        void qc.invalidateQueries({ queryKey: ["marketplace", "products"] });
      }}
    />
  );

  /* ---------------- Página interna do produto ---------------- */
  if (detail) {
    const off = discountPercent(safeCents(detail.price_cents), detail.old_price_cents);
    return (
      <div className="space-y-8">
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)]"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--rv-text-subtle)]">
          <span>Marketplace</span>
          <ChevronRight className="h-3 w-3" />
          <span>{detail.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--rv-text-main)] font-semibold">{detail.name}</span>
        </div>

        <div className="rv-card p-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_260px]">
          <div className="overflow-hidden rounded-2xl border border-[var(--rv-border)] aspect-[16/10]">
            <ProductCover product={detail} />
          </div>

          <div className="min-w-0">
            <span className="rv-badge rv-badge-neutral text-[10px] uppercase font-mono">
              {detail.category}
            </span>
            <h2 className="mt-2 text-2xl font-bold text-[var(--rv-text-main)]">{detail.name}</h2>
            {detail.tagline && (
              <p className="mt-1 text-sm text-[var(--rv-text-muted)]">{detail.tagline}</p>
            )}
            <div className="mt-4 border-t border-[var(--rv-border)] pt-4">
              {detail.old_price_cents && (
                <span className="block text-xs font-mono text-[var(--rv-text-subtle)] line-through">
                  {formatPrice(safeCents(detail.old_price_cents))}
                </span>
              )}
              <div className="flex items-center gap-2">
                {off && <span className="rv-badge rv-badge-emerald">-{off}%</span>}
                <span className="text-3xl font-bold font-mono text-[var(--rv-text-main)]">
                  {formatPrice(safeCents(detail.price_cents))}
                </span>
              </div>
              <span className="mt-2 inline-flex items-center gap-1.5 rv-badge rv-badge-red text-[10px] uppercase">
                <Zap className="h-3 w-3" />
                {detail.delivery_type === "manual" ? "Entrega manual" : "Entrega automática"}
              </span>
            </div>
          </div>

          <div className="rv-card bg-[var(--rv-card-alt-bg)] p-5 h-fit space-y-3">
            <p className="text-sm font-bold text-[var(--rv-text-main)]">
              {soldOut(detail) ? "Indisponível" : "Estoque disponível"}
            </p>
            <p className="text-2xl font-bold font-mono text-[var(--rv-text-main)]">
              {formatPrice(safeCents(detail.price_cents))}
            </p>
            {detail.stock !== null && (
              <p className="text-[11px] font-mono text-[var(--rv-text-subtle)]">
                {detail.stock} disponível(is)
              </p>
            )}
            <button
              type="button"
              disabled={soldOut(detail)}
              onClick={() => buy(detail)}
              className={`rv-btn-primary w-full justify-center ${
                soldOut(detail) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {soldOut(detail) ? "Esgotado" : "Comprar agora"}
            </button>
            <p className="text-[10px] text-center text-[var(--rv-text-subtle)]">
              Pagamento via Pix — Mercado Pago
            </p>
          </div>
        </div>

        <div className="rv-card p-6">
          <h3 className="text-base font-bold text-[var(--rv-text-main)] border-b border-[var(--rv-border)] pb-3">
            Descrição
          </h3>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--rv-text-muted)]">
            {detail.description || "Este produto ainda não possui uma descrição detalhada."}
          </p>
          {detail.delivery_instructions && (
            <div className="mt-5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card-alt-bg)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--rv-text-subtle)]">
                Condições de entrega
              </p>
              <p className="mt-1.5 text-xs text-[var(--rv-text-muted)]">
                {detail.delivery_instructions}
              </p>
            </div>
          )}
        </div>

        {ordersBlock}
        {pixDialog}
      </div>
    );
  }

  /* ---------------- Vitrine ---------------- */
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--rv-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rv-badge rv-badge-red uppercase text-[10px]">
              <ShoppingBag className="h-3 w-3" /> Marketplace
            </span>
            <span className="rv-badge rv-badge-neutral">Produtos Digitais VIP</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--rv-text-main)] tracking-tight">
            Ferramentas & Complementos de Revenda
          </h2>
          <p className="text-xs text-[var(--rv-text-muted)]">
            Adquira recursos exclusivos com desconto de revendedor para oferecer como upsell aos
            seus clientes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] p-1.5 rounded-xl">
          <Filter className="h-3.5 w-3.5 text-[var(--rv-text-subtle)] ml-1.5 mr-1" />
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                cat === c
                  ? "bg-red-600 text-white"
                  : "text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)] hover:bg-[var(--rv-border)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {products.isError && (
        <QueryErrorState
          error={products.error}
          title="Não foi possível carregar o marketplace"
          onRetry={() => void products.refetch()}
          isRetrying={products.isRefetching}
          className="rv-card"
        />
      )}

      {!products.isError && !products.isLoading && list.length === 0 && (
        <div className="rv-card p-12 text-center border-dashed border-[var(--rv-border)]">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-[var(--rv-text-subtle)]" />
          <p className="font-semibold text-sm text-[var(--rv-text-main)]">
            Nenhum produto disponível nesta categoria
          </p>
          <p className="mt-1 text-xs text-[var(--rv-text-muted)] max-w-sm mx-auto">
            Novos plugins e utilitários de alta demanda são adicionados frequentemente pelo
            distribuidor.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((item) => {
          const off = discountPercent(safeCents(item.price_cents), item.old_price_cents);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(item);
                }
              }}
              className={`rv-card group cursor-pointer overflow-hidden p-2.5 transition-transform hover:-translate-y-0.5 ${
                item.featured ? "border-red-600/80 shadow-md" : ""
              }`}
            >
              <div className="relative overflow-hidden rounded-xl border border-[var(--rv-border)] aspect-[4/3]">
                <ProductCover
                  product={item}
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {off && (
                  <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    -{off}%
                  </span>
                )}
                {soldOut(item) && (
                  <span className="absolute right-2 top-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
                    Esgotado
                  </span>
                )}
              </div>

              <p className="mt-2.5 truncate px-1 text-sm font-semibold text-[var(--rv-text-main)]">
                {item.name}
              </p>

              <button
                type="button"
                disabled={soldOut(item)}
                onClick={(e) => {
                  e.stopPropagation();
                  buy(item);
                }}
                className={`rv-btn-primary mt-2 flex w-full items-center justify-center gap-2 ${
                  soldOut(item) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Zap className="h-4 w-4" />
                {soldOut(item)
                  ? "Esgotado"
                  : `Comprar por ${formatPrice(safeCents(item.price_cents))}`}
              </button>
            </div>
          );
        })}
      </div>

      {ordersBlock}
      {pixDialog}
    </div>
  );
}
