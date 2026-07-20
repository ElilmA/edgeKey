// @ts-nocheck -- Bun test types aren't part of the Worker production tsconfig.
import { describe, expect, it } from "bun:test";
import {
  assertCompleteProductOrder,
  normalizeAdminProductQueryInput,
  validateProductReorderIds,
} from "./admin-products";

describe("normalizeAdminProductQueryInput", () => {
  it("normalizes filters and pagination", () => {
    expect(normalizeAdminProductQueryInput({
      name: "  Claude   Pro  ",
      status: "ACTIVE",
      categoryId: 3,
      page: 2.9,
      pageSize: 999,
    })).toEqual({
      name: "Claude Pro",
      status: "ACTIVE",
      categoryId: 3,
      page: 2,
      pageSize: 100,
    });
  });

  it("preserves null as the uncategorized filter", () => {
    expect(normalizeAdminProductQueryInput({ categoryId: null, page: 1, pageSize: 20 })).toEqual({
      name: undefined,
      status: undefined,
      categoryId: null,
      page: 1,
      pageSize: 20,
    });
  });

  it("rejects invalid status and category identifiers", () => {
    expect(() => normalizeAdminProductQueryInput({ status: "BROKEN", page: 1, pageSize: 20 })).toThrow("商品状态筛选无效");
    expect(() => normalizeAdminProductQueryInput({ categoryId: 0, page: 1, pageSize: 20 })).toThrow("商品分类筛选无效");
  });
});

describe("product reorder validation", () => {
  it("accepts a complete unique positive ID list", () => {
    expect(validateProductReorderIds([7, 3, 9])).toEqual([7, 3, 9]);
    expect(() => assertCompleteProductOrder([7, 3, 9], [3, 7, 9])).not.toThrow();
  });

  it("rejects empty, duplicate, invalid, and oversized lists", () => {
    expect(() => validateProductReorderIds([])).toThrow("商品排序数据无效");
    expect(() => validateProductReorderIds([1, 1])).toThrow("重复 ID");
    expect(() => validateProductReorderIds([1, -2])).toThrow("正整数");
    expect(() => validateProductReorderIds(Array.from({ length: 2001 }, (_, index) => index + 1))).toThrow("商品排序数据无效");
  });

  it("rejects stale product collections", () => {
    expect(() => assertCompleteProductOrder([1, 2], [1, 2, 3])).toThrow("商品列表已发生变化");
    expect(() => assertCompleteProductOrder([1, 4, 3], [1, 2, 3])).toThrow("商品列表已发生变化");
  });
});
