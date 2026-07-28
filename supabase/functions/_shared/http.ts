export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function options(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function errorResponse(error: unknown, status = 500): Response {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[edge]", error);
  return json({ error: message }, status);
}

export async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new Error("JSON inválido.");
  }
}
