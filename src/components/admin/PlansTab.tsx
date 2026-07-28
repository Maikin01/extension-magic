import { useState } from "react";
import { translateError } from "@/lib/translate-error";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAdminOverview, adminCreatePlan, adminUpdatePlan } from "@/lib/api/license-api";
import { formatPrice } from "@/lib/license-utils";
import { Plus, Pencil } from "lucide-react";
import { QueryErrorState } from "@/components/QueryErrorState";

type PlanForm = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  duration_days: number;
  price_cents: number;
  max_devices: number;
  is_active: boolean;
  sort_order: number;
  features: string;
};

const emptyForm: PlanForm = {
  slug: "",
  name: "",
  description: "",
  duration_days: 30,
  price_cents: 0,
  max_devices: 1,
  is_active: true,
  sort_order: 0,
  features: "",
};

export function PlansTab() {
  const getOverview = getAdminOverview;
  const createPlan = adminCreatePlan;
  const updatePlan = adminUpdatePlan;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getOverview(),
    retry: 1,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: form.slug,
        name: form.name,
        description: form.description || null,
        duration_days: Number(form.duration_days),
        price_cents: Number(form.price_cents),
        max_devices: Number(form.max_devices),
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
        features: form.features
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (form.id) {
        return updatePlan({ data: { ...payload, id: form.id } });
      }
      return createPlan({ data: payload });
    },
    onSuccess: () => {
      toast.success(form.id ? "Plano atualizado" : "Plano criado");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(translateError(e)),
  });

  function openEdit(p: any) {
    setForm({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? "",
      duration_days: p.duration_days,
      price_cents: p.price_cents,
      max_devices: p.max_devices,
      is_active: p.is_active,
      sort_order: p.sort_order,
      features: Array.isArray(p.features) ? p.features.join("\n") : "",
    });
    setOpen(true);
  }

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  if (isLoading) return <div className="p-4">Carregando…</div>;
  if (error || !data)
    return (
      <QueryErrorState
        error={error ?? new Error("Resposta vazia ao carregar os planos.")}
        title="Não foi possível carregar os planos administrativos"
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Planos disponíveis</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.plans.map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{p.slug}</p>
              </div>
              <Badge variant={p.is_active ? "default" : "outline"}>
                {p.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            {p.description && <p className="mb-2 text-sm text-muted-foreground">{p.description}</p>}
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Preço:</strong> {formatPrice(p.price_cents)}
              </li>
              <li>
                <strong>Duração:</strong> {p.duration_days} dias
              </li>
              <li>
                <strong>Dispositivos:</strong> {p.max_devices}
              </li>
              <li>
                <strong>Ordem:</strong> {p.sort_order}
              </li>
            </ul>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => openEdit(p)}>
              <Pencil className="mr-2 h-3 w-3" /> Editar
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="mensal"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mensal"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Preço (centavos)</Label>
                <Input
                  type="number"
                  value={form.price_cents}
                  onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dispositivos</Label>
                <Input
                  type="number"
                  value={form.max_devices}
                  onChange={(e) => setForm({ ...form, max_devices: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Ativo</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (uma por linha)</Label>
              <Textarea
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Acesso completo&#10;Suporte prioritário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
