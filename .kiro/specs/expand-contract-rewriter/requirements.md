# Expand-and-Contract Rewriter: Requirements (EARS Format)

## REQ-RWR-001: Trigger on CRITICAL/HIGH Findings
WHEN the analyzer produces at least one CRITICAL or HIGH finding, THE SYSTEM SHALL generate a 3-phase Expand-and-Contract migration plan for each finding.

## REQ-RWR-002: Phase 1 Structure (Expand)
WHEN generating Phase 1, THE SYSTEM SHALL produce SQL that: adds nullable shadow columns or indexes using CONCURRENTLY outside transaction blocks, uses NOT VALID for new constraints, and guards all DDL with `SET lock_timeout = '2s'`.

## REQ-RWR-003: Phase 2 Structure (Backfill)
WHEN generating Phase 2, THE SYSTEM SHALL produce batched UPDATE statements and `ALTER TABLE ... VALIDATE CONSTRAINT` using SHARE UPDATE EXCLUSIVE lock, not ACCESS EXCLUSIVE.

## REQ-RWR-004: Phase 3 Structure (Contract)
WHEN generating Phase 3, THE SYSTEM SHALL produce cleanup DDL (dropping old columns, renaming shadow columns, etc.) guarded with `SET lock_timeout = '2s'`.

## REQ-RWR-005: Zero CRITICAL After Rewrite
WHEN the rewritten 3-phase SQL is analyzed by the lock classifier, THE SYSTEM SHALL produce zero CRITICAL findings across all three phases combined.

## REQ-RWR-006: Deterministic Output
WHEN given the same SQL input, THE SYSTEM SHALL produce byte-identical rewrite output every time.

## REQ-RWR-007: JSON Output Shape
WHEN rewriting, THE SYSTEM SHALL return a JSON object: `{ phases: [phase1Statements[], phase2Statements[], phase3Statements[]] }` where each element is a SQL string.

## REQ-RWR-008: LOCK-001 Rewrite (Type Change)
WHEN rewriting a type-change hazard, THE SYSTEM SHALL generate: add shadow column with new type (nullable), backfill via UPDATE, add NOT VALID CHECK constraint on new column, VALIDATE CONSTRAINT, rename columns, drop old column.

## REQ-RWR-009: LOCK-002 Rewrite (Index Without CONCURRENTLY)
WHEN rewriting a CREATE INDEX without CONCURRENTLY, THE SYSTEM SHALL generate a CREATE INDEX CONCURRENTLY statement outside any transaction block.

## REQ-RWR-010: LOCK-004 Rewrite (Volatile Default)
WHEN rewriting a volatile default ADD COLUMN, THE SYSTEM SHALL generate: add nullable column (no default), batched backfill UPDATE setting the value, then set DEFAULT.

## REQ-RWR-011: LOCK-005 Rewrite (SET NOT NULL)
WHEN rewriting a SET NOT NULL hazard, THE SYSTEM SHALL generate: add NOT VALID CHECK (col IS NOT NULL), VALIDATE CONSTRAINT (which uses SHARE UPDATE EXCLUSIVE), then SET NOT NULL.

## REQ-RWR-012: LOCK-006 Rewrite (Unvalidated Constraint)
WHEN rewriting an unvalidated constraint hazard, THE SYSTEM SHALL add NOT VALID to the constraint and add a subsequent VALIDATE CONSTRAINT statement.
