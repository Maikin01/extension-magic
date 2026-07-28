import { z } from "zod";
import { backendApi } from "@/lib/api/backend-client";

const rangeSchema = z.object({
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
});
const detailSchema = rangeSchema.extend({ user_id: z.string().uuid() });
const referralSchema = z.object({ code: z.string().min(4).max(16) });
type Input<T> = { data: T };

export type SaleRow = {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  plan_name: string | null;
};

export type SalesSummary = {
  total_sales: number;
  total_amount_cents: number;
  pending_count: number;
  all_count: number;
};

export type ResellerStatsResponse = { sales: SaleRow[]; summary: SalesSummary };
export type ResellerListResponse = {
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
export type GlobalRevenueResponse = {
  total_amount_cents: number;
  total_sales: number;
  pending_count: number;
  via_reseller_amount_cents: number;
  via_reseller_sales: number;
  direct_amount_cents: number;
  direct_sales: number;
};

export const getMyResellerInfo = (): Promise<{
  referral_code: string | null;
  full_name: string | null;
}> => backendApi.invoke("getMyResellerInfo");

export const getResellerStats = (
  input: Input<z.infer<typeof rangeSchema>>,
): Promise<ResellerStatsResponse> =>
  backendApi.invoke("getResellerStats", rangeSchema.parse(input.data));

export const adminListResellers = (
  input: Input<z.infer<typeof rangeSchema>>,
): Promise<ResellerListResponse> =>
  backendApi.invoke("adminListResellers", rangeSchema.parse(input.data));

export const adminGetResellerDetail = (
  input: Input<z.infer<typeof detailSchema>>,
): Promise<ResellerStatsResponse & { user: { user_id: string } }> =>
  backendApi.invoke("adminGetResellerDetail", detailSchema.parse(input.data));

export const adminGetGlobalRevenue = (
  input: Input<z.infer<typeof rangeSchema>>,
): Promise<GlobalRevenueResponse> =>
  backendApi.invoke("adminGetGlobalRevenue", rangeSchema.parse(input.data));

export const validateReferralCode = (
  input: Input<z.infer<typeof referralSchema>>,
): Promise<{ valid: boolean; reseller?: { full_name: string | null } }> =>
  backendApi.public("validateReferralCode", referralSchema.parse(input.data));
