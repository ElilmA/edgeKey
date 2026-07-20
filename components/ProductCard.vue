<template>
  <a
    :href="`/product/${product.slug}`"
    :aria-label="`查看商品：${product.name}`"
    class="holo-product-card card group overflow-hidden rounded-xl border-transparent bg-base-100 text-base-content shadow-sm transition-all duration-300 hover:text-base-content hover:shadow-xl hover:shadow-base-content/8 focus-visible:outline-none"
  >
    <figure class="relative aspect-square overflow-hidden bg-base-200">
      <img
        :src="product.coverImage || emptyCoverUrl"
        :alt="product.name"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />
      <div class="absolute left-3 top-3">
        <span class="badge badge-sm rounded-md border-0 bg-base-100/85 font-medium text-base-content shadow-sm backdrop-blur-sm">
          {{ product.categoryName || "默认" }}
        </span>
      </div>
    </figure>

    <div class="card-body gap-2.5 p-4">
      <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-base-content">
        {{ product.name }}
      </h3>

      <div class="mt-auto flex items-end justify-between">
        <span
          v-if="product.deliveryType === 'CARD_AUTO'"
          class="rounded px-2 py-0.5 text-xs font-semibold"
          :class="{
            'bg-amber-500/10 text-amber-600': lowStock,
            'bg-emerald-500/10 text-emerald-600': !lowStock && product.availableStock > 0,
            'bg-red-50 text-red-500': product.availableStock === 0,
          }"
        >
          {{ product.availableStock === 0 ? "已售罄" : lowStock ? `紧张(${product.availableStock})` : "有货" }}
        </span>
        <span
          v-else-if="product.deliveryType === 'FIXED_CARD'"
          class="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600"
        >
          有货
        </span>
        <span
          v-else
          class="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600"
        >
          人工发货
        </span>

        <div class="flex items-baseline gap-0.5">
          <span class="text-[11px] font-bold text-red-500/60">¥</span>
          <span class="text-xl font-bold leading-none text-red-500">{{ formatCents(product.price) }}</span>
        </div>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import emptyCoverUrl from "../assets/empty.jpg";
import { formatCents } from "../lib/utils/money";
import type { ProductSummary } from "../modules/catalog/types";

const props = defineProps<{
  product: ProductSummary;
}>();

const lowStock = computed(() => {
  return props.product.availableStock >= 0 && props.product.availableStock < 10;
});
</script>

<style scoped>
.holo-product-card {
  --holo-border-size: 0px;
  position: relative;
  isolation: isolate;
  border: var(--holo-border-size) solid transparent;
  background:
    linear-gradient(var(--color-base-100, #fff), var(--color-base-100, #fff)) padding-box,
    linear-gradient(
      135deg,
      rgba(45, 212, 191, 0.86),
      rgba(96, 165, 250, 0.9),
      rgba(168, 85, 247, 0.86),
      rgba(244, 114, 182, 0.88),
      rgba(251, 191, 36, 0.82),
      rgba(52, 211, 153, 0.86),
      rgba(45, 212, 191, 0.86)
    ) border-box;
  background-size: 100% 100%, 180% 180%;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 12px 28px rgba(15, 23, 42, 0.08),
    0 0 22px rgba(96, 165, 250, 0.1);
}

.holo-product-card.card > figure:first-child {
  border-start-start-radius: calc(0.75rem - var(--holo-border-size));
  border-start-end-radius: calc(0.75rem - var(--holo-border-size));
}

.holo-product-card::before {
  content: "";
  position: absolute;
  inset: -4px;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.34),
    rgba(96, 165, 250, 0.38),
    rgba(168, 85, 247, 0.34),
    rgba(244, 114, 182, 0.32),
    rgba(251, 191, 36, 0.28),
    rgba(52, 211, 153, 0.32),
    rgba(45, 212, 191, 0.34)
  );
  filter: blur(12px);
  opacity: 0.32;
  transform: translateZ(0);
  transition: opacity 300ms ease, filter 300ms ease;
  pointer-events: none;
}

.holo-product-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 18%, rgba(255, 255, 255, 0.2) 42%, transparent 62%);
  opacity: 0;
  transform: translateX(-34%);
  transition: opacity 300ms ease, transform 600ms ease;
  pointer-events: none;
}

.holo-product-card > * {
  position: relative;
  z-index: 1;
}

.holo-product-card:hover {
  transform: translateY(-2px);
  background-position: 0 0, 100% 50%;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.1),
    0 18px 44px rgba(79, 70, 229, 0.12),
    0 0 24px rgba(45, 212, 191, 0.16),
    0 0 30px rgba(244, 114, 182, 0.1);
}

.holo-product-card:focus-visible {
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--color-primary) 32%, transparent),
    0 12px 28px rgba(15, 23, 42, 0.1);
}

.holo-product-card:hover::before {
  opacity: 0.5;
  filter: blur(14px);
}

.holo-product-card:hover::after {
  opacity: 1;
  transform: translateX(34%);
}

@media (prefers-reduced-motion: no-preference) {
  .holo-product-card:hover {
    animation: holo-border-shift 4.8s linear infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .holo-product-card,
  .holo-product-card::before,
  .holo-product-card::after {
    animation: none !important;
    transition: none !important;
  }
}

@keyframes holo-border-shift {
  0% {
    background-position: 0 0, 0% 50%;
  }
  50% {
    background-position: 0 0, 100% 50%;
  }
  100% {
    background-position: 0 0, 0% 50%;
  }
}
</style>
