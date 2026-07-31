import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { getSupabasePublicConfig } from "@/integrations/supabase/public-config";

export function supabaseForUser(ctx: ToolContext) {
  // Use the VITE_-fixed config (see public-config.ts) instead of process.env.SUPABASE_*,
  // which is reserved/injected by Lovable Cloud and can point at a stale backend.
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}
