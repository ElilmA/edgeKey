// @ts-nocheck -- Bun test types are not part of the Worker production tsconfig.
import { describe, expect, test } from "bun:test";
import { BACKUP_KEYS, chooseNextSlot, createManifest, parseManifest } from "./rotation";
import type { BackupFileMetadata } from "./types";

function metadata(slot: "a" | "b", createdAt: string): BackupFileMetadata {
  return {
    slot,
    key: BACKUP_KEYS[slot],
    createdAt,
    size: 100,
    checksum: slot.repeat(64),
    totalRecords: 3,
    counts: { Admin: 1, Order: 2 },
    appVersion: "test",
  };
}

describe("backup rotation", () => {
  test("starts with A and alternates A/B", () => {
    const first = createManifest(null, metadata("a", "2026-07-13T00:00:00.000Z"));
    expect(chooseNextSlot(null)).toBe("a");
    expect(chooseNextSlot(first)).toBe("b");

    const second = createManifest(first, metadata("b", "2026-07-14T00:00:00.000Z"));
    expect(second.latest.slot).toBe("b");
    expect(second.previous?.slot).toBe("a");
    expect(chooseNextSlot(second)).toBe("a");
  });

  test("manifest validates format", () => {
    const manifest = createManifest(null, metadata("a", "2026-07-13T00:00:00.000Z"));
    expect(parseManifest(JSON.stringify(manifest))).toEqual(manifest);
    expect(() => parseManifest('{"format":"wrong"}')).toThrow("manifest");
  });
});
