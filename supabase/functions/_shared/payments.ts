import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";
import { generateLicenseKey, hashLicenseKey } from "./license.ts";

export async function applyProviderPaymentStatus(
  admin: SupabaseClient,
  input: {
    paymentId: string;
    providerPaymentId: string;
    status: string;
    raw: unknown;
  },
): Promise<string> {
  const { data, error } = await admin.rpc("apply_payment_status", {
    p_payment_id: input.paymentId,
    p_provider_payment_id: input.providerPaymentId,
    p_status: input.status,
    p_raw: input.raw,
  });
  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("Resposta inválida ao reconciliar pagamento.");
  }
  return data;
}

export async function finalizePaymentIfApproved(
  admin: SupabaseClient,
  paymentId: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const licenseKey = generateLicenseKey();
    const licenseKeyHash = await hashLicenseKey(licenseKey);
    const { data, error } = await admin.rpc("finalize_approved_payment", {
      p_payment_id: paymentId,
      p_license_key: licenseKey,
      p_license_key_hash: licenseKeyHash,
    });
    if (!error) return typeof data === "string" ? data : null;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não foi possível gerar uma chave única. Tente novamente.");
}
