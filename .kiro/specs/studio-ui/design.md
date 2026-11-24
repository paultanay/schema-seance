# Studio UI: Design

## Component Tree

```
App.tsx
  Header.tsx             - Wordmark, preset tabs, theme toggle, Run Shadow Proof button
  MainWorkspace.tsx      - Two-column layout wrapper
    EditorPane.tsx       - SQL textarea with line numbers + hazard marker overlay
      SchemaDrawer.tsx   - Collapsible base schema + v1 queries display
    ProofPane.tsx        - Proof results container
      MetricStrip.tsx    - 4 measured metrics display
      HazardList.tsx     - Findings list (rule code, lock mode, booleans, explanation)
      CounterexampleView.tsx - Failing query or truncated row display
      ExpandContractPanel.tsx - 3-phase SQL plan + Prove Safe Rewrite
```

## State Shape

```ts
interface AppState {
  activePreset: number;           // 0-4
  migrationSql: string;
  findings: Finding[];
  runResult: RunResult | null;
  rewriteResult: RewriteRunResult | null;
  isRunning: boolean;
  isProving: boolean;
  theme: 'light' | 'dark';
  schemaDrawerOpen: boolean;
}
```

## WASM Loading

`web/src/wasm/bridge.ts` exports:
```ts
loadWasm(): Promise<void>
analyzeSQL(sql: string): Finding[]
rewriteSQL(sql: string): RewritePlan
```

Loading is done once at app startup. `analyzeSQL` and `rewriteSQL` throw if called before `loadWasm()` resolves.

## Hazard Marker Rendering

The editor is a `<textarea>` with an overlay `<div>` using identical font metrics. For each finding, a marker `<span>` is positioned at the finding's `line` number using calculated `top` offset. Markers use `position: absolute`.

## Preset Tabs

Five tabs rendered as `<button>` elements. Active tab has `border-b-2 border-accent`. Tab names:
1. "Checkout Lockout"
2. "Silent UTF-8 Truncation"
3. "Midnight SET NOT NULL"
4. "Volatile Default Rewrite"
5. "Rolling-Deploy DROP COLUMN"
