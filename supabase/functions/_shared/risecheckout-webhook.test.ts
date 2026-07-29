import {
  assertFreshRiseCheckoutTimestamp,
  assertValidRiseCheckoutSignature,
  createRiseCheckoutSignature,
  parseRiseCheckoutEvent,
  RiseCheckoutWebhookError,
} from "./risecheckout-webhook.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const payload = {
  event: "purchase_approved",
  created_at: "2026-07-29T17:00:00.000Z",
  data: {
    order: {
      id: "order-1",
      status: "PAID",
      currency: "BRL",
      amount_cents: 9900,
      paid_at: "2026-07-29T16:59:00.000Z",
    },
    customer: {
      email: " Cliente@Example.com ",
      name: "Cliente Teste",
    },
    item: {
      id: "item-1",
      product_id: "product-1",
      product_name: "Revenda lovable",
    },
  },
};

Deno.test("aceita assinatura HMAC válida com timestamp em milissegundos", async () => {
  const rawBody = JSON.stringify(payload);
  const now = Date.now();
  const timestamp = String(now);
  const signature = await createRiseCheckoutSignature(
    "secret",
    timestamp,
    rawBody,
  );
  await assertValidRiseCheckoutSignature({
    secret: "secret",
    timestamp,
    signature,
    rawBody,
    nowMs: now,
  });
});

Deno.test("aceita timestamp em segundos usado nos retries", async () => {
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const rawBody = JSON.stringify(payload);
  const signature = await createRiseCheckoutSignature(
    "secret",
    timestamp,
    rawBody,
  );
  await assertValidRiseCheckoutSignature({
    secret: "secret",
    timestamp,
    signature,
    rawBody,
    nowMs: now,
  });
});

Deno.test("rejeita corpo alterado e timestamp expirado", async () => {
  const now = Date.now();
  const timestamp = String(now);
  const signature = await createRiseCheckoutSignature(
    "secret",
    timestamp,
    "{}",
  );
  let signatureRejected = false;
  try {
    await assertValidRiseCheckoutSignature({
      secret: "secret",
      timestamp,
      signature,
      rawBody: '{"alterado":true}',
      nowMs: now,
    });
  } catch (error) {
    signatureRejected = error instanceof RiseCheckoutWebhookError &&
      error.code === "INVALID_SIGNATURE";
  }
  assert(signatureRejected, "Corpo alterado deveria invalidar a assinatura.");

  let timestampRejected = false;
  try {
    assertFreshRiseCheckoutTimestamp(String(now - 10 * 60 * 1000), now);
  } catch (error) {
    timestampRejected = error instanceof RiseCheckoutWebhookError &&
      error.code === "EXPIRED_TIMESTAMP";
  }
  assert(timestampRejected, "Timestamp expirado deveria ser rejeitado.");
});

Deno.test("extrai somente compra paga do produto exato", () => {
  const parsed = parseRiseCheckoutEvent(payload);
  assert(parsed.kind === "purchase", "Compra válida deveria ser aceita.");
  assert(
    parsed.purchase.emailNormalized === "cliente@example.com",
    "Email deveria ser normalizado.",
  );

  const otherProduct = structuredClone(payload);
  otherProduct.data.item.product_name = "Outro produto";
  const ignored = parseRiseCheckoutEvent(otherProduct);
  assert(
    ignored.kind === "ignored" && ignored.reason === "product_not_supported",
    "Outro produto deveria ser ignorado.",
  );
});
