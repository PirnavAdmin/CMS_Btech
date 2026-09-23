import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(process.argv[2] || '.')
const baselineSql = process.argv[3] ? path.resolve(process.argv[3]) : null
const integrationSql = path.join(
  projectRoot,
  'Database',
  'IntegrationUpdates',
  'CMS_BTECH_INTEGRATION_UPDATE_20260903.sql'
)

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const item = path.join(directory, entry.name)
  return entry.isDirectory() ? walk(item) : [item]
})

if (!baselineSql || !fs.existsSync(baselineSql)) {
  console.error('Usage: node Scripts/verify-stored-procedures.mjs <project-root> <baseline-dump.sql>')
  process.exit(2)
}

if (!fs.existsSync(integrationSql)) {
  console.error(`Integration SQL not found: ${integrationSql}`)
  process.exit(2)
}

const called = new Set()
for (const file of walk(projectRoot).filter((name) => name.endsWith('.cs'))) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(/["'](sp_[A-Za-z0-9_]+)["']/g)) {
    called.add(match[1].toLowerCase())
  }
}

const sql = [baselineSql, integrationSql]
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')
const defined = new Set(
  [...sql.matchAll(/\bCREATE\s+(?:DEFINER\s*=\s*[^\s]+\s+)?PROCEDURE\s+`?([A-Za-z0-9_]+)`?/gi)]
    .map((match) => match[1].toLowerCase())
)

const missing = [...called].filter((name) => !defined.has(name)).sort()
console.log(JSON.stringify({
  proceduresCalledByBackend: called.size,
  proceduresDefinedByDumpAndUpdate: defined.size,
  missingProcedures: missing
}, null, 2))

if (missing.length) process.exitCode = 1
