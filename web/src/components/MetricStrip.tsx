import type { RunResult } from '../runner/dualPostgres'

interface MetricStripProps {
  result: RunResult
}

interface MetricProps {
  label: string
  value: string
  status: 'safe' | 'unsafe' | 'warn' | 'neutral'
}

function Metric({ label, value, status }: MetricProps) {
  const color = status === 'safe' ? 'var(--forest)'
    : status === 'unsafe' ? 'var(--crimson)'
    : status === 'warn' ? 'var(--amber)'
    : 'var(--text-primary)'

  return (
    <div style={{
      flex: 1,
      padding: '12px',
      background: 'var(--surface-1)',
      border: '1px solid var(--slate-border)',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  )
}

export default function MetricStrip({ result }: MetricStripProps) {
  const v1Ok = result.v1Passing === result.v1Total
  const rowsOk = result.rowsPreserved === result.rowsTotal

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <Metric
        label="HIGHEST LOCK MODE"
        value={result.lockMode}
        status={result.lockMode === 'ACCESS EXCLUSIVE' ? 'unsafe' : 'warn'}
      />
      <Metric
        label="V1 APP COMPATIBILITY"
        value={`${result.v1Passing}/${result.v1Total} passing`}
        status={v1Ok ? 'safe' : 'unsafe'}
      />
      <Metric
        label="ADVERSARIAL ROWS PRESERVED"
        value={`${result.rowsPreserved}/${result.rowsTotal}`}
        status={rowsOk && !result.migrationError ? 'safe' : 'unsafe'}
      />
      <Metric
        label="EXECUTION TIME"
        value={`${result.executionTimeMs}ms`}
        status="neutral"
      />
    </div>
  )
}
