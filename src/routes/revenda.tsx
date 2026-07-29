import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Copy,
  Check,
  Key,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  Trophy,
  BarChart3,
  Coins,
  PackageCheck,
  Moon,
  Sun,
  Headphones,
  Clock,
  Search,
} from "lucide-react";
import { AccessGate } from "@/components/reseller/AccessGate";
import { KeyStore } from "@/components/reseller/KeyStore";
import { ResellerSupport } from "@/components/reseller/ResellerSupport";
import { useAuth } from "@/auth/AuthProvider";
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
          "Portal enterprise de gestão de licenças e produtos para revendedores oficiais Rise Lovable.",
      },
      { property: "og:title", content: "Painel de Revendas — Rise Lovable" },
      {
        property: "og:description",
        content:
          "Gestão de licenças no atacado, marketplace de produtos digitais e relatórios de revenda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResellerPanelPage,
});

type Tab = "chaves" | "minhas" | "marketplace" | "ranking" | "suporte";
type ThemeMode = "dark" | "light";

function getUserInitials(email?: string): string {
  if (!email) return "RV";
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, "");
  if (!name) return "RV";
  if (name.length >= 2) {
    return (name[0] + name[1]).toUpperCase();
  }
  return name.toUpperCase();
}

function ResellerPanelPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("chaves");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [collapsed, setCollapsed] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const exit = () => {
    void signOut();
  };

  const navGroups = [
    {
      title: "GESTÃO DE LICENÇAS",
      items: [
        { key: "chaves", label: "Comprar Licenças", icon: Key },
        { key: "minhas", label: "Minhas Licenças", icon: Coins, count: "4" },
      ],
    },
    {
      title: "REDE & MERCADO",
      items: [
        { key: "marketplace", label: "Marketplace VIP", icon: Store, badge: "Em breve" },
        { key: "ranking", label: "Ranking & Níveis", icon: Trophy, badge: "Em breve" },
      ],
    },
    {
      title: "ATENDIMENTO",
      items: [
        { key: "suporte", label: "Central de Suporte", icon: Headphones },
      ],
    },
  ] as const;

  return (
    <AccessGate>
      <div className={`rv-container ${theme === "light" ? "rv-theme-light" : ""}`}>
        <div className="min-h-screen bg-[var(--rv-bg)] text-[var(--rv-text-main)] font-sans antialiased transition-colors duration-200 flex">
          
          {/* Full-Height Modern Sidebar */}
          <aside
            className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-[var(--rv-border)] bg-[var(--rv-sidebar-bg)] transition-all duration-300 ${
              collapsed ? "w-20" : "w-64"
            }`}
          >
            {/* 1. Larger Brand Area (h-20 height with lower divider line) */}
            <div className="flex h-20 items-center border-b border-[var(--rv-border)] px-5 shrink-0">
              <Link to="/" className="flex items-center gap-3 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Rise Lovable Logo"
                  className="h-11 w-11 shrink-0 rounded-2xl object-contain bg-red-600/10 p-1.5 border border-red-600/30 shadow-md"
                />
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="font-display font-extrabold text-base tracking-tight text-[var(--rv-text-main)] leading-none">
                      RISE <span className="text-red-600">LOVABLE</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--rv-text-subtle)] mt-1.5 uppercase tracking-wider font-bold">
                      Revendedor VIP
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* 2. Grouped Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1.5">
                  {!collapsed && (
                    <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--rv-text-subtle)] mb-2">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((t) => {
                      const isActive = tab === t.key;
                      const Icon = t.icon;

                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setTab(t.key as Tab)}
                          className={`relative flex items-center h-10 w-full rounded-xl text-xs font-medium transition-all ${
                            collapsed ? "justify-center px-0" : "px-3"
                          } ${
                            isActive
                              ? "bg-red-600/10 text-red-600 font-bold border border-red-600/30 shadow-sm"
                              : "text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)] hover:bg-[var(--rv-border)]"
                          }`}
                          title={t.label}
                        >
                          {isActive && !collapsed && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r" />
                          )}
                          <Icon className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-3"} ${isActive ? "text-red-600" : ""}`} />
                          {!collapsed && <span className="flex-1 text-left">{t.label}</span>}
                          {!collapsed && "count" in t && (
                            <span className="ml-auto text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] text-[var(--rv-text-subtle)]">
                              {t.count}
                            </span>
                          )}
                          {!collapsed && "badge" in t && (
                            <span className="ml-auto text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-500">
                              {t.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Bottom User Profile & Logout Widget */}
            <div className="border-t border-[var(--rv-border)] p-3 shrink-0 bg-[var(--rv-card-alt-bg)]">
              <div className={`flex items-center justify-between gap-2 ${collapsed ? "flex-col" : ""}`}>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {getUserInitials(user?.email)}
                  </div>
                  {!collapsed && (
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-semibold text-[var(--rv-text-main)] truncate">
                        {user?.email?.split("@")[0] ?? "revendedor.vip"}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo VIP
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={exit}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--rv-text-muted)] hover:text-red-600 hover:bg-red-600/10 transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Area Offset by Sidebar Width */}
          <div className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ${collapsed ? "pl-20" : "pl-64"}`}>
            
            {/* Transparent / Glassmorphic Topbar Header */}
            <header className="sticky top-0 z-40 h-16 w-full border-b border-[var(--rv-border)]/50 bg-[var(--rv-bg)]/60 backdrop-blur-md flex items-center justify-between px-6 transition-all duration-200">
              
              {/* Left Side: Sidebar Toggle Button (RiseCheckout Reference) */}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="h-9 w-9 shrink-0 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card-alt-bg)] flex items-center justify-center text-[var(--rv-text-muted)] hover:text-[var(--rv-text-main)] hover:bg-[var(--rv-border)] transition-colors shadow-sm"
                aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4.5 w-4.5" />
                ) : (
                  <PanelLeftClose className="h-4.5 w-4.5" />
                )}
              </button>

              {/* Right Side: Theme Switcher Switch & User Profile Avatar */}
              <div className="flex items-center gap-3">
                
                {/* Sun (Left ☀️) / Moon (Right 🌙) Dual Toggle Switch */}
                <div
                  onClick={toggleTheme}
                  className="flex items-center gap-1 p-1 rounded-full border border-[var(--rv-border)] bg-[var(--rv-card-alt-bg)] cursor-pointer select-none shadow-sm transition-colors"
                  title="Alternar entre Tema Claro e Escuro"
                >
                  <div
                    className={`p-1.5 rounded-full transition-all duration-200 ${
                      theme === "light"
                        ? "bg-white text-amber-500 shadow-sm"
                        : "text-[var(--rv-text-subtle)] hover:text-[var(--rv-text-main)]"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                  </div>

                  <div
                    className={`p-1.5 rounded-full transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-zinc-800 text-amber-400 shadow-sm"
                        : "text-[var(--rv-text-subtle)] hover:text-[var(--rv-text-main)]"
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                  </div>
                </div>

                {/* User Avatar Circle with User Initials */}
                <div
                  className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md border border-white/20"
                  title={user?.email ?? "Revendedor VIP"}
                >
                  {getUserInitials(user?.email)}
                </div>
              </div>
            </header>

            {/* Main Content Body */}
            <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-8 flex-1 w-full">
              
              {/* ABA 1: COMPRAR LICENÇAS */}
              {tab === "chaves" && (
                <div className="space-y-8">
                  <AccountOverviewBanner userEmail={user?.email} userId={user?.id} />
                  <KeyStore />
                </div>
              )}

              {/* ABA 2: MINHAS LICENÇAS */}
              {tab === "minhas" && <MyKeys />}

              {/* ABA 3 & 4: MARKETPLACE E RANKING (Em breve) */}
              {tab === "marketplace" && (
                <ComingSoonCard
                  title="Marketplace VIP em Breve"
                  subtitle="Estamos organizando os melhores utilitários e produtos exclusivos para revenda com desconto de parceiro. Em breve disponível!"
                />
              )}
              {tab === "ranking" && (
                <ComingSoonCard
                  title="Ranking & Níveis de Desempenho em Breve"
                  subtitle="O módulo de pontuação por volume de vendas e vantagens de nível operacional está sendo preparado. Em breve estará liberado para todos!"
                />
              )}

              {/* ABA 5: CENTRAL DE SUPORTE */}
              {tab === "suporte" && <ResellerSupport />}
            </main>
          </div>
        </div>
      </div>
    </AccessGate>
  );
}

function AccountOverviewBanner({ userEmail, userId }: { userEmail?: string; userId?: string }) {
  const [copiedRef, setCopiedRef] = useState(false);
  const referralCode = "REV-VIP-" + (userId?.slice(0, 6).toUpperCase() ?? "89A2F0");
  const referralLink = typeof window !== "undefined" ? `${window.location.origin}/?ref=${referralCode}` : "";

  const copyReferral = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    toast.success("Link de indicação copiado!");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Account & Referral Header */}
      <div className="rv-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rv-badge rv-badge-red font-mono text-[10px] uppercase font-bold">
                Revendedor Autorizado
              </span>
              <span className="rv-badge rv-badge-emerald font-mono text-[10px]">
                Nível Diamante
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--rv-text-main)]">
              Painel de Controle de Revenda
            </h1>
            <p className="text-xs text-[var(--rv-text-muted)] mt-1">
              Conta ativa: <span className="text-[var(--rv-text-main)] font-medium">{userEmail ?? "revendedor@riselovable.com"}</span>
            </p>
          </div>

          {/* Referral Link Box */}
          <div className="bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--rv-text-subtle)] block">
                Seu Link de Indicação Direta
              </span>
              <span className="text-xs font-mono font-bold text-red-600 truncate block max-w-xs">
                {referralCode}
              </span>
            </div>
            <button
              type="button"
              onClick={copyReferral}
              className="rv-btn-secondary text-xs h-9 px-3.5 shrink-0 flex items-center justify-center gap-1.5"
            >
              {copiedRef ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stat Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Coins className="h-4 w-4 text-red-600" />}
          label="Licenças Ativas"
          value="42 un."
          hint="Diponíveis para distribuição"
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
          label="Margem de Lucro Bruta"
          value={formatPrice(489000)}
          hint="Acumulado nos últimos 30 dias"
        />
        <StatCard
          icon={<PackageCheck className="h-4 w-4 text-amber-500" />}
          label="Entregas Confirmadas"
          value="156 ped."
          hint="100% de satisfação declarada"
        />
      </div>
    </div>
  );
}

function ComingSoonCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rv-card p-12 text-center border-dashed border-[var(--rv-border)] bg-[var(--rv-card-alt-bg)] space-y-4">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-red-600/10 text-red-600 border border-red-600/30 flex items-center justify-center shadow-sm">
        <Clock className="h-7 w-7" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <span className="rv-badge rv-badge-red font-mono uppercase text-[10px] font-bold">
          Em Desenvolvimento
        </span>
        <h3 className="text-xl font-bold text-[var(--rv-text-main)] pt-1">{title}</h3>
        <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function MyKeys() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const keys = [
    { key: "RISE-7D-X92K-8812", plan: "Chave Semanal (7 dias)", status: "Ativa", created: "28/07/2026" },
    { key: "RISE-30D-M71P-9943", plan: "Chave Mensal (30 dias)", status: "Ativa", created: "26/07/2026" },
    { key: "RISE-VITAL-K992-1102", plan: "Chave Vitalícia", status: "Entregue", created: "20/07/2026" },
    { key: "RISE-30D-Z882-7711", plan: "Chave Mensal (30 dias)", status: "Ativa", created: "18/07/2026" },
  ];

  const filteredKeys = keys.filter(
    (k) =>
      k.key.toLowerCase().includes(search.toLowerCase()) ||
      k.plan.toLowerCase().includes(search.toLowerCase()),
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(value);
    toast.success("Código da licença copiado!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rv-card p-6 md:p-8 space-y-6">
      {/* Exclusive Header for My Keys Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--rv-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rv-badge rv-badge-red font-mono uppercase text-[10px]">
              <Coins className="h-3 w-3" /> Gestão de Licenças
            </span>
            <span className="rv-badge rv-badge-emerald font-mono text-[10px]">
              4 Licenças Ativas
            </span>
          </div>
          <h2 className="text-xl font-bold text-[var(--rv-text-main)] tracking-tight">Minhas Licenças Geradas</h2>
          <p className="text-xs text-[var(--rv-text-muted)]">
            Monitore, copie e gerencie os códigos de acesso gerados para seus clientes.
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--rv-text-subtle)]" />
          <input
            type="text"
            placeholder="Buscar chave ou plano..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] rounded-xl text-[var(--rv-text-main)] placeholder-[var(--rv-text-subtle)] focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="rv-table">
          <thead>
            <tr>
              <th>Código da Licença</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Data de Emissão</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((k) => (
              <tr key={k.key}>
                <td className="font-mono font-bold text-red-600">{k.key}</td>
                <td>{k.plan}</td>
                <td>
                  <span className="rv-badge rv-badge-emerald">{k.status}</span>
                </td>
                <td className="text-[var(--rv-text-subtle)] font-mono text-xs">{k.created}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => copy(k.key)}
                    className="rv-btn-secondary text-xs py-1.5 px-3.5"
                  >
                    {copiedKey === k.key ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
                        <Check className="h-3.5 w-3.5" /> Copiado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Copy className="h-3.5 w-3.5" /> Copiar Licença
                      </span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
    <div className="rv-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)]">{icon}</div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--rv-text-subtle)]">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold font-mono text-[var(--rv-text-main)] tracking-tight">{value}</div>
      <div className="text-[11px] text-[var(--rv-text-subtle)] mt-1">{hint}</div>
    </div>
  );
}
