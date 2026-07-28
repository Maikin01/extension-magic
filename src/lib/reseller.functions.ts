import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invokeProtectedEdge, invokePublicEdge } from "@/lib/supabase-edge.server";

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

type SalesSummary = {
  total_sales: number;
  total_amount_cents: number;
  pending_count: number;
  all_count: number;
};

type ResellerStatsResponse = { sales: SaleRow[]; summary: SalesSummary };

type ResellerListResponse = {
  resellers: Array<{
    user_id: string;
    email: string | null;
    full_name: string | null;
    referral_code: string | null;
    total_sales: number;
    total_amount_cents: number;
    pending_count: number;
  }>;
  global: {
    total_amount_cents: number;
    total_sales: number;
    pending_count: number;
  };
};

type GlobalRevenueResponse = {
  total_amount_cents: number;
  total_sales: number;
  pending_count: number;
  via_reseller_amount_cents: number;
  via_reseller_sales: number;
  direct_amount_cents: number;
  direct_sales: number;
};

export const getMyResellerInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    invokeProtectedEdge<{ referral_code: string | null; full_name: string | null }>(
      context,
      "getMyResellerInfo",
    ),
  );

export const getResellerStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<ResellerStatsResponse>(context, "getResellerStats", data),
  );

export const adminListResellers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<ResellerListResponse>(context, "adminListResellers", data),
  );

export const adminGetResellerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => rangeSchema.extend({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<ResellerStatsResponse>(context, "adminGetResellerDetail", data),
  );

export const adminGetGlobalRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => rangeSchema.parse(data))
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<GlobalRevenueResponse>(context, "adminGetGlobalRevenue", data),
  );

export const validateReferralCode = createServerFn({ method: "POST" })
  .validator((data) => z.object({ code: z.string().min(4).max(16) }).parse(data))
  .handler(async ({ data }) =>
    invokePublicEdge<{ valid: boolean; reseller_name: string | null }>(
      "validateReferralCode",
      data,
    ),
  );
