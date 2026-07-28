import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invokeProtectedEdge } from "@/lib/supabase-edge.server";

export const createPixCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        plan_slug: z.string().min(2).max(50),
        buyer_name: z.string().min(2).max(120),
        buyer_whatsapp: z.string().min(8).max(30),
        buyer_cpf: z.string().max(20).optional(),
        referral_code: z.string().min(4).max(16).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<any>(context, "createPixCheckout", data),
  );

export const getCheckoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ payment_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<any>(context, "getCheckoutStatus", data),
  );
