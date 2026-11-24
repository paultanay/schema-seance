---
inclusion: always
---

# SchemaSeance Power: PostgreSQL Lock Reference

This steering doc is bundled with the SchemaSeance Kiro Power so that agents using the MCP tools have the PostgreSQL 16 lock compatibility matrix in context.

## Lock Mode Hierarchy (weakest to strongest)

| Level | Lock Mode | Conflicts With |
|-------|-----------|----------------|
| 1 | ACCESS SHARE | ACCESS EXCLUSIVE only |
| 2 | ROW SHARE | EXCLUSIVE, ACCESS EXCLUSIVE |
| 3 | ROW EXCLUSIVE | SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| 4 | SHARE UPDATE EXCLUSIVE | SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| 5 | SHARE | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| 6 | SHARE ROW EXCLUSIVE | ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| 7 | EXCLUSIVE | ROW SHARE, ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE |
| 8 | ACCESS EXCLUSIVE | All modes |

## Critical DDL Hazards Detected by SchemaSeance

- `ALTER COLUMN TYPE` (incompatible): ACCESS EXCLUSIVE + table rewrite
- `CREATE INDEX` without `CONCURRENTLY`: SHARE (blocks all writes)
- `DROP INDEX` without `CONCURRENTLY`: ACCESS EXCLUSIVE
- `ADD COLUMN DEFAULT <volatile>`: ACCESS EXCLUSIVE + table rewrite
- `SET NOT NULL` without prior validated CHECK: ACCESS EXCLUSIVE + full scan
- `ADD CONSTRAINT CHECK/FK` without `NOT VALID`: ACCESS EXCLUSIVE + full scan
- `DROP COLUMN` / `RENAME`: breaks v1 app queries during rolling deploy
- DDL without `SET lock_timeout`: lock queue amplification risk
- `VACUUM FULL` / `CLUSTER`: ACCESS EXCLUSIVE + full table copy
- `CONCURRENTLY` inside `BEGIN...COMMIT`: PostgreSQL runtime error

## Safe Pattern: Expand-and-Contract

1. Expand: add nullable shadow column, create index CONCURRENTLY, add constraint NOT VALID. Guard with `SET lock_timeout = '2s'`.
2. Backfill: batched UPDATE, then VALIDATE CONSTRAINT (SHARE UPDATE EXCLUSIVE, allows concurrent reads and writes).
3. Contract: drop old column or rename after all v1 app instances are retired.
