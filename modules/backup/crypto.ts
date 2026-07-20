import type { BackupSnapshot, EncryptedBackupEnvelope } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function transformBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const transformed = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(transformed).arrayBuffer());
}

export function decodeBackupKey(value: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(value);
  } catch {
    throw new Error("BACKUP_ENCRYPTION_KEY 必须是有效的 base64 字符串");
  }
  if (bytes.byteLength !== 32) {
    throw new Error("BACKUP_ENCRYPTION_KEY 解码后必须正好为 32 字节");
  }
  return bytes;
}

async function importBackupKey(value: string) {
  return crypto.subtle.importKey("raw", toArrayBuffer(decodeBackupKey(value)), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  return transformBytes(bytes, new CompressionStream("gzip"));
}

export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  return transformBytes(bytes, new DecompressionStream("gzip"));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encryptSnapshot(snapshot: BackupSnapshot, keyValue: string): Promise<Uint8Array> {
  const compressed = await gzip(textEncoder.encode(JSON.stringify(snapshot)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importBackupKey(keyValue);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(compressed),
  ));
  const envelope: EncryptedBackupEnvelope = {
    format: "edgekey-backup",
    version: 1,
    algorithm: "AES-256-GCM",
    compression: "gzip",
    createdAt: snapshot.createdAt,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
  return textEncoder.encode(JSON.stringify(envelope));
}

export async function decryptBackup(bytes: Uint8Array, keyValue: string): Promise<BackupSnapshot> {
  const envelope = JSON.parse(textDecoder.decode(bytes)) as EncryptedBackupEnvelope;
  if (
    envelope.format !== "edgekey-backup"
    || envelope.version !== 1
    || envelope.algorithm !== "AES-256-GCM"
    || envelope.compression !== "gzip"
  ) {
    throw new Error("不支持的 EdgeKey 备份格式");
  }

  const key = await importBackupKey(keyValue);
  const decrypted = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
    key,
    toArrayBuffer(base64ToBytes(envelope.ciphertext)),
  ));
  const snapshot = JSON.parse(textDecoder.decode(await gunzip(decrypted))) as BackupSnapshot;
  if (snapshot.format !== "edgekey-d1-snapshot" || snapshot.version !== 1 || !snapshot.tables) {
    throw new Error("备份快照内容无效");
  }
  return snapshot;
}
