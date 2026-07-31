# Plano: Consolidar tudo no Supabase externo (LOVABLE EXTENSION)

## Contexto confirmado (leituras já feitas)
- Projeto externo `paokcsxuxipnbnbgnlzs` está vivo e acessível (planos lidos via API anônima; Edge Functions respondendo).
- As credenciais nativas injetadas no sandbox ainda apontam para o projeto **Lovable Cloud `wjkohjslyzogffunfgim`**, que está **pausado**. É a causa raiz do "racha": o app chama o externo, mas migrações/deploys/reconciliação iam para o pausado.
- `psql` está disponível no sandbox, mas não é necessário se o rebind funcionar — as ferramentas nativas (migração, read_query, deploy) cobrem tudo.

## Passo 1 — Re-vincular as credenciais ao seu Supabase externo
- Executar `supabase--rebind_secrets`. Ele busca a service role key via autorização do seu workspace e atualiza `SUPABASE_URL`, publishable key e service role key no sandbox para o projeto conectado por você (`paokcsxuxipnbnbgnlzs`).
- Se falhar (autorização revogada), peço para você reconectar o Supabase nas configurações do projeto e re-tento.
- Após o rebind, confirmar com `supabase--project_info` que o projeto ativo passou a ser `paokcsxuxipnbnbgnlzs` (org LOVABLE EXTENSION), não mais o pausado.

## Passo 2 — Auditar o estado real do banco externo
- `supabase--read_query` em tabelas-chave: `plans`, `payments` (status pendente vs approved), `licenses`, `marketplace_products`, `marketplace_stock_items`, `trial_license_claims`, `user_roles`, `profiles`.
- Confirmar presença das funções RPC: `finalize_approved_payment`, `finalize_approved_payment_bulk`, `claim_marketplace_stock_item`, `apply_payment_status`.
- Listar buckets de storage (`marketplace`) e políticas RLS relevantes.
- Mapear a "defasagem": o que existe no externo vs o que o código espera.

## Passo 3 — Reconciliar pagamentos aprovados travados como "pending"
- Query: `SELECT id, status, amount, provider_id, plan_id, quantity, created_at FROM payments WHERE status='approved' OR (status='pending' AND ...) ORDER BY created_at DESC LIMIT 50`.
- Para cada `approved` sem licença gerada, chamar `finalize_approved_payment` / `finalize_approved_payment_bulk` (são idempotentes).
- Para `pending` que o Mercado Pago já aprovou (verificar via API do MP), marcar `approved` e disparar a geração da licença.
- Confirmar que as chaves/chaves-estoque foram entregues aos usuários.

## Passo 4 — Corrigir gaps de schema/RLS no externo (se existirem)
- Garantir que toda tabela pública tem `GRANT` + `ENABLE ROW LEVEL SECURITY` + políticas.
- Se faltar `marketplace_stock_items` ou `trial_license_claims`, criar via `supabase--migration` seguindo a estrutura já usada no código.
- Garantir que o webhook do Mercado Pago no externo processe `approved` corretamente (re-deploy de `mercadopago-webhook` se necessário via `supabase--deploy_edge_functions`).

## Passo 5 — Verificação final
- `supabase--curl_edge_functions` no webhook para simular notificação `approved` e confirmar liberação automática da licença.
- Conferir no painel admin/revenda que produtos aparecem e Pix do marketplace gera.
- Relatório final do que estava quebrado e do que foi corrigido.

## Nota
Nenhuma mudança de código no app é esperada neste plano — `.env.production` e `public-config.ts` já apontam para o externo. O foco é alinhar as ferramentas/admin ao mesmo banco que o app já usa e resolver os dados travados. Se algo de código precisar mudar após a auditoria, trato em passo separado.