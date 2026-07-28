import { useState } from "react";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/lib/branding";

type Props = {
  onUnlock: (email: string) => void;
};

/**
 * Interface do portão de acesso ao painel de revendas.
 * (Somente UI — a validação real do e-mail da compra será feita no backend.)
 */
export function AccessGate({ onUnlock }: Props) {
  const brand = useBranding();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setError(null);
    setLoading(true);
    // Placeholder: futura verificação da compra no backend
    setTimeout(() => {
      setLoading(false);
      onUnlock(email.trim().toLowerCase());
    }, 700);
  };

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
      <div className="auth-card relative w-full max-w-md">
        <span className="auth-led auth-led-top" />
        <span className="auth-led auth-led-bottom" />

        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={brand.logoUrl}
            alt={brand.logoAlt}
            className="mb-4 h-16 w-16 rounded-2xl object-cover shadow-[0_0_30px_-6px_oklch(0.63_0.245_25/0.8)]"
          />
          <h1 className="text-2xl font-bold tracking-tight">Painel de Revendas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Digite o e-mail usado na sua compra para liberar o acesso.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reseller-email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              E-mail da compra
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reseller-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teste@gmail.com"
                className="pl-9"
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="btn-neon w-full" disabled={loading}>
            <span className="inline-flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "Verificando…" : "Liberar acesso"}
            </span>
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Acesso vitalício ao painel • Suporte humano • Liberação imediata
        </p>
      </div>
    </div>
  );
}
