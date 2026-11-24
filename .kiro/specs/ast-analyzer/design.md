# AST Analyzer: Design

## Architecture

```
engine/internal/sqlast/
  lexer.go         - Byte-by-byte tokenizer producing Token stream
  parser.go        - Recursive-descent parser producing []Statement
  types.go         - Token, Statement, AlterTableStmt, CreateIndexStmt, etc.

engine/internal/locks/
  rules.go         - Rule interface + 10 concrete rule implementations
  classifier.go    - Runs all rules against []Statement, returns []Finding
  finding.go       - Finding struct with JSON tags matching REQ-AST-013

engine/cmd/wasm/main.go  - syscall/js exports: analyzeSQL, rewriteSQL
engine/cmd/cli/main.go   - CLI: schemaseance analyze <file>, schemaseance rewrite <file>
```

## Token Types

```go
type TokenType int
const (
    EOF, ILLEGAL, IDENT, STRING, NUMBER, SEMICOLON,
    LPAREN, RPAREN, COMMA, DOT, EQ,
    // Keywords
    CREATE, INDEX, UNIQUE, CONCURRENTLY, TABLE, ALTER,
    ADD, DROP, COLUMN, CONSTRAINT, CHECK, FOREIGN, KEY,
    NOT, NULL, VALID, DEFAULT, SET, TYPE, RENAME, TO,
    BEGIN, COMMIT, VACUUM, FULL, CLUSTER, PRIMARY,
    VALIDATE, REFERENCES, BIGINT, INT, TEXT, VARCHAR, BOOLEAN
)
```

## Statement AST Nodes

```go
type Statement interface{ stmtNode(); Line() int }
type AlterTableStmt struct { Table string; Actions []AlterAction; LineNum int }
type CreateIndexStmt struct { Concurrent bool; Unique bool; Table string; LineNum int }
type DropIndexStmt   struct { Concurrent bool; Name string; LineNum int }
type SetStmt         struct { Param string; Value string; LineNum int }
type BeginStmt       struct { LineNum int }
type CommitStmt      struct { LineNum int }
type VacuumStmt      struct { Full bool; Table string; LineNum int }
type ClusterStmt     struct { LineNum int }
```

## Finding JSON Shape

```go
type Finding struct {
    ID             string `json:"id"`
    RuleCode       string `json:"ruleCode"`
    Severity       string `json:"severity"`
    LockMode       string `json:"lockMode"`
    BlocksReads    bool   `json:"blocksReads"`
    BlocksWrites   bool   `json:"blocksWrites"`
    TableRewrite   bool   `json:"tableRewrite"`
    StatementIndex int    `json:"statementIndex"`
    Line           int    `json:"line"`
    SQL            string `json:"sql"`
    Explanation    string `json:"explanation"`
    SafePattern    string `json:"safePattern"`
}
```

## Lock Timeout Detection

The classifier tracks whether a `SET lock_timeout = '...'` statement appeared before each table-modifying DDL statement. If no such SET precedes a DDL, LOCK-008 fires.

## Transaction Block Tracking

The classifier tracks `BEGIN` and `COMMIT` statements to determine whether a `CREATE INDEX CONCURRENTLY` or `DROP INDEX CONCURRENTLY` appears inside a transaction block.

## Volatile Function List

Volatile default detection checks the DEFAULT expression against a fixed set:
`gen_random_uuid`, `random`, `clock_timestamp`, `uuid_generate_v4`, `now` (note: `now()` is stable in PG, `clock_timestamp()` is volatile).

## WASM Bridge

`engine/cmd/wasm/main.go` registers two global JS functions using `syscall/js`:
- `analyzeSQL(sql)`: parses, classifies, returns JSON string of `[]Finding`
- `rewriteSQL(sql)`: parses, rewrites, returns JSON string of `{phases: string[][]}`
