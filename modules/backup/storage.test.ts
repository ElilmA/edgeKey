// @ts-nocheck -- Bun test types are not part of the Worker production tsconfig.
import { describe, expect, test } from "bun:test";
import { BACKUP_KEYS } from "./rotation";
import { rotateEncryptedBackup, type BackupObjectStorage } from "./storage";
import type { BackupSnapshot } from "./types";

class MemoryStorage implements BackupObjectStorage {
  objects = new Map<string, Uint8Array>();
  failNextPutFor: string | null = null;

  async get(key: string) {
    const value = this.objects.get(key);
    return value ? value.slice() : null;
  }

  async put(key: string, bytes: Uint8Array) {
    if (this.failNextPutFor === key) {
      this.failNextPutFor = null;
      throw new Error(`simulated put failure: ${key}`);
    }
    this.objects.set(key, bytes.slice());
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

const encryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));

function snapshot(day: number): BackupSnapshot {
  return {
    format: "edgekey-d1-snapshot",
    version: 1,
    appVersion: "test",
    createdAt: `2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`,
    counts: { Admin: 1 },
    totalRecords: 1,
    tables: { Admin: [{ id: 1, day }] },
  };
}

describe("backup object rotation", () => {
  test("keeps only A/B plus manifest after repeated backups", async () => {
    const storage = new MemoryStorage();
    const first = await rotateEncryptedBackup({ storage, snapshot: snapshot(13), encryptionKey, runToken: "one" });
    const second = await rotateEncryptedBackup({ storage, snapshot: snapshot(14), encryptionKey, runToken: "two" });
    const third = await rotateEncryptedBackup({ storage, snapshot: snapshot(15), encryptionKey, runToken: "three" });

    expect([first.latest.slot, second.latest.slot, third.latest.slot]).toEqual(["a", "b", "a"]);
    expect([...storage.objects.keys()].sort()).toEqual([
      BACKUP_KEYS.a,
      BACKUP_KEYS.b,
      BACKUP_KEYS.manifest,
    ].sort());
    expect(third.previous?.slot).toBe("b");
  });

  test("restores the old slot and manifest if manifest upload fails", async () => {
    const storage = new MemoryStorage();
    await rotateEncryptedBackup({ storage, snapshot: snapshot(13), encryptionKey, runToken: "one" });
    await rotateEncryptedBackup({ storage, snapshot: snapshot(14), encryptionKey, runToken: "two" });
    const before = new Map([...storage.objects].map(([key, value]) => [key, value.slice()]));

    storage.failNextPutFor = BACKUP_KEYS.manifest;
    await expect(rotateEncryptedBackup({
      storage,
      snapshot: snapshot(15),
      encryptionKey,
      runToken: "failed",
    })).rejects.toThrow("simulated put failure");

    expect([...storage.objects.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [key, bytes] of before) expect(storage.objects.get(key)).toEqual(bytes);
  });
});
