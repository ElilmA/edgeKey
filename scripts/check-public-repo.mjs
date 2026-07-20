import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenPath = /(^|\/)(\.ai|memory-bank|\.playwright-mcp|node_modules|dist|\.wrangler)(\/|$)|\.(pem|key|p12|pfx|db|sqlite|sqlite3)$/i;
const binary = /\.(png|jpe?g|gif|webp|ico|woff2?|wasm)$/i;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{32,}\r?\n)+-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /AKIA(?!IOSFODNN7EXAMPLE)[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /sk-[A-Za-z0-9]{20,}/,
];

const findings = [];
for (const file of tracked) {
  if (forbiddenPath.test(file)) findings.push(`forbidden path: ${file}`);
  if (binary.test(file)) continue;

  const text = readFileSync(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) findings.push(`credential-like content: ${file}`);
  }
}

if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exit(1);
}

console.log(`Public repository scan passed (${tracked.length} tracked files).`);
