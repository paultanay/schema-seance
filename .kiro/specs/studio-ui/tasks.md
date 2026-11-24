# Studio UI: Tasks

## Task 1: Vite + React + TS + Tailwind scaffold
- Initialize `web/` with correct Vite config including `optimizeDeps: { exclude: ['@electric-sql/pglite'] }`.

## Task 2: WASM Bridge
- Implement `web/src/wasm/bridge.ts`.
- Covers loading, `analyzeSQL`, `rewriteSQL`.

## Task 3: Header and Preset Tabs
- Implement `web/src/components/Header.tsx`.
- Covers REQ-UI-001, REQ-UI-002, REQ-UI-009.

## Task 4: Editor Pane with Hazard Markers
- Implement `web/src/components/EditorPane.tsx` and `SchemaDrawer.tsx`.
- Covers REQ-UI-003, REQ-UI-012.

## Task 5: Metric Strip and Hazard List
- Implement `web/src/components/MetricStrip.tsx` and `HazardList.tsx`.
- Covers REQ-UI-005, REQ-UI-006.

## Task 6: Counterexample and Expand-Contract Panel
- Implement `web/src/components/CounterexampleView.tsx` and `ExpandContractPanel.tsx`.
- Covers REQ-UI-007, REQ-UI-008.

## Task 7: App Wiring and Responsive Layout
- Implement `App.tsx` and `MainWorkspace.tsx` with full state management.
- Covers REQ-UI-004, REQ-UI-010.

## Task 8: Production Build Verification
- Run `npm --prefix web run build` with zero TypeScript errors.
- Covers REQ-UI-011.
