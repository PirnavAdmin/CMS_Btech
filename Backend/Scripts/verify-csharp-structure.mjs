import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const ignored = new Set(['bin', 'obj', '.vs'])
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (entry.isDirectory() && ignored.has(entry.name)) return []
  const item = path.join(directory, entry.name)
  return entry.isDirectory() ? walk(item) : entry.name.endsWith('.cs') ? [item] : []
})

const pairs = { '}': '{', ')': '(', ']': '[' }
const failures = []

for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8')
  const stack = []
  let state = 'code'

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index]
    const next = source[index + 1]

    if (state === 'line-comment') {
      if (current === '\n') state = 'code'
      continue
    }
    if (state === 'block-comment') {
      if (current === '*' && next === '/') { state = 'code'; index += 1 }
      continue
    }
    if (state === 'string') {
      if (current === '\\') { index += 1; continue }
      if (current === '"') state = 'code'
      continue
    }
    if (state === 'verbatim-string') {
      if (current === '"' && next === '"') { index += 1; continue }
      if (current === '"') state = 'code'
      continue
    }
    if (state === 'character') {
      if (current === '\\') { index += 1; continue }
      if (current === "'") state = 'code'
      continue
    }

    if (current === '/' && next === '/') { state = 'line-comment'; index += 1; continue }
    if (current === '/' && next === '*') { state = 'block-comment'; index += 1; continue }
    if (current === '@' && next === '"') { state = 'verbatim-string'; index += 1; continue }
    if (current === '"') { state = 'string'; continue }
    if (current === "'") { state = 'character'; continue }

    if ('{(['.includes(current)) stack.push(current)
    if ('})]'.includes(current) && stack.pop() !== pairs[current]) {
      failures.push(`${path.relative(root, file)}: mismatched ${current}`)
      break
    }
  }

  if (stack.length) failures.push(`${path.relative(root, file)}: unclosed ${stack.join('')}`)
}

console.log(JSON.stringify({ filesChecked: walk(root).length, failures }, null, 2))
if (failures.length) process.exitCode = 1
