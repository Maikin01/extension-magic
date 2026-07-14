import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Dashboard do usuário: licença ativa (ou mais recente), plano, dispositivos, histórico.
 */
export const getMyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [licensesRes, profileRes] = await Promise.all([
      supabase
        .from("licenses")
        .select("*, plans(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    if (licensesRes.error) throw licensesRes.error;
    if (profileRes.error) throw profileRes.error;

    const licenses = licensesRes.data ?? [];
    const currentLicense =
      licenses.find((l) => l.status === "active") ??
      licenses.find((l) => l.status === "pending") ??
      licenses[0] ??
      null;

    let devices: any[] = [];
    let logs: any[] = [];
    if (currentLicense) {
      const [devicesRes, logsRes] = await Promise.all([
        supabase.from("devices").select("*").eq("license_id", currentLicense.id),
        supabase
          .from("activation_logs")
          .select("*")
          .eq("license_id", currentLicense.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      devices = devicesRes.data ?? [];
      logs = logsRes.data ?? [];
    }

    return {
      profile: profileRes.data,
      licenses,
      currentLicense,
      devices,
      logs,
    };
  });

/**
 * Gera manualmente uma licença de teste para o usuário logado. Útil enquanto
 * pagamentos ainda não estão ativos.
 */
export const claimTrialLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateLicenseKey, hashLicenseKey } = await import("@/lib/license.server");

    // Já tem trial?
    const { data: existing } = await supabase
      .from("licenses")
      .select("id, plans!inner(slug)")
      .eq("user_id", userId)
      .eq("plans.slug", "trial")
      .maybeSingle();
    if (existing) throw new Error("Você já criou uma licença de teste.");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("slug", "trial")
      .single();
    if (planErr || !plan) throw new Error("Plano de teste não encontrado.");

    // Tenta até 5x caso colisão de chave
    for (let i = 0; i < 5; i++) {
      const key = generateLicenseKey();
      const hash = hashLicenseKey(key);
      const { data, error } = await supabaseAdmin
        .from("licenses")
        .insert({
          user_id: userId,
          plan_id: plan.id,
          license_key: key,
          license_key_hash: hash,
          status: "pending",
        })
        .select()
        .single();
      if (!error && data) return { license: data };
      if (error && !error.message.includes("duplicate")) throw error;
    }
    throw new Error("Não foi possível gerar uma chave única. Tente novamente.");
  });

/**
 * Cria licença manualmente com plano escolhido (temporário, enquanto pagamentos
 * ainda não estão ligados). Retorna a licença gerada.
 */
export const createManualLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ plan_slug: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateLicenseKey, hashLicenseKey } = await import("@/lib/license.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("slug", data.plan_slug)
      .eq("is_active", true)
      .single();
    if (planErr || !plan) throw new Error("Plano não encontrado.");

    for (let i = 0; i < 5; i++) {
      const key = generateLicenseKey();
      const hash = hashLicenseKey(key);
      const { data: lic, error } = await supabaseAdmin
        .from("licenses")
        .insert({
          user_id: userId,
          plan_id: plan.id,
          license_key: key,
          license_key_hash: hash,
          status: "pending",
        })
        .select()
        .single();
      if (!error && lic) return { license: lic };
      if (error && !error.message.includes("duplicate")) throw error;
    }
    throw new Error("Não foi possível gerar uma chave única. Tente novamente.");
  });

/**
 * Admin: dashboard agregado.
 */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [licensesRes, profilesRes, authRes, plansRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from("licenses")
        .select("*, plans(name, slug)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabaseAdmin.from("plans").select("*").order("sort_order"),
      supabaseAdmin
        .from("activation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (licensesRes.error) throw licensesRes.error;

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p]),
    );
    const emailMap = new Map(
      (authRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
    );

    const licenses = (licensesRes.data ?? []).map((l) => ({
      ...l,
      profiles: l.user_id
        ? {
            full_name: profileMap.get(l.user_id)?.full_name ?? null,
            email: emailMap.get(l.user_id) ?? null,
          }
        : null,
    }));

    const counts = {
      active: licenses.filter((l) => l.status === "active").length,
      pending: licenses.filter((l) => l.status === "pending").length,
      expired: licenses.filter((l) => l.status === "expired").length,
      revoked: licenses.filter((l) => l.status === "revoked").length,
      suspended: licenses.filter((l) => l.status === "suspended").length,
      total_users: authRes.data?.users.length ?? 0,
    };

    return {
      counts,
      licenses,
      plans: plansRes.data ?? [],
      logs: logsRes.data ?? [],
    };
  });

/**
 * Admin: altera status de uma licença.
 */
export const adminUpdateLicenseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        license_id: z.string().uuid(),
        status: z.enum(["active", "expired", "suspended", "revoked", "pending"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ status: data.status })
      .eq("id", data.license_id);
    if (error) throw error;

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: userId,
      action: "update_license_status",
      target_type: "license",
      target_id: data.license_id,
      details: { new_status: data.status },
    });

    return { ok: true };
  });

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

// ============================================================================
// ADMIN — helper de guard
// ============================================================================
async function assertAdmin(context: any) {
  const { supabase, userId } = context;
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Acesso negado.");
  return userId as string;
}

// ============================================================================
// ADMIN — gerar N chaves (avulsas ou atribuídas a um email existente)
// ============================================================================
export const adminGenerateLicenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        plan_slug: z.string().min(1),
        count: z.number().int().min(1).max(100),
        email: z.string().email().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateLicenseKey, hashLicenseKey } = await import("@/lib/license.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("slug", data.plan_slug)
      .single();
    if (planErr || !plan) throw new Error("Plano não encontrado.");

    let targetUserId: string | null = null;
    if (data.email) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw listErr;
      const match = list.users.find(
        (u) => u.email?.toLowerCase() === data.email!.toLowerCase(),
      );
      if (!match) throw new Error(`Usuário com email ${data.email} não encontrado.`);
      targetUserId = match.id;
    }

    const generated: any[] = [];
    for (let n = 0; n < data.count; n++) {
      let inserted = false;
      for (let i = 0; i < 5 && !inserted; i++) {
        const key = generateLicenseKey();
        const hash = hashLicenseKey(key);
        const { data: lic, error } = await supabaseAdmin
          .from("licenses")
          .insert({
            user_id: targetUserId,
            plan_id: plan.id,
            license_key: key,
            license_key_hash: hash,
            status: "pending",
            notes: data.notes ?? null,
          })
          .select()
          .single();
        if (!error && lic) {
          generated.push(lic);
          inserted = true;
        } else if (error && !error.message.includes("duplicate")) {
          throw error;
        }
      }
      if (!inserted) throw new Error("Falha ao gerar chave única.");
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "generate_licenses",
      target_type: "license",
      target_id: null,
      details: {
        plan_slug: data.plan_slug,
        count: data.count,
        email: data.email ?? null,
      },
    });

    return { licenses: generated };
  });

export const adminDeleteLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ license_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("licenses")
      .delete()
      .eq("id", data.license_id);
    if (error) throw error;
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "delete_license",
      target_type: "license",
      target_id: data.license_id,
    });
    return { ok: true };
  });

// ============================================================================
// ADMIN — planos: criar / atualizar
// ============================================================================
const planInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, _ ou -"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  duration_days: z.number().int().min(1).max(3650),
  price_cents: z.number().int().min(0),
  max_devices: z.number().int().min(1).max(50),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
  features: z.array(z.string()).optional(),
});

export const adminCreatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => planInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .insert({ ...data, features: data.features ?? [] })
      .select()
      .single();
    if (error) throw error;
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "create_plan",
      target_type: "plan",
      target_id: plan.id,
      details: data,
    });
    return { plan };
  });

export const adminUpdatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    planInputSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...update } = data;
    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .update({ ...update, features: update.features ?? [] })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "update_plan",
      target_type: "plan",
      target_id: id,
      details: update,
    });
    return { plan };
  });

// ============================================================================
// ADMIN — usuários
// ============================================================================
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [authRes, profilesRes, rolesRes, licensesRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("user_roles").select("*"),
      supabaseAdmin.from("licenses").select("user_id, status"),
    ]);
    if (authRes.error) throw authRes.error;

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const rolesMap = new Map<string, string[]>();
    (rolesRes.data ?? []).forEach((r) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });
    const licenseCountMap = new Map<string, number>();
    (licensesRes.data ?? []).forEach((l) => {
      if (!l.user_id) return;
      licenseCountMap.set(l.user_id, (licenseCountMap.get(l.user_id) ?? 0) + 1);
    });

    return authRes.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      full_name: profileMap.get(u.id)?.full_name ?? null,
      avatar_url: profileMap.get(u.id)?.avatar_url ?? null,
      roles: rolesMap.get(u.id) ?? [],
      license_count: licenseCountMap.get(u.id) ?? 0,
    }));
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "user"]),
        action: z.enum(["grant", "revoke"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context);
    if (data.user_id === adminId && data.role === "admin" && data.action === "revoke") {
      throw new Error("Você não pode remover seu próprio acesso de admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "grant") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error && !error.message.includes("duplicate")) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw error;
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminId,
      action: `${data.action}_role`,
      target_type: "user",
      target_id: data.user_id,
      details: { role: data.role },
    });
    return { ok: true };
  });

export const adminGetAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
