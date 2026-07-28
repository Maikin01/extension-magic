import { MessageCircle, Headphones, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL =
  "https://wa.me/5561992039398?text=" +
  encodeURIComponent("Olá! Sou revendedor Rise Lovable e preciso de suporte.");

const PERKS = [
  { icon: Headphones, title: "Atendimento dedicado", desc: "Fila exclusiva para revendedores." },
  { icon: Clock, title: "Resposta rápida", desc: "Prioridade em dúvidas e ativações." },
  { icon: ShieldCheck, title: "Suporte humano", desc: "Sem robôs, direto com a equipe." },
];

export function ResellerSupport() {
  return (
    <section className="cta-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <span className="auth-led auth-led-top" />
      <div className="relative z-[2] grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <MessageCircle className="h-3.5 w-3.5" /> Suporte de revendedores
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Fale direto com a nossa equipe
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Canal exclusivo no WhatsApp para revendedores: tire dúvidas sobre chaves, entregas,
            preços e problemas de clientes com prioridade total.
          </p>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <Button className="btn-neon mt-6">
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Abrir suporte no WhatsApp
              </span>
            </Button>
          </a>
        </div>

        <ul className="grid gap-3">
          {PERKS.map((p) => (
            <li
              key={p.title}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                <p.icon className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
