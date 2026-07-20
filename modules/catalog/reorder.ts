import type { PrismaClient } from "../../generated/prisma/client";

export type SortableCatalogTable = "Product" | "Category";

const SORTABLE_TABLE_SQL: Record<SortableCatalogTable, string> = {
  Product: '"Product"',
  Category: '"Category"',
};

export function bulkUpdateSortOrder(
  prisma: PrismaClient,
  table: SortableCatalogTable,
  orderedIds: number[],
) {
  const tableSql = SORTABLE_TABLE_SQL[table];
  if (!tableSql) {
    throw new Error(`Unsupported sortable table: ${String(table)}`);
  }

  return prisma.$executeRawUnsafe(
    `WITH incoming AS (
       SELECT CAST(value AS INTEGER) AS id,
              CAST(key AS INTEGER) AS sort
       FROM json_each(?)
     )
     UPDATE ${tableSql} AS target
     SET sort = incoming.sort,
         updatedAt = CURRENT_TIMESTAMP
     FROM incoming
     WHERE target.id = incoming.id`,
    JSON.stringify(orderedIds),
  );
}
