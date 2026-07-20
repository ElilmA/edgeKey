// @ts-nocheck -- Bun test types are not part of the Worker production tsconfig.
import { describe, expect, test } from "bun:test";
import { decodeBackupKey, decryptBackup, encryptSnapshot, gzip, gunzip, sha256Hex } from "./crypto";
import type { BackupSnapshot } from "./types";

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const snapshot: BackupSnapshot = {
  format: "edgekey-d1-snapshot",
  version: 1,
  appVersion: "test",
  createdAt: "2026-07-13T00:00:00.000Z",
  counts: { Admin: 1 },
  totalRecords: 1,
  tables: { Admin: [{ id: 1, username: "admin" }] },
};

describe("backup crypto", () => {
  test("gzip round trip", async () => {
    const source = new TextEncoder().encode("EdgeKey".repeat(100));
    expect(await gunzip(await gzip(source))).toEqual(source);
  });

  test("gzip round trip handles snapshots larger than stream backpressure buffers", async () => {
    const source = new Uint8Array(512 * 1024);
    let state = 0x12345678;
    for (let index = 0; index < source.length; index += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      source[index] = state & 0xff;
    }
    expect(await gunzip(await gzip(source))).toEqual(source);
  });

  test("AES-GCM encrypted backup round trip", async () => {
    const encrypted = await encryptSnapshot(snapshot, key);
    expect(new TextDecoder().decode(encrypted)).not.toContain("admin");
    expect(await decryptBackup(encrypted, key)).toEqual(snapshot);
  });

  test("wrong key rejects authentication", async () => {
    const encrypted = await encryptSnapshot(snapshot, key);
    const wrongKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(8)));
    await expect(decryptBackup(encrypted, wrongKey)).rejects.toThrow();
  });

  test("requires a 32-byte base64 key", () => {
    expect(() => decodeBackupKey("not-base64")).toThrow();
    expect(() => decodeBackupKey(btoa("short"))).toThrow("32 字节");
  });

  test("SHA-256 is stable", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
