import { createFileRoute } from "@tanstack/react-router";
import { forwardEdgeRequest } from "@/lib/supabase-edge.server";

const forward = ({ request }: { request: Request }) =>
  forwardEdgeRequest(request, "mercadopago-webhook");

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: { handlers: { OPTIONS: forward, GET: forward, POST: forward } },
});
