import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = resolve(directory, entry.name)
  return entry.isDirectory() ? files(path) : /\.test\.js$/.test(path) && !/\.vitest\.test\.js$/.test(path) ? [path] : []
})
// Node and Vitest own different suites. Node's default discovery also imports
// browser-only Vitest files, which cannot execute under node:test.
const result = spawnSync(process.execPath, ['--test', ...files('src'), ...files('tests')], { stdio: 'inherit' })
process.exit(result.status ?? 1)
