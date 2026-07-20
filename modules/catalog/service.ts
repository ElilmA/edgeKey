import { getContext } from "telefunc";
import { pinyin } from "pinyin-pro";
import type { PrismaClient } from "../../generated/prisma/client";
import { badRequestError, conflictError, notFoundError } from "../../lib/app-error";
import { validateCategoryInput } from "../../lib/validators/category";
import { validateProductInput } from "../../lib/validators/product";
import { getAdminContext, logAdminOperation } from "../auth/service";
import { getAdminProductDetail, getProductDetailBySlug, listAdminCategories, listAdminProducts, listHomeCategories, listHomeProducts, queryAdminProducts } from "./queries";
import { deleteCategoryRecord, deleteProductRecord, updateCategoryStatus, updateProductCategoryRecord, updateProductSortRecord, upsertCategoryRecord, upsertProductRecord } from "./repository";
import { assertCompleteProductOrder, validateProductReorderIds, type AdminProductQueryInput } from "./admin-products";
import { bulkUpdateSortOrder } from "./reorder";

export async function getHomeCatalog(prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return {
    categories: await listHomeCategories(client),
    products: await listHomeProducts(client),
  };
}

function getCatalogContext() {
  return getContext<{ prisma: PrismaClient }>();
}

function slugify(input: string) {
  const pinyinStr = pinyin(input, { toneType: "none", nonZh: "consecutive" });
  return pinyinStr
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAdminCategories(prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return listAdminCategories(client);
}

export async function saveCategory(input: {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  sort?: number;
}) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const { name } = validateCategoryInput(input);

  const slug = slugify(input.slug?.trim() || name);
  if (!slug) {
    throw badRequestError("分类 slug 不能为空", "CATEGORY_SLUG_REQUIRED");
  }

  let record;
  try {
    record = await upsertCategoryRecord(prisma, {
      id: input.id,
      name,
      slug,
      description: input.description?.trim() || null,
      sort: Number.isFinite(input.sort) ? Number(input.sort) : 0,
    });
  } catch (e: any) {
    if (e?.code === "P2002") throw conflictError("分类名称或 Slug 已存在，请换一个", "CATEGORY_SLUG_CONFLICT");
    throw e;
  }

  await logAdminOperation(
    {
      action: input.id ? "UPDATE_CATEGORY" : "CREATE_CATEGORY",
      targetType: "Category",
      targetId: String(record.id),
      detail: `name=${record.name}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    sort: record.sort,
    status: record.status,
  };
}

export async function toggleCategoryStatus(input: { id: number; status: "ACTIVE" | "DISABLED" }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const record = await updateCategoryStatus(prisma, input.id, input.status);

  await logAdminOperation(
    {
      action: "TOGGLE_CATEGORY_STATUS",
      targetType: "Category",
      targetId: String(record.id),
      detail: `status=${record.status}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return {
    id: record.id,
    status: record.status,
  };
}

export async function deleteCategory(input: { id: number }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const category = await prisma.category.findUnique({
    where: { id: input.id },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw notFoundError("分类不存在", "CATEGORY_NOT_FOUND");
  }

  if (category._count.products > 0) {
    throw conflictError("分类下仍有关联商品，无法删除，请先调整这些商品", "CATEGORY_HAS_PRODUCTS");
  }

  await deleteCategoryRecord(prisma, input.id);

  await logAdminOperation(
    {
      action: "DELETE_CATEGORY",
      targetType: "Category",
      targetId: String(category.id),
      detail: `name=${category.name}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return {
    id: input.id,
  };
}

export async function getAdminProducts(prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return listAdminProducts(client);
}

export async function getAdminProductsPage(input: AdminProductQueryInput, prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return queryAdminProducts(client, input);
}

export async function updateProductCategory(input: { id: number; categoryId: number | null }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw badRequestError("商品 ID 无效", "PRODUCT_INVALID_ID");
  }
  if (input.categoryId !== null && (!Number.isInteger(input.categoryId) || input.categoryId <= 0)) {
    throw badRequestError("商品分类无效", "PRODUCT_INVALID_CATEGORY");
  }

  const product = await prisma.product.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!product) throw notFoundError("商品不存在", "PRODUCT_NOT_FOUND");

  if (input.categoryId !== null) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
    if (!category) throw notFoundError("商品分类不存在", "CATEGORY_NOT_FOUND");
  }

  const record = await updateProductCategoryRecord(prisma, input.id, input.categoryId);
  await logAdminOperation(
    {
      action: "UPDATE_PRODUCT_CATEGORY",
      targetType: "Product",
      targetId: String(record.id),
      detail: `categoryId=${record.categoryId ?? "null"}`,
    },
    { prisma, adminId },
  );

  return { id: record.id, categoryId: record.categoryId, categoryName: record.category?.name ?? null };
}

export async function updateProductSort(input: { id: number; sort: number }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw badRequestError("商品 ID 无效", "PRODUCT_INVALID_ID");
  }
  if (!Number.isInteger(input.sort) || Math.abs(input.sort) > 1_000_000_000) {
    throw badRequestError("商品排序值无效", "PRODUCT_INVALID_SORT");
  }

  const product = await prisma.product.findUnique({ where: { id: input.id }, select: { id: true } });
  if (!product) throw notFoundError("商品不存在", "PRODUCT_NOT_FOUND");

  const record = await updateProductSortRecord(prisma, input.id, input.sort);
  await logAdminOperation(
    {
      action: "UPDATE_PRODUCT_SORT",
      targetType: "Product",
      targetId: String(record.id),
      detail: `sort=${record.sort}`,
    },
    { prisma, adminId },
  );
  return { id: record.id, sort: record.sort };
}

export async function reorderProducts(input: { orderedIds: number[] }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const orderedIds = validateProductReorderIds(input.orderedIds);
  const existingProducts = await prisma.product.findMany({ select: { id: true } });
  assertCompleteProductOrder(orderedIds, existingProducts.map((product) => product.id));

  const updatedCount = await bulkUpdateSortOrder(prisma, "Product", orderedIds);
  if (updatedCount !== orderedIds.length) {
    throw conflictError("商品列表已发生变化，请刷新页面后重试", "PRODUCT_REORDER_STALE_LIST");
  }

  await logAdminOperation(
    {
      action: "REORDER_PRODUCTS",
      targetType: "Product",
      detail: `count=${orderedIds.length};head=${orderedIds.slice(0, 100).join(",")}`,
    },
    { prisma, adminId },
  );
  return orderedIds.map((id, sort) => ({ id, sort }));
}

export async function getAdminProductById(id: number, prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return getAdminProductDetail(client, id);
}

export async function getProductBySlug(slug: string, prisma?: PrismaClient) {
  const client = prisma ?? getCatalogContext().prisma;
  return getProductDetailBySlug(client, slug);
}

export async function saveProduct(input: {
  id?: number;
  categoryId?: number | null;
  name: string;
  slug?: string;
  subtitle?: string;
  coverImage?: string;
  description?: string;
  price: number;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  deliveryType?: "CARD_AUTO" | "FIXED_CARD" | "MANUAL" | "EXPRESS";
  fixedDeliveryContent?: string;
  manualDeliveryHint?: string;
  physicalStock?: number | null;
  minBuy: number;
  maxBuy: number;
  sort?: number;
  purchaseNote?: string;
}) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const { name, deliveryType, fixedDeliveryContent } = validateProductInput(input);

  const slug = slugify(input.slug?.trim() || name);
  if (!slug) {
    throw badRequestError("商品 slug 不能为空", "PRODUCT_SLUG_REQUIRED");
  }

  const minBuy = Number.isFinite(input.minBuy) ? Math.max(1, Math.floor(input.minBuy)) : 1;
  const maxBuy = Number.isFinite(input.maxBuy) ? Math.max(minBuy, Math.floor(input.maxBuy)) : minBuy;
  const stockMode = deliveryType === "CARD_AUTO" ? "FINITE" : "UNLIMITED";
  // 实物库存：只对 MANUAL 和 EXPRESS 类型有效
  const physicalStock = (deliveryType === "MANUAL" || deliveryType === "EXPRESS")
    ? (input.physicalStock != null && Number.isFinite(input.physicalStock) ? Math.max(0, Math.floor(input.physicalStock)) : null)
    : null;

  if (input.id) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
      select: {
        deliveryType: true,
        fixedDeliveryContent: true,
      },
    });

    if (!existingProduct) {
      throw notFoundError("商品不存在", "PRODUCT_NOT_FOUND");
    }

    const deliveryTypeChanged = existingProduct.deliveryType !== deliveryType;
    const fixedDeliveryContentChanged =
      (existingProduct.fixedDeliveryContent?.trim() || "") !==
      (deliveryType === "FIXED_CARD" ? fixedDeliveryContent : "");

    if (deliveryTypeChanged || fixedDeliveryContentChanged) {
      const processingOrder = await prisma.order.findFirst({
        where: {
          productId: input.id,
          OR: [
            {
              paymentStatus: "UNPAID",
              status: { not: "CLOSED" },
            },
            {
              paymentStatus: "PAID",
              deliveryStatus: { not: "DELIVERED" },
            },
          ],
        },
        orderBy: { id: "desc" },
        select: { orderNo: true },
      });

      if (processingOrder) {
        throw conflictError(
          `订单 ${processingOrder.orderNo} 处于处理中状态，发货配置已锁定。如需变更，请先关闭该订单。`,
          "PRODUCT_DELIVERY_CONFIG_LOCKED",
        );
      }
    }
  }

  const record = await upsertProductRecord(prisma, {
    id: input.id,
    categoryId: input.categoryId ?? null,
    name,
    slug,
    subtitle: input.subtitle?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    description: input.description?.trim() || null,
    price: Math.floor(input.price),
    status: input.status,
    deliveryType,
    fixedDeliveryContent: deliveryType === "FIXED_CARD" ? fixedDeliveryContent : null,
    manualDeliveryHint: (deliveryType === "MANUAL" || deliveryType === "EXPRESS") ? input.manualDeliveryHint?.trim() || null : null,
    stockMode,
    physicalStock,
    minBuy,
    maxBuy,
    sort: Number.isFinite(input.sort) ? Math.floor(input.sort ?? 0) : 0,
    purchaseNote: input.purchaseNote?.trim() || null,
  });

  await logAdminOperation(
    {
      action: input.id ? "UPDATE_PRODUCT" : "CREATE_PRODUCT",
      targetType: "Product",
      targetId: String(record.id),
      detail: `name=${record.name}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return {
    id: record.id,
    categoryId: record.categoryId,
    categoryName: record.category?.name ?? null,
    name: record.name,
    slug: record.slug,
    subtitle: record.subtitle,
    coverImage: record.coverImage,
    description: record.description,
    price: record.price,
    status: record.status,
    deliveryType: record.deliveryType,
    fixedDeliveryContent: record.fixedDeliveryContent,
    manualDeliveryHint: record.manualDeliveryHint,
    stockMode: record.stockMode,
    physicalStock: record.physicalStock,
    minBuy: record.minBuy,
    maxBuy: record.maxBuy,
    sort: record.sort,
    purchaseNote: record.purchaseNote,
  };
}

export async function deleteProduct(input: { id: number }) {
  const adminContext = getAdminContext();
  const { prisma } = adminContext;
  const adminId = Number(adminContext.session?.user?.id);
  const product = await prisma.product.findUnique({
    where: { id: input.id },
    include: {
      _count: {
        select: {
          cards: true,
          orders: true,
        },
      },
    },
  });

  if (!product) {
    throw notFoundError("商品不存在", "PRODUCT_NOT_FOUND");
  }

  if (product._count.orders > 0) {
    throw conflictError("商品已有订单记录，不能删除。你可以将商品下架。", "PRODUCT_HAS_ORDERS");
  }

  if (product._count.cards > 0) {
    throw conflictError("商品仍有关联卡密库存，无法删除，请先清空库存", "PRODUCT_HAS_CARDS");
  }

  await deleteProductRecord(prisma, input.id);

  await logAdminOperation(
    {
      action: "DELETE_PRODUCT",
      targetType: "Product",
      targetId: String(product.id),
      detail: `name=${product.name}`,
    },
    {
      prisma,
      adminId,
    },
  );

  return {
    id: input.id,
  };
}
