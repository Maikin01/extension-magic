import { createFileRoute } from "@tanstack/react-router";
import { forwardEdgeRequest } from "@/lib/supabase-edge.server";

const forward = ({ request }: { request: Request }) =>
  forwardEdgeRequest(request, "public-api", "/license/activate");

export const Route = createFileRoute("/api/public/license/activate")({
  server: { handlers: { OPTIONS: forward, POST: forward } },
});
