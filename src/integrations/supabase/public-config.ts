export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} não configurada no build da aplicação.`);
  }
  return normalized;
}

/**
 * Configuração pública do Supabase externo.
 *
 * Os nomes SUPABASE_* do runtime são reservados/injetados pelo Lovable Cloud e
 * podem continuar apontando para o backend antigo. As variáveis VITE_* abaixo
 * são públicas e ficam fixadas no bundle durante o build, garantindo que o
 * navegador e as server functions usem o mesmo projeto Supabase.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = required(
    import.meta.env.VITE_RISE_BACKEND_URL ?? import.meta.env.VITE_SUPABASE_URL,
    "VITE_RISE_BACKEND_URL",
  ).replace(/\/$/, "");
  const publishableKey = required(
    import.meta.env.VITE_RISE_BACKEND_PUBLISHABLE_KEY ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "VITE_RISE_BACKEND_PUBLISHABLE_KEY",
  );

  return { url, publishableKey };
}
