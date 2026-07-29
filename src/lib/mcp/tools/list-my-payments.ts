import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_my_payments",
  title: "Meus pagamentos",
  description: "Lista os pagamentos da conta autenticada, com status, valor e data.",
  inputSchema: {
    limit: z.number().int().optional().describe("Quantidade máxima de pagamentos (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("payments")
      .select("id, plan_id, status, amount_cents, provider, paid_at, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
