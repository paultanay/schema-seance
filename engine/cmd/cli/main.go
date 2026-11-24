package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/schemaseance/schemaseance/engine/internal/locks"
	"github.com/schemaseance/schemaseance/engine/internal/rewriter"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: schemaseance <analyze|rewrite|gate> <file>")
		os.Exit(1)
	}

	cmd := os.Args[1]
	file := os.Args[2]

	data, err := os.ReadFile(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", file, err)
		os.Exit(1)
	}
	sql := string(data)

	switch cmd {
	case "analyze":
		out, err := locks.AnalyzeSQL(sql)
		if err != nil {
			fmt.Fprintf(os.Stderr, "analysis error: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(out))

	case "rewrite":
		out, err := rewriter.RewriteSQL(sql)
		if err != nil {
			fmt.Fprintf(os.Stderr, "rewrite error: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(out))

	case "gate":
		out, err := locks.AnalyzeSQL(sql)
		if err != nil {
			fmt.Fprintf(os.Stderr, "analysis error: %v\n", err)
			os.Exit(2)
		}
		var findings []locks.Finding
		if err := json.Unmarshal(out, &findings); err != nil {
			fmt.Fprintf(os.Stderr, "parse error: %v\n", err)
			os.Exit(2)
		}
		criticals := 0
		for _, f := range findings {
			if f.Severity == locks.SeverityCritical {
				criticals++
				fmt.Fprintf(os.Stderr, "CRITICAL %s line %d: %s\n", f.RuleCode, f.Line, f.Explanation)
			}
		}
		if criticals > 0 {
			fmt.Fprintf(os.Stderr, "\n%d critical hazard(s) in %s. Run 'schemaseance rewrite %s' for a safe alternative.\n", criticals, file, file)
			os.Exit(2)
		}
		fmt.Printf("OK: %s passes all lock-hazard checks.\n", file)

	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
