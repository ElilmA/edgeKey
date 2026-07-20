import type { PrismaClient } from "../../../../generated/prisma/client";
import { getAdminProducts } from "../../../../modules/catalog/service";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: {
  prisma: PrismaClient;
  session?: { user?: { role?: string } };
}) {
  if (pageContext.session?.user?.role !== "admin") {
    return { products: [] };
  }

  return {
    products: await getAdminProducts(pageContext.prisma),
  };
}
