<template>
  <div class="space-y-7">
    <section>
      <h1 class="mb-2 text-3xl font-bold text-base-content">商品搜索</h1>
      <div v-if="query" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/55">
        <span>关键词“<strong class="font-semibold text-base-content">{{ query }}</strong>”</span>
        <span aria-hidden="true">·</span>
        <span>共 {{ total }} 个结果</span>
      </div>
      <p v-else class="m-0 text-sm text-base-content/55">请使用页头搜索框输入商品名称或分类。</p>
    </section>

    <section
      v-if="!query"
      class="rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-6 py-14 text-center"
    >
      <svg class="mx-auto size-11 text-base-content/25" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.767l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd" />
      </svg>
      <h2 class="mt-3 text-base font-semibold text-base-content/70">输入关键词开始搜索</h2>
      <p class="mt-1 text-sm text-base-content/45">可以搜索商品名称、副标题或所属分类</p>
    </section>

    <template v-else>
      <div v-if="products.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>

      <section
        v-else
        class="rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-6 py-14 text-center"
        role="status"
      >
        <svg class="mx-auto size-11 text-base-content/25" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.767l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd" />
        </svg>
        <h2 class="mt-3 text-base font-semibold text-base-content/70">没有找到相关商品</h2>
        <p class="mt-1 text-sm text-base-content/45">试试更短的关键词，或者返回首页浏览全部商品。</p>
        <AppButton href="/" variant="outline" size="sm" class="mt-4">浏览全部商品</AppButton>
      </section>

      <div v-if="products.length" class="flex flex-col items-center gap-2 pt-2" aria-live="polite">
        <AppButton
          v-if="hasMore"
          variant="outline"
          :loading="loadingMore"
          :disabled="loadingMore"
          @click="loadMore"
        >
          加载更多
        </AppButton>
        <span v-else class="text-sm text-base-content/40">已显示全部搜索结果</span>
        <span v-if="loadMoreError" class="text-sm text-error">{{ loadMoreError }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useData } from "vike-vue/useData";
import AppButton from "../../components/AppButton.vue";
import ProductCard from "../../components/ProductCard.vue";
import type { ProductSummary } from "../../modules/catalog/types";
import type { Data } from "./+data";
import { onSearchProducts } from "./searchProducts.telefunc";

const initialData = useData<Data>();
const query = initialData.query;
const products = ref<ProductSummary[]>([...initialData.products]);
const total = ref(initialData.total);
const loadingMore = ref(false);
const loadMoreError = ref("");
const hasMore = computed(() => products.value.length < total.value);
let robotsMeta: HTMLMetaElement | null = null;

onMounted(() => {
  robotsMeta = document.head.querySelector<HTMLMetaElement>("meta[data-edgekey-search-robots]");
  if (!robotsMeta) {
    robotsMeta = document.createElement("meta");
    robotsMeta.dataset.edgekeySearchRobots = "";
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex,follow";
    document.head.appendChild(robotsMeta);
  }
});

onUnmounted(() => {
  robotsMeta?.remove();
  robotsMeta = null;
});

async function loadMore() {
  if (!query || loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  loadMoreError.value = "";
  try {
    const result = await onSearchProducts({
      query,
      skip: products.value.length,
      take: 24,
    });
    products.value.push(...result.items);
    total.value = result.total;
  } catch {
    loadMoreError.value = "加载失败，请稍后重试";
  } finally {
    loadingMore.value = false;
  }
}
</script>
