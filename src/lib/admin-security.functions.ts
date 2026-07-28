import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invokeProtectedEdge } from "@/lib/supabase-edge.server";
import { ADMIN_UNLOCK_TTL_MS, getAdminSessionConfig } from "@/lib/admin-security.server";

export const getAdminGateStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const status = await invokeProtectedEdge<{
      isAdmin: boolean;
      hasPassword: boolean;
      hasTotp: boolean;
    }>(context, "getAdminGateStatus");
    if (!status.isAdmin) return { ...status, unlocked: false };

    const session = await useSession<{ userId?: string; unlockedAt?: number }>(
      getAdminSessionConfig(),
    );
    const unlocked =
      session.data?.userId === context.userId &&
      typeof session.data?.unlockedAt === "number" &&
      Date.now() - session.data.unlockedAt < ADMIN_UNLOCK_TTL_MS;
    return { ...status, unlocked };
  });

export const setAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        newPassword: z.string().min(8).max(128),
        currentPassword: z.string().max(128).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    invokeProtectedEdge<{ ok: true }>(context, "setAdminPassword", data),
  );

export const unlockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ password: z.string().min(1).max(128) }).parse(data))
  .handler(async ({ data, context }) => {
    await invokeProtectedEdge<{ ok: true }>(context, "verifyAdminUnlock", data);
    const session = await useSession<{ userId?: string; unlockedAt?: number }>(
      getAdminSessionConfig(),
    );
    await session.update({ userId: context.userId, unlockedAt: Date.now() });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const session = await useSession(getAdminSessionConfig());
    await session.clear();
    return { ok: true as const };
  });
