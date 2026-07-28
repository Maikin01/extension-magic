import { z } from "zod";
import { backendApi } from "@/lib/api/backend-client";

const createCheckoutSchema = z.object({
  plan_slug: z.string().min(2).max(50),
  buyer_name: z.string().min(2).max(120),
  buyer_whatsapp: z.string().min(8).max(30),
  buyer_cpf: z.string().max(20).optional(),
  referral_code: z.string().min(4).max(16).optional().nullable(),
  idempotency_key: z.string().uuid(),
});
const checkoutStatusSchema = z.object({ payment_id: z.string().uuid() });
type Input<T> = { data: T };

export type PixCheckoutResponse = {
  payment_id: string;
  status: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
};

export type CheckoutStatusResponse = {
  status: string;
  license_key: string | null;
  plan_name: string | null;
  expires_at: string | null;
};

export const createPixCheckout = (
  input: Input<z.infer<typeof createCheckoutSchema>>,
): Promise<PixCheckoutResponse> =>
  backendApi.invoke("createPixCheckout", createCheckoutSchema.parse(input.data), {
    timeoutMs: 45_000,
  });

export const getCheckoutStatus = (
  input: Input<z.infer<typeof checkoutStatusSchema>>,
): Promise<CheckoutStatusResponse> =>
  backendApi.invoke("getCheckoutStatus", checkoutStatusSchema.parse(input.data));
