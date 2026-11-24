---
inclusion: always
---

# SchemaSeance: Repository Structure Steering

## Layout

```
schemaseance/
├── LICENSE
├── README.md
├── .kiro/
│   ├── steering/
│   ├── specs/
│   ├── hooks/
│   ├── agents/
│   └── settings/
├── engine/
│   ├── go.mod
│   ├── cmd/cli/main.go
│   ├── cmd/wasm/main.go
│   └── internal/
│       ├── sqlast/
│       ├── locks/
│       ├── rewriter/
│       └── pbt_test.go
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/
│   │   ├── schemaseance.wasm
│   │   └── wasm_exec.js
│   └── src/
│       ├── wasm/bridge.ts
│       ├── runner/
│       ├── presets/outages.ts
│       ├── components/
│       └── App.tsx
├── mcp/
│   ├── package.json
│   └── src/index.ts
├── power/
├── examples/migrations/
├── scripts/
│   ├── build-wasm.sh
│   └── verify-submission.sh
└── docs/
    └── KIRO_BUILD_LOG.md
```

## File Creation Rules

- Create a file only when a concrete caller exists. No speculative stubs.
- One responsibility per file. The lexer (`lexer.go`) does not classify locks. The lock classifier (`classifier.go`) does not generate rewrites.
- Tests live next to the code they test, not in a separate top-level `tests/` directory.
- `engine/internal/pbt_test.go` is the sole property-based test file for Go.
- `web/src/runner/runner.pbt.test.ts` is the sole property-based test file for TypeScript.

## Naming Conventions

- Go: exported names use PascalCase, unexported use camelCase. No `_` in Go names.
- TypeScript: files use camelCase. React components use PascalCase filenames.
- SQL rule IDs: `LOCK-001` through `LOCK-010`, uppercase, hyphen-separated.
- Hook JSON files: `post-save-go-pbt.json`, `post-save-web-check.json`, `stop-migration-gate.json`.

## What Not to Create

- No `utils/` directory. Shared code lives in the package that owns it.
- No `types/` directory. Types live in the file that uses them, exported if needed.
- No `constants/` file. Constants live next to the code that defines their meaning.
- No `index.ts` barrel re-exports unless the directory has 4+ consumers.
