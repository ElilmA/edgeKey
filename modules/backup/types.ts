export type BackupSlot = "a" | "b";

export type BackupTrigger = "cron" | "manual";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface BackupSnapshot {
  format: "edgekey-d1-snapshot";
  version: 1;
  appVersion: string;
  createdAt: string;
  counts: Record<string, number>;
  totalRecords: number;
  tables: Record<string, Array<Record<string, JsonValue>>>;
}

export interface EncryptedBackupEnvelope {
  format: "edgekey-backup";
  version: 1;
  algorithm: "AES-256-GCM";
  compression: "gzip";
  createdAt: string;
  iv: string;
  ciphertext: string;
}

export interface BackupFileMetadata {
  slot: BackupSlot;
  key: string;
  createdAt: string;
  size: number;
  checksum: string;
  totalRecords: number;
  counts: Record<string, number>;
  appVersion: string;
}

export interface BackupManifest {
  format: "edgekey-backup-manifest";
  version: 1;
  updatedAt: string;
  latest: BackupFileMetadata;
  previous: BackupFileMetadata | null;
}
