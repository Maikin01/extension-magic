import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Retorna as informações do revendedor logado: código, link, e nada mais.
 * Só funciona se o usuário tem role 'revendedor'.
 */
export const getMyResellerInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isReseller } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "revendedor",
    });
    if (!isReseller) throw new Error("Acesso restrito a revendedores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, referral_code")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.referral_code) {
      await supabaseAdmin.rpc("generate_referral_code", { _user_id: userId });
      const refreshed = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, referral_code")
        .eq("id", userId)
        .maybeSingle();
      profile = refreshed.data ?? profile;
    }

    return {
      referral_code: profile?.referral_code ?? null,
      full_name: profile?.full_name ?? null,
    };
  });

const rangeSchema = z.object({
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
});

type SaleRow = {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  plan_name: string | null;
};

function summarize(rows: SaleRow[]) {
  const paid = rows.filter((r) => r.status === "approved");
  const totalPaidCents = paid.reduce((a, r) => a + (r.amount_cents ?? 0), 0);
  const pending = rows.filter((r) => r.status === "pending").length;
  return {
    total_sales: paid.length,
    total_amount_cents: totalPaidCents,
    pending_count: pending,
    all_count: rows.length,
  };
}

/**
 * Estatísticas e lista de vendas do revendedor logado no intervalo.
 */
export const getResellerStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isReseller } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "revendedor",
    });
    if (!isReseller) throw new Error("Acesso restrito a revendedores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payments")
      .select("id, status, amount_cents, created_at, paid_at, buyer_name, buyer_email, plans(name)")
      .eq("reseller_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);

    const { data: rows, error } = await q;
    if (error) throw error;

    const mapped: SaleRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      amount_cents: r.amount_cents,
      created_at: r.created_at,
      paid_at: r.paid_at,
      buyer_name: r.buyer_name,
      buyer_email: r.buyer_email,
      plan_name: r.plans?.name ?? null,
    }));

    return { sales: mapped, summary: summarize(mapped) };
  });

/**
 * Admin: lista todos os revendedores com totais consolidados.
 */
export const adminListResellers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Todos que têm role revendedor
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "revendedor");
    const resellerIds = (roles ?? []).map((r) => r.user_id);
    if (resellerIds.length === 0) {
      return { resellers: [], global: { total_amount_cents: 0, total_sales: 0, pending_count: 0 } };
    }

    const [profilesRes, authRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, referral_code")
        .in("id", resellerIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
      (async () => {
        let q = supabaseAdmin
          .from("payments")
          .select("reseller_id, status, amount_cents, created_at")
          .in("reseller_id", resellerIds);
        if (data.from) q = q.gte("created_at", data.from);
        if (data.to) q = q.lte("created_at", data.to);
        return q;
      })(),
    ]);

    const emailMap = new Map(
      (authRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
    );
    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p]),
    );

    const perReseller = new Map<
      string,
      { paid: number; paidCents: number; pending: number }
    >();
    for (const id of resellerIds) {
      perReseller.set(id, { paid: 0, paidCents: 0, pending: 0 });
    }
    let globalPaidCents = 0;
    let globalPaid = 0;
    let globalPending = 0;
    for (const p of paymentsRes.data ?? []) {
      const bucket = perReseller.get(p.reseller_id!);
      if (!bucket) continue;
      if (p.status === "approved") {
        bucket.paid += 1;
        bucket.paidCents += p.amount_cents ?? 0;
        globalPaid += 1;
        globalPaidCents += p.amount_cents ?? 0;
      } else if (p.status === "pending") {
        bucket.pending += 1;
        globalPending += 1;
      }
    }

    const resellers = resellerIds.map((id) => {
      const b = perReseller.get(id)!;
      const prof = profileMap.get(id);
      return {
        user_id: id,
        email: emailMap.get(id) ?? null,
        full_name: prof?.full_name ?? null,
        referral_code: prof?.referral_code ?? null,
        total_sales: b.paid,
        total_amount_cents: b.paidCents,
        pending_count: b.pending,
      };
    }).sort((a, b) => b.total_amount_cents - a.total_amount_cents);

    return {
      resellers,
      global: {
        total_amount_cents: globalPaidCents,
        total_sales: globalPaid,
        pending_count: globalPending,
      },
    };
  });

/**
 * Admin: detalhes das vendas de um revendedor específico.
 */
export const adminGetResellerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    rangeSchema.extend({ user_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payments")
      .select("id, status, amount_cents, created_at, paid_at, buyer_name, buyer_email, plans(name)")
      .eq("reseller_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    const mapped: SaleRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      amount_cents: r.amount_cents,
      created_at: r.created_at,
      paid_at: r.paid_at,
      buyer_name: r.buyer_name,
      buyer_email: r.buyer_email,
      plan_name: r.plans?.name ?? null,
    }));
    return { sales: mapped, summary: summarize(mapped) };
  });

/**
 * Admin: estatísticas globais de faturamento (todas as vendas).
 */
export const adminGetGlobalRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payments")
      .select("status, amount_cents, reseller_id, created_at");
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;

    let totalCents = 0;
    let totalSales = 0;
    let pending = 0;
    let resellerCents = 0;
    let resellerSales = 0;
    let directCents = 0;
    let directSales = 0;
    for (const r of rows ?? []) {
      if (r.status === "approved") {
        totalCents += r.amount_cents ?? 0;
        totalSales += 1;
        if (r.reseller_id) {
          resellerCents += r.amount_cents ?? 0;
          resellerSales += 1;
        } else {
          directCents += r.amount_cents ?? 0;
          directSales += 1;
        }
      } else if (r.status === "pending") {
        pending += 1;
      }
    }
    return {
      total_amount_cents: totalCents,
      total_sales: totalSales,
      pending_count: pending,
      via_reseller_amount_cents: resellerCents,
      via_reseller_sales: resellerSales,
      direct_amount_cents: directCents,
      direct_sales: directSales,
    };
  });

/**
 * Verifica se um código de indicação é válido (usado no checkout público).
 */
export const validateReferralCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ code: z.string().min(4).max(16) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, referral_code")
      .eq("referral_code", data.code.toUpperCase())
      .maybeSingle();
    if (!profile) return { valid: false, reseller_name: null };

    // Confirma que ainda é revendedor
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .eq("role", "revendedor");
    if (!roles || roles.length === 0) return { valid: false, reseller_name: null };
    return { valid: true, reseller_name: profile.full_name ?? null };
  });
