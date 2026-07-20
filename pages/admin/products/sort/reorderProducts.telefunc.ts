import { assertAdminAccess } from "../../../../modules/auth/service";
import { reorderProducts } from "../../../../modules/catalog/service";

export async function onReorderProducts(input: { orderedIds: number[] }) {
  assertAdminAccess();
  return reorderProducts(input);
}
