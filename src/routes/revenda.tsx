import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Copy,
  KeyRound,
  LogOut,
  ShoppingBag,
  Trophy,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessGate } from "@/components/reseller/AccessGate";
import { KeyStore } from "@/components/reseller/KeyStore";
import { Marketplace } from "@/components/reseller/Marketplace";
import { ResellerRanking } from "@/components/reseller/ResellerRanking";
import { ResellerSupport } from "@/components/reseller/ResellerSupport";
import { formatPrice } from "@/lib/license-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/revenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel de Revendas — Rise Lovable" },
      {
        name: "description",
        content:
          "Compre chaves da extensão com preço de revendedor e venda ferramentas exclusivas no marketplace Rise Lovable.",
      },
      { property: "og:title", content: "Painel de Revendas — Rise Lovable" },
      {
        property: "og:description",
        content:
          "Chaves com preço de revenda, marketplace de ferramentas e controle total das suas vendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResellerPanelPage,
});

const STORAGE_KEY = "rise_reseller_access_email";

type Tab = "chaves" | "minhas" | "marketplace" | "ranking";

function ResellerPanelPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chaves");

  useEffect(() => {
    setEmail(localStorage.getItem(STORAGE_KEY));
  }, []);

  const unlock = (value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    setEmail(value);
    toast.success("Acesso liberado!");
  };

  const exit = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEmail(null);
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <AccessGate onUnlock={unlock} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Painel de revendas
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">
              Acesso liberado para <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <Button variant="outline" onClick={exit}>
            <LogOut className="mr-2 h-4 w-4" /> Sair do painel
          </Button>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Wallet className="h-5 w-5 text-primary" />}
            label="Saldo em chaves"
            value="0"
            hint="chaves disponíveis"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            label="Lucro estimado"
            value={formatPrice(0)}
            hint="no período"
          />
          <StatCard
            icon={<ShoppingBag className="h-5 w-5 text-primary" />}
            label="Compras no marketplace"
            value="0"
            hint="produtos adquiridos"
          />
        </div>

        <nav className="mb-8 inline-flex flex-wrap gap-2 rounded-full border border-border/60 bg-card p-1">
          {(
            [
              { key: "chaves", label: "Comprar chaves", icon: KeyRound },
              { key: "minhas", label: "Minhas chaves", icon: Wallet },
              { key: "marketplace", label: "Marketplace", icon: ShoppingBag },
              { key: "ranking", label: "Ranking", icon: Trophy },
            ] as const
          ).map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setTab(t.key)}
            >
              <t.icon className="mr-2 h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </nav>

        {tab === "chaves" && <KeyStore />}
        {tab === "minhas" && <MyKeys />}
        {tab === "marketplace" && <Marketplace />}
        {tab === "ranking" && <ResellerRanking />}

        <div className="mt-12">
          <ResellerSupport />
        </div>
      </main>
    </div>
  );
}

function MyKeys() {
  const keys: { key: string; plan: string; status: string; created: string }[] = [];

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Chave copiada!");
  };

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-bold">Minhas chaves</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Todas as chaves compradas aparecem aqui prontas para entregar ao cliente.
      </p>

      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
          <KeyRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Você ainda não tem chaves</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compre na aba “Comprar chaves” e elas aparecem aqui na hora.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Chave</th>
                <th className="py-2 pr-3">Plano</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Criada em</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.key} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3 font-mono text-xs">{k.key}</td>
                  <td className="py-2 pr-3">{k.plan}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="secondary">{k.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs">{k.created}</td>
                  <td className="py-2 pr-3">
                    <Button size="sm" variant="ghost" onClick={() => copy(k.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="plan-top-glow" />
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}
