import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/branding";

type Props = {
  children: ReactNode;
};

export function AccessGate({ children }: Props) {
  const brand = useBranding();
  const { status, error, isAdmin, isReseller, refresh } = useAuth();

  if (status === "authenticated" && (isReseller || isAdmin)) {
    return children;
  }

  const loading = status === "initializing";
  const unauthenticated = status === "unauthenticated";
  const failed = status === "error";

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, oklch(0.63 0.245 25 / 0.22), transparent 65%)",
        }}
      />
      <div className="auth-card relative z-10 w-full max-w-md p-6 sm:p-8">
        <span className="auth-led auth-led-top" />
        <span className="auth-led auth-led-bottom" />

        <div className="relative z-[2] flex flex-col items-center text-center">
          <img
            src={brand.logoUrl}
            alt={brand.logoAlt}
            className="mb-4 h-16 w-16 rounded-2xl object-cover shadow-[0_0_30px_-6px_oklch(0.63_0.245_25/0.8)]"
          />
          {loading ? (
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
          ) : failed ? (
            <AlertCircle className="mb-4 h-8 w-8 text-destructive" />
          ) : (
            <ShieldCheck className="mb-4 h-8 w-8 text-primary" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">Painel de Revendas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? "Verificando suas permissões…"
              : unauthenticated
                ? "Entre na sua conta para acessar o painel."
                : failed
                  ? (error?.message ?? "Não foi possível validar seu acesso.")
                  : "Sua conta ainda não possui o perfil de revendedor."}
          </p>

          <div className="mt-6 w-full">
            {loading ? (
              <Button className="w-full" disabled>
                Verificando…
              </Button>
            ) : unauthenticated ? (
              <Button asChild className="btn-neon w-full">
                <Link to="/auth">Entrar na conta</Link>
              </Button>
            ) : failed ? (
              <Button className="btn-neon w-full" onClick={() => void refresh()}>
                Tentar novamente
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Voltar ao painel</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
