import { createAdminClient } from "../_shared/supabase.ts";
import { errorResponse, json, options } from "../_shared/http.ts";
import { getPayment } from "../_shared/mercadopago.ts";
import { finalizePaymentIfApproved } from "../_shared/payments.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method === "GET") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = new URL(request.url);
    const text = await request.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const paymentId =
      body?.data?.id ??
      body?.resource ??
      url.searchParams.get("id") ??
      url.searchParams.get("data.id");
    const topic =
      body?.type ?? body?.topic ?? url.searchParams.get("topic") ?? url.searchParams.get("type");
    if (!paymentId) return json({ ok: true, ignored: "missing id" });
    if (topic && !String(topic).includes("payment"))
      return json({ ok: true, ignored: `topic ${topic}` });

    const remote = await getPayment(String(paymentId));
    const providerId = String(remote.id);
    const status = String(remote.status ?? "pending");
    const externalReference = remote.external_reference ? String(remote.external_reference) : null;
    const admin = createAdminClient();
    const query = admin.from("payments").select("*");
    const { data: payment, error } = externalReference
      ? await query.eq("id", externalReference).maybeSingle()
      : await query.eq("provider_payment_id", providerId).maybeSingle();
    if (error) throw error;
    if (!payment) return json({ ok: true, ignored: "not_found" });

    const { error: updateError } = await admin
      .from("payments")
      .update({
        status,
        provider_payment_id: providerId,
        raw: remote,
        paid_at: status === "approved" ? new Date().toISOString() : payment.paid_at,
      })
      .eq("id", payment.id);
    if (updateError) throw updateError;
    if (status === "approved") await finalizePaymentIfApproved(admin, payment.id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, 500);
  }
});
