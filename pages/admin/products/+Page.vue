<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 class="text-2xl font-bold">商品管理</h1>
          <p class="text-sm text-base-content/70">管理商品价格、分类、排序、上下架状态和购买限制。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton href="/admin/products/sort" variant="outline" size="sm">快速排序</AppButton>
          <AppButton href="/admin/products/new" variant="primary" size="sm">新建商品</AppButton>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="filter.name"
          class="input input-sm input-bordered w-48"
          placeholder="商品名称"
          @keydown.enter.prevent="handleSearch"
        />
        <select v-model="filter.status" class="select select-sm select-bordered w-32">
          <option value="">全部状态</option>
          <option value="ACTIVE">上架</option>
          <option value="INACTIVE">下架</option>
          <option value="DRAFT">草稿</option>
        </select>
        <select v-model="filter.category" class="select select-sm select-bordered w-44">
          <option value="">全部分类</option>
          <option value="__uncategorized__">未分类</option>
          <option v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.name }}{{ category.status === "DISABLED" ? "（停用）" : "" }}
          </option>
        </select>
        <AppButton size="sm" variant="primary" @click="handleSearch">搜索</AppButton>
        <AppButton size="sm" variant="ghost" @click="handleReset">重置</AppButton>
      </div>

      <div
        v-if="quickMessage"
        class="rounded-lg border px-3 py-2 text-sm"
        :class="quickMessageType === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-error/30 bg-error/10 text-error'"
        :role="quickMessageType === 'error' ? 'alert' : 'status'"
        aria-live="polite"
      >
        {{ quickMessage }}
      </div>

      <DataTable
        class="product-admin-table"
        :columns="columns"
        :rows="pageData.items"
        :total="pageData.total"
        :page="currentPage"
        :page-size="PAGE_SIZE"
        row-key="id"
        empty-text="没有找到符合条件的商品。"
        @update:page="fetchPage"
      >
        <template #coverImage="{ row }">
          <img
            :src="row.coverImage || emptyCoverUrl"
            :alt="`${row.name}封面`"
            class="size-12 min-w-12 max-w-none rounded-lg border border-base-200 bg-base-200 object-cover"
            loading="lazy"
          />
        </template>
        <template #name="{ row }">
          <div class="max-w-110">
            <div class="font-medium leading-5">{{ row.name }}</div>
            <div class="mt-0.5 break-all text-xs text-base-content/55">{{ row.slug }}</div>
          </div>
        </template>
        <template #categoryName="{ row }">
          <select
            :value="row.categoryId == null ? '' : String(row.categoryId)"
            class="select select-xs select-bordered w-36"
            :disabled="categorySavingIds.has(row.id)"
            :aria-label="`修改 ${row.name} 的分类`"
            @change="handleCategoryChange(row, $event)"
          >
            <option value="" :selected="row.categoryId == null">未分类</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="String(category.id)"
              :selected="row.categoryId === category.id"
            >
              {{ category.name }}{{ category.status === "DISABLED" ? "（停用）" : "" }}
            </option>
          </select>
        </template>
        <template #sort="{ row }">
          <div class="flex items-center gap-1.5">
            <input
              v-model.number="row.sort"
              type="number"
              class="input input-xs input-bordered w-20 tabular-nums"
              :disabled="sortSavingIds.has(row.id)"
              :aria-label="`修改 ${row.name} 的排序值`"
              @focus="handleSortFocus(row)"
              @blur="handleSortCommit(row)"
              @keydown.enter.prevent="blurInput"
              @keydown.escape.prevent="handleSortEscape(row, $event)"
            />
            <span v-if="sortSavingIds.has(row.id)" class="loading loading-spinner loading-xs text-primary" aria-label="排序保存中"></span>
          </div>
        </template>
        <template #deliveryType="{ value }">
          <StatusTag :type="getDeliveryTypeTagType(value)" variant="pill">
            {{ getDeliveryTypeLabel(value) }}
          </StatusTag>
        </template>
        <template #price="{ value }">{{ formatCents(value) }}</template>
        <template #buy="{ row }">{{ row.minBuy }} - {{ row.maxBuy }}</template>
        <template #status="{ row }">
          <StatusTag :type="getProductStatusTagType(row.status)">
            {{ getProductStatusLabel(row.status) }}
          </StatusTag>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-2">
            <AppButton :href="`/admin/products/${row.id}/edit`" variant="outline" size="xs">编辑</AppButton>
            <AppButton size="xs" variant="danger" @click="handleDelete(row)">删除</AppButton>
          </div>
        </template>
      </DataTable>
    </div>
  </section>
  <ConfirmDialog ref="confirmRef" />
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { onUnmounted, reactive, ref, useTemplateRef } from "vue";
import AppButton from "../../../components/AppButton.vue";
import ConfirmDialog from "../../../components/ConfirmDialog.vue";
import DataTable from "../../../components/DataTable.vue";
import StatusTag from "../../../components/StatusTag.vue";
import { useData } from "vike-vue/useData";
import emptyCoverUrl from "../../../assets/empty.jpg";
import { formatCents } from "../../../lib/utils/money";
import { onDeleteProduct } from "./deleteProduct.telefunc";
import { onQueryProducts } from "./queryProducts.telefunc";
import { onUpdateProductCategory } from "./updateProductCategory.telefunc";
import { onUpdateProductSort } from "./updateProductSort.telefunc";
import type { Data } from "./+data";

const { products, total, categories } = useData<Data>();

const PAGE_SIZE = 20;
const currentPage = ref(1);
const pageData = ref({ items: [...products], total });
const filter = reactive({ name: "", status: "", category: "" });
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>("confirmRef");
const categorySavingIds = reactive(new Set<number>());
const sortSavingIds = reactive(new Set<number>());
const sortOriginals = new Map<number, number>();
const quickMessage = ref("");
const quickMessageType = ref<"success" | "error">("success");
let quickMessageTimer: ReturnType<typeof setTimeout> | undefined;

type ProductRow = (typeof products)[number];

const columns = [
  { key: "id", label: "ID" },
  { key: "coverImage", label: "封面" },
  { key: "name", label: "商品" },
  { key: "categoryName", label: "分类" },
  { key: "sort", label: "排序" },
  { key: "deliveryType", label: "发货方式" },
  { key: "price", label: "价格" },
  { key: "buy", label: "限购" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" },
];

function showQuickMessage(message: string, type: "success" | "error" = "success") {
  quickMessage.value = message;
  quickMessageType.value = type;
  if (quickMessageTimer) clearTimeout(quickMessageTimer);
  quickMessageTimer = setTimeout(() => {
    quickMessage.value = "";
  }, type === "success" ? 1800 : 4000);
}

function getCategoryFilterValue(): number | null | undefined {
  if (!filter.category) return undefined;
  if (filter.category === "__uncategorized__") return null;
  return Number(filter.category);
}

async function fetchPage(page: number) {
  try {
    const result = await onQueryProducts({
      name: filter.name || undefined,
      status: filter.status || undefined,
      categoryId: getCategoryFilterValue(),
      page,
      pageSize: PAGE_SIZE,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    if (page > totalPages) {
      await fetchPage(totalPages);
      return;
    }
    pageData.value = result;
    currentPage.value = page;
  } catch (error) {
    showQuickMessage(normalizeTelefuncError(error, "商品加载失败"), "error");
  }
}

async function handleSearch() {
  await fetchPage(1);
}

async function handleReset() {
  filter.name = "";
  filter.status = "";
  filter.category = "";
  await fetchPage(1);
}

async function handleCategoryChange(row: ProductRow, event: Event) {
  if (categorySavingIds.has(row.id)) return;
  const select = event.currentTarget as HTMLSelectElement;
  const previousCategoryId = row.categoryId ?? null;
  const previousCategoryName = row.categoryName ?? null;
  const categoryId = select.value ? Number(select.value) : null;
  if (categoryId === previousCategoryId) return;

  const selectedCategory = categories.find((category) => category.id === categoryId);
  row.categoryId = categoryId;
  row.categoryName = selectedCategory?.name ?? null;
  categorySavingIds.add(row.id);

  try {
    await onUpdateProductCategory({ id: row.id, categoryId });
    showQuickMessage("商品分类已更新");
    await fetchPage(currentPage.value);
  } catch (error) {
    row.categoryId = previousCategoryId;
    row.categoryName = previousCategoryName;
    showQuickMessage(normalizeTelefuncError(error, "分类保存失败"), "error");
  } finally {
    categorySavingIds.delete(row.id);
  }
}

function handleSortFocus(row: ProductRow) {
  if (!sortOriginals.has(row.id)) sortOriginals.set(row.id, row.sort);
}

function blurInput(event: KeyboardEvent) {
  (event.currentTarget as HTMLInputElement).blur();
}

function handleSortEscape(row: ProductRow, event: KeyboardEvent) {
  const previousSort = sortOriginals.get(row.id);
  if (previousSort !== undefined) row.sort = previousSort;
  sortOriginals.delete(row.id);
  (event.currentTarget as HTMLInputElement).blur();
}

async function handleSortCommit(row: ProductRow) {
  if (sortSavingIds.has(row.id)) return;
  const previousSort = sortOriginals.get(row.id) ?? row.sort;
  if (String(row.sort).trim() === "") {
    row.sort = previousSort;
    sortOriginals.delete(row.id);
    showQuickMessage("排序不能为空", "error");
    return;
  }
  const nextSort = Number(row.sort);

  if (!Number.isInteger(nextSort) || Math.abs(nextSort) > 1_000_000_000) {
    row.sort = previousSort;
    sortOriginals.delete(row.id);
    showQuickMessage("排序必须是有效整数", "error");
    return;
  }
  if (nextSort === previousSort) {
    sortOriginals.delete(row.id);
    return;
  }

  sortSavingIds.add(row.id);
  try {
    await onUpdateProductSort({ id: row.id, sort: nextSort });
    showQuickMessage("商品排序已更新");
    await fetchPage(currentPage.value);
  } catch (error) {
    row.sort = previousSort;
    showQuickMessage(normalizeTelefuncError(error, "排序保存失败"), "error");
  } finally {
    sortOriginals.delete(row.id);
    sortSavingIds.delete(row.id);
  }
}

async function handleDelete(product: ProductRow) {
  if (!await confirmRef.value?.confirm({ title: "删除商品", message: `确认删除商品“${product.name}”吗？`, confirmText: "删除", danger: true })) return;
  try {
    await onDeleteProduct({ id: product.id });
    await fetchPage(currentPage.value);
  } catch (error) {
    await confirmRef.value?.alert({ title: "错误", message: normalizeTelefuncError(error, "删除失败") });
  }
}

function getDeliveryTypeLabel(deliveryType: string) {
  switch (deliveryType) {
    case "CARD_AUTO": return "自动发货卡密";
    case "FIXED_CARD": return "固定内容自动发货";
    case "MANUAL": return "手动发货";
    default: return deliveryType;
  }
}

function getDeliveryTypeTagType(deliveryType: string): "primary" | "success" | "danger" | "warning" | "default" {
  switch (deliveryType) {
    case "CARD_AUTO": return "primary";
    case "FIXED_CARD": return "success";
    case "MANUAL": return "warning";
    default: return "default";
  }
}

function getProductStatusLabel(status: string) {
  if (status === "ACTIVE") return "上架";
  if (status === "DRAFT") return "草稿";
  return "下架";
}

function getProductStatusTagType(status: string): "success" | "warning" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "DRAFT") return "warning";
  return "default";
}

onUnmounted(() => {
  if (quickMessageTimer) clearTimeout(quickMessageTimer);
});
</script>

<style scoped>
.product-admin-table :deep(table) {
  min-width: 1120px;
}
</style>
