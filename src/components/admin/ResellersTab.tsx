import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Clock, Users, Eye } from "lucide-react";
import {
  adminListResellers,
  adminGetResellerDetail,
  adminGetGlobalRevenue,
} from "@/lib/api/reseller-api";
import { formatPrice, formatDateBR } from "@/lib/license-utils";
import { QueryErrorState } from "@/components/QueryErrorState";

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

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

export function ResellersTab() {
  const listResellers = adminListResellers;
  const getGlobal = adminGetGlobalRevenue;
  const getDetail = adminGetResellerDetail;

  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detailUser, setDetailUser] = useState<{ id: string; email: string | null } | null>(null);

  const params = useMemo(
    () => computeRange(range, { from: customFrom, to: customTo }),
    [range, customFrom, customTo],
  );

  const global = useQuery({
    queryKey: ["admin", "global-revenue", range, customFrom, customTo],
    queryFn: () => getGlobal({ data: params as any }),
    retry: 1,
  });

  const resellers = useQuery({
    queryKey: ["admin", "resellers", range, customFrom, customTo],
    queryFn: () => listResellers({ data: params as any }),
    retry: 1,
  });

  const detail = useQuery({
    queryKey: ["admin", "reseller-detail", detailUser?.id, range, customFrom, customTo],
    queryFn: () => getDetail({ data: { ...(params as any), user_id: detailUser!.id } }),
    enabled: !!detailUser,
    retry: 1,
  });

  return (
    <div className="space-y-4">
      {(global.isError || resellers.isError) && (
        <QueryErrorState
          error={global.error ?? resellers.error}
          title="Não foi possível carregar os dados dos revendedores"
          onRetry={() => {
            void global.refetch();
            void resellers.refetch();
          }}
          isRetrying={global.isFetching || resellers.isFetching}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
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

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          label="Faturamento total"
          value={formatPrice(global.data?.total_amount_cents ?? 0)}
        />
        <Stat
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label="Vendas pagas"
          value={String(global.data?.total_sales ?? 0)}
        />
        <Stat
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Via revendedor"
          value={formatPrice(global.data?.via_reseller_amount_cents ?? 0)}
          sub={`${global.data?.via_reseller_sales ?? 0} venda(s)`}
        />
        <Stat
          icon={<Clock className="h-5 w-5 text-primary" />}
          label="Pendentes"
          value={String(global.data?.pending_count ?? 0)}
        />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">
          Revendedores ({resellers.data?.resellers.length ?? 0})
        </h2>
        {resellers.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {!resellers.isLoading && (resellers.data?.resellers.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground">
            Nenhum revendedor cadastrado. Vá na aba <b>Usuários</b> e defina o cargo de alguém como{" "}
            <b>Revendedor</b>.
          </div>
        )}
        {(resellers.data?.resellers.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Vendas pagas</th>
                  <th className="py-2 pr-3">Faturamento</th>
                  <th className="py-2 pr-3">Pendentes</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(resellers.data?.resellers ?? []).map((r) => (
                  <tr key={r.user_id} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-3">{r.email ?? "—"}</td>
                    <td className="py-2 pr-3">{r.full_name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="secondary" className="font-mono">
                        {r.referral_code ?? "—"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">{r.total_sales}</td>
                    <td className="py-2 pr-3 font-mono">{formatPrice(r.total_amount_cents)}</td>
                    <td className="py-2 pr-3">{r.pending_count}</td>
                    <td className="py-2 pr-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailUser({ id: r.user_id, email: r.email })}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vendas de {detailUser?.email}</DialogTitle>
          </DialogHeader>
          {detail.isLoading && <div className="text-muted-foreground">Carregando…</div>}
          {detail.isError && (
            <QueryErrorState
              error={detail.error}
              title="Não foi possível carregar os detalhes do revendedor"
              onRetry={() => void detail.refetch()}
              isRetrying={detail.isFetching}
            />
          )}
          {detail.data && (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Faturamento</div>
                  <div className="font-bold">
                    {formatPrice(detail.data.summary.total_amount_cents)}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Pagas</div>
                  <div className="font-bold">{detail.data.summary.total_sales}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                  <div className="font-bold">{detail.data.summary.pending_count}</div>
                </Card>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Plano</th>
                      <th className="py-2 pr-3">Valor</th>
                      <th className="py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.sales.map((s) => (
                      <tr key={s.id} className="border-b">
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
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
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
