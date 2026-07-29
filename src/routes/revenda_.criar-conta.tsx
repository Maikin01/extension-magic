import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/revenda_/criar-conta")({
  head: () => ({
    meta: [
      { title: "Criar conta de revenda — Rise Lovable" },
      {
        name: "description",
        content: "Ative seu acesso ao painel de revendedores Rise Lovable.",
      },
    ],
  }),
  component: ResellerSignupPage,
});

function ResellerSignupPage() {
  const navigate = useNavigate();
  const { status, isAdmin, isReseller, refresh } = useAuth();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && (isReseller || isAdmin)) {
      void navigate({ to: "/revenda", replace: true });
    }
  }, [isAdmin, isReseller, navigate, status]);

  const checkEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Informe o email usado na compra.");
      return;
    }
    setLoading(true);
    try {
      const result = await resellerAuthApi.getSignupStatus(normalizedEmail);
      if (result.account_exists || result.already_claimed) {
        toast.info("Este email já possui uma conta. Entre com sua senha.");
        await navigate({
          to: "/revenda/entrar",
          replace: true,
        });
        return;
      }
      if (!result.eligible) {
        toast.error("Não encontramos uma compra aprovada para este email.");
        return;
      }
      setEmail(normalizedEmail);
      setStep("password");
    } catch (error) {
      toast.error(translateError(error));
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password.length > 72) {
      toast.error("A senha deve ter entre 8 e 72 caracteres.");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await resellerAuthApi.register({
        email,
        password,
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await resellerAuthApi.claimAccess();
      await refresh();
      toast.success("Conta de revendedor criada com sucesso.");
      await navigate({ to: "/revenda", replace: true });
    } catch (error) {
      if (error instanceof BackendApiError && error.code === "ACCOUNT_EXISTS") {
        toast.info("A conta já existe. Entre usando sua senha atual.");
        await navigate({ to: "/revenda/entrar", replace: true });
        return;
      }
      toast.error(translateError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResellerAuthShell
      title="Criar acesso de revendedor"
      description={
        step === "email"
          ? "Use exatamente o email informado na compra."
          : "Compra confirmada. Agora crie sua senha de acesso."
      }
    >
      {step === "email" ? (
        <form onSubmit={checkEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reseller-signup-email">Email da compra</Label>
            <Input
              id="reseller-signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>
          <Button type="submit" className="btn-neon w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar compra
          </Button>
        </form>
      ) : (
        <form onSubmit={createAccount} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">{email}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reseller-password">Crie uma senha</Label>
            <div className="relative">
              <Input
                id="reseller-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-11"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reseller-password-confirmation">Repita a senha</Label>
            <div className="relative">
              <Input
                id="reseller-password-confirmation"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="pr-11"
                required
              />
              <button
                type="button"
                aria-label={showConfirmation ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showConfirmation}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowConfirmation((visible) => !visible)}
              >
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("email")}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="submit" className="btn-neon" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já possui uma conta?{" "}
        <Link to="/revenda/entrar" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </ResellerAuthShell>
  );
}
