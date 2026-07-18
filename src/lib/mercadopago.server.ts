// Helpers server-only para o Mercado Pago (Pix).
// Nunca importar em código do cliente.

const MP_API = "https://api.mercadopago.com";

function accessToken(): string {
  const t = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  return t;
}

export interface CreatePixInput {
  amountCents: number;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp?: string;
  buyerCpf?: string;
  externalReference: string;
  notificationUrl?: string;
  expiresInMinutes?: number;
}

export interface CreatePixResult {
  id: number;
  status: string;
  status_detail: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string | null;
  date_of_expiration: string | null;
  raw: any;
}

export async function createPixPayment(input: CreatePixInput): Promise<CreatePixResult> {
  const [firstName, ...rest] = (input.buyerName || "Cliente").trim().split(/\s+/);
  const lastName = rest.join(" ") || "Rise";
  const expMs = (input.expiresInMinutes ?? 30) * 60_000;
  const dateOfExpiration = new Date(Date.now() + expMs).toISOString();

  const payer: Record<string, unknown> = {
    email: input.buyerEmail,
    first_name: firstName,
    last_name: lastName,
  };

  // CPF (opcional): só envia se tiver 11 dígitos válidos
  const cpfDigits = (input.buyerCpf ?? "").replace(/\D+/g, "");
  if (cpfDigits.length === 11) {
    payer.identification = { type: "CPF", number: cpfDigits };
  }

  // Telefone (opcional): só envia se tiver pelo menos 10 dígitos
  const phoneDigits = (input.buyerWhatsapp ?? "").replace(/\D+/g, "");
  if (phoneDigits.length >= 10) {
    const areaCode = phoneDigits.slice(0, 2);
    const number = phoneDigits.slice(2);
    payer.phone = { area_code: areaCode, number };
  }

  const body: Record<string, unknown> = {
    transaction_amount: Number((input.amountCents / 100).toFixed(2)),
    description: input.description,
    payment_method_id: "pix",
    external_reference: input.externalReference,
    date_of_expiration: dateOfExpiration,
    payer,
  };
  if (input.notificationUrl) body.notification_url = input.notificationUrl;

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mercado Pago erro ${res.status}: ${json?.message ?? JSON.stringify(json)}`,
    );
  }

  const poi = json?.point_of_interaction?.transaction_data ?? {};
  return {
    id: json.id,
    status: json.status,
    status_detail: json.status_detail,
    qr_code: poi.qr_code ?? "",
    qr_code_base64: poi.qr_code_base64 ?? "",
    ticket_url: poi.ticket_url ?? null,
    date_of_expiration: json.date_of_expiration ?? dateOfExpiration,
    raw: json,
  };
}

export async function getPayment(id: string | number): Promise<any> {
  const res = await fetch(`${MP_API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mercado Pago erro ${res.status}: ${json?.message ?? JSON.stringify(json)}`,
    );
  }
  return json;
}
