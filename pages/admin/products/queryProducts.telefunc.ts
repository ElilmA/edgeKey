import { assertAdminAccess } from "../../../modules/auth/service";
import { getAdminProductsPage } from "../../../modules/catalog/service";

export async function onQueryProducts(input: {
  name?: string;
  status?: string;
  categoryId?: number | null;
  page: number;
  pageSize: number;
}) {
  assertAdminAccess();
  return getAdminProductsPage(input);
}
