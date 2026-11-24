package rewriter

import (
	"fmt"
	"strings"

	"github.com/schemaseance/schemaseance/engine/internal/locks"
	"github.com/schemaseance/schemaseance/engine/internal/sqlast"
)

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}

func Rewrite(sql string) (*RewritePlan, error) {
	stmts, err := sqlast.Parse(sql)
	if err != nil {
		return nil, err
	}
	findings := locks.Analyze(stmts)

	plan := &RewritePlan{
		Phase1: []string{"SET lock_timeout = '2s';", "SET statement_timeout = '30s';"},
		Phase2: []string{},
		Phase3: []string{},
	}

	for _, f := range findings {
		switch f.RuleCode {
		case "LOCK-001":
			applyLock001(plan, f, stmts)
		case "LOCK-002":
			applyLock002(plan, f, stmts)
		case "LOCK-003":
			applyLock003(plan, f, stmts)
		case "LOCK-004":
			applyLock004(plan, f, stmts)
		case "LOCK-005":
			applyLock005(plan, f, stmts)
		case "LOCK-006":
			applyLock006(plan, f, stmts)
		case "LOCK-007":
			applyLock007(plan, f, stmts)
		case "LOCK-009":
			applyLock009(plan, f)
		}
	}

	if len(plan.Phase1) == 2 && len(plan.Phase2) == 0 && len(plan.Phase3) == 0 {
		plan.Phase1 = []string{}
	}

	return plan, nil
}

func applyLock001(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.AlterTableStmt)
	if !ok {
		return
	}
	for _, action := range stmt.Actions {
		a, ok := action.(*sqlast.AlterColumnTypeAction)
		if !ok {
			continue
		}
		shadowCol := a.Column + "_new"
		plan.Phase1 = append(plan.Phase1,
			fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s;", quoteIdent(stmt.Table), quoteIdent(shadowCol), a.NewType),
		)
		plan.Phase2 = append(plan.Phase2,
			fmt.Sprintf("UPDATE %s SET %s = %s::%s WHERE %s IS NOT NULL;", quoteIdent(stmt.Table), quoteIdent(shadowCol), quoteIdent(a.Column), a.NewType, quoteIdent(a.Column)),
			fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT chk_%s_type CHECK (%s IS NOT NULL OR %s IS NULL) NOT VALID;", quoteIdent(stmt.Table), shadowCol, quoteIdent(shadowCol), quoteIdent(a.Column)),
			fmt.Sprintf("ALTER TABLE %s VALIDATE CONSTRAINT chk_%s_type;", quoteIdent(stmt.Table), shadowCol),
		)
		plan.Phase3 = append(plan.Phase3,
			fmt.Sprintf("SET lock_timeout = '2s';"),
			fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s;", quoteIdent(stmt.Table), quoteIdent(a.Column)),
			fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s;", quoteIdent(stmt.Table), quoteIdent(shadowCol), quoteIdent(a.Column)),
		)
	}
}

func applyLock002(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.CreateIndexStmt)
	if !ok {
		return
	}
	uniqueKw := ""
	if stmt.Unique {
		uniqueKw = "UNIQUE "
	}
	name := stmt.Name
	if name == "" {
		name = fmt.Sprintf("idx_%s_new", strings.ToLower(stmt.Table))
	}
	colClause := ""
	if stmt.Columns != "" {
		colClause = fmt.Sprintf(" (%s)", stmt.Columns)
	}
	plan.Phase1 = append(plan.Phase1,
		fmt.Sprintf("CREATE %sINDEX CONCURRENTLY %s ON %s%s;", uniqueKw, quoteIdent(name), quoteIdent(stmt.Table), colClause),
	)
}

func applyLock003(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.DropIndexStmt)
	if !ok {
		return
	}
	plan.Phase1 = append(plan.Phase1,
		fmt.Sprintf("DROP INDEX CONCURRENTLY IF EXISTS %s;", quoteIdent(stmt.Name)),
	)
}

func applyLock004(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.AlterTableStmt)
	if !ok {
		return
	}
	for _, action := range stmt.Actions {
		a, ok := action.(*sqlast.AddColumnAction)
		if !ok || !a.HasDefault || !a.IsVolatileDefault {
			continue
		}
		plan.Phase1 = append(plan.Phase1,
			fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s;", quoteIdent(stmt.Table), quoteIdent(a.Column), a.DataType),
		)
		plan.Phase2 = append(plan.Phase2,
			fmt.Sprintf("UPDATE %s SET %s = %s WHERE %s IS NULL;", quoteIdent(stmt.Table), quoteIdent(a.Column), a.DefaultExpr, quoteIdent(a.Column)),
		)
		plan.Phase3 = append(plan.Phase3,
			fmt.Sprintf("SET lock_timeout = '2s';"),
			fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT %s;", quoteIdent(stmt.Table), quoteIdent(a.Column), a.DefaultExpr),
		)
	}
}

func applyLock005(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.AlterTableStmt)
	if !ok {
		return
	}
	for _, action := range stmt.Actions {
		a, ok := action.(*sqlast.AlterColumnSetNotNullAction)
		if !ok {
			continue
		}
		constraintName := fmt.Sprintf("chk_%s_%s_not_null", stmt.Table, a.Column)
		plan.Phase1 = append(plan.Phase1,
			fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s CHECK (%s IS NOT NULL) NOT VALID;", quoteIdent(stmt.Table), constraintName, quoteIdent(a.Column)),
		)
		plan.Phase2 = append(plan.Phase2,
			fmt.Sprintf("ALTER TABLE %s VALIDATE CONSTRAINT %s;", quoteIdent(stmt.Table), constraintName),
		)
		plan.Phase3 = append(plan.Phase3,
			fmt.Sprintf("SET lock_timeout = '2s';"),
			// VALIDATE CONSTRAINT is included here so Phase 3 is self-contained and safe.
			// VALIDATE CONSTRAINT uses SHARE UPDATE EXCLUSIVE (not ACCESS EXCLUSIVE), so it is safe to repeat.
			fmt.Sprintf("ALTER TABLE %s VALIDATE CONSTRAINT %s;", quoteIdent(stmt.Table), constraintName),
			fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET NOT NULL;", quoteIdent(stmt.Table), quoteIdent(a.Column)),
			fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT %s;", quoteIdent(stmt.Table), constraintName),
		)
	}
}

func applyLock006(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.AlterTableStmt)
	if !ok {
		return
	}
	for _, action := range stmt.Actions {
		a, ok := action.(*sqlast.AddConstraintAction)
		if !ok || a.NotValid {
			continue
		}
		if a.ConstraintType != "CHECK" && a.ConstraintType != "FOREIGN KEY" {
			continue
		}
		notValidSQL := buildConstraintSQL(quoteIdent(stmt.Table), a) + " NOT VALID;"
		plan.Phase1 = append(plan.Phase1, notValidSQL)
		if a.ConstraintName != "" {
			plan.Phase2 = append(plan.Phase2,
				fmt.Sprintf("ALTER TABLE %s VALIDATE CONSTRAINT %s;", quoteIdent(stmt.Table), a.ConstraintName),
			)
		}
	}
}

func applyLock007(plan *RewritePlan, f locks.Finding, stmts []sqlast.Statement) {
	stmt, ok := stmts[f.StatementIndex].(*sqlast.AlterTableStmt)
	if !ok {
		return
	}
	comment := fmt.Sprintf("-- LOCK-007: DROP/RENAME on %s requires a two-phase deploy.", stmt.Table)
	comment += "\n-- Phase 3 (below) runs only after all v1 application instances have been retired."
	plan.Phase1 = append(plan.Phase1, comment)
	for _, action := range stmt.Actions {
		switch a := action.(type) {
		case *sqlast.DropColumnAction:
			plan.Phase3 = append(plan.Phase3,
				fmt.Sprintf("SET lock_timeout = '2s';"),
				fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS %s;", quoteIdent(stmt.Table), quoteIdent(a.Column)),
			)
		case *sqlast.RenameColumnAction:
			plan.Phase3 = append(plan.Phase3,
				fmt.Sprintf("SET lock_timeout = '2s';"),
				fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s;", quoteIdent(stmt.Table), quoteIdent(a.OldName), quoteIdent(a.NewName)),
			)
		case *sqlast.RenameTableAction:
			plan.Phase3 = append(plan.Phase3,
				fmt.Sprintf("SET lock_timeout = '2s';"),
				fmt.Sprintf("ALTER TABLE %s RENAME TO %s;", quoteIdent(stmt.Table), quoteIdent(a.NewName)),
			)
		}
	}
}

func applyLock009(plan *RewritePlan, f locks.Finding) {
	comment := "-- LOCK-009: VACUUM FULL / CLUSTER must run outside migration scripts, during a maintenance window."
	comment += "\n-- Use pg_repack for online table repack without ACCESS EXCLUSIVE on the full table."
	plan.Phase1 = append(plan.Phase1, comment)
}

func buildConstraintSQL(table string, a *sqlast.AddConstraintAction) string {
	nameClause := ""
	if a.ConstraintName != "" {
		nameClause = fmt.Sprintf("CONSTRAINT %s ", a.ConstraintName)
	}
	switch a.ConstraintType {
	case "CHECK":
		return fmt.Sprintf("ALTER TABLE %s ADD %sCHECK (%s)", table, nameClause, a.Expression)
	case "FOREIGN KEY":
		fkBody := a.FKDefinition
		if fkBody == "" {
			fkBody = "(id) REFERENCES other(id)"
		}
		return fmt.Sprintf("ALTER TABLE %s ADD %sFOREIGN KEY %s", table, nameClause, fkBody)
	}
	return ""
}

func RewriteSQL(sql string) ([]byte, error) {
	plan, err := Rewrite(sql)
	if err != nil {
		return nil, err
	}
	return plan.Marshal()
}
