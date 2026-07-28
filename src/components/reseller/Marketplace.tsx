import { useState } from "react";
import { Bot, ExternalLink, Filter, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/license-utils";

type Item = {
  id: string;
  name: string;
  tagline: string;
  category: "IA" | "Ferramentas" | "Assinaturas";
  priceCents: number;
  oldPriceCents?: number;
  rating: number;
  icon: typeof Bot;
  featured?: boolean;
};

const ITEMS: Item[] = [];

const CATEGORIES = ["Todos", "IA", "Ferramentas", "Assinaturas"] as const;

export function Marketplace() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const list = cat === "Todos" ? ITEMS : ITEMS.filter((i) => i.category === cat);

  return (
    <div className="space-y-6">
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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              className={`plan-card group relative flex flex-col rounded-2xl p-6 ${
                item.featured ? "plan-card--highlight" : ""
              }`}
            >
              <span className="plan-top-glow" />

              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-[inset_0_0_0_1px_oklch(0.63_0.245_25/0.35)] transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-6 w-6" />
                </div>
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
              <p className="mt-1 mb-5 text-sm text-muted-foreground">{item.tagline}</p>

              <div className="mt-auto flex items-end justify-between gap-3">
                <div>
                  {item.oldPriceCents && (
                    <span className="block text-xs text-muted-foreground line-through">
                      {formatPrice(item.oldPriceCents)}
                    </span>
                  )}
                  <span className="text-2xl font-extrabold tracking-tight">
                    {formatPrice(item.priceCents)}
                  </span>
                </div>
                <Button className={item.featured ? "btn-glossy-red" : "btn-glossy-dark"}>
                  <span className="inline-flex items-center gap-2">
                    Comprar
                    <ExternalLink className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
