import type { BackupFileMetadata, BackupManifest, BackupSlot } from "./types";

export const BACKUP_KEYS = {
  a: "system-backups/backup-a.ekb",
  b: "system-backups/backup-b.ekb",
  manifest: "system-backups/manifest.json",
} as const;

export function chooseNextSlot(manifest: BackupManifest | null): BackupSlot {
  return manifest?.latest.slot === "a" ? "b" : "a";
}

export function createManifest(
  current: BackupManifest | null,
  latest: BackupFileMetadata,
): BackupManifest {
  return {
    format: "edgekey-backup-manifest",
    version: 1,
    updatedAt: latest.createdAt,
    latest,
    previous: current?.latest ?? null,
  };
}

export function parseManifest(value: string): BackupManifest {
  const manifest = JSON.parse(value) as BackupManifest;
  if (
    manifest.format !== "edgekey-backup-manifest"
    || manifest.version !== 1
    || !manifest.latest
    || !["a", "b"].includes(manifest.latest.slot)
  ) {
    throw new Error("S3 中的备份 manifest 格式无效");
  }
  return manifest;
}
