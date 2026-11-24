---
inclusion: fileMatch
fileMatchPattern: ["engine/**/*.go", "**/*.sql"]
---

# PostgreSQL 16 Lock-Mode Reference

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
| 8 | ACCESS EXCLUSIVE | All modes including ACCESS SHARE |

## DDL Statement Lock Mapping (PostgreSQL 16)

| DDL Statement | Lock Mode | Blocks Reads | Blocks Writes | Table Rewrite |
|---------------|-----------|-------------|--------------|---------------|
| ALTER TABLE ... ALTER COLUMN TYPE (incompatible) | ACCESS EXCLUSIVE | Yes | Yes | Yes |
| ALTER TABLE ... ALTER COLUMN TYPE (compatible, e.g. VARCHAR widening) | ACCESS EXCLUSIVE | Yes | Yes | No |
| ALTER TABLE ... ADD COLUMN DEFAULT (volatile) | ACCESS EXCLUSIVE | Yes | Yes | Yes |
| ALTER TABLE ... ADD COLUMN DEFAULT (constant, PG11+) | ACCESS EXCLUSIVE | Yes | Yes | No (metadata only) |
| ALTER TABLE ... ADD COLUMN (no default) | ACCESS EXCLUSIVE | Yes | Yes | No |
| ALTER TABLE ... ALTER COLUMN SET NOT NULL | ACCESS EXCLUSIVE | Yes | Yes | No (full scan) |
| ALTER TABLE ... ADD CONSTRAINT CHECK | ACCESS EXCLUSIVE | Yes | Yes | No (full scan) |
| ALTER TABLE ... ADD CONSTRAINT CHECK NOT VALID | ACCESS EXCLUSIVE | Yes | Yes | No (metadata only) |
| ALTER TABLE ... VALIDATE CONSTRAINT | SHARE UPDATE EXCLUSIVE | No | No | No |
| ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY | SHARE ROW EXCLUSIVE | No | Yes | No |
| ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY NOT VALID | SHARE ROW EXCLUSIVE | No | Yes | No (metadata only) |
| ALTER TABLE ... DROP COLUMN | ACCESS EXCLUSIVE | Yes | Yes | No |
| ALTER TABLE ... RENAME COLUMN | ACCESS EXCLUSIVE | Yes | Yes | No |
| ALTER TABLE ... RENAME TO | ACCESS EXCLUSIVE | Yes | Yes | No |
| CREATE INDEX (no CONCURRENTLY) | SHARE | No | Yes | No |
| CREATE INDEX CONCURRENTLY | SHARE UPDATE EXCLUSIVE | No | No | No |
| DROP INDEX (no CONCURRENTLY) | ACCESS EXCLUSIVE | Yes | Yes | No |
| DROP INDEX CONCURRENTLY | SHARE UPDATE EXCLUSIVE | No | No | No |
| VACUUM FULL | ACCESS EXCLUSIVE | Yes | Yes | Yes (full copy) |
| CLUSTER | ACCESS EXCLUSIVE | Yes | Yes | Yes (full copy) |

## Volatile vs. Constant Defaults (PostgreSQL 11+ distinction)

A default is **constant** when it is a literal value or a stable expression evaluable at DDL time:
- Integer, float, boolean, string literals: `DEFAULT 0`, `DEFAULT ''`, `DEFAULT true`
- `DEFAULT NULL`
- `DEFAULT CURRENT_TIMESTAMP` (stable)

A default is **volatile** when it calls a volatile function:
- `DEFAULT gen_random_uuid()`
- `DEFAULT random()`
- `DEFAULT clock_timestamp()`
- `DEFAULT uuid_generate_v4()`
- Any user-defined function marked `VOLATILE`

Constant defaults on PG11+ are metadata-only (no table rewrite) but still acquire ACCESS EXCLUSIVE. Volatile defaults always trigger a full table rewrite.

## Lock Timeout Guard Pattern

All DDL in a migration script should be guarded:
```sql
SET lock_timeout = '2s';
SET statement_timeout = '30s';
```
Without this, a blocked DDL statement queues behind all existing transactions and blocks all subsequent transactions behind it, amplifying a 2-second lock wait into minutes of downtime.

## Concurrently Restriction

`CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` CANNOT run inside an explicit transaction block. PostgreSQL raises:
```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

## Expand-and-Contract Pattern (Zero-Downtime)

For any CRITICAL or HIGH hazard, generate a 3-phase plan:

**Phase 1 (Expand):**
- Add nullable shadow column or index with CONCURRENTLY outside any transaction block
- Use NOT VALID for new constraints
- Guard all DDL with `SET lock_timeout = '2s'`

**Phase 2 (Backfill):**
- Batch UPDATE in chunks (e.g., 1000 rows at a time) to avoid long-running transactions
- VALIDATE CONSTRAINT (acquires only SHARE UPDATE EXCLUSIVE)

**Phase 3 (Contract):**
- Drop old column or index after all application instances have deployed v2
- Final cleanup DDL also guarded with lock_timeout
