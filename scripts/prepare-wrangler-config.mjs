import { readFileSync, writeFileSync } from "node:fs";

const path = "dist/server/wrangler.json";
const config = JSON.parse(readFileSync(path, "utf8"));

// vike-photon still emits this removed Wrangler compatibility field.
// Removing it preserves the old default behaviour and keeps the release gate
// compatible with current Wrangler versions.
delete config.legacy_env;

writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${path} for current Wrangler.`);

