import { createAdminClient, hasRole } from "../_shared/supabase.ts";
import { errorResponse, json, options, readJson } from "../_shared/http.ts";
import { hashLicenseKey, normalizeLicenseKey } from "../_shared/license.ts";

function clientIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function isString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max;
}

function publicPath(request: Request): string {
  const path = new URL(request.url).pathname;
  const marker = "/public-api";
  const index = path.indexOf(marker);
  return index >= 0 ? path.slice(index + marker.length) || "/" : path;
}

async function logActivation(admin: any, values: Record<string, unknown>) {
  const { error } = await admin.from("activation_logs").insert(values);
  if (error) console.warn("[activation-log]", error.message);
}

async function getPublicPlans() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

async function validateReferralCode(payload: any) {
  if (!isString(payload?.code, 4, 16)) throw new Error("Código de indicação inválido.");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, referral_code")
    .eq("referral_code", payload.code.toUpperCase())
    .maybeSingle();
  if (!profile || !(await hasRole(admin, profile.id, "revendedor"))) {
    return { valid: false, reseller_name: null };
  }
  return { valid: true, reseller_name: profile.full_name ?? null };
}

async function activateLicense(request: Request, payload: any): Promise<Response> {
  if (
    !isString(payload?.key, 10, 64) ||
    !isString(payload?.device_hash, 8, 128) ||
    (payload.browser != null && !isString(payload.browser, 0, 64)) ||
    (payload.os != null && !isString(payload.os, 0, 64)) ||
    (payload.ext_version != null && !isString(payload.ext_version, 0, 32))
  ) {
    return json({ valid: false, reason: "invalid_payload" }, 400);
  }

  const admin = createAdminClient();
  const keyHash = await hashLicenseKey(normalizeLicenseKey(payload.key));
  const baseLog = {
    license_key_hash: keyHash,
    device_hash: payload.device_hash,
    ip_address: clientIp(request),
    user_agent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
    browser: payload.browser ?? null,
    os: payload.os ?? null,
    ext_version: payload.ext_version ?? null,
  };

  const { data: license, error } = await admin
    .from("licenses")
    .select("*, plans(*)")
    .eq("license_key_hash", keyHash)
    .maybeSingle();
  if (error || !license) {
    await logActivation(admin, { ...baseLog, result: "not_found", reason: "Chave não encontrada" });
    return json({ valid: false, reason: "not_found" }, 404);
  }

  const reject = async (reason: string, status = 403, message?: string) => {
    await logActivation(admin, {
      ...baseLog,
      license_id: license.id,
      result: reason,
      reason: message ?? null,
    });
    return json({ valid: false, reason, ...(message ? { message } : {}) }, status);
  };

  if (["revoked", "suspended", "expired"].includes(license.status)) {
    return reject(license.status);
  }

  let effective = license;
  if (license.status === "pending") {
    const now = new Date();
    const durationMs = license.custom_duration_seconds
      ? license.custom_duration_seconds * 1_000
      : license.custom_duration_minutes
        ? license.custom_duration_minutes * 60_000
        : license.plans?.duration_minutes
          ? license.plans.duration_minutes * 60_000
          : license.plans?.duration_days
            ? license.plans.duration_days * 86_400_000
            : 0;
    if (!durationMs) return reject("error", 500, "Licença sem duração definida");
    const { data: updated, error: updateError } = await admin
      .from("licenses")
      .update({
        status: "active",
        activated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + durationMs).toISOString(),
      })
      .eq("id", license.id)
      .eq("status", "pending")
      .select("*, plans(*)")
      .maybeSingle();
    if (updateError) return reject("error", 500, updateError.message);
    if (updated) {
      effective = updated;
    } else {
      const { data: refreshed } = await admin
        .from("licenses")
        .select("*, plans(*)")
        .eq("id", license.id)
        .single();
      effective = refreshed;
    }
  }

  const nowMs = Date.now();
  const expiresAtMs = effective.expires_at ? new Date(effective.expires_at).getTime() : null;
  if (expiresAtMs != null && expiresAtMs <= nowMs) {
    await admin.from("licenses").update({ status: "expired" }).eq("id", effective.id);
    return reject("expired");
  }

  const maxDevices = effective.max_devices_override ?? effective.plans?.max_devices ?? 1;
  const { data: devices, error: devicesError } = await admin
    .from("devices")
    .select("*")
    .eq("license_id", effective.id);
  if (devicesError) throw devicesError;
  const existing = devices?.find((device: any) => device.device_hash === payload.device_hash);
  if (!existing) {
    const activeCount = devices?.filter((device: any) => !device.is_revoked).length ?? 0;
    if (activeCount >= maxDevices)
      return reject("device_limit", 403, `Limite de ${maxDevices} dispositivos atingido`);
    const { error: insertError } = await admin.from("devices").insert({
      license_id: effective.id,
      device_hash: payload.device_hash,
      browser: payload.browser ?? null,
      os: payload.os ?? null,
      ext_version: payload.ext_version ?? null,
    });
    if (insertError && !/duplicate|unique/i.test(insertError.message)) throw insertError;
  } else if (existing.is_revoked) {
    return reject("device_mismatch", 403, "Dispositivo revogado");
  } else {
    await admin
      .from("devices")
      .update({
        last_seen_at: new Date().toISOString(),
        browser: payload.browser ?? existing.browser,
        os: payload.os ?? existing.os,
        ext_version: payload.ext_version ?? existing.ext_version,
      })
      .eq("id", existing.id);
  }

  await logActivation(admin, { ...baseLog, license_id: effective.id, result: "success" });
  return json({
    valid: true,
    plan: effective.plans?.slug ?? "custom",
    plan_name: effective.plans?.name ?? "Personalizado",
    features: effective.plans?.features ?? [],
    expires_at: effective.expires_at,
    expires_in_ms: expiresAtMs == null ? null : Math.max(0, expiresAtMs - nowMs),
    server_now: new Date(nowMs).toISOString(),
    activated_at: effective.activated_at,
    max_devices: maxDevices,
  });
}

async function validateLicense(request: Request, payload: any): Promise<Response> {
  if (!isString(payload?.key, 10, 64) || !isString(payload?.device_hash, 8, 128)) {
    return json({ valid: false, reason: "invalid_payload" }, 400);
  }
  const admin = createAdminClient();
  const keyHash = await hashLicenseKey(normalizeLicenseKey(payload.key));
  const silent = payload.silent === true;
  const baseLog = {
    license_key_hash: keyHash,
    device_hash: payload.device_hash,
    ip_address: clientIp(request),
    user_agent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
  };
  const { data: license } = await admin
    .from("licenses")
    .select("*, plans(*)")
    .eq("license_key_hash", keyHash)
    .maybeSingle();

  const reject = async (reason: string, status = 403, message?: string) => {
    if (!silent)
      await logActivation(admin, {
        ...baseLog,
        license_id: license?.id ?? null,
        result: reason,
        reason: message ?? null,
      });
    return json({ valid: false, reason, message: message ?? null }, status);
  };
  if (!license) return reject("not_found", 404);
  if (["revoked", "suspended", "expired"].includes(license.status)) return reject(license.status);
  if (license.status === "pending") return reject("invalid_key", 403, "Licença ainda não ativada");

  const nowMs = Date.now();
  const expiresAtMs = license.expires_at ? new Date(license.expires_at).getTime() : null;
  if (expiresAtMs != null && expiresAtMs <= nowMs) {
    await admin.from("licenses").update({ status: "expired" }).eq("id", license.id);
    return reject("expired");
  }
  const { data: device } = await admin
    .from("devices")
    .select("*")
    .eq("license_id", license.id)
    .eq("device_hash", payload.device_hash)
    .maybeSingle();
  if (!device || device.is_revoked) return reject("device_mismatch");

  await admin
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);
  if (!silent)
    await logActivation(admin, { ...baseLog, license_id: license.id, result: "success" });
  const maxDevices = license.max_devices_override ?? license.plans?.max_devices ?? 1;
  return json({
    valid: true,
    plan: license.plans?.slug ?? "custom",
    plan_name: license.plans?.name ?? "Personalizado",
    features: license.plans?.features ?? [],
    expires_at: license.expires_at,
    expires_in_ms: expiresAtMs == null ? null : Math.max(0, expiresAtMs - nowMs),
    server_now: new Date(nowMs).toISOString(),
    activated_at: license.activated_at,
    max_devices: maxDevices,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  try {
    const path = publicPath(request);
    if (path === "/license/activate" && request.method === "POST") {
      return await activateLicense(request, await readJson(request));
    }
    if (path === "/license/validate" && request.method === "POST") {
      return await validateLicense(request, await readJson(request));
    }
    if (request.method === "GET" && path === "/health") return json({ ok: true });
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

    const body = await readJson(request);
    if (body?.action === "getPublicPlans") return json(await getPublicPlans());
    if (body?.action === "validateReferralCode") return json(await validateReferralCode(body.data));
    return json({ error: "Ação pública desconhecida." }, 404);
  } catch (error) {
    return errorResponse(error, 400);
  }
});
