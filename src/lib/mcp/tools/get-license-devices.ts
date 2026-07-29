import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_license_devices",
  title: "Dispositivos da licença",
  description: "Lista os dispositivos registrados em uma licença da conta autenticada.",
  inputSchema: {
    license_id: z.string().describe("ID da licença (uuid) retornado por list_my_licenses."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ license_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data: license, error: licenseError } = await supabase
      .from("licenses")
      .select("id")
      .eq("id", license_id)
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (licenseError) return errorResult(licenseError.message);
    if (!license) return errorResult("Licença não encontrada para esta conta.");

    const { data, error } = await supabase
      .from("devices")
      .select("id, device_hash, browser, os, ext_version, first_seen_at, last_seen_at, is_revoked")
      .eq("license_id", license_id)
      .order("last_seen_at", { ascending: false });
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
