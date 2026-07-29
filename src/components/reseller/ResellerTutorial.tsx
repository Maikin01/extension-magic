import { useState } from "react";
import {
  PlayCircle,
  GraduationCap,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

/** Troque pelo ID do vídeo do YouTube do tutorial oficial. */
const TUTORIAL_VIDEO_ID = "dQw4w9WgXcQ";


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
          Assista ao vídeo e tire suas dúvidas para comprar, ativar e revender licenças sem erro.
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
