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

export async function finalizePaymentLicenses(
  admin: SupabaseClient,
  paymentId: string,
  quantity = 1,
): Promise<string[]> {
  const total = Math.max(1, Math.min(200, Math.floor(quantity) || 1));
  for (let attempt = 0; attempt < 5; attempt++) {
    const keys: { key: string; hash: string }[] = [];
    for (let i = 0; i < total; i++) {
      const key = generateLicenseKey();
      keys.push({ key, hash: await hashLicenseKey(key) });
    }
    const { data, error } = await admin.rpc("finalize_approved_payment_bulk", {
      p_payment_id: paymentId,
      p_keys: keys,
    });
    if (!error) {
      return Array.isArray(data) ? (data as string[]) : [];
    }
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não foi possível gerar uma chave única. Tente novamente.");
}

export async function finalizePaymentIfApproved(
  admin: SupabaseClient,
  paymentId: string,
  quantity = 1,
): Promise<string | null> {
  const keys = await finalizePaymentLicenses(admin, paymentId, quantity);
  return keys[0] ?? null;
}

