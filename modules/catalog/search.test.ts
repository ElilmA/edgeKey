// @ts-nocheck -- Bun test types aren't part of the Worker production tsconfig.
import { describe, expect, it } from "bun:test";
import { normalizeProductSearchInput } from "./queries";

describe("normalizeProductSearchInput", () => {
  it("trims whitespace, collapses gaps, and creates searchable terms", () => {
    expect(normalizeProductSearchInput("  ChatGPT   独享  ")).toEqual({
      query: "ChatGPT 独享",
      terms: ["ChatGPT", "独享"],
    });
  });

  it("deduplicates terms and keeps at most five", () => {
    expect(normalizeProductSearchInput("AI AI 月卡 独享 自动 发货 现货")).toEqual({
      query: "AI AI 月卡 独享 自动 发货 现货",
      terms: ["AI", "月卡", "独享", "自动", "发货"],
    });
  });

  it("limits the normalized query to 64 characters", () => {
    const result = normalizeProductSearchInput("a".repeat(80));

    expect(result.query).toHaveLength(64);
    expect(result.terms).toEqual(["a".repeat(64)]);
  });

  it("returns no terms for an empty query", () => {
    expect(normalizeProductSearchInput("   ")).toEqual({ query: "", terms: [] });
  });
});
