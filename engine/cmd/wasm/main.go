//go:build js && wasm

package main

import (
	"syscall/js"

	"github.com/schemaseance/schemaseance/engine/internal/locks"
	"github.com/schemaseance/schemaseance/engine/internal/rewriter"
)

func main() {
	js.Global().Set("analyzeSQL", js.FuncOf(analyzeSQLJS))
	js.Global().Set("rewriteSQL", js.FuncOf(rewriteSQLJS))
	select {}
}

func analyzeSQLJS(_ js.Value, args []js.Value) interface{} {
	if len(args) == 0 {
		return "[]"
	}
	sql := args[0].String()
	out, err := locks.AnalyzeSQL(sql)
	if err != nil {
		return "[]"
	}
	return string(out)
}

func rewriteSQLJS(_ js.Value, args []js.Value) interface{} {
	if len(args) == 0 {
		return `{"phase1":[],"phase2":[],"phase3":[]}`
	}
	sql := args[0].String()
	out, err := rewriter.RewriteSQL(sql)
	if err != nil {
		return `{"phase1":[],"phase2":[],"phase3":[]}`
	}
	return string(out)
}
