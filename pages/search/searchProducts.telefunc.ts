import { getContext } from "telefunc";
import type { PrismaClient } from "../../generated/prisma/client";
import { searchPublicProducts } from "../../modules/catalog/queries";

export async function onSearchProducts(input: {
  query: string;
  skip?: number;
  take?: number;
}) {
  const { prisma } = getContext() as { prisma: PrismaClient };

  return searchPublicProducts(prisma, {
    query: typeof input?.query === "string" ? input.query : "",
    skip: Number.isFinite(input?.skip) ? input.skip : 0,
    take: Number.isFinite(input?.take) ? input.take : 6,
  });
}
