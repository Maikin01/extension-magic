
# Sistema de Licenciamento — Extensão + Site

Escopo grande. Vou entregar em **fases**, verificando cada uma antes de seguir. Nesta primeira rodada preciso confirmar algumas decisões antes de codar.

---

## Arquitetura

```text
┌────────────┐    HTTPS     ┌──────────────────┐    RLS     ┌──────────────┐
│  Extensão  │ ───────────► │  Site (Lovable)  │ ─────────► │ Lovable Cloud│
│  Chrome    │  /api/public │  TanStack Start  │            │  (Postgres)  │
└────────────┘              └──────────────────┘            └──────────────┘
      ▲                            ▲
      │ chave + device_id          │ login, comprar plano,
      │ (nunca segredos)           │ ver chave, admin
      └── libera/bloqueia          └── usuário final / admin
```

- **Site** = este projeto Lovable (TanStack Start). Todo o cérebro fica aqui.
- **Extensão** = pasta `extension/`. Só coleta chave + device info e pergunta ao site.
- **Banco** = Lovable Cloud (Postgres + Auth + RLS).
- **Pagamentos** = Lovable Payments (Stripe built-in) — fase mais tardia.

---

## Fases

### Fase 1 — Fundação (banco + auth do site)
1. Ativar **Lovable Cloud**.
2. Auth email/senha + Google (padrão Lovable Cloud).
3. Tabela `profiles` (nome, avatar).
4. Tabela `user_roles` + enum `app_role` (`admin`, `user`) + função `has_role()`.
5. Tabelas de negócio:
   - `plans` (slug, nome, duração em dias, preço, max_devices, features JSONB, ativo)
   - `licenses` (id, user_id, plan_id, key único, status enum, activated_at, expires_at, created_at)
   - `devices` (id, license_id, device_hash, browser, os, ext_version, first_seen, last_seen)
   - `activation_logs` (id, license_id, device_hash, ip, ua, result, reason, created_at)
   - `admin_audit_log` (id, admin_id, action, target_type, target_id, details JSONB, created_at)
6. RLS: usuário só vê o que é dele; admin vê tudo via `has_role`.
7. Seed dos planos (Teste 3d, Semanal, Mensal, Trimestral, Semestral, Anual).

### Fase 2 — Interface do site (usuário)
1. `/auth` — login/cadastro (email + Google).
2. `/` — landing simples com "Lovable" (o app), CTA para planos.
3. `/planos` — lista de planos + botão "Assinar".
4. `/dashboard` (protegido) — chave atual, plano, dias restantes, botão copiar, histórico de ativações, dispositivos autorizados, botão baixar extensão (.zip).
5. `/reset-password`.

### Fase 3 — API pública de licenciamento (endpoints da extensão)
Server routes em `/api/public/license/*` (CORS liberado, sem auth do site):
- `POST /api/public/license/activate` — body: `{ key, device_hash, browser, os, ext_version }` → valida chave, verifica limite de dispositivos, registra device, retorna `{ valid, expires_at, plan, features }`.
- `POST /api/public/license/validate` — body: `{ key, device_hash }` → chamado periodicamente pela extensão. Retorna mesmo shape ou `{ valid: false, reason: "expired" | "revoked" | "suspended" | "device_mismatch" | "not_found" }`.
- Toda decisão de validade usa `now()` do **Postgres** (não da extensão).
- Registra tudo em `activation_logs`.
- Rate limiting simples por IP (tabela + janela).

### Fase 4 — Extensão (interface + integração)
1. Reescrever `popup.html` / `popup.js` / `popup.css`:
   - Tela 1: campo pra colar a chave + botão "Ativar".
   - Tela 2: chave ativa → mostra plano, expira em X dias, status, botão "Sair".
   - Tela de bloqueio: chave inválida/expirada com motivo.
2. `background.js`:
   - Gera `device_hash` (crypto random persistente).
   - `chrome.storage.local` guarda: chave, device_hash, último resultado da validação, timestamp.
   - Valida na ativação, no start do browser, e a cada X horas (alarms).
   - Se offline → tolerância de N horas antes de bloquear.
3. As features atuais da extensão (o "ilimitado" e a futura geração de keys diárias/semanais/mensais) ficam gated por `features` retornado do backend.
4. Empacotamento: script pra gerar `public/lovable-extension.zip` que o site serve.

### Fase 5 — Painel Admin
`/admin` (protegido por `has_role('admin')`):
- Lista/pesquisa usuários e licenças.
- Criar licença manual, revogar, suspender, reativar, alterar validade, alterar plano.
- Ver dispositivos e último acesso por licença.
- Estatísticas: ativas, expiradas, vendas, planos mais vendidos, novos usuários.
- Toda ação grava em `admin_audit_log`.

### Fase 6 — Pagamentos
1. `payments--recommend_payment_provider` → habilitar Stripe built-in.
2. Checkout por plano; webhook cria `license` automaticamente após pagamento aprovado.
3. Renovação/expiração: cron endpoint em `/api/public/cron/expire-licenses` (chamado por pg_cron).

### Fase 7 — Geração de Keys diárias/semanais/mensais
Você mencionou que a extensão hoje é "ilimitada" e o próximo passo é ela gerar keys D/S/M para outro app seu (também chamado Lovable). Isso é feature separada — trato depois de todo o fluxo de licenciamento estar sólido, porque precisa dos detalhes do outro app (endpoint, formato das keys que ele espera, etc.).

---

## Detalhes técnicos importantes

- **Formato da chave**: `LVBL-XXXX-XXXX-XXXX-XXXX` (5 blocos alfanuméricos, ~20 chars úteis, gerado com `crypto.randomBytes` e checado unicidade no banco). Configurável se preferir outro.
- **CORS**: rotas `/api/public/license/*` retornam `Access-Control-Allow-Origin: *` (extensão não manda cookie).
- **Segurança**:
  - Chave hasheada no banco (SHA-256), lookup por hash. A chave em claro só existe na resposta do backend logo depois de gerada e na extensão do usuário.
  - `device_hash` é opaco (nunca IP, nunca dado pessoal do device).
  - Rate limit por IP nos endpoints públicos.
  - Todo `expires_at` calculado no servidor a partir de `activated_at + plan.duration_days`.
- **Server-only**: nada de `service_role` no cliente. Server functions com `requireSupabaseAuth` para o site, server routes públicas pra extensão.

---

## Perguntas antes de começar (rápidas)

Preciso confirmar 4 coisas pra Fase 1 sair certa:

1. **Perfis de usuário**: além de email, precisa guardar nome / avatar / etc.? (Assumo **sim, básico**: `full_name` + `avatar_url`.)
2. **Sign in com Google**: habilitar junto do email/senha? (Assumo **sim**.)
3. **Formato da chave**: `LVBL-XXXX-XXXX-XXXX-XXXX` está bom? Ou prefere outro prefixo (ex: `LOVABLE-...`, `PRD_...`)?
4. **Limite de dispositivos por licença**: fixo em 1 por licença, ou variável por plano (ex: Teste=1, Mensal=1, Anual=3)? Isso já entra na tabela `plans` como `max_devices`.

Depois de responder, começo pela **Fase 1** (Cloud + banco + auth) e sigo linear até a Fase 5. Pagamentos (Fase 6) e a geração de keys D/S/M pro outro app (Fase 7) ficam pra quando o núcleo estiver rodando.
