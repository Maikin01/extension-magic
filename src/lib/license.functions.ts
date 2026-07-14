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
    const [licenses, users, plans, logs] = await Promise.all([
      supabaseAdmin
        .from("licenses")
        .select("*, plans(name, slug), profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("profiles").select("id, full_name, created_at").limit(200),
      supabaseAdmin.from("plans").select("*").order("sort_order"),
      supabaseAdmin
        .from("activation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const counts = {
      active: licenses.data?.filter((l) => l.status === "active").length ?? 0,
      pending: licenses.data?.filter((l) => l.status === "pending").length ?? 0,
      expired: licenses.data?.filter((l) => l.status === "expired").length ?? 0,
      revoked: licenses.data?.filter((l) => l.status === "revoked").length ?? 0,
      suspended: licenses.data?.filter((l) => l.status === "suspended").length ?? 0,
      total_users: users.data?.length ?? 0,
    };

    return {
      counts,
      licenses: licenses.data ?? [],
      plans: plans.data ?? [],
      logs: logs.data ?? [],
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
