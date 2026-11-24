---
inclusion: fileMatch
fileMatchPattern: ["web/src/**/*.tsx", "web/src/**/*.css"]
---

# SchemaSeance: UI Craft Steering

## Design Principle

The interface is a database engineering tool, not a marketing page. Every pixel must serve an engineer diagnosing a production risk. No hero sections, no testimonials, no animations for their own sake.

Reference quality: Linear, Stripe Docs, Chrome DevTools.

## Color Palette

### Light Mode
| Role | Token | Hex |
|------|-------|-----|
| Surface primary | `--surface-0` | `#FFFFFF` |
| Surface secondary | `--surface-1` | `#F8FAFC` |
| Structure / borders | `--slate` | `#1E293B` |
| Body text | `--text-primary` | `#0F172A` |
| Muted text | `--text-muted` | `#64748B` |
| Verified hazard (critical) | `--crimson` | `#B91C1C` |
| Verified safe (proof) | `--forest` | `#15803D` |
| Warning | `--amber` | `#B45309` |
| Interactive accent | `--accent` | `#1D4ED8` |

### Dark Mode
| Role | Token | Hex |
|------|-------|-----|
| Surface primary | `--surface-0` | `#0F1115` |
| Surface secondary | `--surface-1` | `#161A22` |
| Structure / borders | `--slate` | `#334155` |
| Body text | `--text-primary` | `#F1F5F9` |
| Muted text | `--text-muted` | `#94A3B8` |
| Verified hazard | `--crimson` | `#EF4444` |
| Verified safe | `--forest` | `#22C55E` |
| Warning | `--amber` | `#F59E0B` |
| Interactive accent | `--accent` | `#60A5FA` |

## Typography

| Use | Font | Weight |
|-----|------|--------|
| Product name, pane headings | `Space Grotesk` | 600 |
| UI labels, buttons, prose | `IBM Plex Sans` | 400/500 |
| SQL, lock modes, checksums, error output | `IBM Plex Mono` | 400 |

Load from Google Fonts: `Space Grotesk:wght@600`, `IBM+Plex+Sans:wght@400;500`, `IBM+Plex+Mono`.

## Prohibited Patterns

- No neon colors, no cyan, no gradients on interactive elements.
- No em-dashes (`—`) in any visible string. Use periods, colons, commas, or parentheses.
- No marketing copy: `seamless`, `elevate`, `unleash`, `robust`, `cutting-edge`, `supercharge`, `next-gen`, `revolutionary`, `game-changer`, `holistic`.
- No unverified metrics displayed (no "99.9% accuracy" unless the PBT suite proves it).
- No skeleton loaders that never resolve. Show real empty states.
- No hero landing page. The judge must land directly on the working studio.

## Layout Rules

- Preset 1 is pre-loaded on first render. No splash screen, no onboarding wizard.
- The editor pane and proof pane are always both visible on screens wider than 768px.
- Hazard markers in the editor pane use the exact line number from the Go WASM AST output.
- Metric counts display as `X/Y` ratios (e.g., `4/5 passing`), never as percentages without a denominator.
- Execution time displays in milliseconds: `142ms`, not `0.142s`.

## Component Rules

- Each component file has one exported component. No multi-component files.
- Props interfaces are defined in the same file as the component. No shared `types.ts` for UI props.
- No inline styles except for dynamic values computed at runtime (e.g., gutter width from line count).
- Tailwind utility classes only. No custom CSS files except for the CSS variable definitions in `index.css`.
