import { createFileRoute } from "@tanstack/react-router";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

/**
 * Webhook do Mercado Pago. MP envia notificações em vários formatos;
 * tratamos o mais comum: { type: "payment", data: { id } } ou querystring
 * `?topic=payment&id=...`. Buscamos o pagamento e atualizamos nossa tabela.
 */
export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      GET: async () => jsonWithCors({ ok: true }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const bodyText = await request.text();
          let body: any = {};
          try {
            body = bodyText ? JSON.parse(bodyText) : {};
          } catch {}

          const mpId =
            body?.data?.id ??
            body?.resource ??
            url.searchParams.get("id") ??
            url.searchParams.get("data.id");
          const topic =
            body?.type ?? body?.topic ?? url.searchParams.get("topic") ?? url.searchParams.get("type");

          if (!mpId) return jsonWithCors({ ok: true, ignored: "missing id" });
          // Só nos importam eventos de pagamento
          if (topic && !String(topic).includes("payment")) {
            return jsonWithCors({ ok: true, ignored: `topic ${topic}` });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { getPayment } = await import("@/lib/mercadopago.server");
          const { finalizePaymentIfApproved } = await import("@/lib/payments.server");

          const mp = await getPayment(String(mpId));
          const providerId = String(mp.id);
          const status: string = mp.status ?? "pending";
          const externalRef: string | null = mp.external_reference ?? null;

          const query = supabaseAdmin.from("payments").select("*");
          const { data: payment } = externalRef
            ? await query.eq("id", externalRef).maybeSingle()
            : await query.eq("provider_payment_id", providerId).maybeSingle();

          if (!payment) {
            console.warn("[MP webhook] pagamento não encontrado", { providerId, externalRef });
            return jsonWithCors({ ok: true, ignored: "not_found" });
          }

          await supabaseAdmin
            .from("payments")
            .update({
              status,
              provider_payment_id: providerId,
              raw: mp,
              paid_at: status === "approved" ? new Date().toISOString() : payment.paid_at,
            })
            .eq("id", payment.id);

          if (status === "approved") {
            await finalizePaymentIfApproved(payment.id);
          }

          return jsonWithCors({ ok: true });
        } catch (err: any) {
          console.error("[MP webhook]", err);
          return jsonWithCors({ ok: false, error: err?.message ?? "error" }, 500);
        }
      },
    },
  },
});
