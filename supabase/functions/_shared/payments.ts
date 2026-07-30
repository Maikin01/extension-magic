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


/**
 * Rede de segurança: reconsulta no Mercado Pago os Pix ainda pendentes e,
 * quando aprovados, aprova o pagamento e gera as chaves. Usado quando o
 * webhook falha ou nunca chega.
 */
export async function reconcilePendingPayments(
  admin: SupabaseClient,
  options: { userId?: string; limit?: number; sinceHours?: number } = {},
): Promise<number> {
  const { getPayment, assertMercadoPagoPaymentContract } = await import(
    "./mercadopago.ts"
  );
  const since = new Date(
    Date.now() - (options.sinceHours ?? 24 * 7) * 3600_000,
  ).toISOString();
  let query = admin
    .from("payments")
    .select(
      "id, user_id, quantity, amount_cents, buyer_email, provider_payment_id, status",
    )
    .in("status", ["pending", "in_process", "authorized"])
    .not("provider_payment_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(Math.min(options.limit ?? 25, 100));
  if (options.userId) query = query.eq("user_id", options.userId);
  const { data, error } = await query;
  if (error || !data?.length) return 0;

  let approved = 0;
  for (const payment of data) {
    try {
      const remote = await getPayment(String(payment.provider_payment_id));
      const verified = assertMercadoPagoPaymentContract(remote, {
        paymentId: payment.id,
        providerPaymentId: payment.provider_payment_id,
        amountCents: payment.amount_cents,
        buyerEmail: payment.buyer_email,
      });
      const status = await applyProviderPaymentStatus(admin, {
        paymentId: payment.id,
        providerPaymentId: verified.providerId,
        status: verified.status,
        raw: remote,
      });
      if (status === "approved") {
        await finalizePaymentLicenses(admin, payment.id, payment.quantity ?? 1);
        approved += 1;
      }
    } catch (err) {
      console.warn(
        "[reconcile-payments]",
        JSON.stringify({
          paymentId: payment.id,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  return approved;
}
