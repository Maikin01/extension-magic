import { createAdminClient } from "../_shared/supabase.ts";
import { createHttpContext, json } from "../_shared/http.ts";
import {
  assertValidRiseCheckoutSignature,
  parseRiseCheckoutEvent,
  RiseCheckoutWebhookError,
} from "../_shared/risecheckout-webhook.ts";

function requiredSecret(): string {
  const secret = Deno.env.get("RISECHECKOUT_WEBHOOK_SECRET")?.trim();
  if (!secret) throw new Error("RISECHECKOUT_WEBHOOK_SECRET não configurado.");
  return secret;
}

Deno.serve(async (request) => {
  const http = createHttpContext(request, "public");
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405, http);
  }

  try {
    const rawBody = await request.text();
    await assertValidRiseCheckoutSignature({
      secret: requiredSecret(),
      timestamp: request.headers.get("x-rise-timestamp"),
      signature: request.headers.get("x-rise-signature"),
      rawBody,
    });

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "JSON inválido.", code: "INVALID_JSON" }, 400, http);
    }

    if (request.headers.get("x-rise-test")?.toLowerCase() === "true") {
      return json({ ok: true, test: true }, 200, http);
    }

    const parsed = parseRiseCheckoutEvent(payload);
    if (parsed.kind === "ignored") {
      return json({ ok: true, ignored: parsed.reason }, 200, http);
    }

    const purchase = parsed.purchase;
    const admin = createAdminClient();
    const { error } = await admin.from("risecheckout_reseller_entitlements")
      .upsert(
        {
          provider: "risecheckout",
          order_id: purchase.orderId,
          order_item_id: purchase.orderItemId,
          last_event_type: purchase.eventType,
          product_id: purchase.productId,
          product_name: purchase.productName,
          email_normalized: purchase.emailNormalized,
          customer_name: purchase.customerName,
          status: "approved",
          amount_cents: purchase.amountCents,
          currency: purchase.currency,
          paid_at: purchase.paidAt,
          event_created_at: purchase.eventCreatedAt,
          raw_payload: payload,
          last_event_at: new Date().toISOString(),
        },
        { onConflict: "provider,order_id,order_item_id" },
      );
    if (error) throw error;

    return json({ ok: true }, 200, http);
  } catch (error) {
    if (error instanceof RiseCheckoutWebhookError) {
      const status = error.code === "INVALID_PAYLOAD" ? 400 : 401;
      return json({ error: error.message, code: error.code }, status, http);
    }
    console.error(
      "[risecheckout-webhook]",
      error instanceof Error ? error.message : String(error),
    );
    return json({ error: "Erro interno do servidor." }, 500, http);
  }
});
