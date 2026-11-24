package locks

import (
	"encoding/json"
	"fmt"
)

type Severity string

const (
	SeverityCritical Severity = "CRITICAL"
	SeverityHigh     Severity = "HIGH"
	SeverityMedium   Severity = "MEDIUM"
	SeverityWarning  Severity = "WARNING"
)

type Finding struct {
	ID             string   `json:"id"`
	RuleCode       string   `json:"ruleCode"`
	Severity       Severity `json:"severity"`
	LockMode       string   `json:"lockMode"`
	BlocksReads    bool     `json:"blocksReads"`
	BlocksWrites   bool     `json:"blocksWrites"`
	TableRewrite   bool     `json:"tableRewrite"`
	StatementIndex int      `json:"statementIndex"`
	Line           int      `json:"line"`
	SQL            string   `json:"sql"`
	Explanation    string   `json:"explanation"`
	SafePattern    string   `json:"safePattern"`
}

var findingCounter int

func newFinding(ruleCode string, severity Severity, lockMode string, blocksReads, blocksWrites, tableRewrite bool, stmtIndex, line int, sql, explanation, safePattern string) Finding {
	findingCounter++
	return Finding{
		ID:             fmt.Sprintf("%s-%04d", ruleCode, findingCounter),
		RuleCode:       ruleCode,
		Severity:       severity,
		LockMode:       lockMode,
		BlocksReads:    blocksReads,
		BlocksWrites:   blocksWrites,
		TableRewrite:   tableRewrite,
		StatementIndex: stmtIndex,
		Line:           line,
		SQL:            sql,
		Explanation:    explanation,
		SafePattern:    safePattern,
	}
}

func MarshalFindings(findings []Finding) ([]byte, error) {
	if findings == nil {
		findings = []Finding{}
	}
	return json.Marshal(findings)
}
