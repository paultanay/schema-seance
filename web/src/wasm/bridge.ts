export interface Finding {
  id: string
  ruleCode: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WARNING'
  lockMode: string
  blocksReads: boolean
  blocksWrites: boolean
  tableRewrite: boolean
  statementIndex: number
  line: number
  sql: string
  explanation: string
  safePattern: string
}

export interface RewritePlan {
  phase1: string[]
  phase2: string[]
  phase3: string[]
}

declare global {
  function analyzeSQL(sql: string): string
  function rewriteSQL(sql: string): string
}

let wasmLoaded = false

export async function loadWasm(): Promise<void> {
  if (wasmLoaded) return

  const go = new (window as unknown as { Go: new () => { importObject: WebAssembly.Imports; run: (instance: WebAssembly.Instance) => void } }).Go()

  const result = await WebAssembly.instantiateStreaming(
    fetch('/schemaseance.wasm'),
    go.importObject
  )

  go.run(result.instance)
  wasmLoaded = true
}

export function analyzeSQL(sql: string): Finding[] {
  if (!wasmLoaded) return []
  try {
    const raw = window.analyzeSQL(sql)
    return JSON.parse(raw) as Finding[]
  } catch {
    return []
  }
}

export function rewriteSQL(sql: string): RewritePlan {
  if (!wasmLoaded) return { phase1: [], phase2: [], phase3: [] }
  try {
    const raw = window.rewriteSQL(sql)
    return JSON.parse(raw) as RewritePlan
  } catch {
    return { phase1: [], phase2: [], phase3: [] }
  }
}
