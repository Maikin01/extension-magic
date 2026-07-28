import {
  ApiHttpError,
  assertAllowedOrigin,
  createHttpContext,
  errorResponse,
  options,
} from "./http.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";

Deno.test("CORS protegido aceita somente a origem configurada", () => {
  Deno.env.set("APP_ALLOWED_ORIGINS", "https://riselovable.lovable.app");
  const allowed = createHttpContext(
    new Request("https://edge.test", {
      method: "OPTIONS",
      headers: {
        Origin: "https://riselovable.lovable.app",
        "X-Request-Id": "request-1234",
      },
    }),
    "protected",
  );
  assertAllowedOrigin(allowed);
  const response = options(allowed);
  assertEquals(response.status, 204);
  assertEquals(
    response.headers.get("access-control-allow-origin"),
    allowed.origin,
  );
  assertEquals(response.headers.get("x-request-id"), "request-1234");

  const denied = createHttpContext(
    new Request("https://edge.test", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.invalid" },
    }),
    "protected",
  );
  assertThrows(() => assertAllowedOrigin(denied), ApiHttpError);
});

Deno.test("erro público não expõe a mensagem interna", async () => {
  const context = createHttpContext(new Request("https://edge.test"), "public");
  const response = errorResponse(
    new Error("segredo interno do banco"),
    context,
  );
  const payload = await response.json();
  assertEquals(response.status, 500);
  assertEquals(payload.code, "INTERNAL_ERROR");
  assertEquals(payload.error, "Erro interno do servidor.");
  assertEquals(payload.requestId, context.requestId);
});
