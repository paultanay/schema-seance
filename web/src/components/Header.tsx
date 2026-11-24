import { PRESETS } from '../presets/outages'

interface HeaderProps {
  activePreset: number
  onSelectPreset: (index: number) => void
  onRunProof: () => void
  isRunning: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  wasmReady: boolean
}

export default function Header({
  activePreset,
  onSelectPreset,
  onRunProof,
  isRunning,
  theme,
  onToggleTheme,
  wasmReady,
}: HeaderProps) {
  return (
    <header style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid var(--slate-border)',
      background: 'var(--surface-0)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        borderBottom: '1px solid var(--slate-border)',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '18px',
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          SchemaSeance
        </span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          padding: '2px 6px',
          background: 'var(--surface-1)',
          borderRadius: '4px',
          border: '1px solid var(--slate-border)',
        }}>
          PostgreSQL 16 Migration Safety Prover
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleTheme}
            style={{
              padding: '6px 10px',
              background: 'var(--surface-1)',
              border: '1px solid var(--slate-border)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
            title="Toggle theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>

          <button
            onClick={onRunProof}
            disabled={isRunning || !wasmReady}
            style={{
              padding: '8px 16px',
              background: isRunning ? 'var(--text-muted)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: !wasmReady ? 0.6 : 1,
            }}
          >
            {isRunning ? 'Running...' : 'Run Shadow Proof'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', padding: '0 20px', gap: '0', overflowX: 'auto' }}>
        {PRESETS.map((preset, i) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(i)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activePreset === i
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              color: activePreset === i ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: 'var(--font-ui)',
              fontWeight: activePreset === i ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </header>
  )
}
