import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = ["admin", "owner"] as const;

async function assertAdminRole(context: any): Promise<void> {
  const { supabase, userId } = context;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Falha ao verificar permissão");
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  const isAdmin = roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
  if (!isAdmin) throw new Error("Acesso negado");
}

function assertRecentMfa(claims: any): void {
  if (claims?.aal !== "aal2") {
    throw new Error("Verificação em duas etapas exigida");
  }
  const now = Math.floor(Date.now() / 1000);
  const iat = Number(claims?.iat ?? 0);
  const RECENT_MFA_WINDOW_S = 5 * 60;
  if (!iat || now - iat > RECENT_MFA_WINDOW_S) {
    throw new Error("Código do autenticador expirou. Verifique novamente.");
  }
}

/**
 * Status do gate admin para o usuário logado:
 * - é admin/owner?
 * - já tem senha extra cadastrada?
 * - já tem um fator TOTP verificado?
 * - a sessão de desbloqueio (cookie) está ativa?
 */
export const getAdminGateStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles: string[] = (rolesData ?? []).map((r: any) => r.role);
    const isAdmin = roles.some((r) =>
      (ADMIN_ROLES as readonly string[]).includes(r),
    );

    if (!isAdmin) {
      return {
        isAdmin: false as const,
        hasPassword: false,
        hasTotp: false,
        unlocked: false,
      };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { getAdminSessionConfig, ADMIN_UNLOCK_TTL_MS } = await import(
      "@/lib/admin-security.server"
    );

    const [pwRes, factorsRes] = await Promise.all([
      supabaseAdmin
        .from("admin_credentials")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin.auth.admin.mfa.listFactors({ userId }),
    ]);

    const factors = (factorsRes.data?.factors ?? []) as Array<{
      factor_type: string;
      status: string;
    }>;
    const hasTotp = factors.some(
      (f) => f.factor_type === "totp" && f.status === "verified",
    );
    const hasPassword = !!pwRes.data;

    const session = await useSession<{ userId?: string; unlockedAt?: number }>(
      getAdminSessionConfig(),
    );
    const unlocked =
      session.data?.userId === userId &&
      typeof session.data?.unlockedAt === "number" &&
      Date.now() - session.data.unlockedAt < ADMIN_UNLOCK_TTL_MS;

    return {
      isAdmin: true as const,
      hasPassword,
      hasTotp,
      unlocked,
    };
  });

/**
 * Define ou troca a senha extra do admin.
 * Exige que o usuário tenha acabado de verificar TOTP (aal2 + iat recente).
 * No fluxo de troca, exige a senha atual.
 */
export const setAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { newPassword: string; currentPassword?: string }) =>
    z
      .object({
        newPassword: z.string().min(8, "Mínimo 8 caracteres").max(128),
        currentPassword: z.string().max(128).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    assertRecentMfa(context.claims);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { hashAdminPassword, verifyAdminPassword } = await import(
      "@/lib/admin-security.server"
    );

    const { data: existing } = await supabaseAdmin
      .from("admin_credentials")
      .select("password_hash")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      if (!data.currentPassword) {
        throw new Error("Senha atual obrigatória");
      }
      const ok = await verifyAdminPassword(
        data.currentPassword,
        existing.password_hash,
      );
      if (!ok) throw new Error("Senha atual incorreta");
    }

    const hash = await hashAdminPassword(data.newPassword);
    const { error } = await supabaseAdmin
      .from("admin_credentials")
      .upsert({ user_id: context.userId, password_hash: hash });
    if (error) throw error;

    return { ok: true as const };
  });

/**
 * Desbloqueia o painel admin: exige AAL2 recente (código TOTP verificado agora)
 * + senha extra correta. Grava a "sessão de desbloqueio" num cookie criptografado.
 */
export const unlockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) =>
    z.object({ password: z.string().min(1).max(128) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    assertRecentMfa(context.claims);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { verifyAdminPassword, getAdminSessionConfig } = await import(
      "@/lib/admin-security.server"
    );

    const { data: cred } = await supabaseAdmin
      .from("admin_credentials")
      .select("password_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!cred) throw new Error("Senha do painel não configurada");

    const ok = await verifyAdminPassword(data.password, cred.password_hash);
    if (!ok) throw new Error("Senha do painel incorreta");

    const session = await useSession<{
      userId?: string;
      unlockedAt?: number;
    }>(getAdminSessionConfig());
    await session.update({
      userId: context.userId,
      unlockedAt: Date.now(),
    });

    return { ok: true as const };
  });

/**
 * Encerra a sessão de desbloqueio (botão "trancar painel" ou logout).
 */
export const lockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getAdminSessionConfig } = await import(
      "@/lib/admin-security.server"
    );
    const session = await useSession(getAdminSessionConfig());
    await session.clear();
    return { ok: true as const };
  });
