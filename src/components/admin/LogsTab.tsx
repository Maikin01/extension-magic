import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAdminOverview,
  adminGetAuditLog,
} from "@/lib/license.functions";
import { formatDateBR } from "@/lib/license-utils";
import { QueryErrorState } from "@/components/QueryErrorState";

export function LogsTab() {
  const getOverview = useServerFn(getAdminOverview);
  const getAudit = useServerFn(adminGetAuditLog);

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getOverview(),
    retry: 1,
  });
  const audit = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => getAudit(),
    retry: 1,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Últimas validações (extensão)</h2>
        {overview.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {overview.isError && (
          <QueryErrorState
            error={overview.error}
            onRetry={() => void overview.refetch()}
            isRetrying={overview.isFetching}
          />
        )}
        <ul className="divide-y text-sm">
          {overview.data?.logs.map((l: any) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">
                {formatDateBR(l.created_at)}
              </span>
              <span className="font-mono text-xs">
                {l.device_hash?.slice(0, 12) ?? "—"}
              </span>
              <Badge variant={l.result === "success" ? "default" : "destructive"}>
                {l.result}
              </Badge>
            </li>
          ))}
          {overview.data?.logs.length === 0 && (
            <li className="py-4 text-center text-muted-foreground">
              Nenhuma validação ainda.
            </li>
          )}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Ações administrativas</h2>
        {audit.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {audit.isError && (
          <QueryErrorState
            error={audit.error}
            onRetry={() => void audit.refetch()}
            isRetrying={audit.isFetching}
          />
        )}
        <ul className="divide-y text-sm">
          {audit.data?.map((l: any) => (
            <li key={l.id} className="py-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateBR(l.created_at)}
                </span>
              </div>
              {l.details && (
                <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-1 text-xs">
                  {JSON.stringify(l.details, null, 0)}
                </pre>
              )}
            </li>
          ))}
          {audit.data?.length === 0 && (
            <li className="py-4 text-center text-muted-foreground">
              Nenhuma ação registrada.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
