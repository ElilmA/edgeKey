import { assertAdminAccess } from "../../../modules/auth/service";
import { updateProductSort } from "../../../modules/catalog/service";

export async function onUpdateProductSort(input: { id: number; sort: number }) {
  assertAdminAccess();
  return updateProductSort(input);
}
