import { createFileRoute } from "@tanstack/react-router";
import { forwardEdgeRequest } from "@/lib/supabase-edge.server";

const forward = ({ request }: { request: Request }) =>
  forwardEdgeRequest(request, "public-api", "/license/validate");

export const Route = createFileRoute("/api/public/license/validate")({
  server: { handlers: { OPTIONS: forward, POST: forward } },
});
