# AST Analyzer: Tasks

## Task 1: Lexer
- Implement `engine/internal/sqlast/lexer.go` tokenizing PostgreSQL DDL keywords, identifiers, strings, numbers, and punctuation.
- Covers REQ-AST-001.
- Test: `TestLexerTotality` in `engine/internal/sqlast/lexer_test.go`.

## Task 2: Parser
- Implement `engine/internal/sqlast/parser.go` producing `[]Statement` from token stream.
- Covers REQ-AST-002.
- Test: `TestParserKnownStatements` in `engine/internal/sqlast/parser_test.go`.

## Task 3: Lock Rules 001-005
- Implement LOCK-001 through LOCK-005 in `engine/internal/locks/rules.go`.
- Covers REQ-AST-003 through REQ-AST-007.
- Test: table-driven unit tests for each rule code.

## Task 4: Lock Rules 006-010
- Implement LOCK-006 through LOCK-010 in `engine/internal/locks/rules.go`.
- Covers REQ-AST-008 through REQ-AST-012.
- Test: table-driven unit tests for each rule code.

## Task 5: Classifier + JSON Output
- Implement `engine/internal/locks/classifier.go` running all rules, returning `[]Finding`.
- Covers REQ-AST-013 and REQ-AST-014.
- Test: `TestClassifierDeterministic`.

## Task 6: Property-Based Tests
- Implement `engine/internal/pbt_test.go` using `pgregory.net/rapid`.
- Covers REQ-AST-016.
- Three properties: parser totality, rewrite safety invariant, deterministic serialization.

## Task 7: CLI Entry Point
- Implement `engine/cmd/cli/main.go` with subcommands `analyze` and `rewrite`.

## Task 8: WASM Entry Point
- Implement `engine/cmd/wasm/main.go` exporting `analyzeSQL` and `rewriteSQL`.
- Covers REQ-AST-015.
