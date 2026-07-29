import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { ResellerAuthShell } from "@/components/reseller/ResellerAuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BackendApiError } from "@/lib/api/backend-client";
import { resellerAuthApi } from "@/lib/api/reseller-auth-api";
import { translateError } from "@/lib/translate-error";

export const Route = createFileRoute("/revenda_/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar na revenda — Rise Lovable" },
      {
        name: "description",
        content: "Acesso exclusivo ao painel de revendedores Rise Lovable.",
      },
    ],
  }),
  component: ResellerLoginPage,
});

function ResellerLoginPage() {
  const navigate = useNavigate();
  const { status, isAdmin, isReseller, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && (isReseller || isAdmin)) {
      void navigate({ to: "/revenda", replace: true });
    }
  }, [isAdmin, isReseller, navigate, status]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      toast.error("Informe seu email e sua senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      await resellerAuthApi.claimAccess();
      await refresh();
      toast.success("Acesso de revendedor confirmado.");
      await navigate({ to: "/revenda", replace: true });
    } catch (error) {
      if (error instanceof BackendApiError && error.code === "RESELLER_PURCHASE_NOT_FOUND") {
        await supabase.auth.signOut({ scope: "local" });
      }
      toast.error(translateError(error));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Informe seu email primeiro.");
      return;
    }
    setResetting(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
    setResetting(false);
    if (error) {
      toast.error(translateError(error));
      return;
    }
    toast.success("Se a conta existir, enviaremos as instruções por email.");
  };

  return (
    <ResellerAuthShell
      title="Painel de Revendas"
      description="Entre com o email usado na compra e a senha da sua conta."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reseller-login-email">Email</Label>
          <Input
            id="reseller-login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="reseller-login-password">Senha</Label>
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:opacity-60"
              onClick={() => void resetPassword()}
              disabled={resetting}
            >
              Esqueci minha senha
            </button>
          </div>
          <Input
            id="reseller-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="btn-neon w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar no painel
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Comprou o acesso e ainda não criou sua senha?{" "}
        <Link to="/revenda/criar-conta" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </ResellerAuthShell>
  );
}
