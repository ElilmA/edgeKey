import { badRequestError, conflictError } from "../../lib/app-error";

export type AdminProductStatusFilter = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface AdminProductQueryInput {
  name?: string;
  status?: string;
  categoryId?: number | null;
  page: number;
  pageSize: number;
}

export interface NormalizedAdminProductQueryInput {
  name?: string;
  status?: AdminProductStatusFilter;
  categoryId?: number | null;
  page: number;
  pageSize: number;
}

const PRODUCT_STATUSES = new Set<AdminProductStatusFilter>(["ACTIVE", "INACTIVE", "DRAFT"]);

export function normalizeAdminProductQueryInput(input: AdminProductQueryInput): NormalizedAdminProductQueryInput {
  const normalizedName = input.name?.trim().replace(/\s+/g, " ").slice(0, 64).trim() || undefined;
  const status = input.status || undefined;

  if (status && !PRODUCT_STATUSES.has(status as AdminProductStatusFilter)) {
    throw badRequestError("商品状态筛选无效", "PRODUCT_QUERY_INVALID_STATUS");
  }

  if (
    input.categoryId !== undefined &&
    input.categoryId !== null &&
    (!Number.isInteger(input.categoryId) || input.categoryId <= 0)
  ) {
    throw badRequestError("商品分类筛选无效", "PRODUCT_QUERY_INVALID_CATEGORY");
  }

  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
  const pageSize = Number.isFinite(input.pageSize)
    ? Math.min(100, Math.max(1, Math.floor(input.pageSize)))
    : 20;

  return {
    name: normalizedName,
    status: status as AdminProductStatusFilter | undefined,
    categoryId: input.categoryId,
    page,
    pageSize,
  };
}

export function validateProductReorderIds(input: unknown): number[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 2000) {
    throw badRequestError("商品排序数据无效", "PRODUCT_REORDER_INVALID");
  }

  if (input.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw badRequestError("商品 ID 必须为正整数", "PRODUCT_REORDER_INVALID_ID");
  }

  const orderedIds = input as number[];
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw badRequestError("商品排序中存在重复 ID", "PRODUCT_REORDER_DUPLICATE_ID");
  }

  return orderedIds;
}

export function assertCompleteProductOrder(orderedIds: number[], existingIds: number[]) {
  const existingIdSet = new Set(existingIds);
  if (
    existingIdSet.size !== orderedIds.length ||
    orderedIds.some((id) => !existingIdSet.has(id))
  ) {
    throw conflictError("商品列表已发生变化，请刷新页面后重试", "PRODUCT_REORDER_STALE_LIST");
  }
}
