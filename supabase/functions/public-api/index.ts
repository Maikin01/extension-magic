import { createAdminClient, hasRole } from "../_shared/supabase.ts";
import {
  ApiHttpError,
  createHttpContext,
  errorResponse,
  type HttpContext,
  json,
  options,
  readJson,
} from "../_shared/http.ts";
import { hashLicenseKey, normalizeLicenseKey } from "../_shared/license.ts";
import { clientIp, consumeRateLimit } from "../_shared/rate-limit.ts";

function isString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min &&
    value.length <= max;
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
  if (!isString(payload?.code, 4, 16)) {
    throw new ApiHttpError(
      400,
      "INVALID_REFERRAL_CODE",
      "Código de indicação inválido.",
    );
  }
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

async function activateLicense(
  request: Request,
  payload: any,
  http: HttpContext,
): Promise<Response> {
  if (
    !isString(payload?.key, 10, 64) ||
    !isString(payload?.device_hash, 8, 128) ||
    (payload.browser != null && !isString(payload.browser, 0, 64)) ||
    (payload.os != null && !isString(payload.os, 0, 64)) ||
    (payload.ext_version != null && !isString(payload.ext_version, 0, 32))
  ) {
    return json({ valid: false, reason: "invalid_payload" }, 400, http);
  }

  const admin = createAdminClient();
  const rate = await consumeRateLimit(
    admin,
    "public-license-activate",
    [clientIp(request)],
    20,
    60,
    { failOpen: true, requestId: http.requestId },
  );
  if (!rate.allowed) {
    const retryAfter = Math.max(1, rate.retryAfterSeconds);
    return json(
      { valid: false, reason: "rate_limited", retry_after_seconds: retryAfter },
      429,
      http,
      { "Retry-After": String(retryAfter) },
    );
  }
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
    await logActivation(admin, {
      ...baseLog,
      result: "not_found",
      reason: "Chave não encontrada",
    });
    return json({ valid: false, reason: "not_found" }, 404, http);
  }

  const reject = async (reason: string, status = 403, message?: string) => {
    await logActivation(admin, {
      ...baseLog,
      license_id: license.id,
      result: reason,
      reason: message ?? null,
    });
    return json(
      { valid: false, reason, ...(message ? { message } : {}) },
      status,
      http,
    );
  };

  const { data: activationData, error: activationError } = await admin.rpc(
    "activate_license_device",
    {
      p_license_id: license.id,
      p_device_hash: payload.device_hash,
      p_browser: payload.browser ?? null,
      p_os: payload.os ?? null,
      p_ext_version: payload.ext_version ?? null,
    },
  );
  if (activationError) throw activationError;
  const activation = activationData && typeof activationData === "object"
    ? activationData as Record<string, unknown>
    : null;
  if (!activation || activation.valid !== true) {
    const reason = typeof activation?.reason === "string"
      ? activation.reason
      : "error";
    const status = typeof activation?.http_status === "number"
      ? activation.http_status
      : 500;
    const message = typeof activation?.message === "string"
      ? activation.message
      : undefined;
    return reject(reason, status, message);
  }

  const nowMs = Date.now();
  const expiresAt = typeof activation.expires_at === "string"
    ? activation.expires_at
    : null;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;

  await logActivation(admin, {
    ...baseLog,
    license_id: license.id,
    result: "success",
  });
  return json(
    {
      valid: true,
      plan: typeof activation.plan === "string" ? activation.plan : "custom",
      plan_name: typeof activation.plan_name === "string"
        ? activation.plan_name
        : "Personalizado",
      features: Array.isArray(activation.features) ? activation.features : [],
      expires_at: expiresAt,
      expires_in_ms: expiresAtMs == null
        ? null
        : Math.max(0, expiresAtMs - nowMs),
      server_now: new Date(nowMs).toISOString(),
      activated_at: typeof activation.activated_at === "string"
        ? activation.activated_at
        : null,
      max_devices: typeof activation.max_devices === "number"
        ? activation.max_devices
        : 1,
    },
    200,
    http,
  );
}

async function validateLicense(
  request: Request,
  payload: any,
  http: HttpContext,
): Promise<Response> {
  if (
    !isString(payload?.key, 10, 64) || !isString(payload?.device_hash, 8, 128)
  ) {
    return json({ valid: false, reason: "invalid_payload" }, 400, http);
  }
  const admin = createAdminClient();
  const rate = await consumeRateLimit(
    admin,
    "public-license-validate",
    [clientIp(request)],
    120,
    60,
    { failOpen: true, requestId: http.requestId },
  );
  if (!rate.allowed) {
    const retryAfter = Math.max(1, rate.retryAfterSeconds);
    return json(
      { valid: false, reason: "rate_limited", retry_after_seconds: retryAfter },
      429,
      http,
      { "Retry-After": String(retryAfter) },
    );
  }
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
    if (!silent) {
      await logActivation(admin, {
        ...baseLog,
        license_id: license?.id ?? null,
        result: reason,
        reason: message ?? null,
      });
    }
    return json(
      { valid: false, reason, message: message ?? null },
      status,
      http,
    );
  };
  if (!license) return reject("not_found", 404);
  if (["revoked", "suspended", "expired"].includes(license.status)) {
    return reject(license.status);
  }
  if (license.status === "pending") {
    return reject("invalid_key", 403, "Licença ainda não ativada");
  }

  const nowMs = Date.now();
  const expiresAtMs = license.expires_at
    ? new Date(license.expires_at).getTime()
    : null;
  if (expiresAtMs != null && expiresAtMs <= nowMs) {
    await admin.from("licenses").update({ status: "expired" }).eq(
      "id",
      license.id,
    );
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
  if (!silent) {
    await logActivation(admin, {
      ...baseLog,
      license_id: license.id,
      result: "success",
    });
  }
  const maxDevices = license.max_devices_override ??
    license.plans?.max_devices ?? 1;
  return json(
    {
      valid: true,
      plan: license.plans?.slug ?? "custom",
      plan_name: license.plans?.name ?? "Personalizado",
      features: license.plans?.features ?? [],
      expires_at: license.expires_at,
      expires_in_ms: expiresAtMs == null
        ? null
        : Math.max(0, expiresAtMs - nowMs),
      server_now: new Date(nowMs).toISOString(),
      activated_at: license.activated_at,
      max_devices: maxDevices,
    },
    200,
    http,
  );
}

Deno.serve(async (request) => {
  const http = createHttpContext(request, "public");
  if (request.method === "OPTIONS") return options(http);
  try {
    const path = publicPath(request);
    if (path === "/license/activate" && request.method === "POST") {
      return await activateLicense(request, await readJson(request), http);
    }
    if (path === "/license/validate" && request.method === "POST") {
      return await validateLicense(request, await readJson(request), http);
    }
    if (request.method === "GET" && path === "/health") {
      return json({ ok: true }, 200, http);
    }
    if (request.method !== "POST") {
      throw new ApiHttpError(
        405,
        "METHOD_NOT_ALLOWED",
        "Método não permitido.",
      );
    }

    const body = await readJson(request);
    const record = body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
    const action = record?.action;
    if (typeof action !== "string" || action.length > 80) {
      throw new ApiHttpError(400, "ACTION_REQUIRED", "Ação obrigatória.");
    }
    const allowedActions = new Set(["getPublicPlans", "validateReferralCode"]);
    if (!allowedActions.has(action)) {
      throw new ApiHttpError(
        404,
        "UNKNOWN_ACTION",
        "Ação pública desconhecida.",
      );
    }
    const admin = createAdminClient();
    const rate = await consumeRateLimit(
      admin,
      "public-action",
      [clientIp(request), action],
      120,
      60,
      { failOpen: true, requestId: http.requestId },
    );
    if (!rate.allowed) {
      throw new ApiHttpError(
        429,
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em instantes.",
        {
          retryAfterSeconds: Math.max(1, rate.retryAfterSeconds),
        },
      );
    }
    if (action === "getPublicPlans") {
      return json(await getPublicPlans(), 200, http);
    }
    if (action === "validateReferralCode") {
      return json(await validateReferralCode(record?.data), 200, http);
    }
    throw new ApiHttpError(404, "UNKNOWN_ACTION", "Ação pública desconhecida.");
  } catch (error) {
    return errorResponse(error, http);
  }
});
