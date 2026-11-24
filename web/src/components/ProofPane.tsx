import MetricStrip from './MetricStrip'
import HazardList from './HazardList'
import CounterexampleView from './CounterexampleView'
import ExpandContractPanel from './ExpandContractPanel'
import type { RunResult, RewriteRunResult } from '../runner/dualPostgres'
import type { RewritePlan } from '../wasm/bridge'

interface ProofPaneProps {
  runResult: RunResult | null
  rewritePlan: RewritePlan | null
  rewriteResult: RewriteRunResult | null
  isRunning: boolean
  isProving: boolean
  onProveSafeRewrite: () => void
  error: string | null
}

export default function ProofPane({
  runResult,
  rewritePlan,
  rewriteResult,
  isRunning,
  isProving,
  onProveSafeRewrite,
  error,
}: ProofPaneProps) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-0)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--slate-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          proof results
        </span>
        {runResult && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: runResult.migrationError || runResult.v1Passing < runResult.v1Total || !runResult.checksumMatch
              ? 'var(--crimson)'
              : 'var(--forest)',
          }}>
            {runResult.migrationError || runResult.v1Passing < runResult.v1Total || !runResult.checksumMatch
              ? 'UNSAFE'
              : 'SAFE'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(185, 28, 28, 0.08)',
            border: '1px solid var(--crimson)',
            borderRadius: '6px',
            color: 'var(--crimson)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {isRunning && (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>
            Running dual PGlite proof with 200 adversarial rows...
          </div>
        )}

        {!isRunning && !runResult && !error && (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>
            Click <strong>Run Shadow Proof</strong> to analyze the migration against 200 adversarial rows in two isolated PGlite instances.
          </div>
        )}

        {runResult && (
          <>
            <MetricStrip result={runResult} />
            <HazardList result={runResult} />
            <CounterexampleView result={runResult} />
          </>
        )}

        <ExpandContractPanel
          runResult={runResult}
          rewritePlan={rewritePlan}
          rewriteResult={rewriteResult}
          isProving={isProving}
          onProveSafeRewrite={onProveSafeRewrite}
        />
      </div>
    </div>
  )
}
