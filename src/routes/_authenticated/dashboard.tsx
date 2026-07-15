import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Copy, Download, Key, MessageCircle, PlayCircle, Sparkles } from "lucide-react";
import { getMyDashboard, claimTrialLicense } from "@/lib/license.functions";
import {
  LICENSE_STATUS_LABEL,
  formatDateBR,
} from "@/lib/license-utils";

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (isNaN(diff)) return null;
  if (diff <= 0) return { expired: true, label: "Expirada" };
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  let label: string;
  if (days > 0) label = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  else if (hours > 0) label = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  else label = `${pad(minutes)}:${pad(seconds)}`;
  return { expired: false, label };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Lovable" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const getDash = useServerFn(getMyDashboard);
  const claimTrial = useServerFn(claimTrialLicense);
  const qc = useQueryClient();
  const autoClaimedRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDash(),
    refetchInterval: 30_000,
  });

  const trialMut = useMutation({
    mutationFn: () => claimTrial(),
    onSuccess: (res: any) => {
      if (res?.existed) toast.info("Você já tem uma licença de teste ativa.");
      else toast.success("Licença de teste criada! 10 minutos de acesso.");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Auto-claim quando vier de "Testar grátis" (?claim=trial) e ainda não tiver licença
  useEffect(() => {
    if (autoClaimedRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("claim") !== "trial") return;
    if (!data) return;
    autoClaimedRef.current = true;
    if (!data.currentLicense) trialMut.mutate();
    // limpa a query
    params.delete("claim");
    const q = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (q ? `?${q}` : ""),
    );
  }, [data]);

  return (
    <div className="rise-bg min-h-screen">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="chip-neon inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3" /> Meu painel
            </span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Bem-vindo ao seu <span className="text-gradient-red">painel</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Baixe a extensão, ative com sua chave e comece a usar sem limites.
            </p>
          </div>
        </header>

        {isLoading && <Card className="p-6">Carregando…</Card>}
        {error && (
          <Card className="p-6 text-destructive">Erro: {(error as Error).message}</Card>
        )}

        {data && !data.currentLicense && (
          <Card className="ring-glow border-primary/30 bg-black/40 p-8 text-center backdrop-blur">
            <Key className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold">Você ainda não tem uma licença</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Gere sua chave de teste gratuita — 10 minutos de acesso.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                className="btn-neon"
                onClick={() => trialMut.mutate()}
                disabled={trialMut.isPending}
              >
                {trialMut.isPending ? "Gerando…" : "Gerar teste grátis (10 minutos)"}
              </Button>
            </div>
          </Card>
        )}

        {data?.currentLicense && (
          <div className="space-y-6">
            <ExtensionCard />
            <TutorialsCard />
            <LicensesCard licenses={data.licenses} current={data.currentLicense} />
          </div>
        )}
      </main>
    </div>
  );
}


function ExtensionCard() {
  return (
    <Card className="ring-glow border-primary/30 bg-black/40 p-8 backdrop-blur">
      <h2 className="text-xl font-bold text-gradient-red">Extensão Lovable Ilimitado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Baixe a extensão e ative com sua chave de licença para usar o Lovable sem limites.
      </p>
      <Button className="btn-neon mt-5" onClick={downloadExtension}>
        <Download className="mr-2 h-4 w-4" /> Baixar extensão
      </Button>
    </Card>
  );
}

function TutorialsCard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <VideoCard title="Como instalar" />
      <VideoCard title="Como usar" />
    </div>
  );
}

function VideoCard({ title }: { title: string }) {
  return (
    <Card className="border-primary/20 bg-black/40 p-6 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-gradient-red">{title}</h3>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-black/60">
        <div className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.63 0.245 25 / 0.25), transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-3 text-muted-foreground">
          <PlayCircle className="h-14 w-14" />
          <span className="text-sm">Vídeo em breve</span>
        </div>
      </div>
    </Card>
  );
}

function LicensesCard({ licenses, current }: { licenses: any[]; current: any }) {
  return (
    <Card className="ring-glow border-primary/30 bg-black/40 p-8 backdrop-blur">
      <h2 className="mb-5 text-xl font-bold text-gradient-red">Minhas licenças</h2>
      <ul className="space-y-3">
        {licenses.map((l) => (
          <LicenseRow key={l.id} license={l} isCurrent={l.id === current?.id} />
        ))}
      </ul>
    </Card>
  );
}

function LicenseRow({ license, isCurrent }: { license: any; isCurrent: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(license.license_key);
    setCopied(true);
    toast.success("Chave copiada");
    setTimeout(() => setCopied(false), 1500);
  };
  const status = license.status as string;
  const badgeVariant =
    status === "active"
      ? "default"
      : status === "pending"
        ? "secondary"
        : "destructive";

  const countdown = useCountdown(isCurrent ? license.expires_at : null);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-black/50 p-4">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <code className="truncate font-mono text-sm">{license.license_key}</code>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="chip-neon border-0" variant={badgeVariant as any}>
          {license.plans?.name ?? LICENSE_STATUS_LABEL[status] ?? status}
        </Badge>
        {license.expires_at && (
          <span className="text-xs text-muted-foreground">
            Expira em {formatDateBR(license.expires_at)}
          </span>
        )}
        {isCurrent && countdown && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums ${
              countdown.expired
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary"
            }`}
            title="Tempo restante da licença"
          >
            <Clock className="h-3 w-3" />
            {countdown.expired ? "Expirada" : countdown.label}
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={copy}>
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </li>
  );
}

function downloadExtension() {
  fetch("/lovable-extension-v1.0.2.zip")
    .then((r) => {
      if (!r.ok) throw new Error("Download indisponível — publique o site para gerar o zip.");
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lovable-extension-v1.0.2.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => toast.error(err.message));
}
