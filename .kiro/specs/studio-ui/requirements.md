# Studio UI: Requirements (EARS Format)

## REQ-UI-001: Immediate Tool Access
WHEN the app loads, THE SYSTEM SHALL render the working studio with Preset 1 pre-loaded, with no splash screen or onboarding modal blocking access.

## REQ-UI-002: Preset Selector
WHEN the user clicks a preset tab, THE SYSTEM SHALL load that preset's base schema, migration SQL, and v1 app queries into the editor and clear previous proof results.

## REQ-UI-003: SQL Editor with Hazard Markers
WHEN the Go WASM analyzer returns findings, THE SYSTEM SHALL display inline hazard markers at the exact line numbers from the AST output, using crimson for CRITICAL and amber for HIGH/MEDIUM.

## REQ-UI-004: Run Shadow Proof
WHEN the user clicks "Run Shadow Proof", THE SYSTEM SHALL execute the Dual PGlite runner with the current migration SQL and display the RunResult in the proof pane.

## REQ-UI-005: Four Measured Metrics
WHEN proof results are displayed, THE SYSTEM SHALL show exactly these four metrics: Highest Lock Mode (string), v1 App Compatibility (X/Y format), Adversarial Rows Preserved (X/200 format), Execution Time (Nms format).

## REQ-UI-006: Hazard List
WHEN proof results are displayed, THE SYSTEM SHALL render each finding as a row showing: rule code, lock mode, blocksReads/blocksWrites booleans, and one-sentence explanation.

## REQ-UI-007: Counterexample Inspector
WHEN a proof run finds a failing v1 query or truncated row, THE SYSTEM SHALL display the exact PostgreSQL error message and the failing row's column values verbatim.

## REQ-UI-008: Expand-and-Contract Proof Panel
WHEN the user clicks "Prove Safe Rewrite", THE SYSTEM SHALL display the 3-phase SQL plan and run a full 200-row + v1/v2 app query verification, then show before-vs-after metrics.

## REQ-UI-009: Theme Toggle
WHEN the user clicks the theme toggle, THE SYSTEM SHALL switch between light and dark mode, persisting the preference in localStorage.

## REQ-UI-010: Responsive Layout
WHEN the viewport is wider than 768px, THE SYSTEM SHALL show the editor pane and proof pane side by side. Below 768px, THE SYSTEM SHALL stack them vertically.

## REQ-UI-011: Zero Console Errors
WHEN the production build is served, THE SYSTEM SHALL produce zero TypeScript compilation errors and zero browser console errors during normal operation.

## REQ-UI-012: Base Schema Drawer
WHEN the user expands the base schema drawer, THE SYSTEM SHALL show the preset's CREATE TABLE statements and v1 app queries in read-only monospace display.
