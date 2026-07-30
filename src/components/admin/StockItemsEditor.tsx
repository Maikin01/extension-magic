import { useMemo, useState } from "react";
import { Copy, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
  used?: number;
  label?: string;
};

export function StockItemsEditor({ items, onChange, used = 0, label = "Estoque" }: Props) {
  const [search, setSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");

  const filtered = useMemo(
    () =>
      items
        .map((value, index) => ({ value, index }))
        .filter((row) =>
          search.trim() ? row.value.toLowerCase().includes(search.trim().toLowerCase()) : true,
        ),
    [items, search],
  );

  const update = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const removeAt = (index: number) => onChange(items.filter((_, i) => i !== index));

  const openBulk = () => {
    setBulkValue(items.join("\n"));
    setBulkOpen(true);
  };

  const applyBulk = () => {
    const next = bulkValue
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    onChange(next);
    setBulkOpen(false);
    toast.success(`${next.length} unidade(s) no estoque.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar unidade
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={openBulk}>
          <Upload className="mr-1 h-4 w-4" /> Colar em massa
        </Button>
        {items.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onChange([])}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {items.length} disponível(is){used ? ` · ${used} entregue(s)` : ""}
        </span>
      </div>

      <div className="rounded-lg border border-border/60 p-3">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Sem estoque unitário. Cada unidade adicionada aqui é entregue para um comprador
            diferente (1 link/chave por venda). Deixe vazio para usar o entregável único abaixo.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar"
                className="h-9"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(items.join("\n"));
                  toast.success("Estoque copiado.");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filtered.map((row) => (
                <div key={row.index} className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeAt(row.index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Input
                    value={row.value}
                    onChange={(e) => update(row.index, e.target.value)}
                    placeholder="Link, chave ou texto desta unidade"
                    className="h-9 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Colar estoque em massa</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Um item por linha. Cada linha vira uma unidade do estoque.
          </p>
          <Textarea
            rows={10}
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyBulk}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
