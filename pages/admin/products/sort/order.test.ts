// @ts-nocheck -- Bun test types aren't part of the Worker production tsconfig.
import { describe, expect, it } from "bun:test";
import { getDragAutoScrollSpeed } from "./autoScroll";
import { moveItemByOffset, moveItemToIndex } from "./order";

const rows = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" },
  { id: 4, name: "D" },
];

describe("product sort list movement", () => {
  it("moves an item to a one-based target position without mutating the input", () => {
    const result = moveItemToIndex(rows, 3, 1);

    expect(result.map((item) => item.id)).toEqual([3, 1, 2, 4]);
    expect(rows.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("clamps target positions to the available range", () => {
    expect(moveItemToIndex(rows, 2, 99).map((item) => item.id)).toEqual([1, 3, 4, 2]);
    expect(moveItemToIndex(rows, 3, -8).map((item) => item.id)).toEqual([3, 1, 2, 4]);
  });

  it("supports one-step movement and leaves invalid moves unchanged", () => {
    expect(moveItemByOffset(rows, 3, -1).map((item) => item.id)).toEqual([1, 3, 2, 4]);
    expect(moveItemByOffset(rows, 1, -1)).toEqual(rows);
    expect(moveItemByOffset(rows, 99, 1)).toEqual(rows);
  });
});

describe("product sort drag auto-scroll", () => {
  it("does not scroll while the pointer stays away from both edges", () => {
    expect(getDragAutoScrollSpeed({ pointerY: 300, containerTop: 100, containerBottom: 500 })).toBe(0);
  });

  it("scrolls toward the nearest edge with progressive speed", () => {
    expect(getDragAutoScrollSpeed({ pointerY: 118, containerTop: 100, containerBottom: 500 })).toBe(-15);
    expect(getDragAutoScrollSpeed({ pointerY: 482, containerTop: 100, containerBottom: 500 })).toBe(15);
  });

  it("caps the speed when the pointer moves outside the scroll container", () => {
    expect(getDragAutoScrollSpeed({ pointerY: 0, containerTop: 100, containerBottom: 500 })).toBe(-20);
    expect(getDragAutoScrollSpeed({ pointerY: 600, containerTop: 100, containerBottom: 500 })).toBe(20);
  });
});
