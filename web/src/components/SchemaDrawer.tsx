import type { Preset } from '../presets/outages'

interface SchemaDrawerProps {
  preset: Preset
}

export default function SchemaDrawer({ preset }: SchemaDrawerProps) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--surface-1)',
      borderTop: '1px solid var(--slate-border)',
      maxHeight: '240px',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
          BASE SCHEMA
        </div>
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
        }}>
          {preset.baseSchemaSql}
        </pre>
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
          V1 APP QUERIES
        </div>
        {preset.appQueries.map((q, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-primary)',
            padding: '4px 0',
            borderBottom: i < preset.appQueries.length - 1 ? '1px solid var(--slate-border)' : 'none',
          }}>
            {q}
          </div>
        ))}
      </div>
    </div>
  )
}
