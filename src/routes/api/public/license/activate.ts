import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getRequestIP } from "@tanstack/react-start/server";
import { CORS_HEADERS, jsonWithCors, optionsResponse } from "@/lib/cors";

const activateSchema = z.object({
  key: z.string().min(10).max(64),
  device_hash: z.string().min(8).max(128),
  browser: z.string().max(64).optional().nullable(),
  os: z.string().max(64).optional().nullable(),
  ext_version: z.string().max(32).optional().nullable(),
});

export const Route = createFileRoute("/api/public/license/activate")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = activateSchema.safeParse(raw);
          if (!parsed.success) {
            return jsonWithCors(
              { valid: false, reason: "invalid_payload", details: parsed.error.issues },
              400,
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { hashLicenseKey, normalizeLicenseKey } = await import("@/lib/license.server");

          const key = normalizeLicenseKey(parsed.data.key);
          const keyHash = hashLicenseKey(key);
          const ip = safeIp();
          const ua = request.headers.get("user-agent")?.slice(0, 512) ?? null;

          // Busca licença + plano
          const { data: license, error: licErr } = await supabaseAdmin
            .from("licenses")
            .select("*, plans(*)")
            .eq("license_key_hash", keyHash)
            .maybeSingle();

          const baseLog = {
            license_key_hash: keyHash,
            device_hash: parsed.data.device_hash,
            ip_address: ip,
            user_agent: ua,
            browser: parsed.data.browser ?? null,
            os: parsed.data.os ?? null,
            ext_version: parsed.data.ext_version ?? null,
          };

          if (licErr || !license) {
            await supabaseAdmin.from("activation_logs").insert({
              ...baseLog,
              result: "not_found",
              reason: "Chave não encontrada",
            });
            return jsonWithCors({ valid: false, reason: "not_found" }, 404);
          }

          // Status atuais
          if (license.status === "revoked") {
            await logAndReturn(license.id, baseLog, "revoked", "Licença revogada");
            return jsonWithCors({ valid: false, reason: "revoked" }, 403);
          }
          if (license.status === "suspended") {
            await logAndReturn(license.id, baseLog, "suspended", "Licença suspensa");
            return jsonWithCors({ valid: false, reason: "suspended" }, 403);
          }
          if (license.status === "expired") {
            await logAndReturn(license.id, baseLog, "expired", "Licença expirada");
            return jsonWithCors({ valid: false, reason: "expired" }, 403);
          }

          // Se ainda pending, ativa agora — expira em custom_duration_seconds > custom_duration_minutes > plan.duration_days
          let effective = license;
          if (license.status === "pending") {
            const now = new Date();
            let durationMs: number;
            if (license.custom_duration_seconds) {
              durationMs = license.custom_duration_seconds * 1_000;
            } else if (license.custom_duration_minutes) {
              durationMs = license.custom_duration_minutes * 60_000;
            } else if (license.plans) {
              durationMs = license.plans.duration_days * 86400_000;
            } else {
              await logAndReturn(license.id, baseLog, "error", "Licença sem duração definida");
              return jsonWithCors({ valid: false, reason: "error" }, 500);
            }
            const expires = new Date(now.getTime() + durationMs);
            const { data: updated, error: updErr } = await supabaseAdmin
              .from("licenses")
              .update({
                status: "active",
                activated_at: now.toISOString(),
                expires_at: expires.toISOString(),
              })
              .eq("id", license.id)
              .select("*, plans(*)")
              .single();
            if (updErr || !updated) {
              await logAndReturn(license.id, baseLog, "error", updErr?.message ?? "update fail");
              return jsonWithCors({ valid: false, reason: "error" }, 500);
            }
            effective = updated;
          }

          // Verifica expiração via now() do servidor
          const serverNowMs = Date.now();
          const expiresAtMs = effective.expires_at ? new Date(effective.expires_at).getTime() : null;
          if (expiresAtMs != null && expiresAtMs <= serverNowMs) {
            await supabaseAdmin
              .from("licenses")
              .update({ status: "expired" })
              .eq("id", effective.id);
            await logAndReturn(effective.id, baseLog, "expired", "Licença expirada");
            return jsonWithCors({ valid: false, reason: "expired" }, 403);
          }

          // Dispositivos: registra ou atualiza; respeita max_devices
          const maxDevices = effective.max_devices_override ?? effective.plans?.max_devices ?? 1;
          const { data: existingDevices } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("license_id", effective.id);

          const already = existingDevices?.find(
            (d) => d.device_hash === parsed.data.device_hash,
          );
          if (!already) {
            const activeCount = existingDevices?.filter((d) => !d.is_revoked).length ?? 0;
            if (activeCount >= maxDevices) {
              await logAndReturn(
                effective.id,
                baseLog,
                "device_limit",
                `Limite de ${maxDevices} dispositivos atingido`,
              );
              return jsonWithCors(
                {
                  valid: false,
                  reason: "device_limit",
                  max_devices: maxDevices,
                },
                403,
              );
            }
            await supabaseAdmin.from("devices").insert({
              license_id: effective.id,
              device_hash: parsed.data.device_hash,
              browser: parsed.data.browser ?? null,
              os: parsed.data.os ?? null,
              ext_version: parsed.data.ext_version ?? null,
            });
          } else {
            if (already.is_revoked) {
              await logAndReturn(effective.id, baseLog, "device_mismatch", "Dispositivo revogado");
              return jsonWithCors({ valid: false, reason: "device_mismatch" }, 403);
            }
            await supabaseAdmin
              .from("devices")
              .update({
                last_seen_at: new Date().toISOString(),
                browser: parsed.data.browser ?? already.browser,
                os: parsed.data.os ?? already.os,
                ext_version: parsed.data.ext_version ?? already.ext_version,
              })
              .eq("id", already.id);
          }

          await supabaseAdmin.from("activation_logs").insert({
            ...baseLog,
            license_id: effective.id,
            result: "success",
          });

          return jsonWithCors({
            valid: true,
            plan: effective.plans?.slug ?? "custom",
            plan_name: effective.plans?.name ?? "Personalizado",
            features: effective.plans?.features ?? [],
            expires_at: effective.expires_at,
            expires_in_ms: expiresAtMs == null ? null : Math.max(0, expiresAtMs - serverNowMs),
            server_now: new Date(serverNowMs).toISOString(),
            activated_at: effective.activated_at,
            max_devices: maxDevices,
          });

          async function logAndReturn(
            licId: string | null,
            base: any,
            result:
              | "success"
              | "invalid_key"
              | "expired"
              | "revoked"
              | "suspended"
              | "device_limit"
              | "device_mismatch"
              | "not_found"
              | "rate_limited"
              | "error",
            reason: string,
          ) {
            await supabaseAdmin.from("activation_logs").insert({
              ...base,
              license_id: licId,
              result,
              reason,
            });
          }
        } catch (err: any) {
          console.error("[/api/public/license/activate]", err);
          return jsonWithCors({ valid: false, reason: "error", message: err?.message }, 500);
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
