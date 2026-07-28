import { getSupabasePublicConfig } from "@/integrations/supabase/public-config";

function edgeBaseUrl(): string {
  const { url } = getSupabasePublicConfig();
  return `${url}/functions/v1`;
}

function publishableKey(): string {
  return getSupabasePublicConfig().publishableKey;
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
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");
  if (contentType) headers.set("content-type", contentType);
  if (userAgent) headers.set("user-agent", userAgent);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  if (requestId) headers.set("x-request-id", requestId);
  if (signature) headers.set("x-signature", signature);
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
