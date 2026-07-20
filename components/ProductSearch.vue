<template>
  <div ref="rootRef" class="relative w-full max-w-md">
    <form role="search" @submit.prevent="submitSearch">
      <label :for="inputId" class="sr-only">搜索商品</label>
      <div class="relative">
        <svg
          class="pointer-events-none absolute left-3.5 top-1/2 z-10 size-[18px] -translate-y-1/2 text-primary"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.25"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>

        <input
          :id="inputId"
          ref="inputRef"
          v-model="query"
          type="search"
          maxlength="64"
          autocomplete="off"
          spellcheck="false"
          placeholder="搜索商品名称或分类"
          class="product-search-input input input-bordered h-10 w-full rounded-xl border-base-300 bg-base-100 pl-11 pr-10 text-sm shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="showDropdown"
          :aria-controls="listboxId"
          :aria-activedescendant="activeDescendant"
          @focus="handleFocus"
          @keydown="handleKeydown"
        />

        <span
          v-if="loading && query.trim()"
          class="loading loading-spinner loading-xs pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
          aria-label="正在搜索"
        ></span>
        <button
          v-else-if="query"
          type="button"
          class="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-base-content/40 transition hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="清空商品搜索"
          @click="clearQuery"
        >
          <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.47 5.47a.75.75 0 0 1 1.06 0L10 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06L11.06 10l3.47 3.47a.75.75 0 1 1-1.06 1.06L10 11.06l-3.47 3.47a.75.75 0 0 1-1.06-1.06L8.94 10 5.47 6.53a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>
    </form>

    <div
      v-if="showDropdown"
      :id="listboxId"
      class="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl shadow-base-content/10"
    >
      <div v-if="loading" class="flex items-center gap-2 px-4 py-4 text-sm text-base-content/55" role="status">
        <span class="loading loading-spinner loading-xs"></span>
        正在搜索商品...
      </div>

      <div v-else-if="errorMessage" class="px-4 py-4 text-sm text-error" role="alert">
        {{ errorMessage }}
      </div>

      <ul v-else-if="results.length" role="listbox" class="m-0 max-h-96 list-none overflow-y-auto p-1">
        <li v-for="(product, index) in results" :key="product.id" role="presentation">
          <a
            :id="`${listboxId}-${product.id}`"
            :href="`/product/${product.slug}`"
            role="option"
            :aria-selected="selectedIndex === index"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base-content transition hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            :class="selectedIndex === index ? 'bg-base-200' : ''"
            @mouseenter="selectedIndex = index"
            @click.prevent="goToProduct(product.slug)"
          >
            <img
              :src="product.coverImage || emptyCoverUrl"
              :alt="product.name"
              class="size-11 shrink-0 rounded-lg bg-base-200 object-cover"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ product.name }}</span>
              <span class="mt-0.5 block truncate text-xs text-base-content/50">
                {{ product.subtitle || product.categoryName || "数字商品" }}
              </span>
            </span>
            <span class="shrink-0 text-sm font-bold text-red-500">{{ formatCents(product.price) }}</span>
          </a>
        </li>
      </ul>

      <div v-else-if="hasSearched" class="px-4 py-5 text-center" role="status">
        <div class="text-sm font-medium text-base-content/65">没有找到相关商品</div>
        <a href="/" class="mt-1 inline-block text-xs font-medium text-primary hover:underline">查看全部商品</a>
      </div>

      <button
        v-if="!loading && !errorMessage && total > results.length"
        type="button"
        class="flex w-full items-center justify-center border-t border-base-200 px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-base-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25"
        @click="goToSearchPage"
      >
        查看全部 {{ total }} 个结果
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { navigate } from "vike/client/router";
import emptyCoverUrl from "../assets/empty.jpg";
import { formatCents } from "../lib/utils/money";
import type { ProductSummary } from "../modules/catalog/types";
import { onSearchProducts } from "../pages/search/searchProducts.telefunc";

const emit = defineEmits<{
  requestClose: [];
}>();

const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const inputId = `product-search-${id}`;
const listboxId = `product-search-list-${id}`;
const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const query = ref("");
const results = ref<ProductSummary[]>([]);
const total = ref(0);
const loading = ref(false);
const hasSearched = ref(false);
const errorMessage = ref("");
const selectedIndex = ref(-1);
const dropdownOpen = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let requestSequence = 0;
let suppressNextDropdown = false;
let suppressNextSearch = false;

const showDropdown = computed(() => dropdownOpen.value && Boolean(query.value.trim()));
const activeDescendant = computed(() => {
  const product = results.value[selectedIndex.value];
  return product ? `${listboxId}-${product.id}` : undefined;
});

function normalizedQuery() {
  return query.value.trim().replace(/\s+/g, " ").slice(0, 64).trim();
}

watch(query, (value) => {
  requestSequence += 1;
  selectedIndex.value = -1;
  errorMessage.value = "";
  hasSearched.value = false;
  results.value = [];
  total.value = 0;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (!value.trim()) {
    loading.value = false;
    dropdownOpen.value = false;
    return;
  }

  if (suppressNextDropdown) {
    suppressNextDropdown = false;
  } else {
    dropdownOpen.value = true;
  }

  if (suppressNextSearch) {
    suppressNextSearch = false;
    loading.value = false;
    return;
  }

  loading.value = true;
  const sequence = requestSequence;
  debounceTimer = setTimeout(() => runSearch(value, sequence), 250);
});

async function runSearch(value: string, sequence: number) {
  debounceTimer = null;
  try {
    const result = await onSearchProducts({ query: value, skip: 0, take: 6 });
    if (sequence !== requestSequence) return;

    results.value = result.items;
    total.value = result.total;
    hasSearched.value = true;
  } catch {
    if (sequence !== requestSequence) return;
    errorMessage.value = "搜索失败，请稍后重试";
  } finally {
    if (sequence === requestSequence) {
      loading.value = false;
    }
  }
}

function handleFocus() {
  if (query.value.trim()) {
    dropdownOpen.value = true;
    if (!loading.value && !hasSearched.value && !debounceTimer) {
      requestSequence += 1;
      loading.value = true;
      const sequence = requestSequence;
      debounceTimer = setTimeout(() => runSearch(query.value, sequence), 250);
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!results.value.length) return;
    dropdownOpen.value = true;
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!results.value.length) return;
    dropdownOpen.value = true;
    selectedIndex.value = selectedIndex.value <= 0 ? results.value.length - 1 : selectedIndex.value - 1;
    return;
  }

  if (event.key === "Enter" && selectedIndex.value >= 0) {
    event.preventDefault();
    const product = results.value[selectedIndex.value];
    if (product) goToProduct(product.slug);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    dropdownOpen.value = false;
    selectedIndex.value = -1;
    emit("requestClose");
  }
}

function submitSearch() {
  if (selectedIndex.value >= 0) {
    const product = results.value[selectedIndex.value];
    if (product) {
      goToProduct(product.slug);
      return;
    }
  }

  goToSearchPage();
}

function goToProduct(slug: string) {
  dropdownOpen.value = false;
  emit("requestClose");
  void navigate(`/product/${encodeURIComponent(slug)}`);
}

function goToSearchPage() {
  const value = normalizedQuery();
  if (!value) {
    focus();
    return;
  }

  dropdownOpen.value = false;
  selectedIndex.value = -1;
  window.location.href = `/search?q=${encodeURIComponent(value)}`;
}

function clearQuery() {
  query.value = "";
  void nextTick(focus);
}

function focus() {
  inputRef.value?.focus();
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!rootRef.value?.contains(event.target as Node)) {
    dropdownOpen.value = false;
    selectedIndex.value = -1;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  if (window.location.pathname === "/search") {
    const initialQuery = new URLSearchParams(window.location.search).get("q")?.slice(0, 64) ?? "";
    if (initialQuery) {
      suppressNextDropdown = true;
      suppressNextSearch = true;
      query.value = initialQuery;
    }
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  if (debounceTimer) clearTimeout(debounceTimer);
  requestSequence += 1;
});

defineExpose({ focus });
</script>

<style scoped>
.product-search-input::-webkit-search-cancel-button {
  display: none;
}
</style>
