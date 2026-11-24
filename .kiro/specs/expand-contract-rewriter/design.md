# Expand-and-Contract Rewriter: Design

## Module

```
engine/internal/rewriter/
  rewriter.go    - Rewrite(findings []Finding, stmts []Statement) -> RewritePlan
  plan.go        - RewritePlan struct with JSON serialization
```

## RewritePlan

```go
type RewritePlan struct {
    Phase1 []string `json:"phase1"` // Expand: shadow columns, CONCURRENTLY indexes, NOT VALID constraints
    Phase2 []string `json:"phase2"` // Backfill: UPDATE chunks, VALIDATE CONSTRAINT
    Phase3 []string `json:"phase3"` // Contract: rename, drop old artifacts
}
```

## Rewrite Dispatch

For each finding, dispatch to a rule-specific rewrite function:
- `LOCK-001` -> `rewriteTypeChange`
- `LOCK-002` -> `rewriteIndexWithoutConcurrently`
- `LOCK-003` -> `rewriteDropIndexWithoutConcurrently`
- `LOCK-004` -> `rewriteVolatileDefault`
- `LOCK-005` -> `rewriteSetNotNull`
- `LOCK-006` -> `rewriteUnvalidatedConstraint`
- `LOCK-007` -> no Phase 1/2/3 generated (application-level concern, comment explaining v2 deploy requirement)
- `LOCK-008` -> prepend `SET lock_timeout = '2s'; SET statement_timeout = '30s';` to Phase 1

## Example: LOCK-002 Rewrite

Input: `CREATE INDEX idx_orders_user ON orders(user_id);`

Phase 1:
```sql
SET lock_timeout = '2s';
CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);
```
Phase 2: (empty - no backfill needed)
Phase 3: (empty - no cleanup needed)

## Example: LOCK-005 Rewrite

Input: `ALTER TABLE payments ALTER COLUMN invoice_ref SET NOT NULL;`

Phase 1:
```sql
SET lock_timeout = '2s';
ALTER TABLE payments ADD CONSTRAINT chk_invoice_ref_not_null CHECK (invoice_ref IS NOT NULL) NOT VALID;
```
Phase 2:
```sql
ALTER TABLE payments VALIDATE CONSTRAINT chk_invoice_ref_not_null;
```
Phase 3:
```sql
SET lock_timeout = '2s';
ALTER TABLE payments ALTER COLUMN invoice_ref SET NOT NULL;
ALTER TABLE payments DROP CONSTRAINT chk_invoice_ref_not_null;
```
