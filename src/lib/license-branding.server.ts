// Helper server-only: resolve reseller referral code para uma licença.
// Retorna null quando a licença não veio de um revendedor.
export async function resolveLicenseBrandingCode(
  supabaseAdmin: any,
  licenseUserId: string | null | undefined,
): Promise<string | null> {
  if (!licenseUserId) return null;
  try {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("reseller_id")
      .eq("user_id", licenseUserId)
      .not("reseller_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment?.reseller_id) return null;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .eq("id", payment.reseller_id)
      .maybeSingle();
    return profile?.referral_code ?? null;
  } catch {
    return null;
  }
}
