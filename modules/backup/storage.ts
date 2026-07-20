import { S3Client } from "../../lib/s3/client";
import { encryptSnapshot, sha256Hex } from "./crypto";
import { BACKUP_KEYS, chooseNextSlot, createManifest, parseManifest } from "./rotation";
import type { BackupFileMetadata, BackupManifest, BackupSnapshot } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface BackupObjectStorage {
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class S3BackupObjectStorage implements BackupObjectStorage {
  constructor(private readonly client: S3Client) {}

  async get(key: string): Promise<Uint8Array | null> {
    const response = await this.client.getObject(key, 30_000);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`读取 S3 备份对象失败 (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.client.putObject(key, bytes, contentType, { cacheControl: "no-store" });
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteObject(key);
  }
}

async function verifyObject(storage: BackupObjectStorage, key: string, checksum: string) {
  const downloaded = await storage.get(key);
  if (!downloaded) throw new Error(`备份上传后无法读取：${key}`);
  const downloadedChecksum = await sha256Hex(downloaded);
  if (downloadedChecksum !== checksum) throw new Error(`备份上传校验失败：${key}`);
}

async function restoreObject(storage: BackupObjectStorage, key: string, previous: Uint8Array | null, contentType: string) {
  if (previous) await storage.put(key, previous, contentType);
  else await storage.delete(key);
}

export async function rotateEncryptedBackup(input: {
  storage: BackupObjectStorage;
  snapshot: BackupSnapshot;
  encryptionKey: string;
  runToken: string;
}): Promise<BackupManifest> {
  const { storage, snapshot } = input;
  const oldManifestBytes = await storage.get(BACKUP_KEYS.manifest);
  const oldManifest = oldManifestBytes ? parseManifest(textDecoder.decode(oldManifestBytes)) : null;
  const slot = chooseNextSlot(oldManifest);
  const targetKey = BACKUP_KEYS[slot];
  const temporaryKey = `system-backups/.backup-next-${input.runToken}.ekb`;
  const oldTargetBytes = await storage.get(targetKey);
  const encrypted = await encryptSnapshot(snapshot, input.encryptionKey);
  const checksum = await sha256Hex(encrypted);
  let targetTouched = false;
  let manifestTouched = false;

  try {
    await storage.put(temporaryKey, encrypted, "application/octet-stream");
    await verifyObject(storage, temporaryKey, checksum);

    targetTouched = true;
    await storage.put(targetKey, encrypted, "application/octet-stream");
    await verifyObject(storage, targetKey, checksum);
    await storage.delete(temporaryKey);

    const metadata: BackupFileMetadata = {
      slot,
      key: targetKey,
      createdAt: snapshot.createdAt,
      size: encrypted.byteLength,
      checksum,
      totalRecords: snapshot.totalRecords,
      counts: snapshot.counts,
      appVersion: snapshot.appVersion,
    };
    const manifest = createManifest(oldManifest, metadata);
    const manifestBytes = textEncoder.encode(JSON.stringify(manifest, null, 2));
    manifestTouched = true;
    await storage.put(BACKUP_KEYS.manifest, manifestBytes, "application/json");

    const savedManifestBytes = await storage.get(BACKUP_KEYS.manifest);
    if (!savedManifestBytes) throw new Error("备份 manifest 上传后无法读取");
    const savedManifest = parseManifest(textDecoder.decode(savedManifestBytes));
    if (savedManifest.latest.checksum !== checksum || savedManifest.latest.slot !== slot) {
      throw new Error("备份 manifest 上传校验失败");
    }
    return manifest;
  } catch (error) {
    const rollbackErrors: string[] = [];
    await storage.delete(temporaryKey).catch((rollbackError) => rollbackErrors.push(String(rollbackError)));
    if (targetTouched) {
      await restoreObject(storage, targetKey, oldTargetBytes, "application/octet-stream")
        .catch((rollbackError) => rollbackErrors.push(String(rollbackError)));
    }
    if (manifestTouched) {
      await restoreObject(storage, BACKUP_KEYS.manifest, oldManifestBytes, "application/json")
        .catch((rollbackError) => rollbackErrors.push(String(rollbackError)));
    }
    if (rollbackErrors.length && error instanceof Error) {
      error.message += `；回滚失败：${rollbackErrors.join("；")}`;
    }
    throw error;
  }
}
