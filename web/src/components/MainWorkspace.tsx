import EditorPane from './EditorPane'
import ProofPane from './ProofPane'
import type { Finding, RewritePlan } from '../wasm/bridge'
import type { RunResult, RewriteRunResult } from '../runner/dualPostgres'
import type { Preset } from '../presets/outages'

interface MainWorkspaceProps {
  preset: Preset
  migrationSql: string
  onMigrationSqlChange: (sql: string) => void
  findings: Finding[]
  runResult: RunResult | null
  rewritePlan: RewritePlan | null
  rewriteResult: RewriteRunResult | null
  isRunning: boolean
  isProving: boolean
  schemaDrawerOpen: boolean
  onToggleSchemaDrawer: () => void
  onProveSafeRewrite: () => void
  error: string | null
}

export default function MainWorkspace(props: MainWorkspaceProps) {
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      flexDirection: 'row',
    }}>
      <EditorPane
        preset={props.preset}
        migrationSql={props.migrationSql}
        onMigrationSqlChange={props.onMigrationSqlChange}
        findings={props.findings}
        schemaDrawerOpen={props.schemaDrawerOpen}
        onToggleSchemaDrawer={props.onToggleSchemaDrawer}
      />
      <div style={{ width: '1px', background: 'var(--slate-border)', flexShrink: 0 }} />
      <ProofPane
        runResult={props.runResult}
        rewritePlan={props.rewritePlan}
        rewriteResult={props.rewriteResult}
        isRunning={props.isRunning}
        isProving={props.isProving}
        onProveSafeRewrite={props.onProveSafeRewrite}
        error={props.error}
      />
    </div>
  )
}
