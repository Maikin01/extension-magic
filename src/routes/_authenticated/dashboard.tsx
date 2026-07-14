import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Key, Monitor, Clock, ShieldCheck, ExternalLink } from "lucide-react";
import { getMyDashboard, claimTrialLicense } from "@/lib/license.functions";
import {
  LICENSE_STATUS_LABEL,
  formatDateBR,
  formatDaysLeft,
} from "@/lib/license-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Lovable" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const getDash = useServerFn(getMyDashboard);
  const claimTrial = useServerFn(claimTrialLicense);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDash(),
  });

  const trialMut = useMutation({
    mutationFn: () => claimTrial(),
    onSuccess: () => {
      toast.success("Licença de teste criada!");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-muted-foreground">
            Gerencie sua chave, veja dispositivos autorizados e baixe a extensão.
          </p>
        </header>

        {isLoading && <Card className="p-6">Carregando…</Card>}
        {error && <Card className="p-6 text-destructive">Erro: {(error as Error).message}</Card>}

        {data && !data.currentLicense && (
          <Card className="p-8 text-center">
            <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Você ainda não tem uma licença</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Escolha um plano ou crie uma licença de teste gratuita de 3 dias para começar
              agora.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => trialMut.mutate()} disabled={trialMut.isPending}>
                {trialMut.isPending ? "Gerando…" : "Gerar teste grátis (3 dias)"}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/planos">Ver planos</Link>
              </Button>
            </div>
          </Card>
        )}

        {data?.currentLicense && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <LicenseCard license={data.currentLicense} />
              <DevicesCard devices={data.devices} />
              <LogsCard logs={data.logs} />
            </div>
            <aside className="space-y-6">
              <DownloadCard />
              <AllLicensesCard licenses={data.licenses} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function LicenseCard({ license }: { license: any }) {
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
        : status === "expired" || status === "revoked" || status === "suspended"
          ? "destructive"
          : "outline";

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Sua chave</div>
          <div className="mt-1 text-sm text-muted-foreground">{license.plans?.name}</div>
        </div>
        <Badge variant={badgeVariant as any}>{LICENSE_STATUS_LABEL[status] ?? status}</Badge>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <Key className="h-4 w-4 text-muted-foreground" />
        <code className="flex-1 font-mono text-sm">{license.license_key}</code>
        <Button size="sm" variant="ghost" onClick={copy}>
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Ativada em</div>
          <div className="mt-1 font-medium">{formatDateBR(license.activated_at)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Expira em</div>
          <div className="mt-1 font-medium">{formatDateBR(license.expires_at)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Restante</div>
          <div className="mt-1 font-medium">{formatDaysLeft(license.expires_at)}</div>
        </div>
      </div>

      {status === "pending" && (
        <div className="mt-4 rounded-md bg-primary/5 p-3 text-sm text-muted-foreground">
          Cole sua chave na extensão para ativá-la. A partir da ativação o tempo começa a contar.
        </div>
      )}
    </Card>
  );
}

function DevicesCard({ devices }: { devices: any[] }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Monitor className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Dispositivos autorizados</h3>
      </div>
      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum dispositivo ativado ainda. Cole sua chave na extensão para começar.
        </p>
      ) : (
        <ul className="space-y-3">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">
                  {d.browser ?? "Navegador"} · {d.os ?? "SO"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Última vez: {formatDateBR(d.last_seen_at)} · v{d.ext_version ?? "?"}
                </div>
              </div>
              {d.is_revoked && <Badge variant="destructive">Revogado</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LogsCard({ logs }: { logs: any[] }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Últimas validações</h3>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
      ) : (
        <ul className="divide-y">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{formatDateBR(l.created_at)}</span>
              <Badge variant={l.result === "success" ? "default" : "destructive"}>
                {l.result}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DownloadCard() {
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <Download className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Baixar extensão</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Baixe o arquivo .zip, extraia e carregue em <code>chrome://extensions</code> com o modo
        desenvolvedor ativo.
      </p>
      <Button className="mt-4 w-full" onClick={downloadExtension}>
        <Download className="mr-2 h-4 w-4" /> Baixar .zip
      </Button>
      <a
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        href="https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/"
        target="_blank"
        rel="noreferrer"
      >
        Como instalar <ExternalLink className="h-3 w-3" />
      </a>
    </Card>
  );
}

function downloadExtension() {
  fetch("/lovable-extension.zip")
    .then((r) => {
      if (!r.ok) throw new Error("Download indisponível — publique o site para gerar o zip.");
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lovable-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => toast.error(err.message));
}

function AllLicensesCard({ licenses }: { licenses: any[] }) {
  if (licenses.length <= 1) return null;
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Histórico de licenças</h3>
      </div>
      <ul className="space-y-2 text-sm">
        {licenses.map((l) => (
          <li key={l.id} className="flex items-center justify-between">
            <span className="font-mono text-xs">{l.license_key.slice(0, 14)}…</span>
            <Badge variant="outline">{LICENSE_STATUS_LABEL[l.status] ?? l.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
