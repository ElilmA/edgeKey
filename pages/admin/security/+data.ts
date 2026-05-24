import type { PrismaClient } from "../../../generated/prisma/client";
import { getTurnstileConfig } from "../../../server/turnstile";

export type Data = ReturnType<typeof data>;

export async function data(pageContext: {
  prisma: PrismaClient;
  session?: { user?: { role?: string } };
}) {
  if (pageContext.session?.user?.role !== "admin") {
    return { turnstileEnabled: false };
  }

  const config = getTurnstileConfig();
  return {
    turnstileEnabled: config.enabled,
  };
}
