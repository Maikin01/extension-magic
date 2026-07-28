import assert from "node:assert/strict";

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(
  /\/$/,
  "",
);
const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const productionOrigin = process.env.APP_PUBLIC_ORIGIN || "https://riselovable.lovable.app";

assert(supabaseUrl, "SUPABASE_URL/VITE_SUPABASE_URL ausente");
assert(publishableKey, "SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_PUBLISHABLE_KEY ausente");

async function call(functionName, init = {}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID(),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

const health = await call("public-api/health", { method: "GET" });
assert.equal(health.response.status, 200);
assert.equal(health.payload?.ok, true);

const plans = await call("public-api", {
  method: "POST",
  body: JSON.stringify({ action: "getPublicPlans" }),
});
assert.equal(plans.response.status, 200);
assert(Array.isArray(plans.payload), "planos públicos não retornaram uma lista");
assert.equal(plans.payload.length, 6, "quantidade inesperada de planos públicos");

const anonymous = await call("backend-api", {
  method: "POST",
  headers: { Origin: productionOrigin },
  body: JSON.stringify({ action: "getMyDashboard" }),
});
assert.equal(anonymous.response.status, 401);
assert.equal(anonymous.payload?.code, "UNAUTHORIZED");
assert.equal(anonymous.response.headers.get("access-control-allow-origin"), productionOrigin);

const deniedOrigin = await call("backend-api", {
  method: "OPTIONS",
  headers: { Origin: "https://evil.invalid" },
});
assert.equal(deniedOrigin.response.status, 403);
assert.equal(deniedOrigin.payload?.code, "ORIGIN_NOT_ALLOWED");

const userToken = process.env.SUPABASE_USER_ACCESS_TOKEN;
if (userToken) {
  const access = await call("backend-api", {
    method: "POST",
    headers: { Origin: productionOrigin, Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ action: "getMyAccessContext" }),
  });
  assert.equal(access.response.status, 200);
  assert.equal(typeof access.payload?.user?.id, "string");
  assert(Array.isArray(access.payload?.roles));
}

console.log(
  `[smoke-edge] OK: health, ${plans.payload.length} planos, auth 401 e CORS protegida validados.`,
);
