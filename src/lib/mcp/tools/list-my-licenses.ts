import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_my_licenses",
  title: "Minhas licenças",
  description: "Lista as licenças da conta autenticada, com status, data de ativação e expiração.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const { data, error } = await supabaseForUser(ctx)
      .from("licenses")
      .select("id, plan_id, license_key, status, activated_at, expires_at, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false });
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
