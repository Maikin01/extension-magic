import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminListUsers, adminSetUserRole } from "@/lib/license.functions";
import { formatDateBR } from "@/lib/license-utils";
import { Shield, ShieldOff } from "lucide-react";

export function UsersTab() {
  const listUsers = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetUserRole);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
  });

  const mut = useMutation({
    mutationFn: (vars: { user_id: string; role: "admin"; action: "grant" | "revoke" }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-4">Carregando…</div>;

  const filtered = data.filter((u: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Usuários ({data.length})</h2>
        <Input
          placeholder="Buscar por email ou nome…"
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Nome</th>
              <th className="py-2 pr-3">Papéis</th>
              <th className="py-2 pr-3">Licenças</th>
              <th className="py-2 pr-3">Criado</th>
              <th className="py-2 pr-3">Último login</th>
              <th className="py-2 pr-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3">{u.email ?? "—"}</td>
                  <td className="py-2 pr-3">{u.full_name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-1">
                      {u.roles.length === 0 && (
                        <Badge variant="outline">user</Badge>
                      )}
                      {u.roles.map((r: string) => (
                        <Badge
                          key={r}
                          variant={r === "admin" ? "default" : "outline"}
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3">{u.license_count}</td>
                  <td className="py-2 pr-3 text-xs">{formatDateBR(u.created_at)}</td>
                  <td className="py-2 pr-3 text-xs">
                    {formatDateBR(u.last_sign_in_at)}
                  </td>
                  <td className="py-2 pr-3">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mut.mutate({
                            user_id: u.id,
                            role: "admin",
                            action: "revoke",
                          })
                        }
                      >
                        <ShieldOff className="mr-1 h-3 w-3" /> Remover admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          mut.mutate({
                            user_id: u.id,
                            role: "admin",
                            action: "grant",
                          })
                        }
                      >
                        <Shield className="mr-1 h-3 w-3" /> Tornar admin
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
