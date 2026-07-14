## Plano de teste — Performance da landing (clean minimal)

Este é um exercício de modo plano com base nas suas respostas: foco em **Site/landing**, prioridade **Performance**, estilo **Clean minimal** (branco/cinza/preto/azul #3b82f6), escopo médio (3/5).

### Objetivo
Deixar `/` (e rotas públicas próximas) mais rápida sem redesenhar tudo — cortes cirúrgicos em imagem, fontes, JS e render.

### Etapas
1. **Baseline** — medir LCP, CLS, TBT da rota `/` no preview atual e listar os 3 maiores ofensores (imagem herói, bundle, fontes).
2. **Imagens** — converter o og/hero para WebP/AVIF via `vite-imagetools`, adicionar `width/height` e `fetchpriority="high"` no LCP, `loading="lazy"` no resto.
3. **Preload do LCP** — `head().links` da rota `/` com `rel="preload" as="image"` da imagem herói.
4. **Fontes** — garantir `font-display: swap`, `preconnect` no provedor, e reduzir para no máximo 2 pesos por família.
5. **JS da landing** — auditar imports pesados na rota `/` e mover o que não é crítico para `lazy()`/dynamic import; remover libs não usadas.
6. **CSS** — revisar `styles.css` para tokens clean minimal (bg `#ffffff`, surface `#f4f4f5`, foreground `#18181b`, primary `#3b82f6`) sem quebrar o resto.
7. **Validação** — rodar Lighthouse/Playwright no preview e comparar contra o baseline.

### Riscos
- Mexer em tokens globais pode afetar `/auth`, `/planos`, `/admin`. Mitigação: alterar apenas variáveis do tema claro e testar cada rota.
- `vite-imagetools` exige que o asset esteja em `src/assets/`. Se a imagem herói vem de URL externa (R2), o ganho vem via `<img>` correto + preload, não via transform.
- Lazy-loading agressivo pode piorar LCP se atingir o elemento errado.

### Próximos passos (após aprovação)
- Rodar baseline com Playwright + screenshot.
- Aplicar etapas 2–4 primeiro (maior ROI, menor risco).
- Reavaliar antes de mexer em JS/CSS globais.

### Detalhes técnicos
- Tokens em `src/styles.css` via `oklch`, mantendo contraste AA.
- Preload no `head()` da rota, não no `__root` (evita custo em rotas que não usam a imagem).
- Nenhuma alteração na extensão nem no backend nesta rodada.
