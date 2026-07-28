const MP_API = "https://api.mercadopago.com";

function accessToken(): string {
  const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")?.trim() ?? "";
  if (!token) throw new Error("Token do Mercado Pago não configurado no Supabase.");
  if (!token.startsWith("APP_USR-") && !token.startsWith("TEST-")) {
    throw new Error("Access Token do Mercado Pago inválido.");
  }
  return token;
}

export async function createPixPayment(input: {
  amountCents: number;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp?: string;
  buyerCpf?: string;
  externalReference: string;
  notificationUrl: string;
  expiresInMinutes?: number;
}) {
  const [firstName, ...rest] = (input.buyerName || "Cliente").trim().split(/\s+/);
  const payer: Record<string, unknown> = {
    email: input.buyerEmail,
    first_name: firstName,
    last_name: rest.join(" ") || "Rise",
  };
  const cpf = (input.buyerCpf ?? "").replace(/\D+/g, "");
  if (cpf.length === 11) payer.identification = { type: "CPF", number: cpf };
  const phone = (input.buyerWhatsapp ?? "").replace(/\D+/g, "");
  if (phone.length >= 10) payer.phone = { area_code: phone.slice(0, 2), number: phone.slice(2) };

  const expiration = new Date(Date.now() + (input.expiresInMinutes ?? 30) * 60_000).toISOString();
  const response = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: Number((input.amountCents / 100).toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      date_of_expiration: expiration,
      notification_url: input.notificationUrl,
      payer,
    }),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`Mercado Pago erro ${response.status}: ${payload?.message ?? "erro"}`);
  const transaction = payload?.point_of_interaction?.transaction_data ?? {};
  return {
    id: payload.id,
    status: payload.status,
    qr_code: transaction.qr_code ?? "",
    qr_code_base64: transaction.qr_code_base64 ?? "",
    ticket_url: transaction.ticket_url ?? null,
    date_of_expiration: payload.date_of_expiration ?? expiration,
    raw: payload,
  };
}

export async function getPayment(id: string | number): Promise<any> {
  const response = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(String(id))}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`Mercado Pago erro ${response.status}: ${payload?.message ?? "erro"}`);
  return payload;
}
