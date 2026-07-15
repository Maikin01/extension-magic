import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createPixSchema = z.object({
  plan_slug: z.string().min(2).max(50),
  buyer_name: z.string().min(2).max(120),
  buyer_whatsapp: z.string().min(8).max(30),
});

function digits(s: string) {
  return s.replace(/\D+/g, "");
}

function syntheticEmail(whatsapp: string) {
  const d = digits(whatsapp) || "00000000000";
  return `wpp+${d}@rise-lovable.app`;
}

/**
 * Cria um pagamento Pix no Mercado Pago para o plano informado, salva a linha
 * em `payments` e devolve QR Code + copia-e-cola para o cliente.
 * Fluxo público (sem login) — a chave da licença é entregue após confirmação.
 */
export const createPixCheckout = createServerFn({ method: "POST" })
  .inputValidator((data) => createPixSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPixPayment } = await import("@/lib/mercadopago.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("slug", data.plan_slug)
      .eq("is_active", true)
      .single();
    if (planErr || !plan) throw new Error("Plano não encontrado.");
    if (plan.price_cents <= 0) throw new Error("Este plano é gratuito, não requer pagamento.");

    // Cria linha em payments antes de chamar MP para ter external_reference
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        buyer_name: data.buyer_name.trim(),
        buyer_whatsapp: digits(data.buyer_whatsapp),
        buyer_email: syntheticEmail(data.buyer_whatsapp),
        status: "pending",
      })
      .select()
      .single();
    if (payErr || !payment) throw payErr ?? new Error("Falha ao criar pagamento.");

    const notificationUrl = `${process.env.PUBLIC_BASE_URL ?? "https://vamos-extend-buddy.lovable.app"}/api/public/mercadopago/webhook`;

    try {
      const pix = await createPixPayment({
        amountCents: plan.price_cents,
        description: `Rise Lovable — ${plan.name}`,
        buyerName: data.buyer_name,
        buyerEmail: payment.buyer_email!,
        externalReference: payment.id,
        notificationUrl,
        expiresInMinutes: 30,
      });

      await supabaseAdmin
        .from("payments")
        .update({
          provider_payment_id: String(pix.id),
          qr_code: pix.qr_code,
          qr_code_base64: pix.qr_code_base64,
          ticket_url: pix.ticket_url,
          expires_at: pix.date_of_expiration,
          raw: pix.raw,
        })
        .eq("id", payment.id);

      return {
        payment_id: payment.id,
        qr_code: pix.qr_code,
        qr_code_base64: pix.qr_code_base64,
        ticket_url: pix.ticket_url,
        expires_at: pix.date_of_expiration,
        amount_cents: plan.price_cents,
        plan_name: plan.name,
      };
    } catch (err: any) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "error", raw: { error: err?.message ?? String(err) } })
        .eq("id", payment.id);
      throw err;
    }
  });

/**
 * Consulta status do pagamento. Se o MP confirmar aprovação e a licença ainda
 * não tiver sido gerada, gera aqui mesmo (fallback caso o webhook atrase).
 */
export const getCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ payment_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPayment } = await import("@/lib/mercadopago.server");
    const { finalizePaymentIfApproved } = await import("@/lib/payments.server");

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*, plans(*), licenses(license_key)")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (error || !payment) throw new Error("Pagamento não encontrado.");

    // Se ainda não aprovado, pergunta ao MP
    if (payment.status !== "approved" && payment.provider_payment_id) {
      try {
        const mp = await getPayment(payment.provider_payment_id);
        if (mp?.status && mp.status !== payment.status) {
          await supabaseAdmin
            .from("payments")
            .update({ status: mp.status, raw: mp })
            .eq("id", payment.id);
          payment.status = mp.status;
        }
      } catch (e) {
        console.warn("[getCheckoutStatus] MP poll fail", e);
      }
    }

    let licenseKey: string | null = payment.licenses?.license_key ?? null;
    if (payment.status === "approved" && !licenseKey) {
      licenseKey = await finalizePaymentIfApproved(payment.id);
    }

    return {
      status: payment.status,
      license_key: licenseKey,
      plan_name: payment.plans?.name ?? null,
      expires_at: payment.expires_at,
    };
  });
