import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createElement } from 'react'
import { transformWithOxc } from 'vite'
import { toCsv } from '../utils/exportUtils.js'

// Exercise the actual JSX handlers with isolated hooks and a mocked server.
const source = readFileSync(new URL('./ExportMenu.jsx', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../api/apiEndpoints.js', import.meta.url), 'utf8')
const screens = [...apiSource.match(/SCREEN_EXPORT_ENDPOINTS = Object.freeze\(Object.fromEntries\(\[([\s\S]*?)\]\.map/)[1].matchAll(/'([^']+)'/g)].map(match => match[1])
const { code } = await transformWithOxc(source.replace(/^import .*$/gm, '').replace('export default function', 'function').replace('export function', 'function'), 'ExportMenu.jsx', { jsx: { runtime: 'classic' } })
const bindings = ['React', 'useEffect', 'useId', 'useRef', 'useState', 'FiChevronDown', 'FiDownload', 'FiPrinter', 'downloadServerExport', 'exportToCsv', 'printEntityDetails', 'printResults', 'SCREEN_EXPORT_ENDPOINTS', 'screenExportsApi', 'showSuccess', 'showError']
const factory = new Function(...bindings, `${code}; return ExportMenu`)
const columns = [{ label: 'Record ID', value: 'id' }]
const records = Array.from({ length: 13 }, (_, index) => ({ id: index + 1 }))

function harness(props, serverRows = records, printError = null) {
  const calls = [], downloads = [], prints = [], successes = [], errors = []
  let stateIndex = 0
  const noop = () => {}
  const Component = factory({ createElement }, noop, () => 'export', () => ({ current: null }), value => [stateIndex++ === 0 ? true : value, noop], noop, noop, noop,
    (file, filename) => downloads.push({ csv: file.csv, filename }),
    options => downloads.push({ csv: toCsv(options.rows, options.columns), filename: options.filename }), noop,
    options => { if (printError) throw printError; prints.push(options) }, Object.fromEntries(screens.map(screen => [screen, {}])),
    { save: async (screen, params) => { calls.push({ screen, params }); if (serverRows instanceof Error) throw serverRows; return { csv: toCsv(serverRows, columns) } } }, message => successes.push(message), message => errors.push(message))
  const tree = Component({ columns, title: props.filename, ...props })
  const buttons = []
  function visit(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'button') buttons.push(node)
    for (const child of [node.props?.children].flat(Infinity)) visit(child)
  }
  visit(tree)
  const label = button => [button.props.children].flat(Infinity).filter(child => typeof child === 'string').join('').trim()
  return { calls, downloads, prints, successes, errors, buttons, labels: buttons.map(label), csv: buttons.find(button => label(button) === 'Download CSV'), pdf: buttons.find(button => label(button) === 'Print / Save as PDF') }
}

function pageSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? pageSources(new URL(`${entry.name}/`, directory)) : entry.name.endsWith('.jsx') ? [readFileSync(new URL(entry.name, directory), 'utf8')] : [])
}
const pages = pageSources(new URL('../pages/', import.meta.url))
const filenames = [...new Set(pages.flatMap(page => [...page.matchAll(/<ExportMenu\b[\s\S]*?filename="([^"]+)"/g)].map(match => match[1])))].filter(name => name !== 'fee-structures-hostel')
// FeeStructure also supplies its filename through a hostel/transport expression.
filenames.push('fee-structures-hostel', 'fee-structures-transport')

for (const filename of filenames) {
  test(`${filename}: single CSV action, all 13 records, filtered export, unchanged print`, async () => {
    const full = harness({ filename, rows: records })
    assert.deepEqual(full.labels, ['Export', 'Download CSV', 'Print / Save as PDF'])
    await full.csv.props.onClick()
    assert.equal(full.downloads.length, 1)
    assert.deepEqual(full.successes, ['CSV downloaded successfully'])
    assert.deepEqual(full.errors, [])
    assert.equal(full.downloads[0].csv.split('\r\n').length - 1, 13)
    assert.equal(full.downloads[0].filename, filename)
    assert.equal(full.downloads[0].csv.split('\r\n')[0], '\uFEFF"Record ID"')
    if (full.calls.length) {
      const paginated = harness({ filename, rows: records.slice(0, 10) })
      await paginated.csv.props.onClick()
      assert.equal(paginated.downloads[0].csv.split('\r\n').length - 1, 13)
      assert.equal(paginated.calls.length, 1)
    }
    const params = { search: 'matching records' }
    const filtered = harness({ filename, rows: records.slice(0, 5), exportParams: params }, records.slice(0, 5))
    await filtered.csv.props.onClick()
    assert.equal(filtered.downloads[0].csv.split('\r\n').length - 1, 5)
    if (filtered.calls.length) assert.equal(filtered.calls[0].params, params)
    await filtered.pdf.props.onClick()
    assert.equal(filtered.prints[0].rows.length, 5)
    assert.match(filtered.successes.at(-1), /Print preview opened/)
  })
}

test('server export remains available without loaded table rows', async () => {
  const menu = harness({ filename: 'colleges', rows: [] })
  assert.equal(menu.csv.props.disabled, false)
  await menu.csv.props.onClick()
  assert.equal(menu.downloads[0].csv.split('\r\n').length - 1, 13)
  assert.equal(menu.pdf.props.disabled, true)
})

test('failed CSV export reports the backend error once and never reports success', async () => {
  const menu = harness({ filename: 'colleges', rows: records }, new Error('Export access denied'))
  await menu.csv.props.onClick()
  assert.deepEqual(menu.errors, ['Export access denied'])
  assert.deepEqual(menu.successes, [])
  assert.equal(menu.downloads.length, 0)
})

test('blocked print preview reports an error without success', async () => {
  const menu = harness({ filename: 'colleges', rows: records }, records, new Error('Allow pop-ups to open the print preview.'))
  await menu.pdf.props.onClick()
  assert.deepEqual(menu.errors, ['Allow pop-ups to open the print preview.'])
  assert.deepEqual(menu.successes, [])
  assert.equal(menu.prints.length, 0)
})
