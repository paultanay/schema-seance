# Dual PGlite Runner: Requirements (EARS Format)

## REQ-PGL-001: Dual Isolation
WHEN a proof run starts, THE SYSTEM SHALL instantiate two independent in-memory PGlite instances (`baselineDb` and `candidateDb`) that share no state.

## REQ-PGL-002: Schema Application
WHEN a proof run starts, THE SYSTEM SHALL apply the preset's `baseSchemaSql` to both databases before inserting any rows.

## REQ-PGL-003: Deterministic Seed Data
WHEN seeding data, THE SYSTEM SHALL insert the identical set of rows (default 200) into both databases, covering: NULL values, empty strings, 4-byte UTF-8 (emoji, Bengali, Japanese), max-length strings, boundary numeric values, and boundary timestamps.

## REQ-PGL-004: Pre-Migration Checksum
WHEN rows are inserted and before migration runs, THE SYSTEM SHALL compute a canonical SHA-256 checksum for each table in both databases.

## REQ-PGL-005: Migration Execution
WHEN the user's migration SQL is executed, THE SYSTEM SHALL apply it only to `candidateDb`, measure exact execution time in milliseconds, and capture any PostgreSQL error verbatim.

## REQ-PGL-006: v1 App Query Replay
WHEN migration execution completes (or fails), THE SYSTEM SHALL execute each preset v1 application query against both `baselineDb` and `candidateDb`, recording which queries pass and which fail with their exact PostgreSQL error message.

## REQ-PGL-007: Post-Migration Checksum
WHEN v1 app queries have run, THE SYSTEM SHALL compute post-migration SHA-256 checksums and compare them against pre-migration checksums, reporting any table where the checksum changed unexpectedly.

## REQ-PGL-008: Data Preservation Report
WHEN checksum comparison completes, THE SYSTEM SHALL produce a structured report containing: row counts (before/after), column diff, truncation counterexamples (rows whose values changed or failed cast), and overall data preservation status.

## REQ-PGL-009: Memory Safety
WHEN a proof run ends (whether by success or error), THE SYSTEM SHALL close both PGlite instances in a `finally` block.

## REQ-PGL-010: Rewrite Proof Run
WHEN the user clicks "Prove Safe Rewrite", THE SYSTEM SHALL instantiate a third `rewrittenDb`, apply the Expand-and-Contract phases from the Go rewriter, re-run all v1 and v2 app queries plus all 200 adversarial rows, and return side-by-side comparison metrics.

## REQ-PGL-011: Property Tests
WHEN tested with `fast-check` and Vitest, THE SYSTEM SHALL pass: data preservation (Expand-and-Contract rewrites lose zero rows), checksum determinism (invariant to insertion order), and rollback equivalence (up then down restores original checksum).
