import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Filter, ShoppingBag, Star, PackageCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QueryErrorState } from "@/components/QueryErrorState";
import { formatPrice } from "@/lib/license-utils";
import { translateError } from "@/lib/translate-error";
import {
  createMarketplaceOrder,
  listMarketplaceProducts,
  listMyMarketplaceOrders,
  ORDER_STATUS_LABELS,
} from "@/lib/api/marketplace-api";

const CATEGORIES = ["Todos", "IA", "Ferramentas", "Assinaturas"] as const;

export function Marketplace() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");

  const products = useQuery({
    queryKey: ["marketplace", "products"],
    queryFn: listMarketplaceProducts,
    retry: 1,
  });

  const orders = useQuery({
    queryKey: ["marketplace", "my-orders"],
    queryFn: listMyMarketplaceOrders,
    retry: 1,
  });

  const buy = useMutation({
    mutationFn: (product_id: string) => createMarketplaceOrder({ product_id }),
    onSuccess: () => {
      toast.success("Pedido criado! Fale com o suporte para pagar e liberar o entregável.");
      void qc.invalidateQueries({ queryKey: ["marketplace", "my-orders"] });
    },
    onError: (e) => toast.error(translateError(e)),
  });

  const list = (products.data?.products ?? []).filter(
    (i) => cat === "Todos" || i.category === cat,
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <ShoppingBag className="h-3.5 w-3.5" /> Marketplace
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Ferramentas para vender junto com as chaves
          </h2>
          <p className="text-sm text-muted-foreground">
            Produtos digitais exclusivos com preço de revendedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </header>

      {products.error && (
        <QueryErrorState error={products.error} onRetry={() => void products.refetch()} />
      )}

      {!products.error && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">
            {products.isLoading ? "Carregando produtos…" : "Nenhum produto disponível ainda"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Em breve novos produtos e ferramentas exclusivas serão publicados aqui.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => (
          <article
            key={item.id}
            className={`plan-card group relative flex flex-col rounded-2xl p-6 ${
              item.featured ? "plan-card--highlight" : ""
            }`}
          >
            <span className="plan-top-glow" />

            <div className="mb-4 flex items-start justify-between gap-3">
              {item.cover_url ? (
                <img
                  src={item.cover_url}
                  alt={item.name}
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Bot className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                  {item.category}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  {item.rating.toFixed(1)}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold">{item.name}</h3>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{item.tagline}</p>
            {item.description && (
              <p className="mb-5 whitespace-pre-line text-xs text-muted-foreground">
                {item.description}
              </p>
            )}

            <div className="mt-auto flex items-end justify-between gap-3">
              <div>
                {item.old_price_cents && (
                  <span className="block text-xs text-muted-foreground line-through">
                    {formatPrice(item.old_price_cents)}
                  </span>
                )}
                <span className="text-2xl font-extrabold tracking-tight">
                  {formatPrice(item.price_cents)}
                </span>
                {item.stock !== null && (
                  <span className="block text-[11px] text-muted-foreground">
                    {item.stock} em estoque
                  </span>
                )}
              </div>
              <Button
                className={item.featured ? "btn-glossy-red" : "btn-glossy-dark"}
                disabled={buy.isPending || (item.stock !== null && item.stock <= 0)}
                onClick={() => buy.mutate(item.id)}
              >
                {item.stock !== null && item.stock <= 0 ? "Esgotado" : "Comprar"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-bold leading-tight">Minhas compras</h3>
            <p className="text-xs text-muted-foreground">
              Assim que o pagamento for confirmado, o entregável aparece aqui.
            </p>
          </div>
        </div>

        {(orders.data?.orders ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            Você ainda não fez nenhuma compra no marketplace.
          </p>
        ) : (
          <div className="space-y-3">
            {(orders.data?.orders ?? []).map((o) => (
              <div key={o.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(o.amount_cents)} ·{" "}
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={o.status === "delivered" ? "default" : "secondary"}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </div>

                {o.delivered_content && (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="flex-1 break-all rounded-lg bg-muted/40 p-3 font-mono text-xs">
                      {o.delivered_content}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => copy(o.delivered_content!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {o.delivered_content && o.delivery_instructions && (
                  <p className="mt-2 text-xs text-muted-foreground">{o.delivery_instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
