import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminOverview, adminUpdateLicenseStatus } from "@/lib/license.functions";
import { formatDateBR, LICENSE_STATUS_LABEL } from "@/lib/license-utils";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Lovable" }] }),
  component: AdminPage,
});

function AdminPage() {
  const getOverview = useServerFn(getAdminOverview);
  const updateStatus = useServerFn(adminUpdateLicenseStatus);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getOverview(),
  });

  const mut = useMutation({
    mutationFn: (vars: { license_id: string; status: any }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <SiteHeader />
        <div className="p-10">Carregando…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-muted/20">
        <SiteHeader />
        <Card className="m-10 p-6 text-destructive">
          {(error as Error).message === "Acesso negado."
            ? "Você não tem permissão para ver este painel."
            : (error as Error).message}
        </Card>
      </div>
    );
  }
  if (!data) return null;

  const filtered = data.licenses.filter((l: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.license_key.toLowerCase().includes(q) ||
      (l.profiles?.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, licenças e planos.</p>
          </div>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-6">
          <Stat label="Ativas" value={data.counts.active} />
          <Stat label="Pendentes" value={data.counts.pending} />
          <Stat label="Expiradas" value={data.counts.expired} />
          <Stat label="Revogadas" value={data.counts.revoked} />
          <Stat label="Suspensas" value={data.counts.suspended} />
          <Stat label="Usuários" value={data.counts.total_users} />
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold">Licenças</h2>
            <Input
              placeholder="Buscar por chave ou nome…"
              className="max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Chave</th>
                  <th className="py-2 pr-3">Usuário</th>
                  <th className="py-2 pr-3">Plano</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Ativação</th>
                  <th className="py-2 pr-3">Expiração</th>
                  <th className="py-2 pr-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2 pr-3 font-mono text-xs">{l.license_key}</td>
                    <td className="py-2 pr-3">{l.profiles?.full_name ?? "—"}</td>
                    <td className="py-2 pr-3">{l.plans?.name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{LICENSE_STATUS_LABEL[l.status] ?? l.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs">{formatDateBR(l.activated_at)}</td>
                    <td className="py-2 pr-3 text-xs">{formatDateBR(l.expires_at)}</td>
                    <td className="py-2 pr-3">
                      <Select
                        value={l.status}
                        onValueChange={(v) =>
                          mut.mutate({ license_id: l.id, status: v })
                        }
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="active">Ativar</SelectItem>
                          <SelectItem value="suspended">Suspender</SelectItem>
                          <SelectItem value="revoked">Revogar</SelectItem>
                          <SelectItem value="expired">Expirar</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="mb-4 font-semibold">Últimas validações (todos usuários)</h2>
          <ul className="divide-y text-sm">
            {data.logs.map((l: any) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">{formatDateBR(l.created_at)}</span>
                <span className="font-mono text-xs">{l.device_hash?.slice(0, 12) ?? "—"}</span>
                <Badge variant={l.result === "success" ? "default" : "destructive"}>
                  {l.result}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
