import type { RunResult, RewriteRunResult } from '../runner/dualPostgres'
import type { RewritePlan } from '../wasm/bridge'

interface ExpandContractPanelProps {
  runResult: RunResult | null
  rewritePlan: RewritePlan | null
  rewriteResult: RewriteRunResult | null
  isProving: boolean
  onProveSafeRewrite: () => void
}

function PhaseBlock({ title, statements }: { title: string; statements: string[] }) {
  if (statements.length === 0) return null
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
        {title}
      </div>
      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-primary)',
        background: 'var(--surface-1)',
        border: '1px solid var(--slate-border)',
        borderRadius: '4px',
        padding: '10px 12px',
        overflow: 'auto',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {statements.join('\n')}
      </pre>
    </div>
  )
}

export default function ExpandContractPanel({
  runResult,
  rewritePlan,
  rewriteResult,
  isProving,
  onProveSafeRewrite,
}: ExpandContractPanelProps) {
  const showPanel = runResult !== null

  if (!showPanel) return null

  const isSafe = rewriteResult !== null &&
    rewriteResult.v1Passing === rewriteResult.v1Total &&
    rewriteResult.checksumMatch &&
    rewriteResult.migrationError === null

  return (
    <div style={{
      marginTop: '16px',
      border: '1px solid var(--slate-border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--slate-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '13px',
          color: 'var(--text-primary)',
        }}>
          Zero-Downtime Expand-and-Contract Plan
        </span>
        {rewriteResult && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            color: isSafe ? 'var(--forest)' : 'var(--crimson)',
            background: isSafe ? 'rgba(21, 128, 61, 0.1)' : 'rgba(185, 28, 28, 0.08)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            {isSafe ? 'PROVEN SAFE' : 'STILL UNSAFE'}
          </span>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {!rewritePlan && !rewriteResult && (
          <button
            onClick={onProveSafeRewrite}
            disabled={isProving}
            style={{
              padding: '8px 16px',
              background: 'var(--forest)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: isProving ? 'not-allowed' : 'pointer',
              opacity: isProving ? 0.6 : 1,
              marginBottom: '12px',
            }}
          >
            {isProving ? 'Proving...' : 'Prove Safe Rewrite'}
          </button>
        )}

        {isProving && (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>
            Running 200-row verification on rewritten SQL...
          </div>
        )}

        {rewritePlan && (
          <>
            <PhaseBlock title="PHASE 1: EXPAND" statements={rewritePlan.phase1} />
            <PhaseBlock title="PHASE 2: BACKFILL AND VALIDATE" statements={rewritePlan.phase2} />
            <PhaseBlock title="PHASE 3: CONTRACT" statements={rewritePlan.phase3} />
          </>
        )}

        {rewriteResult && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: isSafe ? 'rgba(21, 128, 61, 0.08)' : 'rgba(185, 28, 28, 0.08)',
            border: `1px solid ${isSafe ? 'var(--forest)' : 'var(--crimson)'}`,
            borderRadius: '6px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: isSafe ? 'var(--forest)' : 'var(--crimson)',
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              {isSafe ? 'Rewrite verified safe.' : 'Rewrite still has issues.'}
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                v1 compat: {rewriteResult.v1Passing}/{rewriteResult.v1Total}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                rows: {rewriteResult.rowsPreserved}/{rewriteResult.rowsTotal}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                checksum: {rewriteResult.checksumMatch ? 'match' : 'mismatch'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                {rewriteResult.executionTimeMs}ms
              </span>
            </div>
          </div>
        )}

        {rewritePlan && !rewriteResult && !isProving && (
          <button
            onClick={onProveSafeRewrite}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: 'var(--forest)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Prove Safe Rewrite
          </button>
        )}
      </div>
    </div>
  )
}
