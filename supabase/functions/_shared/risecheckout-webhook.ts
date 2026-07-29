export const RESELLER_PRODUCT_NAMES = [
  "Revenda lovable",
  "Extensão ilimitada",
] as const;
export const RISECHECKOUT_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export class RiseCheckoutWebhookError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RiseCheckoutWebhookError";
  }
}

type UnknownRecord = Record<string, unknown>;

export type RiseCheckoutResellerPurchase = {
  eventType: "purchase_approved";
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  emailNormalized: string;
  customerName: string | null;
  amountCents: number | null;
  currency: string | null;
  paidAt: string | null;
  eventCreatedAt: string | null;
};

export type ParsedRiseCheckoutEvent =
  | { kind: "purchase"; purchase: RiseCheckoutResellerPurchase }
  | { kind: "ignored"; reason: string };

function record(value: unknown): UnknownRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nonEmptyString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function nullableIsoDate(value: unknown): string | null {
  const candidate = nonEmptyString(value, 80);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function normalizeRiseCheckoutEmail(value: unknown): string | null {
  const email = nonEmptyString(value, 255)?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function parseRiseCheckoutEvent(
  payload: unknown,
): ParsedRiseCheckoutEvent {
  const root = record(payload);
  if (!root) {
    throw new RiseCheckoutWebhookError(
      "INVALID_PAYLOAD",
      "Payload do webhook inválido.",
    );
  }
  const eventType = nonEmptyString(root.event, 80);
  if (eventType !== "purchase_approved") {
    return { kind: "ignored", reason: "event_not_supported" };
  }

  const data = record(root?.data);
  const order = record(data?.order);
  const customer = record(data?.customer);
  const item = record(data?.item);
  if (!data || !order || !customer || !item) {
    throw new RiseCheckoutWebhookError(
      "INVALID_PAYLOAD",
      "Payload sem data.order, data.customer ou data.item.",
    );
  }

  const productName = nonEmptyString(item.product_name, 300);
  if (
    !productName ||
    !RESELLER_PRODUCT_NAMES.includes(
      productName as (typeof RESELLER_PRODUCT_NAMES)[number],
    )
  ) {
    return { kind: "ignored", reason: "product_not_supported" };
  }

  const orderStatus = nonEmptyString(order.status, 40)?.toLowerCase();
  if (orderStatus !== "paid") {
    return { kind: "ignored", reason: "order_not_paid" };
  }

  const orderId = nonEmptyString(order.id, 160);
  const orderItemId = nonEmptyString(item.id, 160);
  const emailNormalized = normalizeRiseCheckoutEmail(customer.email);
  if (!orderId || !orderItemId || !emailNormalized) {
    throw new RiseCheckoutWebhookError(
      "INVALID_PAYLOAD",
      "Compra sem identificadores ou email válidos.",
    );
  }

  return {
    kind: "purchase",
    purchase: {
      eventType,
      orderId,
      orderItemId,
      productId: nonEmptyString(item.product_id, 160),
      productName,
      emailNormalized,
      customerName: nonEmptyString(customer.name, 200),
      amountCents: nullableInteger(order.amount_cents),
      currency: nonEmptyString(order.currency, 12),
      paidAt: nullableIsoDate(order.paid_at),
      eventCreatedAt: nullableIsoDate(root.created_at),
    },
  };
}

function timestampToMilliseconds(value: string): number {
  if (!/^\d{10,13}$/.test(value)) {
    throw new RiseCheckoutWebhookError(
      "INVALID_TIMESTAMP",
      "Timestamp do webhook inválido.",
    );
  }
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) {
    throw new RiseCheckoutWebhookError(
      "INVALID_TIMESTAMP",
      "Timestamp do webhook inválido.",
    );
  }
  return value.length <= 10 ? numeric * 1000 : numeric;
}

export function assertFreshRiseCheckoutTimestamp(
  value: string,
  nowMs = Date.now(),
  toleranceMs = RISECHECKOUT_SIGNATURE_TOLERANCE_MS,
): void {
  const timestampMs = timestampToMilliseconds(value);
  if (Math.abs(nowMs - timestampMs) > toleranceMs) {
    throw new RiseCheckoutWebhookError(
      "EXPIRED_TIMESTAMP",
      "Timestamp do webhook expirado.",
    );
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function createRiseCheckoutSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return bytesToHex(new Uint8Array(signed));
}

export async function assertValidRiseCheckoutSignature(options: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowMs?: number;
}): Promise<void> {
  const timestamp = options.timestamp?.trim() ?? "";
  const signature = options.signature?.trim().toLowerCase() ?? "";
  if (!timestamp || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new RiseCheckoutWebhookError(
      "INVALID_SIGNATURE",
      "Assinatura do webhook ausente ou inválida.",
    );
  }
  assertFreshRiseCheckoutTimestamp(timestamp, options.nowMs);
  const expected = await createRiseCheckoutSignature(
    options.secret,
    timestamp,
    options.rawBody,
  );
  if (!constantTimeEqual(expected, signature)) {
    throw new RiseCheckoutWebhookError(
      "INVALID_SIGNATURE",
      "Assinatura do webhook inválida.",
    );
  }
}
