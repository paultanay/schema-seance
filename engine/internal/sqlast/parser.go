package sqlast

import (
	"strings"
)

type Parser struct {
	tokens []Token
	pos    int
}

func NewParser(tokens []Token) *Parser {
	return &Parser{tokens: tokens, pos: 0}
}

func (p *Parser) peek() Token {
	if p.pos >= len(p.tokens) {
		return Token{Type: EOF}
	}
	return p.tokens[p.pos]
}

func (p *Parser) peekN(n int) Token {
	if p.pos+n >= len(p.tokens) {
		return Token{Type: EOF}
	}
	return p.tokens[p.pos+n]
}

func (p *Parser) advance() Token {
	t := p.peek()
	if p.pos < len(p.tokens) {
		p.pos++
	}
	return t
}

func (p *Parser) expect(tt TokenType) (Token, bool) {
	t := p.peek()
	if t.Type != tt {
		return t, false
	}
	p.advance()
	return t, true
}

func (p *Parser) skipUntilSemicolon() {
	for {
		t := p.peek()
		if t.Type == EOF || t.Type == SEMICOLON {
			if t.Type == SEMICOLON {
				p.advance()
			}
			return
		}
		p.advance()
	}
}

func (p *Parser) currentLine() int {
	return p.peek().Line
}

func (p *Parser) consumeParenExpr() string {
	var sb strings.Builder
	depth := 0
	for {
		t := p.peek()
		if t.Type == EOF {
			break
		}
		if t.Type == LPAREN {
			depth++
			sb.WriteString("(")
			p.advance()
			continue
		}
		if t.Type == RPAREN {
			if depth == 0 {
				break
			}
			depth--
			sb.WriteString(")")
			p.advance()
			if depth == 0 {
				break
			}
			continue
		}
		if t.Type == SEMICOLON && depth == 0 {
			break
		}
		sb.WriteString(t.Literal)
		sb.WriteString(" ")
		p.advance()
	}
	return strings.TrimSpace(sb.String())
}

func (p *Parser) consumeUntil(stop ...TokenType) string {
	stopSet := make(map[TokenType]bool)
	for _, s := range stop {
		stopSet[s] = true
	}
	var sb strings.Builder
	depth := 0
	for {
		t := p.peek()
		if t.Type == EOF {
			break
		}
		if t.Type == LPAREN {
			depth++
		}
		if t.Type == RPAREN {
			if depth == 0 {
				break
			}
			depth--
		}
		if depth == 0 && stopSet[t.Type] {
			break
		}
		sb.WriteString(t.Literal)
		sb.WriteString(" ")
		p.advance()
	}
	return strings.TrimSpace(sb.String())
}

var volatileFunctions = map[string]bool{
	"gen_random_uuid":  true,
	"random":           true,
	"clock_timestamp":  true,
	"uuid_generate_v4": true,
	"uuid_generate_v1": true,
	"uuid_generate_v1mc": true,
	"txid_current":     true,
	"pg_backend_pid":   true,
}

func isVolatileDefault(expr string) bool {
	// consumeUntil joins tokens with spaces: "gen_random_uuid ( )".
	// Compact whitespace so real calls match fn+"(" while string literals
	// like "a random note" (no parens) do not.
	compact := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(expr)), " ", "")
	for fn := range volatileFunctions {
		if strings.Contains(compact, fn+"(") {
			return true
		}
	}
	return false
}

func (p *Parser) parseDataType() string {
	var parts []string
	t := p.peek()
	switch t.Type {
	case VARCHAR, CHAR:
		p.advance()
		parts = append(parts, t.Literal)
		if p.peek().Type == LPAREN {
			p.advance()
			inner := p.consumeUntil(RPAREN)
			p.advance() // consume RPAREN
			parts = append(parts, "("+inner+")")
		}
	case DOUBLE:
		p.advance()
		parts = append(parts, t.Literal)
		if p.peek().Type == PRECISION {
			p.advance()
			parts = append(parts, "precision")
		}
	case TIMESTAMP, TIMESTAMPTZ:
		p.advance()
		parts = append(parts, t.Literal)
		if p.peek().Type == WITH || p.peek().Type == WITHOUT {
			tz := p.advance()
			parts = append(parts, tz.Literal)
			if p.peek().Type == TIME {
				zone := p.advance()
				parts = append(parts, zone.Literal)
				if p.peek().Type == IDENT && strings.EqualFold(p.peek().Literal, "zone") {
					p.advance()
					parts = append(parts, "zone")
				}
			}
		}
	case NUMERIC, DECIMAL:
		p.advance()
		parts = append(parts, t.Literal)
		if p.peek().Type == LPAREN {
			p.advance()
			inner := p.consumeUntil(RPAREN)
			p.advance()
			parts = append(parts, "("+inner+")")
		}
	case TEXT, INT, INTEGER, BIGINT, SMALLINT, BOOLEAN, BOOL,
		FLOAT, SERIAL, BIGSERIAL, UUID, DATE, TIME, JSONB, JSON, BYTEA:
		p.advance()
		parts = append(parts, t.Literal)
	case IDENT:
		p.advance()
		parts = append(parts, t.Literal)
		if p.peek().Type == LPAREN {
			p.advance()
			inner := p.consumeUntil(RPAREN)
			p.advance()
			parts = append(parts, "("+inner+")")
		}
	}
	return strings.Join(parts, "")
}

func (p *Parser) parseAlterAction() AlterAction {
	t := p.peek()
	switch t.Type {
	case ADD:
		p.advance()
		return p.parseAddAction()
	case DROP:
		p.advance()
		if p.peek().Type == COLUMN {
			p.advance()
			if p.peek().Type == IF {
				p.advance()
				if p.peek().Type == EXISTS {
					p.advance()
				}
			}
			col := p.advance()
			return &DropColumnAction{Column: col.Literal}
		}
		p.consumeUntil(SEMICOLON, COMMA, RPAREN)
		return nil
	case ALTER:
		p.advance()
		return p.parseAlterColumnAction()
	case RENAME:
		p.advance()
		return p.parseRenameAction()
	case VALIDATE:
		p.advance()
		if p.peek().Type == CONSTRAINT {
			p.advance()
			name := p.advance()
			return &ValidateConstraintAction{ConstraintName: name.Literal}
		}
		return nil
	case SET:
		p.advance()
		p.consumeUntil(SEMICOLON, COMMA)
		return nil
	default:
		p.consumeUntil(SEMICOLON, COMMA)
		return nil
	}
}

func (p *Parser) parseAddAction() AlterAction {
	if p.peek().Type == COLUMN {
		p.advance()
		if p.peek().Type == IF {
			p.advance()
			if p.peek().Type == NOT {
				p.advance()
			}
			if p.peek().Type == EXISTS {
				p.advance()
			}
		}
		col := p.advance()
		dataType := p.parseDataType()
		action := &AddColumnAction{
			Column:     col.Literal,
			DataType:   dataType,
			IsNullable: true,
		}
		for {
			t := p.peek()
			if t.Type == SEMICOLON || t.Type == COMMA || t.Type == EOF || t.Type == RPAREN {
				break
			}
			if t.Type == DEFAULT {
				p.advance()
				start := p.pos
				exprTokens := p.consumeUntil(SEMICOLON, COMMA, NOT, NULL, UNIQUE, PRIMARY, CHECK, REFERENCES)
				_ = start
				action.HasDefault = true
				action.DefaultExpr = exprTokens
				action.IsVolatileDefault = isVolatileDefault(exprTokens)
				continue
			}
			if t.Type == NOT {
				p.advance()
				if p.peek().Type == NULL {
					p.advance()
					action.IsNullable = false
				}
				continue
			}
			if t.Type == NULL {
				p.advance()
				action.IsNullable = true
				continue
			}
			p.advance()
		}
		return action
	}

	if p.peek().Type == CONSTRAINT {
		p.advance()
		nameT := p.advance()
		name := nameT.Literal
		if p.peek().Type == IDENT || p.peek().Type == PRIMARY {
			name = nameT.Literal
		}
		return p.parseConstraintDef(name)
	}

	t := p.peek()
	switch t.Type {
	case CHECK, PRIMARY, UNIQUE, FOREIGN:
		return p.parseConstraintDef("")
	}

	p.consumeUntil(SEMICOLON, COMMA)
	return nil
}

func (p *Parser) parseConstraintDef(name string) AlterAction {
	t := p.peek()
	action := &AddConstraintAction{ConstraintName: name}

	switch t.Type {
	case CHECK:
		p.advance()
		action.ConstraintType = "CHECK"
		if p.peek().Type == LPAREN {
			p.advance()
			action.Expression = p.consumeParenExpr()
			if p.peek().Type == RPAREN {
				p.advance()
			}
		}
	case FOREIGN:
		p.advance()
		if p.peek().Type == KEY {
			p.advance()
		}
		action.ConstraintType = "FOREIGN KEY"
		action.FKDefinition = p.consumeUntil(NOT, SEMICOLON, COMMA)
	case PRIMARY:
		p.advance()
		if p.peek().Type == KEY {
			p.advance()
		}
		action.ConstraintType = "PRIMARY KEY"
		if p.peek().Type == LPAREN {
			p.advance()
			p.consumeUntil(RPAREN)
			p.advance()
		}
	case UNIQUE:
		p.advance()
		action.ConstraintType = "UNIQUE"
		if p.peek().Type == LPAREN {
			p.advance()
			p.consumeUntil(RPAREN)
			p.advance()
		}
	}

	if p.peek().Type == NOT {
		p.advance()
		if p.peek().Type == VALID {
			p.advance()
			action.NotValid = true
		}
	}

	return action
}

func (p *Parser) parseAlterColumnAction() AlterAction {
	if p.peek().Type == COLUMN {
		p.advance()
	}
	col := p.advance()

	t := p.peek()
	switch t.Type {
	case TYPE, SET:
		if t.Type == TYPE {
			p.advance()
			newType := p.parseDataType()
			p.consumeUntil(SEMICOLON, COMMA)
			return &AlterColumnTypeAction{Column: col.Literal, NewType: newType}
		}
		if t.Type == SET {
			p.advance()
			if p.peek().Type == NOT {
				p.advance()
				if p.peek().Type == NULL {
					p.advance()
					return &AlterColumnSetNotNullAction{Column: col.Literal}
				}
			}
			p.consumeUntil(SEMICOLON, COMMA)
			return nil
		}
	}
	p.consumeUntil(SEMICOLON, COMMA)
	return nil
}

func (p *Parser) parseRenameAction() AlterAction {
	if p.peek().Type == COLUMN {
		p.advance()
	}
	if p.peek().Type == TO {
		// RENAME TO <table>
		p.advance()
		newName := p.advance()
		return &RenameTableAction{NewName: newName.Literal}
	}
	oldName := p.advance()
	if p.peek().Type == TO {
		p.advance()
		newName := p.advance()
		return &RenameColumnAction{OldName: oldName.Literal, NewName: newName.Literal}
	}
	return nil
}

func Parse(input string) ([]Statement, error) {
	tokens := Tokenize(input)
	p := NewParser(tokens)
	var stmts []Statement

	for {
		p.skipWhitespace()
		if p.peek().Type == EOF {
			break
		}
		if p.peek().Type == SEMICOLON {
			p.advance()
			continue
		}

		stmt := p.parseStatement()
		if stmt != nil {
			stmts = append(stmts, stmt)
		}
	}
	return stmts, nil
}

func (p *Parser) skipWhitespace() {
	for p.peek().Type == SEMICOLON {
		p.advance()
	}
}

func (p *Parser) parseStatement() Statement {
	t := p.peek()
	line := t.Line

	switch t.Type {
	case ALTER:
		p.advance()
		if p.peek().Type == TABLE {
			p.advance()
			if p.peek().Type == ONLY {
				p.advance()
			}
			if p.peek().Type == IF {
				p.advance()
				if p.peek().Type == EXISTS {
					p.advance()
				}
			}
			tableName := p.advance()
			stmt := &AlterTableStmt{Table: tableName.Literal, Line: line}
			action := p.parseAlterAction()
			if action != nil {
				stmt.Actions = append(stmt.Actions, action)
			}
			for p.peek().Type == COMMA {
				p.advance()
				action = p.parseAlterAction()
				if action != nil {
					stmt.Actions = append(stmt.Actions, action)
				}
			}
			if p.peek().Type == SEMICOLON {
				p.advance()
			}
			return stmt
		}
		p.skipUntilSemicolon()
		return &UnknownStmt{Raw: "ALTER ...", Line: line}

	case CREATE:
		p.advance()
		unique := false
		if p.peek().Type == UNIQUE {
			unique = true
			p.advance()
		}
		if p.peek().Type == INDEX {
			p.advance()
			concurrent := false
			if p.peek().Type == CONCURRENTLY {
				concurrent = true
				p.advance()
			}
			if p.peek().Type == IF {
				p.advance()
				if p.peek().Type == NOT {
					p.advance()
				}
				if p.peek().Type == EXISTS {
					p.advance()
				}
			}
			nameT := p.peek()
			indexName := ""
			if nameT.Type == IDENT {
				indexName = nameT.Literal
				p.advance()
			}
			if p.peek().Type == ON {
				p.advance()
			}
			if p.peek().Type == ONLY {
				p.advance()
			}
			tableT := p.advance()
			columns := ""
			if p.peek().Type == LPAREN {
				p.advance()
				columns = p.consumeUntil(RPAREN)
				p.advance()
			}
			p.skipUntilSemicolon()
			return &CreateIndexStmt{
				Name:       indexName,
				Table:      tableT.Literal,
				Columns:    columns,
				Concurrent: concurrent,
				Unique:     unique,
				Line:       line,
			}
		}
		p.skipUntilSemicolon()
		return &UnknownStmt{Raw: "CREATE ...", Line: line}

	case DROP:
		p.advance()
		if p.peek().Type == INDEX {
			p.advance()
			concurrent := false
			if p.peek().Type == CONCURRENTLY {
				concurrent = true
				p.advance()
			}
			if p.peek().Type == IF {
				p.advance()
				if p.peek().Type == EXISTS {
					p.advance()
				}
			}
			nameT := p.advance()
			p.skipUntilSemicolon()
			return &DropIndexStmt{Name: nameT.Literal, Concurrent: concurrent, Line: line}
		}
		p.skipUntilSemicolon()
		return &UnknownStmt{Raw: "DROP ...", Line: line}

	case SET:
		p.advance()
		paramT := p.advance()
		param := paramT.Literal
		if p.peek().Type == EQ || p.peek().Type == TO {
			p.advance()
		}
		value := p.consumeUntil(SEMICOLON)
		if p.peek().Type == SEMICOLON {
			p.advance()
		}
		return &SetStmt{Param: strings.ToLower(param), Value: value, Line: line}

	case BEGIN:
		p.advance()
		if p.peek().Type == TRANSACTION {
			p.advance()
		}
		if p.peek().Type == SEMICOLON {
			p.advance()
		}
		return &BeginStmt{Line: line}

	case COMMIT:
		p.advance()
		if p.peek().Type == TRANSACTION {
			p.advance()
		}
		if p.peek().Type == SEMICOLON {
			p.advance()
		}
		return &CommitStmt{Line: line}

	case VACUUM:
		p.advance()
		full := false
		if p.peek().Type == FULL {
			full = true
			p.advance()
		}
		tableT := p.peek()
		tableName := ""
		if tableT.Type == IDENT {
			tableName = tableT.Literal
			p.advance()
		}
		p.skipUntilSemicolon()
		return &VacuumStmt{Full: full, Table: tableName, Line: line}

	case CLUSTER:
		p.advance()
		tableT := p.peek()
		tableName := ""
		if tableT.Type == IDENT {
			tableName = tableT.Literal
			p.advance()
		}
		p.skipUntilSemicolon()
		return &ClusterStmt{Table: tableName, Line: line}

	default:
		raw := t.Literal
		p.skipUntilSemicolon()
		return &UnknownStmt{Raw: raw, Line: line}
	}
}

