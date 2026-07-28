import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} não configurada.`);
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AuthContext = {
  admin: SupabaseClient;
  userId: string;
  email: string | null;
  claims: Record<string, unknown>;
};

function decodeClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export async function requireUser(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Não autenticado.");
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão inválida ou expirada.");

  return {
    admin,
    userId: data.user.id,
    email: data.user.email ?? null,
    claims: decodeClaims(token),
  };
}

export async function hasRole(
  admin: SupabaseClient,
  userId: string,
  roles: string | string[],
): Promise<boolean> {
  const accepted = Array.isArray(roles) ? roles : [roles];
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", accepted);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function assertRole(
  admin: SupabaseClient,
  userId: string,
  roles: string | string[],
): Promise<void> {
  if (!(await hasRole(admin, userId, roles))) throw new Error("Acesso negado.");
}
