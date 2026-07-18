import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Users, DollarSign, TrendingUp, Clock } from "lucide-react";
import { getMyResellerInfo, getResellerStats } from "@/lib/reseller.functions";
import { formatPrice, formatDateBR } from "@/lib/license-utils";
import { translateError } from "@/lib/translate-error";

export const Route = createFileRoute("/_authenticated/reseller")({
  head: () => ({ meta: [{ title: "Revendedor — Rise Lovable" }] }),
  component: ResellerPage,
});

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "all" | "custom";

function computeRange(key: RangeKey, custom?: { from: string; to: string }) {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  switch (key) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case "7d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { from: startOfDay(s).toISOString(), to: endOfDay(now).toISOString() };
    }
    case "30d": {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { from: startOfDay(s).toISOString(), to: endOfDay(now).toISOString() };
    }
    case "custom": {
      if (!custom?.from || !custom?.to) return { from: null, to: null };
      return {
        from: startOfDay(new Date(custom.from)).toISOString(),
        to: endOfDay(new Date(custom.to)).toISOString(),
      };
    }
    default:
      return { from: null, to: null };
  }
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

function ResellerPage() {
  const getInfo = useServerFn(getMyResellerInfo);
  const getStats = useServerFn(getResellerStats);
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [copied, setCopied] = useState(false);

  const info = useQuery({
    queryKey: ["reseller", "info"],
    queryFn: () => getInfo(),
    retry: false,
  });

  const rangeParams = useMemo(
    () => computeRange(range, { from: customFrom, to: customTo }),
    [range, customFrom, customTo],
  );

  const stats = useQuery({
    queryKey: ["reseller", "stats", range, customFrom, customTo],
    queryFn: () => getStats({ data: rangeParams as any }),
    enabled: !!info.data,
  });

  const link = info.data?.referral_code
    ? info.data.referral_code.toUpperCase() === "UV78ZDXT"
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/apice`
      : `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${info.data.referral_code}#plans`
    : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  if (info.isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
          Carregando…
        </main>
      </div>
    );
  }

  if (info.isError) {
    return (
      <div className="min-h-screen bg-muted/20">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">
            {translateError(info.error as Error)}
          </p>
        </main>
      </div>
    );
  }

  const summary = stats.data?.summary;
  const sales = stats.data?.sales ?? [];

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do revendedor</h1>
            <p className="text-muted-foreground">
              Acompanhe suas vendas pelo link exclusivo.
            </p>
          </div>
        </header>

        <Card className="mb-6 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Seu link de indicação
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {info.data?.referral_code ?? "—"}
                </Badge>
                {info.data?.full_name && (
                  <span className="text-sm text-muted-foreground">
                    {info.data.full_name}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={() => copy(link)} disabled={!link}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
          </div>
          <Input readOnly value={link} className="font-mono text-xs" />
          <p className="mt-2 text-xs text-muted-foreground">
            Toda venda feita por esse link entra automaticamente no seu painel.
          </p>
        </Card>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-40"
              />
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            label="Faturamento"
            value={formatPrice(summary?.total_amount_cents ?? 0)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            label="Vendas pagas"
            value={String(summary?.total_sales ?? 0)}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-primary" />}
            label="Pendentes"
            value={String(summary?.pending_count ?? 0)}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Total no período"
            value={String(summary?.all_count ?? 0)}
          />
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Vendas no período</h2>
          {stats.isLoading && <div className="text-muted-foreground">Carregando…</div>}
          {!stats.isLoading && sales.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nenhuma venda registrada no período.
            </div>
          )}
          {sales.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-3 text-xs">{formatDateBR(s.created_at)}</td>
                      <td className="py-2 pr-3">{s.buyer_name ?? "—"}</td>
                      <td className="py-2 pr-3">{s.plan_name ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono">{formatPrice(s.amount_cents)}</td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant={
                            s.status === "approved"
                              ? "default"
                              : s.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
