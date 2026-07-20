import { assertAdminAccess } from "../../../modules/auth/service";
import { updateProductCategory } from "../../../modules/catalog/service";

export async function onUpdateProductCategory(input: { id: number; categoryId: number | null }) {
  assertAdminAccess();
  return updateProductCategory(input);
}
