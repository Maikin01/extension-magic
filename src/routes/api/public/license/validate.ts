import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getRequestIP } from "@tanstack/react-start/server";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

const schema = z.object({
  key: z.string().min(10).max(64),
  device_hash: z.string().min(8).max(128),
});

export const Route = createFileRoute("/api/public/license/validate")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = schema.safeParse(raw);
          if (!parsed.success) return jsonWithCors({ valid: false, reason: "invalid_payload" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { hashLicenseKey, normalizeLicenseKey } = await import("@/lib/license.server");

          const key = normalizeLicenseKey(parsed.data.key);
          const keyHash = hashLicenseKey(key);
          const ip = safeIp();
          const ua = request.headers.get("user-agent")?.slice(0, 512) ?? null;

          const { data: license } = await supabaseAdmin
            .from("licenses")
            .select("*, plans(*)")
            .eq("license_key_hash", keyHash)
            .maybeSingle();

          const baseLog = {
            license_key_hash: keyHash,
            device_hash: parsed.data.device_hash,
            ip_address: ip,
            user_agent: ua,
          };

          if (!license) {
            await supabaseAdmin.from("activation_logs").insert({ ...baseLog, result: "not_found" });
            return jsonWithCors({ valid: false, reason: "not_found" }, 404);
          }

          if (license.status === "revoked")
            return finalize(license.id, baseLog, "revoked", 403);
          if (license.status === "suspended")
            return finalize(license.id, baseLog, "suspended", 403);
          if (license.status === "expired")
            return finalize(license.id, baseLog, "expired", 403);
          if (license.status === "pending")
            return finalize(license.id, baseLog, "invalid_key", 403, "Licença ainda não ativada");

          const serverNowMs = Date.now();
          const expiresAtMs = license.expires_at ? new Date(license.expires_at).getTime() : null;
          if (expiresAtMs != null && expiresAtMs <= serverNowMs) {
            await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", license.id);
            return finalize(license.id, baseLog, "expired", 403);
          }

          const { data: device } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("license_id", license.id)
            .eq("device_hash", parsed.data.device_hash)
            .maybeSingle();

          if (!device || device.is_revoked) {
            return finalize(license.id, baseLog, "device_mismatch", 403);
          }

          await supabaseAdmin
            .from("devices")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", device.id);

          await supabaseAdmin
            .from("activation_logs")
            .insert({ ...baseLog, license_id: license.id, result: "success" });

          return jsonWithCors({
            valid: true,
            plan: license.plans.slug,
            plan_name: license.plans.name,
            features: license.plans.features,
            expires_at: license.expires_at,
            expires_in_ms: expiresAtMs == null ? null : Math.max(0, expiresAtMs - serverNowMs),
            server_now: new Date(serverNowMs).toISOString(),
          });

          async function finalize(
            licId: string,
            base: any,
            result:
              | "invalid_key"
              | "expired"
              | "revoked"
              | "suspended"
              | "device_limit"
              | "device_mismatch"
              | "not_found"
              | "error",
            status: number,
            reason?: string,
          ) {
            await supabaseAdmin
              .from("activation_logs")
              .insert({ ...base, license_id: licId, result, reason: reason ?? null });
            return jsonWithCors({ valid: false, reason: result, message: reason ?? null }, status);
          }
        } catch (err: any) {
          console.error("[/api/public/license/validate]", err);
          return jsonWithCors({ valid: false, reason: "error" }, 500);
        }
      },
    },
  },
});

function safeIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}
