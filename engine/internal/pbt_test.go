package internal_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/schemaseance/schemaseance/engine/internal/locks"
	"github.com/schemaseance/schemaseance/engine/internal/rewriter"
	"github.com/schemaseance/schemaseance/engine/internal/sqlast"
	"pgregory.net/rapid"
)

func TestParserTotality(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		input := rapid.String().Draw(rt, "sql")
		defer func() {
			if r := recover(); r != nil {
				rt.Fatalf("parser panicked on input %q: %v", input, r)
			}
		}()
		sqlast.Parse(input)
	})
}

func TestLexerTotality(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		input := rapid.SliceOf(rapid.Byte()).Draw(rt, "bytes")
		defer func() {
			if r := recover(); r != nil {
				rt.Fatalf("lexer panicked on bytes: %v", r)
			}
		}()
		sqlast.Tokenize(string(input))
	})
}

func TestDeterministicSerialization(t *testing.T) {
	samples := []string{
		"ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(32);",
		"CREATE INDEX idx_name ON orders(user_id);",
		"ALTER TABLE payments ALTER COLUMN amount SET NOT NULL;",
		"BEGIN; CREATE INDEX CONCURRENTLY idx ON t(c); COMMIT;",
		"DROP INDEX idx_old;",
	}
	rapid.Check(t, func(rt *rapid.T) {
		idx := rapid.IntRange(0, len(samples)-1).Draw(rt, "idx")
		sql := samples[idx]

		b1, err := locks.AnalyzeSQL(sql)
		if err != nil {
			return
		}
		b2, err := locks.AnalyzeSQL(sql)
		if err != nil {
			return
		}
		if string(b1) != string(b2) {
			rt.Fatalf("non-deterministic output for %q:\nrun1: %s\nrun2: %s", sql, b1, b2)
		}
	})
}

func TestRewriteSafetyInvariant(t *testing.T) {
	unsafeSQLs := []string{
		"ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(8);",
		"CREATE INDEX idx_orders_user ON orders(user_id);",
		"DROP INDEX idx_old_name;",
		"ALTER TABLE users ADD COLUMN uid UUID DEFAULT gen_random_uuid();",
		"ALTER TABLE payments ALTER COLUMN ref SET NOT NULL;",
		"ALTER TABLE events ADD CONSTRAINT chk_active CHECK (active IS NOT NULL);",
	}

	rapid.Check(t, func(rt *rapid.T) {
		idx := rapid.IntRange(0, len(unsafeSQLs)-1).Draw(rt, "idx")
		sql := unsafeSQLs[idx]

		plan, err := rewriter.Rewrite(sql)
		if err != nil {
			return
		}

		for phaseNum, statements := range [][]string{plan.Phase1, plan.Phase2, plan.Phase3} {
			if len(statements) == 0 {
				continue
			}
			phaseSQL := strings.Join(statements, "\n")
			data, err := locks.AnalyzeSQL(phaseSQL)
			if err != nil {
				continue
			}
			var findings []locks.Finding
			if err := json.Unmarshal(data, &findings); err != nil {
				continue
			}
			for _, f := range findings {
				if f.Severity == locks.SeverityCritical {
					rt.Fatalf("rewrite phase %d still contains CRITICAL finding %s for input %q",
						phaseNum+1, f.RuleCode, sql)
				}
			}
		}
	})
}
