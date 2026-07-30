import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Pencil, Plus, Trash2, Truck } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { formatPrice } from "@/lib/license-utils";
import { translateError } from "@/lib/translate-error";
import {
  adminCreateMarketplaceProduct,
  adminDeleteMarketplaceProduct,
  adminListMarketplaceOrders,
  adminListMarketplaceProducts,
  adminUpdateMarketplaceOrder,
  adminUpdateMarketplaceProduct,
  DELIVERY_LABELS,
  ORDER_STATUS_LABELS,
  type AdminProduct,
  type DeliveryType,
  type OrderStatus,
  type ProductInput,
} from "@/lib/api/marketplace-api";
import { StockItemsEditor } from "@/components/admin/StockItemsEditor";

type Form = ProductInput & {
  id?: string;
  priceReais: string;
  oldPriceReais: string;
  stockItems: string[];
  stockUsed: number;
};

const emptyForm: Form = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  category: "Ferramentas",
  price_cents: 0,
  old_price_cents: null,
  cover_url: "",
  delivery_type: "link",
  delivery_content: "",
  delivery_instructions: "",
  stock: null,
  rating: 5,
  is_active: true,
  featured: false,
  sort_order: 0,
  priceReais: "",
  oldPriceReais: "",
  stockItems: [],
  stockUsed: 0,
};

const toCents = (value: string) => Math.round(Number(value.replace(",", ".") || "0") * 100);

const FIELD_LABELS: Record<string, string> = {
  slug: "Identificador (slug)",
  name: "Nome",
  tagline: "Chamada curta",
  description: "Descrição completa",
  category: "Categoria",
  price_cents: "Preço",
  old_price_cents: "Preço antigo",
  cover_url: "Imagem de capa",
  delivery_type: "Tipo de entregável",
  delivery_content: "Entregável",
  delivery_instructions: "Instruções de uso",
  stock: "Estoque",
  stock_items: "Estoque por unidade",
  rating: "Avaliação",
  sort_order: "Ordem",
};

function ProductsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "marketplace", "products"],
    queryFn: adminListMarketplaceProducts,
    retry: 1,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: ProductInput = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        tagline: form.tagline?.trim() || null,
        description: form.description?.trim() || null,
        category: form.category.trim() || "Ferramentas",
        price_cents: toCents(form.priceReais),
        old_price_cents: form.oldPriceReais ? toCents(form.oldPriceReais) : null,
        cover_url: form.cover_url?.trim() || null,
        delivery_type: form.delivery_type,
        delivery_content: form.delivery_content?.trim() || null,
        delivery_instructions: form.delivery_instructions?.trim() || null,
        stock: form.stockItems.length
          ? form.stockItems.length
          : form.stock === null || Number.isNaN(form.stock)
            ? null
            : Number(form.stock),
        stock_items: form.stockItems.map((item) => item.trim()).filter(Boolean),
        rating: Number(form.rating) || 5,
        is_active: form.is_active,
        featured: form.featured,
        sort_order: Number(form.sort_order) || 0,
      };

      // Validação local: aponta o campo exato antes de chamar o backend.
      const local: Record<string, string> = {};
      if (payload.name.length < 1) local.name = "Informe o nome do produto.";
      if (payload.slug.length < 2) local.slug = "Informe ao menos 2 caracteres.";
      else if (!/^[a-z0-9_-]+$/.test(payload.slug)) {
        local.slug = "Use apenas letras minúsculas, números, - e _.";
      }
      if (!payload.category) local.category = "Escolha uma categoria.";
      if (!Number.isFinite(payload.price_cents) || payload.price_cents < 0) {
        local.price_cents = "Informe um preço válido (ex.: 49,90).";
      }
      if (
        payload.cover_url &&
        !/^data:image\/[a-z0-9.+-]+;base64,/i.test(payload.cover_url) &&
        !/^https?:\/\//i.test(payload.cover_url)
      ) {
        local.cover_url = "Envie uma imagem ou informe uma URL http(s) válida.";
      }
      if (Number(payload.rating) < 0 || Number(payload.rating) > 5) {
        local.rating = "A avaliação deve ficar entre 0 e 5.";
      }
      if (Object.keys(local).length) {
        setFieldErrors(local);
        throw new Error(
          `Corrija: ${
            Object.keys(local)
              .map((k) => FIELD_LABELS[k] ?? k)
              .join(", ")
          }`,
        );
      }
      setFieldErrors({});

      return form.id
        ? adminUpdateMarketplaceProduct({ ...payload, id: form.id })
        : adminCreateMarketplaceProduct(payload);
    },
    onSuccess: () => {
      toast.success("Produto salvo!");
      setOpen(false);
      setForm(emptyForm);
      setFieldErrors({});
      void qc.invalidateQueries({ queryKey: ["admin", "marketplace"] });
    },
    onError: (e) => {
      const fields = (e as { fields?: Array<{ field: string; message: string }> }).fields;
      if (Array.isArray(fields) && fields.length) {
        const mapped: Record<string, string> = {};
        for (const issue of fields) {
          mapped[issue.field.split(".")[0]] = issue.message;
        }
        setFieldErrors(mapped);
        toast.error(
          `Corrija: ${
            fields.map((f) => FIELD_LABELS[f.field.split(".")[0]] ?? f.field).join(", ")
          }`,
        );
        return;
      }
      toast.error(translateError(e));
    },
  });

  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <p className="text-[11px] font-medium text-destructive">{fieldErrors[name]}</p>
    ) : null;
  const invalid = (name: string) =>
    fieldErrors[name] ? "border-destructive focus-visible:ring-destructive" : "";

  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);

  const remove = useMutation({
    mutationFn: adminDeleteMarketplaceProduct,
    onSuccess: () => {
      toast.success("Produto excluído.");
      setPendingDelete(null);
      void qc.invalidateQueries({ queryKey: ["admin", "marketplace"] });
    },
    onError: (e) => toast.error(translateError(e)),
  });

  const edit = (p: AdminProduct) => {
    setForm({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      category: p.category,
      price_cents: p.price_cents,
      old_price_cents: p.old_price_cents,
      cover_url: p.cover_url ?? "",
      delivery_type: p.delivery_type,
      delivery_content: p.delivery_content ?? "",
      delivery_instructions: p.delivery_instructions ?? "",
      stock: p.stock,
      rating: p.rating,
      is_active: p.is_active,
      featured: p.featured,
      sort_order: p.sort_order,
      priceReais: (p.price_cents / 100).toFixed(2),
      oldPriceReais: p.old_price_cents ? (p.old_price_cents / 100).toFixed(2) : "",
      stockItems: p.stock_items ?? [],
      stockUsed: p.stock_items_used ?? 0,
    });
    setOpen(true);
  };

  if (error) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  const products = data?.products ?? [];

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Produtos do marketplace</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre produtos, defina o preço e o entregável que o comprador recebe.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Produto</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Preço</th>
                <th className="py-2 pr-3">Entrega</th>
                <th className="py-2 pr-3">Estoque</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 pr-3 font-medium">{p.name}</td>
                  <td className="py-3 pr-3">{p.category}</td>
                  <td className="py-3 pr-3">{formatPrice(p.price_cents)}</td>
                  <td className="py-3 pr-3 text-xs">{DELIVERY_LABELS[p.delivery_type]}</td>
                  <td className="py-3 pr-3">{p.stock ?? "∞"}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => edit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(p)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir “{pendingDelete?.name}”? Essa ação não pode
              ser desfeita. Os pedidos já realizados continuam no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
            >
              {remove.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            {/* Coluna esquerda: imagem + preview */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Imagem de capa
                </Label>
                <ImageDropzone
                  value={form.cover_url ?? ""}
                  onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
                />
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Prévia do card
                </p>
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <div className="aspect-[4/3] bg-muted/40">
                    {form.cover_url ? (
                      <img
                        src={form.cover_url}
                        alt="Prévia"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-7 w-7 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-semibold">
                      {form.name || "Nome do produto"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {form.tagline || "Chamada curta"}
                    </p>
                    <p className="pt-1 text-sm font-bold text-primary">
                      Comprar por {formatPrice(toCents(form.priceReais))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna direita: campos */}
            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informações
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          name: e.target.value,
                          slug: f.id
                            ? f.slug
                            : e.target.value
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-|-$/g, ""),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Identificador (slug)</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Chamada curta</Label>
                    <Input
                      value={form.tagline ?? ""}
                      placeholder="Ex.: Conta com 300 créditos, entrega imediata"
                      onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Descrição completa</Label>
                    <Textarea
                      rows={5}
                      value={form.description ?? ""}
                      placeholder="Explique o que o comprador recebe, condições e prazos."
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IA">IA</SelectItem>
                        <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                        <SelectItem value="Assinaturas">Assinaturas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Estoque (vazio = ilimitado)</Label>
                    <Input
                      type="number"
                      disabled={form.stockItems.length > 0}
                      value={
                        form.stockItems.length > 0 ? form.stockItems.length : (form.stock ?? "")
                      }
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          stock: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                    />
                    {form.stockItems.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Controlado pelas unidades cadastradas na seção Entrega.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Preço
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Preço (R$)</Label>
                    <Input
                      value={form.priceReais}
                      onChange={(e) => setForm((f) => ({ ...f, priceReais: e.target.value }))}
                      placeholder="49,90"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Preço antigo (R$, opcional)</Label>
                    <Input
                      value={form.oldPriceReais}
                      onChange={(e) => setForm((f) => ({ ...f, oldPriceReais: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Entrega
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Tipo de entregável</Label>
                    <Select
                      value={form.delivery_type}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, delivery_type: v as DeliveryType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DELIVERY_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>
                      Entregável{" "}
                      {form.delivery_type === "manual"
                        ? "(opcional — você entrega manualmente em cada pedido)"
                        : "(usado apenas quando não há estoque por unidade)"}
                    </Label>
                    <Textarea
                      rows={3}
                      value={form.delivery_content ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, delivery_content: e.target.value }))
                      }
                    />
                  </div>
                  {form.delivery_type !== "manual" && (
                    <div className="space-y-1 sm:col-span-2">
                      <StockItemsEditor
                        items={form.stockItems}
                        used={form.stockUsed}
                        onChange={(stockItems) => setForm((f) => ({ ...f, stockItems }))}
                        label="Estoque por unidade (1 entregável por venda)"
                      />
                    </div>
                  )}
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Instruções de uso (aparecem junto ao entregável)</Label>
                    <Textarea
                      rows={2}
                      value={form.delivery_instructions ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, delivery_instructions: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Exibição
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Ordem</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Avaliação (0–5)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.rating}
                      onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                    />
                    <Label>Ativo</Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                    <Switch
                      checked={form.featured}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                    />
                    <Label>Destaque</Label>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

function OrdersPanel() {
  const qc = useQueryClient();
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "marketplace", "orders"],
    queryFn: adminListMarketplaceOrders,
    retry: 1,
  });

  const update = useMutation({
    mutationFn: adminUpdateMarketplaceOrder,
    onSuccess: () => {
      toast.success("Pedido atualizado!");
      void qc.invalidateQueries({ queryKey: ["admin", "marketplace"] });
    },
    onError: (e) => toast.error(translateError(e)),
  });

  const orders = data?.orders ?? [];
  const pending = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);

  if (error) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-bold leading-tight">Pedidos e entregas</h3>
          <p className="text-xs text-muted-foreground">
            {pending} pedido(s) aguardando pagamento. Ao marcar como pago, o entregável é
            liberado automaticamente para o comprador.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum pedido ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.buyer_email ?? o.buyer_id} · {formatPrice(o.amount_cents)} ·{" "}
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </p>
                  {o.buyer_note && (
                    <p className="mt-1 text-xs text-muted-foreground">Obs.: {o.buyer_note}</p>
                  )}
                </div>
                <Badge variant={o.status === "delivered" ? "default" : "secondary"}>
                  {ORDER_STATUS_LABELS[o.status]}
                </Badge>
              </div>

              {o.status !== "delivered" && o.status !== "cancelled" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    placeholder="Entregável (link, chave ou instruções) — opcional se já cadastrado no produto"
                    value={deliveryDrafts[o.id] ?? ""}
                    onChange={(e) =>
                      setDeliveryDrafts((d) => ({ ...d, [o.id]: e.target.value }))
                    }
                  />
                  <Button
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        order_id: o.id,
                        status: "paid",
                        delivered_content: deliveryDrafts[o.id] || null,
                      })
                    }
                  >
                    Confirmar pagamento e entregar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({ order_id: o.id, status: "cancelled" as OrderStatus })
                    }
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {o.status === "delivered" && o.delivered_content && (
                <p className="mt-3 break-all rounded-lg bg-muted/40 p-3 font-mono text-xs">
                  {o.delivered_content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function MarketplaceTab() {
  return (
    <Tabs defaultValue="products">
      <TabsList className="mb-4">
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductsPanel />
      </TabsContent>
      <TabsContent value="orders">
        <OrdersPanel />
      </TabsContent>
    </Tabs>
  );
}
