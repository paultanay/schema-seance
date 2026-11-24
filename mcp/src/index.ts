import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ENGINE = process.env['SCHEMASEANCE_ENGINE'] ?? './engine/cmd/cli/schemaseance'

function runCLI(cmd: 'analyze' | 'rewrite' | 'gate', sql: string): string {
  const tmp = join(tmpdir(), `schemaseance-${Date.now()}.sql`)
  try {
    writeFileSync(tmp, sql, 'utf8')
    return execSync(`${ENGINE} ${cmd} ${tmp}`, { encoding: 'utf8' })
  } catch (e) {
    if (e instanceof Error && 'stdout' in e) {
      return (e as NodeJS.ErrnoException & { stdout: string }).stdout ?? String(e)
    }
    return String(e)
  } finally {
    try { unlinkSync(tmp) } catch { /* ignore */ }
  }
}

const server = new Server(
  { name: 'schemaseance', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_migration',
      description: 'Analyze a PostgreSQL migration SQL for lock hazards. Returns a JSON array of findings with rule codes, lock modes, and explanations.',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'The PostgreSQL DDL migration SQL to analyze.' },
        },
        required: ['sql'],
      },
    },
    {
      name: 'propose_expand_contract',
      description: 'Generate a 3-phase zero-downtime Expand-and-Contract rewrite for an unsafe PostgreSQL migration.',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'The unsafe PostgreSQL DDL migration SQL to rewrite.' },
        },
        required: ['sql'],
      },
    },
    {
      name: 'run_shadow_proof',
      description: 'Run a shadow proof: analyze the migration SQL for lock hazards and gate-check it. Returns findings with critical hazard details. Use in CI to block unsafe migrations.',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'The PostgreSQL DDL migration SQL to shadow-proof.' },
        },
        required: ['sql'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const sql = (args as { sql: string }).sql

  if (!sql || typeof sql !== 'string') {
    return { content: [{ type: 'text', text: 'Error: sql argument required.' }], isError: true }
  }

  switch (name) {
    case 'analyze_migration': {
      const output = runCLI('analyze', sql)
      return { content: [{ type: 'text', text: output }] }
    }
    case 'propose_expand_contract': {
      const output = runCLI('rewrite', sql)
      return { content: [{ type: 'text', text: output }] }
    }
    case 'run_shadow_proof': {
      const output = runCLI('gate', sql)
      return { content: [{ type: 'text', text: output }] }
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
