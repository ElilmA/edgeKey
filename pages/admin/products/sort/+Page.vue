<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">商品快速排序</h1>
          <p class="text-sm text-base-content/70">拖动商品或直接输入目标位置，全部调整完成后一次保存。</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="dirty" class="badge badge-warning badge-outline">有未保存修改</span>
          <AppButton variant="ghost" size="sm" :disabled="saving" @click="handleBack">返回商品管理</AppButton>
          <AppButton variant="primary" size="sm" :loading="saving" :disabled="!dirty" @click="handleSave">
            保存排序
          </AppButton>
        </div>
      </div>

      <div class="flex flex-col items-stretch gap-3 rounded-xl border border-base-200 bg-base-200/40 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <input
              v-model="locatorQuery"
              class="input input-sm input-bordered min-w-0 flex-1 bg-base-100 lg:max-w-80"
              placeholder="输入商品名称或 Slug 快速定位"
              @keydown.enter.prevent="locateProduct"
            />
            <AppButton variant="outline" size="sm" @click="locateProduct">定位</AppButton>
          </div>
          <span class="whitespace-nowrap text-xs text-base-content/55">共 {{ productList.length }} 件商品</span>
        </div>
        <div class="text-xs text-base-content/55 lg:text-right">
          当前第 1 行保存后为 sort=0，后续依次递增。
        </div>
      </div>

      <div
        v-if="sortMessage || sortErrorMessage"
        class="rounded-lg border px-3 py-2 text-sm"
        :class="sortErrorMessage ? 'border-error/30 bg-error/10 text-error' : 'border-success/30 bg-success/10 text-success'"
        :role="sortErrorMessage ? 'alert' : 'status'"
        aria-live="polite"
      >
        {{ sortErrorMessage || sortMessage }}
      </div>

      <div
        ref="sortScrollRef"
        class="product-sort-scroll overflow-auto rounded-xl border border-base-300"
        @dragover.prevent="handleScrollDragOver"
        @dragleave="handleScrollDragLeave"
      >
        <table class="product-sort-table table table-zebra table-sm w-full">
          <thead class="sticky top-0 z-20 bg-base-200">
            <tr>
              <th class="w-12 text-center"><span class="sr-only">拖动排序</span></th>
              <th class="w-24">位置</th>
              <th>商品</th>
              <th>分类</th>
              <th class="w-24">原排序</th>
              <th class="w-48">快速移动</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!productList.length">
              <td colspan="6" class="py-8 text-center text-base-content/60">当前还没有商品。</td>
            </tr>
            <tr
              v-for="(row, index) in productList"
              :key="row.id"
              :ref="(element) => setRowRef(row.id, element)"
              class="product-sort-row"
              :class="{
                'is-dragging': draggingId === row.id,
                'is-drop-before': dragOverId === row.id && dropPosition === 'before' && draggingId !== row.id,
                'is-drop-after': dragOverId === row.id && dropPosition === 'after' && draggingId !== row.id,
                'is-highlighted': highlightedId === row.id,
              }"
              @dragover.prevent="handleDragOver($event, row.id)"
              @drop.prevent="handleDrop(row.id)"
            >
              <td class="text-center">
                <button
                  type="button"
                  class="drag-handle btn btn-ghost btn-xs px-1 text-base-content/45 hover:text-primary"
                  :draggable="!saving"
                  :disabled="saving"
                  :aria-label="`拖动调整 ${row.name} 的排序`"
                  :title="`拖动调整 ${row.name} 的排序`"
                  @dragstart="handleDragStart($event, row.id)"
                  @dragend="resetDragState"
                  @keydown.up.prevent="moveByOffset(row.id, -1)"
                  @keydown.down.prevent="moveByOffset(row.id, 1)"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
                    <path d="M7 4.75A1.25 1.25 0 1 1 4.5 4.75 1.25 1.25 0 0 1 7 4.75Zm0 5A1.25 1.25 0 1 1 4.5 9.75 1.25 1.25 0 0 1 7 9.75Zm-1.25 6.25A1.25 1.25 0 1 0 5.75 13.5a1.25 1.25 0 0 0 0 2.5ZM15.5 4.75A1.25 1.25 0 1 1 13 4.75a1.25 1.25 0 0 1 2.5 0Zm-1.25 6.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm1.25 3.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
                  </svg>
                </button>
              </td>
              <td>
                <input
                  :value="index + 1"
                  type="number"
                  min="1"
                  :max="productList.length"
                  class="input input-xs input-bordered w-20 tabular-nums"
                  :disabled="saving"
                  :aria-label="`将 ${row.name} 移动到目标位置`"
                  @change="handlePositionChange(row.id, $event)"
                  @keydown.enter.prevent="blurPositionInput"
                />
              </td>
              <td>
                <div class="flex min-w-64 items-center gap-3">
                  <img
                    :src="row.coverImage || emptyCoverUrl"
                    :alt="`${row.name}封面`"
                    class="size-11 shrink-0 rounded-lg border border-base-200 bg-base-200 object-cover"
                    loading="lazy"
                  />
                  <div class="min-w-0">
                    <div class="truncate font-medium" :title="row.name">{{ row.name }}</div>
                    <div class="max-w-120 truncate text-xs text-base-content/50" :title="row.slug">{{ row.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap">{{ row.categoryName || "未分类" }}</td>
              <td class="tabular-nums text-base-content/65">{{ row.sort }}</td>
              <td>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs px-2"
                    :disabled="saving || index === 0"
                    :aria-label="`置顶 ${row.name}`"
                    title="置顶"
                    @click="moveToPosition(row.id, 1)"
                  >
                    ⇡
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs px-2"
                    :disabled="saving || index === 0"
                    :aria-label="`上移 ${row.name}`"
                    title="上移"
                    @click="moveByOffset(row.id, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs px-2"
                    :disabled="saving || index === productList.length - 1"
                    :aria-label="`下移 ${row.name}`"
                    title="下移"
                    @click="moveByOffset(row.id, 1)"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs px-2"
                    :disabled="saving || index === productList.length - 1"
                    :aria-label="`置底 ${row.name}`"
                    title="置底"
                    @click="moveToPosition(row.id, productList.length)"
                  >
                    ⇣
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4">
        <p class="text-xs text-base-content/55">排序修改不会自动写入数据库，点击“保存排序”后才会生效。</p>
        <div class="flex gap-2">
          <AppButton variant="ghost" size="sm" :disabled="saving" @click="handleBack">放弃并返回</AppButton>
          <AppButton variant="primary" size="sm" :loading="saving" :disabled="!dirty" @click="handleSave">保存排序</AppButton>
        </div>
      </div>
    </div>
  </section>

  <ConfirmDialog ref="confirmRef" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, type ComponentPublicInstance } from "vue";
import { normalizeTelefuncError } from "../../../../lib/app-error";
import AppButton from "../../../../components/AppButton.vue";
import ConfirmDialog from "../../../../components/ConfirmDialog.vue";
import emptyCoverUrl from "../../../../assets/empty.jpg";
import { useData } from "vike-vue/useData";
import type { Data } from "./+data";
import { getDragAutoScrollSpeed } from "./autoScroll";
import { moveItemByOffset, moveItemToIndex } from "./order";
import { onReorderProducts } from "./reorderProducts.telefunc";

const { products } = useData<Data>();
const productList = ref(products.map((product) => ({ ...product })));
const originalOrder = ref(products.map((product) => product.id));
const saving = ref(false);
const sortMessage = ref("");
const sortErrorMessage = ref("");
const locatorQuery = ref("");
const highlightedId = ref<number | null>(null);
const draggingId = ref<number | null>(null);
const dragOverId = ref<number | null>(null);
const dropPosition = ref<"before" | "after" | null>(null);
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>("confirmRef");
const sortScrollRef = useTemplateRef<HTMLElement>("sortScrollRef");
const rowRefs = new Map<number, HTMLElement>();
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
let messageTimer: ReturnType<typeof setTimeout> | undefined;
let autoScrollFrame: number | undefined;
let dragPointerY: number | null = null;
let lastLocatorQuery = "";
let lastLocatorOffset = -1;

const dirty = computed(() => {
  if (productList.value.length !== originalOrder.value.length) return true;
  return productList.value.some((product, index) => product.id !== originalOrder.value[index]);
});

function setRowRef(id: number, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) rowRefs.set(id, element);
  else rowRefs.delete(id);
}

function markChanged() {
  sortMessage.value = "";
  sortErrorMessage.value = "";
}

function moveToPosition(id: number, position: number) {
  if (saving.value) return;
  productList.value = moveItemToIndex(productList.value, id, position);
  markChanged();
}

function moveByOffset(id: number, offset: -1 | 1) {
  if (saving.value) return;
  productList.value = moveItemByOffset(productList.value, id, offset);
  markChanged();
}

function handlePositionChange(id: number, event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const currentPosition = productList.value.findIndex((item) => item.id === id) + 1;
  if (!input.value.trim()) {
    input.value = String(currentPosition);
    sortErrorMessage.value = "目标位置不能为空";
    return;
  }
  const position = Number(input.value);
  if (!Number.isInteger(position)) {
    input.value = String(currentPosition);
    sortErrorMessage.value = "目标位置必须是整数";
    return;
  }
  moveToPosition(id, position);
}

function blurPositionInput(event: KeyboardEvent) {
  (event.currentTarget as HTMLInputElement).blur();
}

function resetDragState() {
  stopAutoScroll();
  draggingId.value = null;
  dragOverId.value = null;
  dropPosition.value = null;
}

function stopAutoScroll() {
  dragPointerY = null;
  if (autoScrollFrame !== undefined) {
    cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = undefined;
  }
}

function runAutoScroll() {
  autoScrollFrame = undefined;
  const container = sortScrollRef.value;
  if (!container || draggingId.value === null || dragPointerY === null || saving.value) return;

  const rect = container.getBoundingClientRect();
  const speed = getDragAutoScrollSpeed({
    pointerY: dragPointerY,
    containerTop: rect.top,
    containerBottom: rect.bottom,
  });
  if (speed === 0) return;

  const previousScrollTop = container.scrollTop;
  container.scrollTop += speed;
  if (container.scrollTop !== previousScrollTop) {
    autoScrollFrame = requestAnimationFrame(runAutoScroll);
  }
}

function handleScrollDragOver(event: DragEvent) {
  if (draggingId.value === null || saving.value) {
    stopAutoScroll();
    return;
  }
  dragPointerY = event.clientY;
  if (autoScrollFrame === undefined) autoScrollFrame = requestAnimationFrame(runAutoScroll);
}

function handleScrollDragLeave(event: DragEvent) {
  const container = sortScrollRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    stopAutoScroll();
  }
}

function handleDragStart(event: DragEvent, id: number) {
  if (saving.value) {
    event.preventDefault();
    return;
  }
  draggingId.value = id;
  event.dataTransfer?.setData("text/plain", String(id));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    const row = (event.currentTarget as HTMLElement | null)?.closest("tr");
    if (row) event.dataTransfer.setDragImage(row, 24, row.getBoundingClientRect().height / 2);
  }
}

function handleDragOver(event: DragEvent, targetId: number) {
  if (draggingId.value === null || saving.value) return;
  const row = event.currentTarget as HTMLElement;
  const rect = row.getBoundingClientRect();
  dragOverId.value = targetId;
  dropPosition.value = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function handleDrop(targetId: number) {
  const sourceId = draggingId.value;
  const position = dropPosition.value;
  resetDragState();
  if (sourceId === null || position === null || sourceId === targetId || saving.value) return;

  const sourceIndex = productList.value.findIndex((item) => item.id === sourceId);
  const targetIndex = productList.value.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;

  const nextList = [...productList.value];
  const [moved] = nextList.splice(sourceIndex, 1);
  let insertIndex = targetIndex + (position === "after" ? 1 : 0);
  if (sourceIndex < insertIndex) insertIndex -= 1;
  nextList.splice(insertIndex, 0, moved);
  productList.value = nextList;
  markChanged();
}

function locateProduct() {
  const query = locatorQuery.value.trim().toLocaleLowerCase();
  if (!query) {
    sortErrorMessage.value = "请输入要定位的商品名称或 Slug";
    return;
  }

  const matches = productList.value.filter((product) =>
    product.name.toLocaleLowerCase().includes(query) || product.slug.toLocaleLowerCase().includes(query),
  );
  if (!matches.length) {
    sortErrorMessage.value = "没有找到匹配的商品";
    return;
  }

  lastLocatorOffset = lastLocatorQuery === query ? (lastLocatorOffset + 1) % matches.length : 0;
  lastLocatorQuery = query;
  const product = matches[lastLocatorOffset];
  highlightedId.value = product.id;
  sortErrorMessage.value = "";
  sortMessage.value = matches.length > 1 ? `已定位第 ${lastLocatorOffset + 1}/${matches.length} 个匹配商品` : "已定位商品";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  rowRefs.get(product.id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightedId.value = null;
  }, 1800);
}

async function handleSave() {
  if (!dirty.value || saving.value) return;
  saving.value = true;
  sortMessage.value = "排序保存中...";
  sortErrorMessage.value = "";
  if (messageTimer) clearTimeout(messageTimer);

  try {
    const result = await onReorderProducts({ orderedIds: productList.value.map((product) => product.id) });
    const sortById = new Map(result.map((item) => [item.id, item.sort]));
    productList.value = productList.value.map((product) => ({
      ...product,
      sort: sortById.get(product.id) ?? product.sort,
    }));
    originalOrder.value = productList.value.map((product) => product.id);
    sortMessage.value = "排序已保存";
    messageTimer = setTimeout(() => {
      sortMessage.value = "";
    }, 2000);
  } catch (error) {
    sortMessage.value = "";
    sortErrorMessage.value = normalizeTelefuncError(error, "排序保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleBack() {
  if (dirty.value) {
    const confirmed = await confirmRef.value?.confirm({
      title: "放弃排序修改",
      message: "当前排序尚未保存，确认放弃修改并返回商品管理吗？",
      confirmText: "放弃修改",
      danger: true,
    });
    if (!confirmed) return;
  }
  window.location.href = "/admin/products";
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  stopAutoScroll();
  if (highlightTimer) clearTimeout(highlightTimer);
  if (messageTimer) clearTimeout(messageTimer);
});
</script>

<style scoped>
.product-sort-scroll {
  min-height: 24rem;
  max-height: calc(100vh - 20rem);
}

.product-sort-table {
  min-width: 850px;
}

.product-sort-row {
  transition: opacity 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
}

.product-sort-row.is-dragging {
  opacity: 0.45;
  background-color: color-mix(in oklab, var(--color-primary) 8%, transparent);
}

.product-sort-row.is-drop-before {
  box-shadow: inset 0 3px 0 var(--color-primary);
}

.product-sort-row.is-drop-after {
  box-shadow: inset 0 -3px 0 var(--color-primary);
}

.product-sort-row.is-highlighted {
  animation: product-row-highlight 1.8s ease-out;
  background-color: color-mix(in oklab, var(--color-warning) 20%, transparent);
}

.drag-handle {
  cursor: grab;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

@keyframes product-row-highlight {
  0%, 35% { box-shadow: inset 0 0 0 2px var(--color-warning); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
}

@media (max-width: 48rem) {
  .product-sort-scroll {
    max-height: calc(100vh - 23rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-sort-row {
    transition: none;
  }

  .product-sort-row.is-highlighted {
    animation: none;
  }
}
</style>
