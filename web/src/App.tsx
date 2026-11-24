import { useState, useEffect, useCallback } from 'react'
import { loadWasm, analyzeSQL, rewriteSQL, type Finding, type RewritePlan } from './wasm/bridge'
import { runProof, runRewriteProof, type RunResult, type RewriteRunResult } from './runner/dualPostgres'
import { PRESETS } from './presets/outages'
import Header from './components/Header'
import MainWorkspace from './components/MainWorkspace'

export interface AppState {
  activePreset: number
  migrationSql: string
  findings: Finding[]
  runResult: RunResult | null
  rewritePlan: RewritePlan | null
  rewriteResult: RewriteRunResult | null
  isRunning: boolean
  isProving: boolean
  wasmReady: boolean
  schemaDrawerOpen: boolean
  theme: 'light' | 'dark'
  error: string | null
}

function getInitialTheme(): 'light' | 'dark' {
  try {
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  } catch {
    return 'light'
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    activePreset: 0,
    migrationSql: PRESETS[0].migrationSql,
    findings: [],
    runResult: null,
    rewritePlan: null,
    rewriteResult: null,
    isRunning: false,
    isProving: false,
    wasmReady: false,
    schemaDrawerOpen: false,
    theme: getInitialTheme(),
    error: null,
  }))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    try {
      localStorage.setItem('theme', state.theme)
    } catch {
      // ignore
    }
  }, [state.theme])

  useEffect(() => {
    loadWasm().then(() => {
      setState(s => ({ ...s, wasmReady: true }))
    }).catch(err => {
      setState(s => ({ ...s, error: `WASM load failed: ${err}` }))
    })
  }, [])

  useEffect(() => {
    if (!state.wasmReady) return
    const findings = analyzeSQL(state.migrationSql)
    setState(s => ({ ...s, findings }))
  }, [state.migrationSql, state.wasmReady])

  const selectPreset = useCallback((index: number) => {
    setState(s => ({
      ...s,
      activePreset: index,
      migrationSql: PRESETS[index].migrationSql,
      runResult: null,
      rewritePlan: null,
      rewriteResult: null,
      error: null,
    }))
  }, [])

  const runShadowProof = useCallback(async () => {
    setState(s => ({ ...s, isRunning: true, runResult: null, rewriteResult: null, error: null }))
    try {
      const preset = PRESETS[state.activePreset]
      const result = await runProof(preset, state.migrationSql)
      setState(s => ({ ...s, runResult: result, isRunning: false }))
    } catch (e) {
      setState(s => ({ ...s, isRunning: false, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [state.activePreset, state.migrationSql])

  const proveSafeRewrite = useCallback(async () => {
    if (!state.wasmReady) return
    const plan = rewriteSQL(state.migrationSql)
    setState(s => ({ ...s, isProving: true, rewritePlan: plan, rewriteResult: null, error: null }))
    try {
      const preset = PRESETS[state.activePreset]
      const result = await runRewriteProof(preset, plan)
      setState(s => ({ ...s, rewriteResult: result, isProving: false }))
    } catch (e) {
      setState(s => ({ ...s, isProving: false, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [state.activePreset, state.migrationSql, state.wasmReady])

  const setMigrationSql = useCallback((sql: string) => {
    setState(s => ({ ...s, migrationSql: sql, runResult: null, rewriteResult: null }))
  }, [])

  const toggleTheme = useCallback(() => {
    setState(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))
  }, [])

  const toggleSchemaDrawer = useCallback(() => {
    setState(s => ({ ...s, schemaDrawerOpen: !s.schemaDrawerOpen }))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header
        activePreset={state.activePreset}
        onSelectPreset={selectPreset}
        onRunProof={runShadowProof}
        isRunning={state.isRunning}
        theme={state.theme}
        onToggleTheme={toggleTheme}
        wasmReady={state.wasmReady}
      />
      <MainWorkspace
        preset={PRESETS[state.activePreset]}
        migrationSql={state.migrationSql}
        onMigrationSqlChange={setMigrationSql}
        findings={state.findings}
        runResult={state.runResult}
        rewritePlan={state.rewritePlan}
        rewriteResult={state.rewriteResult}
        isRunning={state.isRunning}
        isProving={state.isProving}
        schemaDrawerOpen={state.schemaDrawerOpen}
        onToggleSchemaDrawer={toggleSchemaDrawer}
        onProveSafeRewrite={proveSafeRewrite}
        error={state.error}
      />
    </div>
  )
}
