import { Trophy, Crown, BarChart3 } from "lucide-react";

type Tier = {
  name: string;
  minSales: number;
  perk: string;
  badgeClass: string;
};

const TIERS: Tier[] = [
  { name: "Bronze", minSales: 0, perk: "Preço padrão de revenda no atacado", badgeClass: "rv-badge-neutral" },
  { name: "Prata", minSales: 25, perk: "5% de desconto extra + suporte prioritário", badgeClass: "rv-badge-neutral border-[var(--rv-border)]" },
  { name: "Ouro", minSales: 75, perk: "10% de desconto + gerente de contas dedicado", badgeClass: "rv-badge-amber" },
  { name: "Diamante", minSales: 200, perk: "15% de desconto + preço mínimo garantido VIP", badgeClass: "rv-badge-red font-bold" },
];

type RankRow = { position: number; name: string; sales: number; tier: string };

const RANKING: RankRow[] = [
  { position: 1, name: "Maicon D. (Você)", sales: 214, tier: "Diamante" },
  { position: 2, name: "Rafael Souza", sales: 178, tier: "Ouro" },
  { position: 3, name: "Bruna Martins", sales: 156, tier: "Ouro" },
  { position: 4, name: "Lucas Almeida", sales: 141, tier: "Ouro" },
  { position: 5, name: "Camila Rocha", sales: 128, tier: "Ouro" },
  { position: 6, name: "Diego Fernandes", sales: 117, tier: "Ouro" },
  { position: 7, name: "Thiago Lima", sales: 103, tier: "Ouro" },
  { position: 8, name: "Juliana Prado", sales: 92, tier: "Ouro" },
  { position: 9, name: "Vitor Hugo", sales: 81, tier: "Ouro" },
  { position: 10, name: "Amanda Silva", sales: 76, tier: "Ouro" },
  { position: 11, name: "Pedro Henrique", sales: 68, tier: "Prata" },
  { position: 12, name: "Larissa Gomes", sales: 61, tier: "Prata" },
  { position: 13, name: "Gustavo Nunes", sales: 54, tier: "Prata" },
  { position: 14, name: "Rodrigo Pires", sales: 48, tier: "Prata" },
  { position: 15, name: "Fernanda Dias", sales: 43, tier: "Prata" },
  { position: 16, name: "Matheus Barros", sales: 37, tier: "Prata" },
  { position: 17, name: "Isabela Castro", sales: 31, tier: "Prata" },
  { position: 18, name: "André Ramos", sales: 27, tier: "Prata" },
  { position: 19, name: "Carla Menezes", sales: 22, tier: "Bronze" },
  { position: 20, name: "Felipe Torres", sales: 17, tier: "Bronze" },
  { position: 21, name: "Beatriz Correia", sales: 12, tier: "Bronze" },
  { position: 22, name: "Marcelo Vieira", sales: 8, tier: "Bronze" },
  { position: 23, name: "Renata Bastos", sales: 4, tier: "Bronze" },
];

export function ResellerRanking() {
  const currentSales = 214;
  const currentTier = "Diamante";

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--rv-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rv-badge rv-badge-red font-mono uppercase text-[10px]">
              <Trophy className="h-3 w-3" /> Ranking & Benefícios
            </span>
            <span className="rv-badge rv-badge-neutral">Módulo de Desempenho</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--rv-text-main)] tracking-tight">Níveis Operacionais de Revenda</h2>
          <p className="text-xs text-[var(--rv-text-muted)]">
            Aumente seu volume mensal de vendas para desbloquear maiores margens de lucro e suporte prioritário.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[var(--rv-card-alt-bg)] border border-[var(--rv-border)] p-3 rounded-xl">
          <Crown className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--rv-text-subtle)] block">Seu Nível Atual</span>
            <span className="text-xs font-bold text-[var(--rv-text-main)]">{currentTier} · {currentSales} Licenças</span>
          </div>
        </div>
      </div>

      {/* Tier Benefits Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`rv-card p-5 flex flex-col justify-between ${
              t.name === currentTier ? "border-red-600/80 shadow-md" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`rv-badge ${t.badgeClass}`}>{t.name}</span>
                <span className="text-[10px] font-mono text-[var(--rv-text-subtle)]">{t.minSales}+ Vendas</span>
              </div>
              <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed font-medium mb-3">{t.perk}</p>
            </div>

            <div className="border-t border-[var(--rv-border)] pt-3 mt-2">
              <span className="text-[11px] text-[var(--rv-text-subtle)] font-mono">
                {t.minSales === 0 ? "Acesso imediato" : `Meta: ${t.minSales} licenças`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="rv-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--rv-border)] pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-base font-bold text-[var(--rv-text-main)]">Classificação Geral de Revendedores</h3>
              <p className="text-xs text-[var(--rv-text-muted)]">Ranking em tempo real baseado no total de licenças liquidadas.</p>
            </div>
          </div>

          <span className="rv-badge rv-badge-neutral font-mono">{RANKING.length} Participantes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="rv-table">
            <thead>
              <tr>
                <th className="w-16">Pos.</th>
                <th>Revendedor</th>
                <th>Nível</th>
                <th className="text-right">Licenças Vendidas</th>
              </tr>
            </thead>
            <tbody>
              {RANKING.map((r) => {
                const isTop1 = r.position === 1;
                const isTop2 = r.position === 2;
                const isTop3 = r.position === 3;

                return (
                  <tr
                    key={r.position}
                    className={r.name.includes("(Você)") ? "bg-red-500/10 font-semibold" : ""}
                  >
                    <td>
                      {isTop1 && (
                        <span className="rv-badge rv-badge-amber font-mono font-bold">#1 🥇</span>
                      )}
                      {isTop2 && (
                        <span className="rv-badge rv-badge-neutral font-mono font-bold">#2 🥈</span>
                      )}
                      {isTop3 && (
                        <span className="rv-badge rv-badge-neutral font-mono font-bold text-amber-700">#3 🥉</span>
                      )}
                      {!isTop1 && !isTop2 && !isTop3 && (
                        <span className="font-mono text-xs text-[var(--rv-text-subtle)]">#{r.position}</span>
                      )}
                    </td>
                    <td className="font-medium text-[var(--rv-text-main)]">
                      {r.name}
                    </td>
                    <td>
                      <span
                        className={`rv-badge ${
                          r.tier === "Diamante"
                            ? "rv-badge-red font-bold"
                            : r.tier === "Ouro"
                              ? "rv-badge-amber"
                              : "rv-badge-neutral"
                        }`}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold text-[var(--rv-text-main)]">
                      {r.sales} un.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
