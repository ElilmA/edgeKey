# Portfolio contribution boundary

## Upstream

EdgeKey is an MIT-licensed project maintained at
[`34892002/edgeKey`](https://github.com/34892002/edgeKey). The base product,
original architecture, and upstream history remain attributed to that project.

## Fork additions

Le Li's fork adds independently reviewable commits for:

1. Product search and responsive navigation
2. Admin filtering, pagination, inline maintenance, and global reordering
3. Encrypted A/B object-backup rotation primitives
4. CI release protection and public-repository safety checks

The backup primitives intentionally stop at encryption, checksum validation,
rotation, and failed-publication rollback. Production snapshot table allow-lists,
storage credentials, resource identifiers, and customer data are not part of
this public fork.

## Verify

```bash
bun install --frozen-lockfile
bun test
bun run build
bun run portfolio:scan
bun run release:dry-run
```

The deployment command is a dry-run. It must not run migrations, seed data, or
write to a remote D1 database.

The CI audit blocks critical advisories. As of 2026-07-20, Bun still reports
seven high-severity advisories in upstream/transitive development dependencies
(`ws`, `fast-uri`, `hono`, and `undici`) after compatible updates. They are
tracked explicitly instead of being misrepresented as a clean audit.
