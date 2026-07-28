import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invokeProtectedEdge, invokePublicEdge } from "@/lib/supabase-edge.server";

const protectedGet = (action: string) =>
  createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => invokeProtectedEdge<any>(context, action));

const protectedPost = <T>(action: string, schema: z.ZodType<T>) =>
  createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((data) => schema.parse(data))
    .handler(async ({ data, context }) => invokeProtectedEdge<any>(context, action, data));

const protectedPostWithoutInput = (action: string) =>
  createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => invokeProtectedEdge<any>(context, action));

export const getMyDashboard = protectedGet("getMyDashboard");
export const claimTrialLicense = protectedPostWithoutInput("claimTrialLicense");
export const getAdminOverview = protectedGet("getAdminOverview");
export const adminListUsers = protectedGet("adminListUsers");
export const adminGetAuditLog = protectedGet("adminGetAuditLog");
export const adminListPayments = protectedGet("adminListPayments");

export const createManualLicense = protectedPost(
  "createManualLicense",
  z.object({ plan_slug: z.string().min(1) }),
);

export const adminUpdateLicenseStatus = protectedPost(
  "adminUpdateLicenseStatus",
  z.object({
    license_id: z.string().uuid(),
    status: z.enum(["active", "expired", "suspended", "revoked", "pending"]),
  }),
);

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () =>
  invokePublicEdge<any[]>("getPublicPlans"),
);

export const adminGenerateLicenses = protectedPost(
  "adminGenerateLicenses",
  z
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
        !!value.plan_slug || !!value.custom_duration_minutes || !!value.custom_duration_seconds,
      { message: "Informe um plano ou uma duração personalizada." },
    ),
);

export const adminDeleteLicense = protectedPost(
  "adminDeleteLicense",
  z.object({ license_id: z.string().uuid() }),
);

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

export const adminCreatePlan = protectedPost("adminCreatePlan", planInputSchema);
export const adminUpdatePlan = protectedPost(
  "adminUpdatePlan",
  planInputSchema.extend({ id: z.string().uuid() }),
);

export const adminSetUserRole = protectedPost(
  "adminSetUserRole",
  z.object({
    user_id: z.string().uuid(),
    role: z.enum(["admin", "user", "cliente", "revendedor", "owner"]),
    action: z.enum(["grant", "revoke"]),
  }),
);

export const adminDeleteUser = protectedPost(
  "adminDeleteUser",
  z.object({ user_id: z.string().uuid() }),
);
