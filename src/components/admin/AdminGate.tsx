import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { translateError } from "@/lib/translate-error";
import { QueryErrorState } from "@/components/QueryErrorState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MfaStatus = {
  hasTotp: boolean;
  currentLevel: "aal1" | "aal2" | null;
};

function normalizeError(error: unknown): string {
  return translateError(error instanceof Error ? error : new Error(String(error)));
}

async function getMfaStatus(): Promise<MfaStatus> {
  const [factorsResult, assuranceResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (factorsResult.error) throw factorsResult.error;
  if (assuranceResult.error) throw assuranceResult.error;
  const hasTotp = (factorsResult.data?.totp ?? []).some((factor) => factor.status === "verified");
  const reportedLevel = assuranceResult.data?.currentLevel;
  const currentLevel: MfaStatus["currentLevel"] =
    reportedLevel === "aal2" ? "aal2" : reportedLevel === "aal1" ? "aal1" : null;
  return {
    hasTotp,
    currentLevel,
  };
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { status, isAdmin, error: authError, refresh: refreshAuth } = useAuth();
  const mfa = useQuery({
    queryKey: ["admin", "mfa-status"],
    queryFn: getMfaStatus,
    enabled: status === "authenticated" && isAdmin,
    staleTime: 0,
    retry: 1,
  });

  if (status === "initializing") {
    return <div className="p-8 text-center text-muted-foreground">Verificando permissões…</div>;
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg p-8">
        <QueryErrorState
          error={authError ?? new Error("Não foi possível validar sua sessão.")}
          title="Não foi possível verificar suas permissões"
          onRetry={() => void refreshAuth()}
        />
      </div>
    );
  }

  if (status !== "authenticated" || !isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>Sua conta não possui permissão de administrador.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (mfa.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Verificando MFA…</div>;
  }

  if (mfa.isError || !mfa.data) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <QueryErrorState
          error={mfa.error ?? new Error("Resposta vazia ao verificar o MFA.")}
          title="Não foi possível verificar o autenticador"
          onRetry={() => void mfa.refetch()}
          isRetrying={mfa.isFetching}
        />
      </div>
    );
  }

  if (!mfa.data.hasTotp) {
    return <TotpEnrollStep onDone={() => void mfa.refetch()} />;
  }

  if (mfa.data.currentLevel !== "aal2") {
    return <TotpChallengeStep onDone={() => void mfa.refetch()} />;
  }

  return <>{children}</>;
}

function TotpEnrollStep({ onDone }: { onDone: () => void }) {
  const [enrolling, setEnrolling] = useState(false);
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const stale = (list?.all ?? []).filter(
        (candidate) => candidate.factor_type === "totp" && candidate.status !== "verified",
      );
      for (const candidate of stale) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: candidate.id });
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (error) {
      toast.error(normalizeError(error));
    } finally {
      setEnrolling(false);
    }
  };

  const verify = async () => {
    if (!factor) return;
    setVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;
      const result = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (result.error) throw result.error;
      toast.success("Autenticador ativado");
      onDone();
    } catch (error) {
      toast.error(normalizeError(error));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Ativar autenticação em duas etapas</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        O painel administrativo exige um aplicativo autenticador compatível com TOTP.
      </p>
      {!factor ? (
        <Button onClick={startEnroll} disabled={enrolling} className="w-full">
          {enrolling ? "Gerando QR…" : "Gerar QR Code"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center rounded-lg border bg-white p-4">
            <img src={factor.qr} alt="QR Code TOTP" className="h-56 w-56" />
          </div>
          <div className="rounded-md bg-muted p-3 text-center">
            <div className="text-xs text-muted-foreground">Ou digite manualmente:</div>
            <code className="break-all font-mono text-sm">{factor.secret}</code>
          </div>
          <div>
            <Label htmlFor="totp-enroll-code">Código de 6 dígitos</Label>
            <Input
              id="totp-enroll-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          <Button onClick={verify} disabled={verifying || code.length !== 6} className="w-full">
            {verifying ? "Verificando…" : "Confirmar e ativar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function TotpChallengeStep({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const factor = (data?.totp ?? []).find((candidate) => candidate.status === "verified");
      if (!factor) throw new Error("Nenhum autenticador ativo.");
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.trim(),
      });
      if (result.error) throw result.error;
      toast.success("Acesso administrativo confirmado");
      onDone();
    } catch (error) {
      toast.error(normalizeError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Confirmar acesso administrativo</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Digite o código atual do seu aplicativo autenticador.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="totp-challenge-code">Código de 6 dígitos</Label>
          <Input
            id="totp-challenge-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />
        </div>
        <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
          {busy ? "Verificando…" : "Entrar no painel"}
        </Button>
      </form>
    </Card>
  );
}
