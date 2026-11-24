---
inclusion: always
---

# SchemaSeance: Technology Steering

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Go core | Go | 1.23+ |
| WASM target | GOOS=js GOARCH=wasm | Go stdlib |
| Property tests (Go) | pgregory.net/rapid | latest |
| Frontend bundler | Vite | 5.x |
| UI framework | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| In-browser PostgreSQL | @electric-sql/pglite | latest |
| Property tests (TS) | fast-check + Vitest | latest |
| MCP server | TypeScript stdio | latest |

## Go Engine Rules

- Zero CGO. Pure Go only so `GOOS=js GOARCH=wasm go build` works without a C toolchain.
- No external SQL parsing libraries. The lexer and recursive-descent parser are hand-written in `engine/internal/sqlast/`.
- All lock-hazard rules live in `engine/internal/locks/`. Each rule is a pure function: `func (r Rule) Check(stmt Statement) []Finding`.
- The rewriter in `engine/internal/rewriter/` is deterministic: same input always produces byte-identical output.

## Vite Configuration Requirement

`web/vite.config.ts` MUST include:
```ts
optimizeDeps: { exclude: ['@electric-sql/pglite'] }
```
Without this, Vite's dependency pre-bundling breaks PGlite's internal WASM asset loading in both dev and production builds.

## PGlite Rules

- Always instantiate with `new PGlite()` (in-memory, no filesystem).
- Always close both instances in a `finally` block: `await db.close()`.
- Never reuse a PGlite instance across test runs. Fresh instances per run only.

## SHA-256 Checksums

Use `crypto.subtle.digest('SHA-256', ...)` (Web Crypto API). Never use a third-party hash library for table checksums.

## Dependency Policy

Add a dependency only when it provides a capability the stdlib does not (e.g., fast-check for property-based testing, pglite for in-browser Postgres). Do not add lodash, axios, zod, or similar general-utility libraries.
