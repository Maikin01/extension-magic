import { Crown, Medal, Trophy, TrendingUp, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tier = {
  name: string;
  min: number;
  desc: string;
  color: string;
};

// Hierarquia de revendedores (quantidade de chaves vendidas)
const TIERS: Tier[] = [
  { name: "Bronze", min: 0, desc: "Início da jornada", color: "oklch(0.62 0.11 60)" },
  { name: "Prata", min: 25, desc: "Vendas constantes", color: "oklch(0.78 0.02 250)" },
  { name: "Ouro", min: 75, desc: "Alto volume", color: "oklch(0.82 0.16 85)" },
  { name: "Diamante", min: 200, desc: "Elite Rise Lovable", color: "oklch(0.78 0.13 200)" },
];

type RankRow = { position: number; name: string; sales: number; tier: string };

const RANKING: RankRow[] = [];

const rankIcon = (position: number) => {
  if (position === 1) return <Trophy className="h-4 w-4 text-primary" />;
  if (position === 2) return <Medal className="h-4 w-4 text-muted-foreground" />;
  if (position === 3) return <Star className="h-4 w-4 text-muted-foreground" />;
  return <span className="text-xs font-semibold text-muted-foreground">#{position}</span>;
};

export function ResellerRanking() {
  return (
    <div className="space-y-8">
      <section>
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <Crown className="h-3.5 w-3.5" /> Hierarquia
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Níveis de revendedor</h2>
          <p className="text-sm text-muted-foreground">
            Quanto mais chaves você vende, melhor o seu nível e as suas condições.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className="relative overflow-hidden border-border/60 bg-card p-5 transition-transform hover:-translate-y-1"
            >
              <span className="plan-top-glow" />
              <div
                className="mb-3 grid h-10 w-10 place-items-center rounded-xl border"
                style={{ borderColor: `${t.color}55`, background: `${t.color}1a` }}
              >
                <Crown className="h-5 w-5" style={{ color: t.color }} />
              </div>
              <p className="text-lg font-bold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-primary">
                {t.min}+ chaves vendidas
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card className="border-border/60 bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-bold leading-tight">Ranking de revendedores</h3>
              <p className="text-xs text-muted-foreground">
                Atualizado conforme as vendas confirmadas.
              </p>
            </div>
          </div>

          {RANKING.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">O ranking ainda está vazio</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que as primeiras vendas forem confirmadas, os revendedores aparecem aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Pos.</th>
                    <th className="py-2 pr-3">Revendedor</th>
                    <th className="py-2 pr-3">Nível</th>
                    <th className="py-2 pr-3">Chaves vendidas</th>
                  </tr>
                </thead>
                <tbody>
                  {RANKING.map((r) => (
                    <tr key={r.position} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-3">{rankIcon(r.position)}</td>
                      <td className="py-3 pr-3 font-medium">{r.name}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="secondary">{r.tier}</Badge>
                      </td>
                      <td className="py-3 pr-3 font-semibold">{r.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
