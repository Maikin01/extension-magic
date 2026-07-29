import { ExternalLink, UserCheck, Clock, Headphones } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/5561992039398?text=" +
  encodeURIComponent("Olá! Sou revendedor autorizado Rise Lovable e necessito de atendimento prioritário.");

function WhatsAppLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ResellerSupport() {
  return (
    <div className="rv-card overflow-hidden">
      {/* Banner Superior Hero */}
      <div className="p-8 md:p-12 border-b border-[var(--rv-border)] bg-gradient-to-br from-[#25D366]/10 via-[var(--rv-card-alt-bg)] to-[var(--rv-card-bg)]">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shadow-sm">
              <WhatsAppLogo className="h-6 w-6" />
            </span>
            <span className="rv-badge rv-badge-emerald font-mono uppercase text-[10px] font-bold">
              Suporte de Revendedores
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--rv-text-main)]">
            Fale direto com a nossa equipe
          </h2>

          <p className="text-xs md:text-sm text-[var(--rv-text-muted)] leading-relaxed max-w-2xl">
            Canal exclusivo no WhatsApp para revendedores: tire dúvidas sobre chaves, entregas, preços e problemas de clientes com prioridade total.
          </p>

          <div className="pt-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 h-12 px-8 rounded-xl text-sm font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-all shadow-md hover:shadow-lg"
            >
              <WhatsAppLogo className="h-5 w-5" />
              <span>Abrir WhatsApp Agora</span>
              <ExternalLink className="h-4 w-4 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid de Vantagens do Suporte Direto */}
      <div className="p-8 grid gap-6 md:grid-cols-3 bg-[var(--rv-card-alt-bg)]">
        <div className="p-5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card-bg)] space-y-2">
          <div className="p-2 rounded-lg bg-red-600/10 text-red-600 w-fit">
            <UserCheck className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-[var(--rv-text-main)]">Atendimento dedicado</h3>
          <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed">
            Fila exclusiva para revendedores.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card-bg)] space-y-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit">
            <Clock className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-[var(--rv-text-main)]">Resposta rápida</h3>
          <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed">
            Prioridade em dúvidas e ativações.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card-bg)] space-y-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
            <Headphones className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-[var(--rv-text-main)]">Suporte humano</h3>
          <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed">
            Sem robôs, direto com a equipe.
          </p>
        </div>
      </div>
    </div>
  );
}
