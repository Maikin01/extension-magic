import { useState } from "react";
import { translateError } from "@/lib/translate-error";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { adminListUsers, adminSetUserRole, adminDeleteUser } from "@/lib/api/license-api";
import { formatDateBR } from "@/lib/license-utils";
import { Trash2 } from "lucide-react";
import { QueryErrorState } from "@/components/QueryErrorState";
import { useAuth } from "@/auth/AuthProvider";

type AssignableRole = "cliente" | "revendedor" | "admin" | "owner";
const BASIC_ASSIGNABLE_ROLES: AssignableRole[] = ["cliente", "revendedor"];
const OWNER_ASSIGNABLE_ROLES: AssignableRole[] = ["cliente", "revendedor", "admin", "owner"];
const ROLE_LABEL: Record<string, string> = {
  cliente: "Cliente",
  revendedor: "Revendedor",
  owner: "Owner",
  admin: "Admin",
  user: "User",
};
const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  revendedor: "secondary",
  cliente: "outline",
  user: "outline",
};

export function UsersTab() {
  const { isOwner } = useAuth();
  const assignableRoles = isOwner ? OWNER_ASSIGNABLE_ROLES : BASIC_ASSIGNABLE_ROLES;
  const listUsers = adminListUsers;
  const setRole = adminSetUserRole;
  const deleteUser = adminDeleteUser;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
    retry: 1,
  });

  const roleMut = useMutation({
    mutationFn: (vars: { user_id: string; role: AssignableRole; action: "grant" | "revoke" }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      toast.success("Cargo atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(translateError(e)),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => deleteUser({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(translateError(e)),
  });

  if (isLoading) return <div className="p-4">Carregando…</div>;
  if (error || !data)
    return (
      <QueryErrorState
        error={error ?? new Error("Resposta vazia ao carregar os usuários.")}
        title="Não foi possível carregar os usuários"
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );

  const filtered = data.filter((u: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? "").toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)
    );
  });

  const getPrimaryAssignable = (roles: string[]): AssignableRole | "" => {
    for (const r of assignableRoles) if (roles.includes(r)) return r;
    return "";
  };

  const handleRoleChange = async (userId: string, currentRoles: string[], next: AssignableRole) => {
    // remove all other assignable roles, then grant next
    for (const r of assignableRoles) {
      if (r !== next && currentRoles.includes(r)) {
        await roleMut.mutateAsync({ user_id: userId, role: r, action: "revoke" });
      }
    }
    if (!currentRoles.includes(next)) {
      await roleMut.mutateAsync({ user_id: userId, role: next, action: "grant" });
    }
  };

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
              <th className="py-2 pr-3">Cargo</th>
              <th className="py-2 pr-3">Licenças</th>
              <th className="py-2 pr-3">Criado</th>
              <th className="py-2 pr-3">Último login</th>
              <th className="py-2 pr-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => {
              const primary = getPrimaryAssignable(u.roles);
              return (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3">{u.email ?? "—"}</td>
                  <td className="py-2 pr-3">{u.full_name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <Badge variant="outline">user</Badge>}
                      {u.roles.map((r: string) => (
                        <Badge key={r} variant={ROLE_VARIANT[r] ?? "outline"}>
                          {ROLE_LABEL[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <Select
                      value={primary}
                      disabled={
                        !isOwner &&
                        u.roles.some((role: string) => ["admin", "owner"].includes(role))
                      }
                      onValueChange={(v) => handleRoleChange(u.id, u.roles, v as AssignableRole)}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue placeholder="Definir cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 pr-3">{u.license_count}</td>
                  <td className="py-2 pr-3 text-xs">{formatDateBR(u.created_at)}</td>
                  <td className="py-2 pr-3 text-xs">{formatDateBR(u.last_sign_in_at)}</td>
                  <td className="py-2 pr-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            !isOwner &&
                            u.roles.some((role: string) => ["admin", "owner"].includes(role))
                          }
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso apagará permanentemente o cadastro de{" "}
                            <strong>{u.email ?? u.id}</strong> e revogará todos os acessos. Esta
                            ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => delMut.mutate(u.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
