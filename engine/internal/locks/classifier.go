package locks

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/schemaseance/schemaseance/engine/internal/sqlast"
)

type AnalysisResult struct {
	Findings []Finding `json:"findings"`
}

func Analyze(stmts []sqlast.Statement) []Finding {
	findingCounter = 0
	var findings []Finding

	inTransaction := false
	hasLockTimeout := false
	validatedConstraints := make(map[string]bool)

	for i, stmt := range stmts {
		switch s := stmt.(type) {
		case *sqlast.BeginStmt:
			inTransaction = true
		case *sqlast.CommitStmt:
			inTransaction = false
		case *sqlast.SetStmt:
			lower := strings.ToLower(s.Param)
			if lower == "lock_timeout" || lower == "'lock_timeout'" {
				hasLockTimeout = true
			}

		case *sqlast.VacuumStmt:
			if s.Full {
				if !hasLockTimeout {
					findings = append(findings, newFinding(
						"LOCK-008", SeverityHigh,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(), fmt.Sprintf("VACUUM FULL %s", s.Table),
						"No SET lock_timeout guard before DDL. A waiting DDL queues all subsequent transactions behind it, amplifying a 2s lock wait into minutes of downtime.",
						"Add SET lock_timeout = '2s'; SET statement_timeout = '30s'; before all DDL.",
					))
				}
				findings = append(findings, newFinding(
					"LOCK-009", SeverityHigh,
					"ACCESS EXCLUSIVE", true, true, true,
					i, s.LineNum(), fmt.Sprintf("VACUUM FULL %s", s.Table),
					"VACUUM FULL acquires ACCESS EXCLUSIVE and rewrites the entire table. Never run inside a migration script against a live table.",
					"Use pg_repack or schedule VACUUM FULL during a maintenance window outside migration scripts.",
				))
			}

		case *sqlast.ClusterStmt:
			if !hasLockTimeout {
				findings = append(findings, newFinding(
					"LOCK-008", SeverityHigh,
					"ACCESS EXCLUSIVE", true, true, false,
					i, s.LineNum(), fmt.Sprintf("CLUSTER %s", s.Table),
					"No SET lock_timeout guard before DDL.",
					"Add SET lock_timeout = '2s'; before all DDL.",
				))
			}
			findings = append(findings, newFinding(
				"LOCK-009", SeverityHigh,
				"ACCESS EXCLUSIVE", true, true, true,
				i, s.LineNum(), fmt.Sprintf("CLUSTER %s", s.Table),
				"CLUSTER acquires ACCESS EXCLUSIVE and rewrites the table in index order. Never run inside a migration script against a live table.",
				"Schedule CLUSTER during a maintenance window or use pg_repack.",
			))

		case *sqlast.CreateIndexStmt:
			if s.Concurrent {
				if inTransaction {
					findings = append(findings, newFinding(
						"LOCK-010", SeverityMedium,
						"SHARE UPDATE EXCLUSIVE", false, false, false,
						i, s.LineNum(), fmt.Sprintf("CREATE INDEX CONCURRENTLY %s ON %s", s.Name, s.Table),
						"CREATE INDEX CONCURRENTLY cannot run inside an explicit BEGIN...COMMIT transaction block. PostgreSQL raises an error at runtime.",
						"Move CREATE INDEX CONCURRENTLY outside the transaction block.",
					))
				}
			} else {
				if !hasLockTimeout {
					findings = append(findings, newFinding(
						"LOCK-008", SeverityHigh,
						"SHARE", false, true, false,
						i, s.LineNum(), fmt.Sprintf("CREATE INDEX %s ON %s", s.Name, s.Table),
						"No SET lock_timeout guard before DDL. A SHARE lock blocks all writes for the full index build duration.",
						"Add SET lock_timeout = '2s'; before all DDL.",
					))
				}
				findings = append(findings, newFinding(
					"LOCK-002", SeverityCritical,
					"SHARE", false, true, false,
					i, s.LineNum(), fmt.Sprintf("CREATE INDEX %s ON %s", s.Name, s.Table),
					"CREATE INDEX without CONCURRENTLY acquires a SHARE lock that blocks all INSERT, UPDATE, and DELETE operations for the entire index build duration.",
					"Use CREATE INDEX CONCURRENTLY outside any transaction block. Note: CONCURRENTLY takes longer and uses more CPU but does not block writes.",
				))
			}

		case *sqlast.DropIndexStmt:
			if s.Concurrent {
				if inTransaction {
					findings = append(findings, newFinding(
						"LOCK-010", SeverityMedium,
						"SHARE UPDATE EXCLUSIVE", false, false, false,
						i, s.LineNum(), fmt.Sprintf("DROP INDEX CONCURRENTLY %s", s.Name),
						"DROP INDEX CONCURRENTLY cannot run inside an explicit BEGIN...COMMIT transaction block.",
						"Move DROP INDEX CONCURRENTLY outside the transaction block.",
					))
				}
			} else {
				if !hasLockTimeout {
					findings = append(findings, newFinding(
						"LOCK-008", SeverityHigh,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(), fmt.Sprintf("DROP INDEX %s", s.Name),
						"No SET lock_timeout guard before DDL.",
						"Add SET lock_timeout = '2s'; before all DDL.",
					))
				}
				findings = append(findings, newFinding(
					"LOCK-003", SeverityCritical,
					"ACCESS EXCLUSIVE", true, true, false,
					i, s.LineNum(), fmt.Sprintf("DROP INDEX %s", s.Name),
					"DROP INDEX without CONCURRENTLY acquires ACCESS EXCLUSIVE, blocking all reads and writes.",
					"Use DROP INDEX CONCURRENTLY outside any transaction block.",
				))
			}

		case *sqlast.AlterTableStmt:
			tableSQL := fmt.Sprintf("ALTER TABLE %s", s.Table)

			// First pass: collect any VALIDATE CONSTRAINT actions in this statement
			for _, action := range s.Actions {
				if a, ok := action.(*sqlast.ValidateConstraintAction); ok {
					validatedConstraints[a.ConstraintName] = true
				}
			}

			if !hasLockTimeout {
				findings = append(findings, newFinding(
					"LOCK-008", SeverityHigh,
					"ACCESS EXCLUSIVE", true, true, false,
					i, s.LineNum(), tableSQL,
					"No SET lock_timeout guard before ALTER TABLE. A waiting DDL queues all subsequent transactions behind it.",
					"Add SET lock_timeout = '2s'; SET statement_timeout = '30s'; before all ALTER TABLE statements.",
				))
			}

			for _, action := range s.Actions {
				switch a := action.(type) {
				case *sqlast.AlterColumnTypeAction:
					findings = append(findings, newFinding(
						"LOCK-001", SeverityCritical,
						"ACCESS EXCLUSIVE", true, true, true,
						i, s.LineNum(),
						fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s TYPE %s", s.Table, a.Column, a.NewType),
						"ALTER COLUMN TYPE acquires ACCESS EXCLUSIVE and triggers a full table rewrite if the new type is not binary-compatible. All reads and writes are blocked for the duration of the rewrite.",
						"Use the Expand-and-Contract pattern: add a shadow column with the new type, backfill with UPDATE, validate a CHECK constraint, then swap and drop the old column.",
					))

				case *sqlast.AlterColumnSetNotNullAction:
					// Safe when a prior VALIDATE CONSTRAINT for a not-null check on this column exists
					checkName := fmt.Sprintf("chk_%s_%s_not_null", s.Table, a.Column)
					if validatedConstraints[checkName] {
						break
					}
					findings = append(findings, newFinding(
						"LOCK-005", SeverityCritical,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(),
						fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET NOT NULL", s.Table, a.Column),
						"SET NOT NULL without a prior validated CHECK constraint performs a full table scan under ACCESS EXCLUSIVE, blocking all reads and writes. Any existing NULL row causes the migration to fail and roll back.",
						"First add: ALTER TABLE "+s.Table+" ADD CONSTRAINT chk_"+a.Column+"_nn CHECK ("+a.Column+" IS NOT NULL) NOT VALID; then VALIDATE CONSTRAINT (uses SHARE UPDATE EXCLUSIVE); then SET NOT NULL.",
					))

				case *sqlast.AddColumnAction:
					if a.HasDefault {
						if a.IsVolatileDefault {
							findings = append(findings, newFinding(
								"LOCK-004", SeverityCritical,
								"ACCESS EXCLUSIVE", true, true, true,
								i, s.LineNum(),
								fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s DEFAULT %s", s.Table, a.Column, a.DataType, a.DefaultExpr),
								"ADD COLUMN with a volatile DEFAULT (e.g., gen_random_uuid(), random(), clock_timestamp()) triggers a full table rewrite to evaluate the function for every existing row.",
								"Add the column as nullable (no DEFAULT), then backfill with UPDATE in batches, then add the DEFAULT constraint metadata-only.",
							))
						} else {
							findings = append(findings, newFinding(
								"LOCK-004", SeverityWarning,
								"ACCESS EXCLUSIVE", true, true, false,
								i, s.LineNum(),
								fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s DEFAULT %s", s.Table, a.Column, a.DataType, a.DefaultExpr),
								"ADD COLUMN with a constant DEFAULT (PostgreSQL 11+) is metadata-only (no table rewrite) but still acquires ACCESS EXCLUSIVE. Set a lock_timeout to limit blast radius.",
								"This is safe on PostgreSQL 11+. Ensure SET lock_timeout = '2s'; precedes this statement.",
							))
						}
					}

				case *sqlast.AddConstraintAction:
					if !a.NotValid && (a.ConstraintType == "CHECK" || a.ConstraintType == "FOREIGN KEY") {
						findings = append(findings, newFinding(
							"LOCK-006", SeverityCritical,
							"ACCESS EXCLUSIVE", true, true, false,
							i, s.LineNum(),
							fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT %s %s", s.Table, a.ConstraintName, a.ConstraintType),
							"ADD CONSTRAINT without NOT VALID performs a full table scan under ACCESS EXCLUSIVE to validate all existing rows. On large tables this can hold the lock for minutes.",
							"Add the constraint with NOT VALID first (metadata-only ACCESS EXCLUSIVE), then run VALIDATE CONSTRAINT separately (uses SHARE UPDATE EXCLUSIVE, allows concurrent reads/writes).",
						))
					}

				case *sqlast.DropColumnAction:
					findings = append(findings, newFinding(
						"LOCK-007", SeverityHigh,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(),
						fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", s.Table, a.Column),
						"DROP COLUMN acquires ACCESS EXCLUSIVE and immediately breaks any v1 application queries that SELECT or reference this column. During a rolling deployment, v1 instances will fail.",
						"Use Expand-and-Contract: deploy v2 application code that stops referencing the old column before running DROP COLUMN. Only drop in a subsequent migration after all v1 instances are retired.",
					))

				case *sqlast.RenameColumnAction:
					findings = append(findings, newFinding(
						"LOCK-007", SeverityHigh,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(),
						fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s", s.Table, a.OldName, a.NewName),
						"RENAME COLUMN acquires ACCESS EXCLUSIVE and immediately breaks all v1 application queries referencing the old column name.",
						"Use Expand-and-Contract: add new column, backfill, deploy v2 code using new name, then drop old column in a subsequent migration.",
					))

				case *sqlast.RenameTableAction:
					findings = append(findings, newFinding(
						"LOCK-007", SeverityHigh,
						"ACCESS EXCLUSIVE", true, true, false,
						i, s.LineNum(),
						fmt.Sprintf("ALTER TABLE %s RENAME TO %s", s.Table, a.NewName),
						"RENAME TABLE acquires ACCESS EXCLUSIVE and immediately breaks all v1 application queries referencing the old table name.",
						"Use a view or synonym to alias the old name, deploy v2 application code, then drop the alias.",
					))
				}
			}
		}
	}

	return findings
}

func AnalyzeSQL(sql string) ([]byte, error) {
	stmts, err := sqlast.Parse(sql)
	if err != nil {
		return nil, err
	}
	findings := Analyze(stmts)
	if findings == nil {
		findings = []Finding{}
	}
	return json.Marshal(findings)
}
