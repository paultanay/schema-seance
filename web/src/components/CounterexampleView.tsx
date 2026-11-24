import type { RunResult } from '../runner/dualPostgres'

interface CounterexampleViewProps {
  result: RunResult
}

export default function CounterexampleView({ result }: CounterexampleViewProps) {
  if (result.truncationCounterexamples.length === 0) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Data Counterexamples
      </div>

      <div style={{
        border: '1px solid var(--slate-border)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-1)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: '11px' }}>ID</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: '11px' }}>COLUMN</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--forest)', fontWeight: 500, fontSize: '11px' }}>BEFORE</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--crimson)', fontWeight: 500, fontSize: '11px' }}>AFTER</th>
            </tr>
          </thead>
          <tbody>
            {result.truncationCounterexamples.map((ex, i) => (
              <tr
                key={i}
                style={{
                  borderTop: '1px solid var(--slate-border)',
                  background: i % 2 === 0 ? 'var(--surface-0)' : 'var(--surface-1)',
                }}
              >
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{String(ex.id)}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{ex.column}</td>
                <td style={{ padding: '8px 12px', color: 'var(--forest)' }}>
                  {typeof ex.before === 'string' ? `"${ex.before}"` : String(ex.before)}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--crimson)' }}>
                  {ex.after === null ? 'NULL' : typeof ex.after === 'string' ? `"${ex.after}"` : String(ex.after)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
