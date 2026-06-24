import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import ts from 'typescript'

async function importTs(relativePath) {
  const url = new URL(relativePath, import.meta.url)
  const source = await readFile(url, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
  })
  const encoded = Buffer.from(outputText, 'utf8').toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

const { getImportBalanceDisplay } = await importTs('../src/lib/import-balance.ts')

const available = await getImportBalanceDisplay(
  42,
  async (id) => {
    assert.equal(id, 42)
    return { currentUsage: 12.5, usageLimit: 50 }
  },
  () => 'unused'
)

assert.deepEqual(available, { usage: '12.5/50' })

const unavailable = await getImportBalanceDisplay(
  7,
  async (id) => {
    assert.equal(id, 7)
    throw new Error('403 Forbidden')
  },
  (error) => error instanceof Error ? error.message : String(error)
)

assert.deepEqual(unavailable, { balanceError: '403 Forbidden' })
