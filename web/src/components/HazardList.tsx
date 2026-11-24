import type { RunResult } from '../runner/dualPostgres'

interface HazardListProps {
  result: RunResult
}

function lockModeColor(lockMode: string): string {
  if (lockMode === 'ACCESS EXCLUSIVE') return 'var(--crimson)'
  if (lockMode === 'SHARE') return 'var(--amber)'
  return 'var(--text-muted)'
}

export default function HazardList({ result }: HazardListProps) {
  const v1Failures = result.v1Results.filter(r => !r.passedCandidate)

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
        Lock Hazards
      </div>

      {result.migrationError && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(185, 28, 28, 0.08)',
          border: '1px solid var(--crimson)',
          borderRadius: '6px',
          marginBottom: '8px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--crimson)', marginBottom: '4px' }}>
            MIGRATION ERROR
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
            {result.migrationError}
          </div>
        </div>
      )}

      {v1Failures.length > 0 && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(185, 28, 28, 0.06)',
          border: '1px solid var(--crimson)',
          borderRadius: '6px',
          marginBottom: '8px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--crimson)', marginBottom: '8px' }}>
            V1 QUERY FAILURES ({v1Failures.length}/{result.v1Total})
          </div>
          {v1Failures.map((f, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {f.sql}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--crimson)' }}>
                {f.error}
              </div>
            </div>
          ))}
        </div>
      )}

      {!result.checksumMatch && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(180, 83, 9, 0.08)',
          border: '1px solid var(--amber)',
          borderRadius: '6px',
          marginBottom: '8px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginBottom: '4px' }}>
            CHECKSUM MISMATCH
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
            Table data changed unexpectedly after migration.
          </div>
        </div>
      )}

      <div style={{
        padding: '10px 12px',
        background: 'var(--surface-1)',
        border: '1px solid var(--slate-border)',
        borderRadius: '6px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              color: lockModeColor(result.lockMode),
            }}>
              {result.lockMode}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
              blocks reads: {result.blocksReads ? 'yes' : 'no'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
              blocks writes: {result.blocksWrites ? 'yes' : 'no'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
