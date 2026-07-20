import type { PrismaClient } from "../../generated/prisma/client";
import { searchPublicProducts } from "../../modules/catalog/queries";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: {
  prisma: PrismaClient;
  urlParsed: { search: Record<string, string | undefined> };
}) {
  const result = await searchPublicProducts(pageContext.prisma, {
    query: pageContext.urlParsed.search.q ?? "",
    skip: 0,
    take: 24,
  });

  return {
    query: result.query,
    products: result.items,
    total: result.total,
  };
}
