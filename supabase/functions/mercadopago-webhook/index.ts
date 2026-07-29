import { createAdminClient } from "../_shared/supabase.ts";
import {
  ApiHttpError,
  createHttpContext,
  errorResponse,
  json,
  options,
} from "../_shared/http.ts";
import {
  assertMercadoPagoPaymentContract,
  getPayment,
  verifyMercadoPagoWebhookSignature,
} from "../_shared/mercadopago.ts";
import {
  applyProviderPaymentStatus,
  finalizePaymentIfApproved,
} from "../_shared/payments.ts";
import { clientIp, enforceRateLimit } from "../_shared/rate-limit.ts";

Deno.serve(async (request) => {
  const http = createHttpContext(request, "public");
  if (request.method === "OPTIONS") return options(http);
  if (request.method === "GET") return json({ ok: true }, 200, http);

  try {
    if (request.method !== "POST") {
      throw new ApiHttpError(
        405,
        "METHOD_NOT_ALLOWED",
        "Método não permitido.",
      );
    }
    const admin = createAdminClient();
    await enforceRateLimit(
      admin,
      "mercadopago-webhook",
      [clientIp(request)],
      600,
      60,
      {
        failOpen: true,
        requestId: http.requestId,
      },
    );
    const url = new URL(request.url);
    const text = await request.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    const paymentId = body?.data?.id ??
      body?.resource ??
      url.searchParams.get("id") ??
      url.searchParams.get("data.id");
    const topic = body?.type ?? body?.topic ?? url.searchParams.get("topic") ??
      url.searchParams.get("type");
    if (!paymentId) return json({ ok: true, ignored: "missing id" }, 200, http);
    if (topic && !String(topic).includes("payment")) {
      return json(
        { ok: true, ignored: `topic ${String(topic).slice(0, 128)}` },
        200,
        http,
      );
    }

    const signature = await verifyMercadoPagoWebhookSignature(
      request,
      String(paymentId),
    );
    if (!signature.configured) {
      console.warn(
        "[mercadopago-webhook]",
        JSON.stringify({
          requestId: http.requestId,
          code: "WEBHOOK_SECRET_NOT_CONFIGURED",
        }),
      );
    } else if (!signature.valid) {
      throw new ApiHttpError(
        401,
        "INVALID_WEBHOOK_SIGNATURE",
        "Assinatura inválida.",
      );
    }

    const remote = await getPayment(String(paymentId));
    const providerId = String(remote.id);
    const externalReference = remote.external_reference
      ? String(remote.external_reference)
      : null;
    const query = admin.from("payments").select("*");
    const { data: payment, error } = externalReference
      ? await query.eq("id", externalReference).maybeSingle()
      : await query.eq("provider_payment_id", providerId).maybeSingle();
    if (error) throw error;
    if (!payment) return json({ ok: true, ignored: "not_found" }, 200, http);

    const verified = assertMercadoPagoPaymentContract(remote, {
      paymentId: payment.id,
      providerPaymentId: payment.provider_payment_id,
      amountCents: payment.amount_cents,
      buyerEmail: payment.buyer_email,
    });
    const effectiveStatus = await applyProviderPaymentStatus(admin, {
      paymentId: payment.id,
      providerPaymentId: verified.providerId,
      status: verified.status,
      raw: remote,
    });
    if (effectiveStatus === "approved") {
      await finalizePaymentIfApproved(admin, payment.id, payment.quantity ?? 1);
    }
    return json({ ok: true }, 200, http);
  } catch (error) {
    return errorResponse(error, http);
  }
});
