// Server-only helpers para finalizar pagamentos aprovados e gerar a licença.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateLicenseKey, hashLicenseKey } from "@/lib/license.server";

/**
 * Se o pagamento estiver aprovado e ainda não possui licença vinculada,
 * gera uma chave e vincula. Retorna a `license_key` (em claro).
 * Idempotente: ao rodar de novo, retorna a chave existente.
 */
export async function finalizePaymentIfApproved(paymentId: string): Promise<string | null> {
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("*, plans(*)")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !payment) return null;
  if (payment.status !== "approved") return null;

  if (payment.license_id) {
    const { data: lic } = await supabaseAdmin
      .from("licenses")
      .select("license_key")
      .eq("id", payment.license_id)
      .maybeSingle();
    return lic?.license_key ?? null;
  }

  const plan = payment.plans;
  if (!plan) throw new Error("Plano do pagamento não encontrado.");

  for (let i = 0; i < 5; i++) {
    const key = generateLicenseKey();
    const hash = hashLicenseKey(key);
    const { data: lic, error: licErr } = await supabaseAdmin
      .from("licenses")
      .insert({
        user_id: payment.user_id,
        plan_id: plan.id,
        license_key: key,
        license_key_hash: hash,
        status: "pending",
        notes: `Pix MP ${payment.provider_payment_id ?? ""} — ${payment.buyer_name} (${payment.buyer_whatsapp})`,
      })
      .select()
      .single();
    if (!licErr && lic) {
      await supabaseAdmin
        .from("payments")
        .update({ license_id: lic.id, paid_at: payment.paid_at ?? new Date().toISOString() })
        .eq("id", payment.id);
      return key;
    }
    if (licErr && !licErr.message.includes("duplicate")) throw licErr;
  }
  throw new Error("Não foi possível gerar licença após pagamento.");
}
