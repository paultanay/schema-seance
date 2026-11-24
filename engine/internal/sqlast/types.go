package sqlast

type TokenType int

const (
	EOF TokenType = iota
	ILLEGAL
	IDENT
	STRING
	NUMBER
	SEMICOLON
	LPAREN
	RPAREN
	COMMA
	DOT
	EQ
	LBRACKET
	RBRACKET

	// Keywords
	ALTER
	TABLE
	ADD
	DROP
	COLUMN
	CONSTRAINT
	CHECK
	FOREIGN
	KEY
	NOT
	NULL
	VALID
	DEFAULT
	SET
	TYPE
	RENAME
	TO
	BEGIN
	COMMIT
	VACUUM
	FULL
	CLUSTER
	CREATE
	INDEX
	UNIQUE
	CONCURRENTLY
	PRIMARY
	VALIDATE
	REFERENCES
	TRANSACTION
	NO_CHAIN
	LOCK_TIMEOUT
	STATEMENT_TIMEOUT
	CASCADE
	RESTRICT
	IF
	EXISTS
	ONLY
	USING
	WHERE
	ON
	WITH
	WITHOUT

	// Type keywords
	TEXT
	VARCHAR
	CHAR
	INT
	INTEGER
	BIGINT
	SMALLINT
	BOOLEAN
	BOOL
	FLOAT
	DOUBLE
	PRECISION
	NUMERIC
	DECIMAL
	SERIAL
	BIGSERIAL
	UUID
	TIMESTAMP
	TIMESTAMPTZ
	DATE
	TIME
	JSONB
	JSON
	BYTEA
)

var keywords = map[string]TokenType{
	"alter":             ALTER,
	"table":             TABLE,
	"add":               ADD,
	"drop":              DROP,
	"column":            COLUMN,
	"constraint":        CONSTRAINT,
	"check":             CHECK,
	"foreign":           FOREIGN,
	"key":               KEY,
	"not":               NOT,
	"null":              NULL,
	"valid":             VALID,
	"default":           DEFAULT,
	"set":               SET,
	"type":              TYPE,
	"rename":            RENAME,
	"to":                TO,
	"begin":             BEGIN,
	"commit":            COMMIT,
	"vacuum":            VACUUM,
	"full":              FULL,
	"cluster":           CLUSTER,
	"create":            CREATE,
	"index":             INDEX,
	"unique":            UNIQUE,
	"concurrently":      CONCURRENTLY,
	"primary":           PRIMARY,
	"validate":          VALIDATE,
	"references":        REFERENCES,
	"cascade":           CASCADE,
	"restrict":          RESTRICT,
	"if":                IF,
	"exists":            EXISTS,
	"only":              ONLY,
	"using":             USING,
	"where":             WHERE,
	"on":                ON,
	"with":              WITH,
	"without":           WITHOUT,
	"text":              TEXT,
	"varchar":           VARCHAR,
	"char":              CHAR,
	"int":               INT,
	"integer":           INTEGER,
	"bigint":            BIGINT,
	"smallint":          SMALLINT,
	"boolean":           BOOLEAN,
	"bool":              BOOL,
	"float":             FLOAT,
	"double":            DOUBLE,
	"precision":         PRECISION,
	"numeric":           NUMERIC,
	"decimal":           DECIMAL,
	"serial":            SERIAL,
	"bigserial":         BIGSERIAL,
	"uuid":              UUID,
	"timestamp":         TIMESTAMP,
	"timestamptz":       TIMESTAMPTZ,
	"date":              DATE,
	"time":              TIME,
	"jsonb":             JSONB,
	"json":              JSON,
	"bytea":             BYTEA,
	"lock_timeout":      LOCK_TIMEOUT,
	"statement_timeout": STATEMENT_TIMEOUT,
	"transaction":       TRANSACTION,
}

type Token struct {
	Type    TokenType
	Literal string
	Line    int
}

type Statement interface {
	stmtNode()
	LineNum() int
}

type AlterAction interface {
	alterActionNode()
}

type AlterTableStmt struct {
	Table   string
	Actions []AlterAction
	Line    int
}

func (s *AlterTableStmt) stmtNode()      {}
func (s *AlterTableStmt) LineNum() int   { return s.Line }

type AddColumnAction struct {
	Column      string
	DataType    string
	HasDefault  bool
	DefaultExpr string
	IsVolatileDefault bool
	IsNullable  bool
}

func (a *AddColumnAction) alterActionNode() {}

type AlterColumnTypeAction struct {
	Column  string
	NewType string
}

func (a *AlterColumnTypeAction) alterActionNode() {}

type AlterColumnSetNotNullAction struct {
	Column string
}

func (a *AlterColumnSetNotNullAction) alterActionNode() {}

type AddConstraintAction struct {
	ConstraintName string
	ConstraintType string // CHECK, FOREIGN KEY, UNIQUE, PRIMARY KEY
	Expression     string
	NotValid       bool
}

func (a *AddConstraintAction) alterActionNode() {}

type ValidateConstraintAction struct {
	ConstraintName string
}

func (a *ValidateConstraintAction) alterActionNode() {}

type DropColumnAction struct {
	Column string
}

func (a *DropColumnAction) alterActionNode() {}

type RenameColumnAction struct {
	OldName string
	NewName string
}

func (a *RenameColumnAction) alterActionNode() {}

type RenameTableAction struct {
	NewName string
}

func (a *RenameTableAction) alterActionNode() {}

type CreateIndexStmt struct {
	Name        string
	Table       string
	Concurrent  bool
	Unique      bool
	Line        int
}

func (s *CreateIndexStmt) stmtNode()    {}
func (s *CreateIndexStmt) LineNum() int { return s.Line }

type DropIndexStmt struct {
	Name       string
	Concurrent bool
	Line       int
}

func (s *DropIndexStmt) stmtNode()    {}
func (s *DropIndexStmt) LineNum() int { return s.Line }

type SetStmt struct {
	Param string
	Value string
	Line  int
}

func (s *SetStmt) stmtNode()    {}
func (s *SetStmt) LineNum() int { return s.Line }

type BeginStmt struct {
	Line int
}

func (s *BeginStmt) stmtNode()    {}
func (s *BeginStmt) LineNum() int { return s.Line }

type CommitStmt struct {
	Line int
}

func (s *CommitStmt) stmtNode()    {}
func (s *CommitStmt) LineNum() int { return s.Line }

type VacuumStmt struct {
	Full  bool
	Table string
	Line  int
}

func (s *VacuumStmt) stmtNode()    {}
func (s *VacuumStmt) LineNum() int { return s.Line }

type ClusterStmt struct {
	Table string
	Line  int
}

func (s *ClusterStmt) stmtNode()    {}
func (s *ClusterStmt) LineNum() int { return s.Line }

type UnknownStmt struct {
	Raw  string
	Line int
}

func (s *UnknownStmt) stmtNode()    {}
func (s *UnknownStmt) LineNum() int { return s.Line }
