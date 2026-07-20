import type { PrismaClient } from "../../../generated/prisma/client";
import { getAdminCategories, getAdminProductsPage } from "../../../modules/catalog/service";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: {
  prisma: PrismaClient;
  session?: { user?: { role?: string } };
}) {
  if (pageContext.session?.user?.role !== "admin") {
    return {
      products: [],
      total: 0,
      categories: [],
    };
  }

  const productPage = await getAdminProductsPage({ page: 1, pageSize: 20 }, pageContext.prisma);
  return {
    products: productPage.items,
    total: productPage.total,
    categories: await getAdminCategories(pageContext.prisma),
  };
}
