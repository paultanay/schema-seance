import { useRef, useCallback } from 'react'
import type { Finding } from '../wasm/bridge'
import type { Preset } from '../presets/outages'
import SchemaDrawer from './SchemaDrawer'

interface EditorPaneProps {
  preset: Preset
  migrationSql: string
  onMigrationSqlChange: (sql: string) => void
  findings: Finding[]
  schemaDrawerOpen: boolean
  onToggleSchemaDrawer: () => void
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'var(--crimson)'
    case 'HIGH': return 'var(--crimson)'
    case 'MEDIUM': return 'var(--amber)'
    case 'WARNING': return 'var(--amber)'
    default: return 'var(--text-muted)'
  }
}

export default function EditorPane({
  preset,
  migrationSql,
  onMigrationSqlChange,
  findings,
  schemaDrawerOpen,
  onToggleSchemaDrawer,
}: EditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMigrationSqlChange(e.target.value)
  }, [onMigrationSqlChange])

  const lineCount = migrationSql.split('\n').length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '50%',
      minWidth: '300px',
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
          migration.sql
        </span>
        {findings.length > 0 && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--crimson)',
            background: 'rgba(185, 28, 28, 0.08)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            {findings.filter(f => f.severity === 'CRITICAL').length} critical,{' '}
            {findings.filter(f => f.severity === 'HIGH').length} high
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', minHeight: '100%' }}>
          {/* Line numbers */}
          <div style={{
            padding: '12px 8px 12px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--text-muted)',
            background: 'var(--surface-1)',
            userSelect: 'none',
            textAlign: 'right',
            minWidth: '36px',
            flexShrink: 0,
          }}>
            {Array.from({ length: lineCount }, (_, i) => {
              const lineNum = i + 1
              const lineFinding = findings.find(f => f.line === lineNum)
              return (
                <div
                  key={i}
                  style={{
                    color: lineFinding ? severityColor(lineFinding.severity) : undefined,
                    fontWeight: lineFinding ? 600 : undefined,
                    position: 'relative',
                  }}
                  title={lineFinding ? `${lineFinding.ruleCode}: ${lineFinding.explanation}` : undefined}
                >
                  {lineFinding && (
                    <span style={{
                      position: 'absolute',
                      right: '-4px',
                      color: severityColor(lineFinding.severity),
                    }}>!</span>
                  )}
                  {lineNum}
                </div>
              )
            })}
          </div>

          {/* Hazard marker strip */}
          <div style={{
            width: '4px',
            background: 'var(--surface-1)',
            flexShrink: 0,
            position: 'relative',
          }}>
            {findings.map((f, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: `calc(${(f.line - 1)} * 1.6 * 13px + 12px)`,
                  left: 0,
                  width: '4px',
                  height: 'calc(1.6 * 13px)',
                  background: severityColor(f.severity),
                }}
                title={`${f.ruleCode}: ${f.explanation}`}
              />
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={migrationSql}
            onChange={handleChange}
            spellCheck={false}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.6',
              background: 'var(--surface-0)',
              color: 'var(--text-primary)',
              minHeight: '200px',
            }}
          />
        </div>
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--slate-border)' }}>
        <button
          onClick={onToggleSchemaDrawer}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            fontSize: '12px',
            fontFamily: 'var(--font-ui)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ transform: schemaDrawerOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
            &#9654;
          </span>
          Base Schema and v1 App Queries
        </button>
        {schemaDrawerOpen && <SchemaDrawer preset={preset} />}
      </div>
    </div>
  )
}
