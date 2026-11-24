# AST Analyzer: Requirements (EARS Format)

## REQ-AST-001: Lexer Totality
WHEN the lexer receives any byte sequence as input, THE SYSTEM SHALL tokenize it without panicking, returning an error token for unrecognized sequences rather than crashing.

## REQ-AST-002: Parser Totality
WHEN the parser receives any token stream, THE SYSTEM SHALL return a parsed result or a structured parse error without panicking.

## REQ-AST-003: ALTER COLUMN TYPE Lock Detection (LOCK-001)
WHEN a migration contains `ALTER TABLE ... ALTER COLUMN ... TYPE` changing to a narrower or incompatible type, THE SYSTEM SHALL return a finding with ruleCode `LOCK-001`, severity `CRITICAL`, lockMode `ACCESS EXCLUSIVE`, tableRewrite `true`, and the exact source line number.

## REQ-AST-004: CREATE INDEX Lock Detection (LOCK-002)
WHEN a migration contains `CREATE INDEX` or `CREATE UNIQUE INDEX` without the `CONCURRENTLY` keyword, THE SYSTEM SHALL return a finding with ruleCode `LOCK-002`, severity `CRITICAL`, lockMode `SHARE`, blocksWrites `true`.

## REQ-AST-005: DROP INDEX Lock Detection (LOCK-003)
WHEN a migration contains `DROP INDEX` without `CONCURRENTLY`, THE SYSTEM SHALL return a finding with ruleCode `LOCK-003`, severity `CRITICAL`, lockMode `ACCESS EXCLUSIVE`.

## REQ-AST-006: Volatile Default Detection (LOCK-004)
WHEN a migration contains `ALTER TABLE ... ADD COLUMN ... DEFAULT expr` where `expr` is a volatile function call, THE SYSTEM SHALL return a finding with ruleCode `LOCK-004`, severity `CRITICAL`, lockMode `ACCESS EXCLUSIVE`, tableRewrite `true`.
WHEN a migration contains `ALTER TABLE ... ADD COLUMN ... DEFAULT expr` where `expr` is a constant literal or stable expression, THE SYSTEM SHALL return a finding with ruleCode `LOCK-004`, severity `WARNING`, lockMode `ACCESS EXCLUSIVE`, tableRewrite `false`.

## REQ-AST-007: SET NOT NULL Scan Detection (LOCK-005)
WHEN a migration contains `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` without a prior validated CHECK constraint on the same column, THE SYSTEM SHALL return a finding with ruleCode `LOCK-005`, severity `CRITICAL`, lockMode `ACCESS EXCLUSIVE`.

## REQ-AST-008: Unvalidated Constraint Detection (LOCK-006)
WHEN a migration contains `ALTER TABLE ... ADD CONSTRAINT ... CHECK` or `FOREIGN KEY` without `NOT VALID`, THE SYSTEM SHALL return a finding with ruleCode `LOCK-006`, severity `CRITICAL`, lockMode `ACCESS EXCLUSIVE`.

## REQ-AST-009: Destructive Rename/Drop Detection (LOCK-007)
WHEN a migration contains `ALTER TABLE ... DROP COLUMN`, `RENAME COLUMN`, or `RENAME TABLE`, THE SYSTEM SHALL return a finding with ruleCode `LOCK-007`, severity `HIGH`, lockMode `ACCESS EXCLUSIVE`.

## REQ-AST-010: Missing Lock Timeout Detection (LOCK-008)
WHEN a migration modifies an existing table without a `SET lock_timeout` statement preceding it, THE SYSTEM SHALL return a finding with ruleCode `LOCK-008`, severity `HIGH`.

## REQ-AST-011: VACUUM FULL / CLUSTER Detection (LOCK-009)
WHEN a migration contains `VACUUM FULL` or `CLUSTER`, THE SYSTEM SHALL return a finding with ruleCode `LOCK-009`, severity `HIGH`, lockMode `ACCESS EXCLUSIVE`.

## REQ-AST-012: CONCURRENTLY in Transaction (LOCK-010)
WHEN a migration contains `CREATE INDEX CONCURRENTLY` or `DROP INDEX CONCURRENTLY` inside an explicit `BEGIN ... COMMIT` block, THE SYSTEM SHALL return a finding with ruleCode `LOCK-010`, severity `MEDIUM`.

## REQ-AST-013: Structured JSON Output
WHEN analysis completes, THE SYSTEM SHALL return a JSON array where each element contains: `id`, `ruleCode`, `severity`, `lockMode`, `blocksReads`, `blocksWrites`, `tableRewrite`, `statementIndex`, `line`, `sql`, `explanation`, `safePattern`.

## REQ-AST-014: Deterministic Output
WHEN the same SQL input is analyzed twice, THE SYSTEM SHALL produce byte-identical JSON output both times.

## REQ-AST-015: WASM Export
WHEN compiled to WebAssembly, THE SYSTEM SHALL export `analyzeSQL(sql: string): string` and `rewriteSQL(sql: string): string` as global JavaScript functions callable from the browser.

## REQ-AST-016: Property-Based Test Coverage
WHEN tested with `pgregory.net/rapid`, THE SYSTEM SHALL pass: parser totality (no panics on arbitrary input), rewrite safety invariant (Analyze(Rewrite(sql)) produces zero CRITICAL findings), and deterministic serialization.
