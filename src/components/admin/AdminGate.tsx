import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { translateError } from "@/lib/translate-error";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getAdminGateStatus,
  setAdminPassword,
  unlockAdmin,
  lockAdmin,
} from "@/lib/admin-security.functions";
import { ShieldCheck, ShieldAlert, Lock, KeyRound, LogOut } from "lucide-react";

function normalizeError(e: unknown): string {
  return translateError(e instanceof Error ? e : new Error(String(e)));
}

async function refreshSession() {
  // Após verify, o supabase-js atualiza a sessão internamente,
  // mas garantimos que o token no storage está fresco.
  await supabase.auth.getSession();
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const statusFn = useServerFn(getAdminGateStatus);
  const qc = useQueryClient();

  const lockFn = useServerFn(lockAdmin);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "gate"],
    queryFn: () => statusFn(),
    staleTime: 0,
  });

  const lockMut = useMutation({
    mutationFn: () => lockFn(),
    onSuccess: () => {
      toast.success("Painel trancado");
      qc.invalidateQueries({ queryKey: ["admin", "gate"] });
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-muted-foreground">Verificando permissões…</div>;
  }

  if (!data.isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>
            Sua conta não possui permissão de administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data.hasTotp) {
    return <TotpEnrollStep onDone={() => refetch()} />;
  }

  if (!data.hasPassword) {
    return <PasswordSetupStep onDone={() => refetch()} />;
  }

  if (!data.unlocked) {
    return <UnlockStep onDone={() => refetch()} />;
  }

  return <>{children}</>;


/** Passo 1: cadastrar Google Authenticator */
function TotpEnrollStep({ onDone }: { onDone: () => void }) {
  const [enrolling, setEnrolling] = useState(false);
  const [factor, setFactor] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      // Remove fatores TOTP não verificados antigos para evitar conflito.
      const { data: list } = await supabase.auth.mfa.listFactors();
      const stale = [...(list?.totp ?? []), ...(list?.all ?? [])].filter(
        (f: any) => f.factor_type === "totp" && f.status !== "verified",
      );
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactor({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setEnrolling(false);
    }
  };

  const verify = async () => {
    if (!factor) return;
    setVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challenge.error) throw challenge.error;
      const verifyRes = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verifyRes.error) throw verifyRes.error;
      await refreshSession();
      toast.success("Autenticador ativado");
      onDone();
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Ativar Google Authenticator</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Para proteger o painel admin, cadastre um autenticador (Google
        Authenticator, Authy, 1Password, etc).
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
            <div className="text-xs text-muted-foreground">
              Ou digite manualmente:
            </div>
            <code className="text-sm font-mono break-all">{factor.secret}</code>
          </div>
          <div>
            <Label htmlFor="totp-code">Código de 6 dígitos do app</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          <Button
            onClick={verify}
            disabled={verifying || code.length !== 6}
            className="w-full"
          >
            {verifying ? "Verificando…" : "Confirmar e ativar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Passo 2: definir senha extra do painel (requer TOTP recém-verificado) */
function PasswordSetupStep({ onDone }: { onDone: () => void }) {
  const setPw = useServerFn(setAdminPassword);
  const [needsFreshTotp, setNeedsFreshTotp] = useState(true);
  const [step, setStep] = useState<"totp" | "password">("totp");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const doChallenge = async () => {
    setBusy(true);
    try {
      const { data: list, error: lErr } = await supabase.auth.mfa.listFactors();
      if (lErr) throw lErr;
      const totp = (list?.totp ?? []).find((f: any) => f.status === "verified");
      if (!totp) throw new Error("Nenhum autenticador ativo");
      const ch = await supabase.auth.mfa.challengeAndVerify({
        factorId: totp.id,
        code: code.trim(),
      });
      if (ch.error) throw ch.error;
      await refreshSession();
      setStep("password");
      setNeedsFreshTotp(false);
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (password !== password2) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    try {
      await setPw({ data: { newPassword: password } });
      toast.success("Senha do painel definida");
      onDone();
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Criar senha do painel</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Essa é uma senha adicional, exigida sempre que você abrir o painel
        admin (mesmo já logado).
      </p>

      {step === "totp" ? (
        <div className="space-y-4">
          <p className="text-sm">
            Primeiro, confirme um código do autenticador para autorizar a
            criação da senha.
          </p>
          <div>
            <Label htmlFor="totp-code-1">Código de 6 dígitos</Label>
            <Input
              id="totp-code-1"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          <Button
            onClick={doChallenge}
            disabled={busy || code.length !== 6}
            className="w-full"
          >
            {busy ? "Verificando…" : "Continuar"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="pw1">Nova senha</Label>
            <Input
              id="pw1"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <Label htmlFor="pw2">Confirmar senha</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <Button
            onClick={save}
            disabled={busy || password.length < 8 || password !== password2}
            className="w-full"
          >
            {busy ? "Salvando…" : "Salvar senha"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Passo 3: unlock (código TOTP + senha do painel) a cada acesso */
function UnlockStep({ onDone }: { onDone: () => void }) {
  const unlock = useServerFn(unlockAdmin);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: list, error: lErr } = await supabase.auth.mfa.listFactors();
      if (lErr) throw lErr;
      const totp = (list?.totp ?? []).find((f: any) => f.status === "verified");
      if (!totp) throw new Error("Nenhum autenticador ativo");
      const ch = await supabase.auth.mfa.challengeAndVerify({
        factorId: totp.id,
        code: code.trim(),
      });
      if (ch.error) throw ch.error;
      await refreshSession();
      await unlock({ data: { password } });
      toast.success("Painel desbloqueado");
      onDone();
    } catch (e) {
      toast.error(normalizeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Desbloquear painel admin</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Digite um código atual do Google Authenticator e a senha do painel.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="unlock-code">Código de 6 dígitos</Label>
          <Input
            id="unlock-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />
        </div>
        <div>
          <Label htmlFor="unlock-pw">Senha do painel</Label>
          <Input
            id="unlock-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={busy || code.length !== 6 || !password}
          className="w-full"
        >
          {busy ? "Verificando…" : "Desbloquear"}
        </Button>
      </form>
    </Card>
  );
}
