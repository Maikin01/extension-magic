import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";
import { insertUniqueLicense } from "./license.ts";

export async function finalizePaymentIfApproved(
  admin: SupabaseClient,
  paymentId: string,
): Promise<string | null> {
  const { data: payment, error } = await admin
    .from("payments")
    .select("*, plans(*)")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !payment || payment.status !== "approved") return null;

  if (payment.license_id) {
    const { data: existing } = await admin
      .from("licenses")
      .select("license_key")
      .eq("id", payment.license_id)
      .maybeSingle();
    return existing?.license_key ?? null;
  }
  if (!payment.plans) throw new Error("Plano do pagamento não encontrado.");

  const license = await insertUniqueLicense(admin, {
    user_id: payment.user_id,
    plan_id: payment.plans.id,
    status: "pending",
    notes: `Pix MP ${payment.provider_payment_id ?? ""} — ${payment.buyer_name} (${payment.buyer_whatsapp})`,
  });

  const { data: claimed, error: claimError } = await admin
    .from("payments")
    .update({
      license_id: license.id,
      paid_at: payment.paid_at ?? new Date().toISOString(),
    })
    .eq("id", payment.id)
    .is("license_id", null)
    .select("license_id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) {
    await admin.from("licenses").delete().eq("id", license.id);
    const { data: refreshed } = await admin
      .from("payments")
      .select("licenses(license_key)")
      .eq("id", payment.id)
      .single();
    return (refreshed as any)?.licenses?.license_key ?? null;
  }
  return license.license_key;
}
