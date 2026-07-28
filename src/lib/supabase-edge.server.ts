type SupabaseFunctionContext = {
  supabase: any;
};

async function edgeError(error: any): Promise<Error> {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      if (payload?.error) return new Error(String(payload.error));
    } catch {
      // Mantém a mensagem original abaixo.
    }
  }
  return new Error(error?.message ?? "Falha ao chamar o backend Supabase.");
}

export async function invokeProtectedEdge<T>(
  context: SupabaseFunctionContext,
  action: string,
  data?: unknown,
): Promise<T> {
  const result = await context.supabase.functions.invoke("backend-api", {
    body: { action, data },
  });
  if (result.error) throw await edgeError(result.error);
  return result.data as T;
}

function edgeBaseUrl(): string {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  if (!url) throw new Error("SUPABASE_URL não configurada no ambiente Lovable.");
  return `${url}/functions/v1`;
}

function publishableKey(): string {
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY não configurada no ambiente Lovable.");
  return key;
}

export async function invokePublicEdge<T>(action: string, data?: unknown): Promise<T> {
  const response = await fetch(`${edgeBaseUrl()}/public-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey(),
    },
    body: JSON.stringify({ action, data }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error ?? `Backend Supabase respondeu ${response.status}.`);
  return payload as T;
}

export async function forwardEdgeRequest(
  request: Request,
  functionName: "public-api" | "mercadopago-webhook",
  suffix = "",
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${edgeBaseUrl()}/${functionName}${suffix}`);
  target.search = incoming.search;
  const headers = new Headers();
  headers.set("apikey", publishableKey());
  const contentType = request.headers.get("content-type");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (contentType) headers.set("content-type", contentType);
  if (userAgent) headers.set("user-agent", userAgent);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
