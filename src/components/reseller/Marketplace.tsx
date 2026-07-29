import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Wrench, Layers, Store, ShoppingBag, PackageCheck, Copy, Check, Filter } from "lucide-react";
import { formatPrice } from "@/lib/license-utils";
import { translateError } from "@/lib/translate-error";
import {
  createMarketplaceOrder,
  listMarketplaceProducts,
  listMyMarketplaceOrders,
  ORDER_STATUS_LABELS,
} from "@/lib/api/marketplace-api";

const CATEGORIES = ["Todos", "IA", "Ferramentas", "Assinaturas"] as const;

const MOCK_PRODUCTS = [
  {
    id: "prod-1",
    name: "Extensão Prompts Turbo IA",
    tagline: "Injetor automático de prompts otimizados para criação de componentes.",
    description: "Aumente a velocidade de prototipagem em 3x com templates prontos de alta conversão.",
    category: "IA",
    price_cents: 3990,
    old_price_cents: 7990,
    rating: 4.9,
    stock: 45,
    featured: true,
    cover_url: null,
  },
  {
    id: "prod-2",
    name: "Gerador de Termos & Políticas",
    tagline: "Gerador de documentos jurídicos para SaaS e agências.",
    description: "Crie termos de uso e políticas de privacidade alinhadas com a LGPD em segundos.",
    category: "Ferramentas",
    price_cents: 2990,
    old_price_cents: 5990,
    rating: 4.8,
    stock: 12,
    featured: false,
    cover_url: null,
  },
  {
    id: "prod-3",
    name: "Assinatura Pro Developer Tools",
    tagline: "Pacote VIP de APIs e conectores premium para construtores.",
    description: "Acesso ilimitado a webhooks rápidos e banco de ícones customizados.",
    category: "Assinaturas",
    price_cents: 9900,
    old_price_cents: 14900,
    rating: 5.0,
    stock: 100,
    featured: false,
    cover_url: null,
  },
];

export function Marketplace() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const buy = useMutation({
    mutationFn: (product_id: string) => createMarketplaceOrder({ product_id }),
    onSuccess: () => {
      toast.success("Pedido criado! O entregável será liberado assim que o pagamento for confirmado.");
      void qc.invalidateQueries({ queryKey: ["marketplace", "my-orders"] });
    },
    onError: (e) => toast.error(translateError(e)),
  });

  const rawList = products.data?.products ?? [];

  const list = rawList.filter((i) => cat === "Todos" || i.category === cat);

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "IA":
        return <Cpu className="h-4 w-4 text-red-600" />;
      case "Ferramentas":
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case "Assinaturas":
        return <Layers className="h-4 w-4 text-emerald-500" />;
      default:
        return <Store className="h-4 w-4 text-[var(--rv-text-subtle)]" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
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
            Adquira recursos exclusivos com desconto de revendedor para oferecer como upsell aos seus clientes.
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

      {list.length === 0 && (
        <div className="rv-card p-12 text-center border-dashed border-[var(--rv-border)]">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-[var(--rv-text-subtle)]" />
          <p className="font-semibold text-sm text-[var(--rv-text-main)]">
            Nenhum produto disponível nesta categoria
          </p>
          <p className="mt-1 text-xs text-[var(--rv-text-muted)] max-w-sm mx-auto">
            Novos plugins e utilitários de alta demanda são adicionados frequentemente pelo distribuidor.
          </p>
        </div>
      )}

      {/* Grid of Products */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => (
          <div
            key={item.id}
            className={`rv-card p-6 flex flex-col justify-between ${
              item.featured ? "border-red-600/80 shadow-md" : ""
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.name}
                    loading="lazy"
                    className="h-12 w-12 rounded-xl object-cover border border-[var(--rv-border)]"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                )}
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rv-badge rv-badge-neutral text-[10px] uppercase font-mono">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-500 font-mono">
                    ★ {item.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-[var(--rv-text-main)] mb-1">{item.name}</h3>
              <p className="text-xs text-[var(--rv-text-muted)] mb-3">{item.tagline}</p>
              {item.description && (
                <p className="text-[11px] text-[var(--rv-text-subtle)] whitespace-pre-line mb-4 line-clamp-3">
                  {item.description}
                </p>
              )}
            </div>

            <div className="border-t border-[var(--rv-border)] pt-4 flex items-end justify-between gap-3">
              <div>
                {item.old_price_cents && (
                  <span className="block text-xs text-[var(--rv-text-subtle)] line-through font-mono">
                    {formatPrice(item.old_price_cents)}
                  </span>
                )}
                <span className="text-2xl font-bold font-mono text-[var(--rv-text-main)]">
                  {formatPrice(item.price_cents)}
                </span>
                {item.stock !== null && (
                  <span className="block text-[10px] font-mono text-[var(--rv-text-subtle)] mt-0.5">
                    {item.stock} unidades em estoque
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={buy.isPending || (item.stock !== null && item.stock <= 0)}
                onClick={() => buy.mutate(item.id)}
                className={`rv-btn-primary ${
                  item.stock !== null && item.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {item.stock !== null && item.stock <= 0 ? "Esgotado" : "Adquirir"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Section */}
      <div className="rv-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--rv-border)] pb-4">
          <PackageCheck className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="text-base font-bold text-[var(--rv-text-main)]">Histórico de Compras no Marketplace</h3>
            <p className="text-xs text-[var(--rv-text-muted)]">
              Gerencie seus entregáveis e chaves liberadas de produtos do marketplace.
            </p>
          </div>
        </div>

        {(orders.data?.orders ?? []).length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--rv-border)] rounded-xl">
            <p className="text-xs text-[var(--rv-text-muted)]">Você ainda não realizou compras neste módulo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(orders.data?.orders ?? []).map((o) => (
              <div key={o.id} className="bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--rv-text-main)]">{o.product_name}</h4>
                    <p className="text-xs font-mono text-[var(--rv-text-muted)]">
                      {formatPrice(o.amount_cents)} · {new Date(o.created_at).toLocaleString("pt-BR")}
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
    </div>
  );
}
