# Expand-and-Contract Rewriter: Tasks

## Task 1: RewritePlan Type and Serialization
- Implement `engine/internal/rewriter/plan.go`.
- Covers REQ-RWR-006, REQ-RWR-007.

## Task 2: Rule-Specific Rewrite Functions
- Implement `engine/internal/rewriter/rewriter.go` with dispatch and all rule rewrites.
- Covers REQ-RWR-001 through REQ-RWR-012.
- Test: table-driven tests for each rule code's rewrite output.

## Task 3: Rewrite Safety Invariant (via PBT)
- The pbt_test.go property "Analyze(Rewrite(sql)) produces zero CRITICAL findings" verifies REQ-RWR-005.
