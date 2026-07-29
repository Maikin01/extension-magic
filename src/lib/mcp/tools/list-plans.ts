import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_plans",
  title: "Listar planos",
  description: "Lista os planos de licença ativos da Rise Lovable com preço, duração e limite de dispositivos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const { data, error } = await supabaseForUser(ctx)
      .from("plans")
      .select("slug, name, description, price_cents, duration_days, duration_minutes, max_devices, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
