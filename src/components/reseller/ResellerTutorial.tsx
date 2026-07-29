import { useState } from "react";
import {
  PlayCircle,
  GraduationCap,
  Key,
  CreditCard,
  Download,
  ShieldCheck,
  Users,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

/** Troque pelo ID do vídeo do YouTube do tutorial oficial. */
const TUTORIAL_VIDEO_ID = "dQw4w9WgXcQ";

const STEPS = [
  {
    icon: CreditCard,
    title: "1. Comprar sua licença",
    text: "Vá em “Comprar Licenças”, escolha o plano (semanal, mensal ou vitalícia) ou monte uma chave sob medida com a quantidade de dias que quiser. Gere o Pix e pague — a chave aparece automaticamente após a confirmação.",
  },
  {
    icon: Key,
    title: "2. Onde ficam suas chaves",
    text: "Todas as chaves compradas ficam salvas em “Minhas Licenças”, vinculadas à sua conta. Você pode copiar a chave a qualquer momento, mesmo que feche o navegador.",
  },
  {
    icon: Download,
    title: "3. Instalar a extensão",
    text: "Baixe o pacote da extensão no painel, extraia a pasta, abra chrome://extensions, ative o Modo do desenvolvedor e clique em “Carregar sem compactação” selecionando a pasta extraída.",
  },
  {
    icon: ShieldCheck,
    title: "4. Ativar a chave",
    text: "Abra a extensão, cole a chave e clique em ativar. Importante: o tempo da licença só começa a contar no momento da primeira ativação — antes disso ela fica parada aguardando.",
  },
  {
    icon: Users,
    title: "5. Revender para seus clientes",
    text: "Entregue a chave ao seu cliente e oriente-o a ativar na extensão. Cada plano tem um limite de dispositivos simultâneos; use uma chave por cliente para evitar bloqueios.",
  },
];

const FAQ = [
  {
    q: "Comprei e a chave não apareceu, e agora?",
    a: "Aguarde alguns segundos e atualize a aba “Minhas Licenças”. O Pix é confirmado automaticamente. Se após 5 minutos nada aparecer, fale com o suporte enviando o comprovante — localizamos o pagamento e liberamos na hora.",
  },
  {
    q: "O tempo começa a contar quando eu compro?",
    a: "Não. A licença fica pendente e o prazo só inicia na primeira ativação dentro da extensão. Você pode comprar hoje e entregar ao cliente semanas depois sem perder tempo.",
  },
  {
    q: "Posso usar a mesma chave em vários computadores?",
    a: "Cada plano define quantos dispositivos simultâneos são permitidos. Ultrapassando o limite, a ativação é recusada. Para mais clientes, compre mais chaves.",
  },
  {
    q: "Como funciona a chave personalizada?",
    a: "No gerador sob medida você escolhe a quantidade de dias e a quantidade de chaves. O valor segue a mesma tabela dos planos oficiais, calculado proporcionalmente ao período.",
  },
  {
    q: "Qual preço devo cobrar do meu cliente?",
    a: "Cada card de licença mostra o preço sugerido de revenda e sua margem estimada. Você é livre para definir o valor final que quiser.",
  },
];

export function ResellerTutorial() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--rv-border)] pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="rv-badge rv-badge-red font-mono uppercase text-[10px]">
            <GraduationCap className="h-3 w-3" /> Centro de Treinamento
          </span>
        </div>
        <h2 className="text-xl font-bold text-[var(--rv-text-main)] tracking-tight">
          Tutorial do Revendedor
        </h2>
        <p className="text-xs text-[var(--rv-text-muted)]">
          Assista ao vídeo e siga o passo a passo para comprar, ativar e revender licenças sem erro.
        </p>
      </div>

      {/* Video */}
      <div className="rv-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="h-4 w-4 text-red-600" />
          <h3 className="text-base font-bold text-[var(--rv-text-main)]">
            Vídeo: como comprar e ativar sua licença
          </h3>
        </div>
        <div className="relative w-full overflow-hidden rounded-xl border border-[var(--rv-border)] bg-black aspect-video">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${TUTORIAL_VIDEO_ID}?rel=0&modestbranding=1`}
            title="Tutorial do painel de revendas Rise Lovable"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <p className="mt-3 text-[11px] text-[var(--rv-text-subtle)]">
          Duração aproximada de 5 minutos. Recomendamos assistir antes da primeira venda.
        </p>
      </div>

      {/* Steps */}
      <div>
        <h3 className="text-sm font-bold text-[var(--rv-text-main)] uppercase tracking-wider mb-4">
          Passo a passo
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rv-card p-5 flex gap-4">
              <div className="shrink-0 h-9 w-9 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--rv-text-main)] mb-1">{s.title}</p>
                <p className="text-xs leading-relaxed text-[var(--rv-text-muted)]">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="rv-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-4 w-4 text-red-600" />
          <h3 className="text-base font-bold text-[var(--rv-text-main)]">Perguntas frequentes</h3>
        </div>
        <div className="divide-y divide-[var(--rv-border)]">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-semibold text-[var(--rv-text-main)]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--rv-text-subtle)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--rv-text-muted)]">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
