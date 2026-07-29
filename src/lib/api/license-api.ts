import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { backendApi } from "@/lib/api/backend-client";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LicenseRow = Database["public"]["Tables"]["licenses"]["Row"];
type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
type ActivationLogRow = Database["public"]["Tables"]["activation_logs"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["admin_audit_log"]["Row"];

export type LicenseWithRelations = LicenseRow & {
  plans: PlanRow | { name: string; slug: string } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
  is_deleted?: boolean;
};

export type TrialClaim = LicenseWithRelations & { is_deleted: boolean };

export type DashboardResponse = {
  profile: ProfileRow | null;
  licenses: LicenseWithRelations[];
  currentLicense: LicenseWithRelations | null;
  trialClaim: TrialClaim | null;
  devices: DeviceRow[];
  logs: ActivationLogRow[];
};

export type AdminOverviewResponse = {
  counts: {
    active: number;
    pending: number;
    expired: number;
    revoked: number;
    suspended: number;
    total_users: number;
  };
  licenses: LicenseWithRelations[];
  plans: PlanRow[];
  logs: ActivationLogRow[];
};

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  roles: string[];
  license_count: number;
};

export type AdminPayment = {
  id: string;
  status: string;
  amount_cents: number;
  buyer_name: string | null;
  buyer_whatsapp: string | null;
  buyer_email: string | null;
  provider_payment_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  plans: { name: string; slug: string } | null;
  licenses: { license_key: string } | null;
};

const updateLicenseStatusSchema = z.object({
  license_id: z.string().uuid(),
  status: z.enum(["active", "expired", "suspended", "revoked", "pending"]),
});
const generateLicensesSchema = z
  .object({
    plan_slug: z.string().min(1).optional().nullable(),
    count: z.number().int().min(1).max(100),
    email: z.string().email().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    custom_duration_minutes: z
      .number()
      .int()
      .min(1)
      .max(60 * 24 * 3650)
      .optional()
      .nullable(),
    custom_duration_seconds: z
      .number()
      .int()
      .min(1)
      .max(60 * 60 * 24 * 3650)
      .optional()
      .nullable(),
    max_devices_override: z.number().int().min(1).max(50).optional().nullable(),
  })
  .refine(
    (value) =>
      Boolean(value.plan_slug) ||
      Boolean(value.custom_duration_minutes) ||
      Boolean(value.custom_duration_seconds),
    { message: "Informe um plano ou uma duração personalizada." },
  );
const deleteLicenseSchema = z.object({ license_id: z.string().uuid() });
const planInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  duration_days: z.number().int().min(1).max(3650),
  price_cents: z.number().int().min(0),
  max_devices: z.number().int().min(1).max(50),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
  features: z.array(z.string()).optional(),
});
const updatePlanSchema = planInputSchema.extend({ id: z.string().uuid() });
const setUserRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "user", "cliente", "revendedor", "owner"]),
  action: z.enum(["grant", "revoke"]),
});
const deleteUserSchema = z.object({ user_id: z.string().uuid() });

type Input<T> = { data: T };
type Ok = { ok: true };

export const getMyDashboard = (): Promise<DashboardResponse> => backendApi.invoke("getMyDashboard");

export const claimTrialLicense = (): Promise<{ license: LicenseRow; existed?: boolean }> =>
  backendApi.invoke("claimTrialLicense");

export const getAdminOverview = (): Promise<AdminOverviewResponse> =>
  backendApi.invoke("getAdminOverview");

export const adminListUsers = (): Promise<AdminUser[]> => backendApi.invoke("adminListUsers");
export const adminGetAuditLog = (): Promise<AuditLogRow[]> => backendApi.invoke("adminGetAuditLog");
export const adminListPayments = (): Promise<AdminPayment[]> =>
  backendApi.invoke("adminListPayments");

export const adminUpdateLicenseStatus = (
  input: Input<z.infer<typeof updateLicenseStatusSchema>>,
): Promise<Ok> =>
  backendApi.invoke("adminUpdateLicenseStatus", updateLicenseStatusSchema.parse(input.data));

export const adminGenerateLicenses = (
  input: Input<z.infer<typeof generateLicensesSchema>>,
): Promise<{ licenses: LicenseRow[] }> =>
  backendApi.invoke("adminGenerateLicenses", generateLicensesSchema.parse(input.data));

export const adminDeleteLicense = (
  input: Input<z.infer<typeof deleteLicenseSchema>>,
): Promise<Ok> => backendApi.invoke("adminDeleteLicense", deleteLicenseSchema.parse(input.data));

export const adminCreatePlan = (
  input: Input<z.infer<typeof planInputSchema>>,
): Promise<{ plan: PlanRow }> =>
  backendApi.invoke("adminCreatePlan", planInputSchema.parse(input.data));

export const adminUpdatePlan = (
  input: Input<z.infer<typeof updatePlanSchema>>,
): Promise<{ plan: PlanRow }> =>
  backendApi.invoke("adminUpdatePlan", updatePlanSchema.parse(input.data));

export const adminSetUserRole = (input: Input<z.infer<typeof setUserRoleSchema>>): Promise<Ok> =>
  backendApi.invoke("adminSetUserRole", setUserRoleSchema.parse(input.data));

export const adminDeleteUser = (input: Input<z.infer<typeof deleteUserSchema>>): Promise<Ok> =>
  backendApi.invoke("adminDeleteUser", deleteUserSchema.parse(input.data));

export const getPublicPlans = (): Promise<PlanRow[]> => backendApi.public("getPublicPlans");
