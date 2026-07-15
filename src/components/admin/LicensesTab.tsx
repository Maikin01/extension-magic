import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminOverview,
  adminUpdateLicenseStatus,
  adminGenerateLicenses,
  adminDeleteLicense,
} from "@/lib/license.functions";
import { formatDateBR, LICENSE_STATUS_LABEL } from "@/lib/license-utils";
import { Copy, Plus, Trash2, KeyRound } from "lucide-react";

export function LicensesTab() {
  const getOverview = useServerFn(getAdminOverview);
  const updateStatus = useServerFn(adminUpdateLicenseStatus);
  const generate = useServerFn(adminGenerateLicenses);
  const del = useServerFn(adminDeleteLicense);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [genPlan, setGenPlan] = useState("");
  const [genCount, setGenCount] = useState(1);
  const [genEmail, setGenEmail] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState(10);
  const [customDurationUnit, setCustomDurationUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [lastGenerated, setLastGenerated] = useState<any[] | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getOverview(),
    retry: 1,
  });

  const statusMut = useMutation({
    mutationFn: (vars: { license_id: string; status: any }) => updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (license_id: string) => del({ data: { license_id } }),
    onSuccess: () => {
      toast.success("Licença deletada");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genMut = useMutation({
    mutationFn: () => {
      let custom_duration_minutes: number | null = null;
      if (useCustomDuration) {
        const mult =
          customDurationUnit === "minutes" ? 1 : customDurationUnit === "hours" ? 60 : 60 * 24;
        custom_duration_minutes = Math.max(1, Math.floor(customDurationValue * mult));
      }
      return generate({
        data: {
          plan_slug: genPlan,
          count: genCount,
          email: genEmail.trim() || null,
          notes: genNotes.trim() || null,
          custom_duration_minutes,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`${res.licenses.length} chave(s) geradas`);
      setLastGenerated(res.licenses);
      setGenEmail("");
      setGenNotes("");
      setGenCount(1);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-4">Carregando…</div>;
  if (error || !data)
    return (
      <Card className="p-6">
        <div className="text-destructive font-medium">Erro ao carregar dados.</div>
        <div className="text-xs text-muted-foreground mt-1">
          {(error as Error)?.message ?? "Desconhecido"}
        </div>
        <Button size="sm" className="mt-3" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );

  const filtered = data.licenses.filter((l: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.license_key.toLowerCase().includes(q) ||
      (l.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (l.profiles?.email ?? "").toLowerCase().includes(q) ||
      (l.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-6">
        <Stat label="Ativas" value={data.counts.active} />
        <Stat label="Pendentes" value={data.counts.pending} />
        <Stat label="Expiradas" value={data.counts.expired} />
        <Stat label="Revogadas" value={data.counts.revoked} />
        <Stat label="Suspensas" value={data.counts.suspended} />
        <Stat label="Usuários" value={data.counts.total_users} />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Licenças</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por chave, nome ou nota…"
              className="w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Dialog open={genOpen} onOpenChange={setGenOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Gerar chaves
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" /> Gerar novas licenças
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select value={genPlan} onValueChange={setGenPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.plans.map((p: any) => (
                          <SelectItem key={p.id} value={p.slug}>
                            {p.name} ({p.duration_days}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade (máx 100)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={genCount}
                      onChange={(e) => setGenCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Atribuir a email (opcional)</Label>
                    <Input
                      type="email"
                      placeholder="Deixe vazio para chave avulsa"
                      value={genEmail}
                      onChange={(e) => setGenEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se vazio, a chave fica sem dono até ser atribuída.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Notas internas (opcional)</Label>
                    <Textarea
                      placeholder="Ex: Cliente Fulano - venda manual"
                      value={genNotes}
                      onChange={(e) => setGenNotes(e.target.value)}
                    />
                  </div>

                  {lastGenerated && lastGenerated.length > 0 && (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Chaves geradas
                      </div>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {lastGenerated.map((l: any) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 font-mono text-xs"
                          >
                            <span>{l.license_key}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(l.license_key);
                                toast.success("Copiada");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            lastGenerated.map((l: any) => l.license_key).join("\n"),
                          );
                          toast.success("Todas copiadas");
                        }}
                      >
                        <Copy className="mr-2 h-3 w-3" /> Copiar todas
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGenOpen(false)}>
                    Fechar
                  </Button>
                  <Button
                    disabled={!genPlan || genMut.isPending}
                    onClick={() => genMut.mutate()}
                  >
                    {genMut.isPending ? "Gerando…" : "Gerar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                <th className="py-2 pr-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1 font-mono text-xs">
                      {l.license_key}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(l.license_key);
                          toast.success("Copiada");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {l.profiles ? (
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm">
                          {l.profiles.full_name || "(sem nome)"}
                        </span>
                        {l.profiles.email && (
                          <span className="text-xs text-muted-foreground">
                            {l.profiles.email}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">avulsa</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{l.plans?.name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={statusVariant(l.status)}>
                      {LICENSE_STATUS_LABEL[l.status] ?? l.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs">{formatDateBR(l.activated_at)}</td>
                  <td className="py-2 pr-3 text-xs">{formatDateBR(l.expires_at)}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <Select
                        value={l.status}
                        onValueChange={(v) =>
                          statusMut.mutate({ license_id: l.id, status: v })
                        }
                      >
                        <SelectTrigger className="h-8 w-32">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar licença?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é permanente. Chave: {l.license_key}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => delMut.mutate(l.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhuma licença encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "revoked":
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}
