import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createElement } from 'react'
import { transformWithOxc } from 'vite'
import { toCsv } from '../utils/exportUtils.js'
import { yearColumns } from '../utils/exportColumns.js'

// Exercise the actual JSX handlers with isolated hooks and local row data.
const source = readFileSync(new URL('./ExportMenu.jsx', import.meta.url), 'utf8')
const { code } = await transformWithOxc(source.replace(/^import .*$/gm, '').replace('export default function', 'function').replace('export function', 'function'), 'ExportMenu.jsx', { jsx: { runtime: 'classic' } })
const bindings = ['React', 'useEffect', 'useId', 'useRef', 'useState', 'FiChevronDown', 'FiDownload', 'FiPrinter', 'exportToCsv', 'printEntityDetails', 'printResults', 'printSingleRecord', 'cleanRecordSections', 'readVisibleRecordSections', 'singleRecordCsvOptions', 'showSuccess', 'showError']
const factory = new Function(...bindings, `${code}; return ExportMenu`)
const columns = [{ label: 'Record ID', value: 'id' }]
const records = Array.from({ length: 13 }, (_, index) => ({ id: index + 1 }))

function harness(props, printError = null) {
  const calls = [], downloads = [], prints = [], successes = [], errors = []
  let stateIndex = 0
  const noop = () => {}
  const Component = factory({ createElement }, noop, () => 'export', () => ({ current: null }), value => [stateIndex++ === 0 ? true : value, noop], noop, noop, noop,
    options => downloads.push({ csv: toCsv(options.rows, options.columns), filename: options.filename }),
    noop,
    options => { if (printError) throw printError; prints.push(options) },
    noop,
    sections => sections,
    () => [],
    (sections, filename) => ({ rows: sections, columns: [], filename }),
    message => successes.push(message), message => errors.push(message))
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
  test(`${filename}: CSV uses mapped rows and columns, filtered export, unchanged print`, async () => {
    const full = harness({ filename, rows: records })
    assert.deepEqual(full.labels, ['Export', 'Download CSV', 'Print / Save as PDF'])
    await full.csv.props.onClick()
    assert.equal(full.downloads.length, 1)
    assert.deepEqual(full.successes, ['CSV downloaded successfully'])
    assert.deepEqual(full.errors, [])
    assert.equal(full.downloads[0].csv.split('\r\n').length - 1, 13)
    assert.equal(full.downloads[0].filename, filename)
    assert.equal(full.downloads[0].csv.split('\r\n')[0], '\uFEFF"Record ID"')
    assert.deepEqual(full.calls, [])
    const paginated = harness({ filename, rows: records.slice(0, 10) })
    await paginated.csv.props.onClick()
    assert.equal(paginated.downloads[0].csv.split('\r\n').length - 1, 10)
    assert.deepEqual(paginated.calls, [])
    const params = { search: 'matching records' }
    const filtered = harness({ filename, rows: records.slice(0, 5), exportParams: params })
    await filtered.csv.props.onClick()
    assert.equal(filtered.downloads[0].csv.split('\r\n').length - 1, 5)
    await filtered.pdf.props.onClick()
    assert.equal(filtered.prints[0].rows.length, 5)
    assert.match(filtered.successes.at(-1), /Print preview opened/)
  })
}

test('screen list exports are disabled when there are no mapped rows', async () => {
  const menu = harness({ filename: 'colleges', rows: [] })
  assert.equal(menu.buttons[0].props.disabled, true)
  assert.deepEqual(menu.labels, ['Export'])
})

test('list export is disabled when user-facing columns are missing', async () => {
  const menu = harness({ filename: 'academic-years', rows: records, columns: [] })
  assert.equal(menu.buttons[0].props.disabled, true)
  assert.deepEqual(menu.labels, ['Export'])
})

test('custom download action remains supported and reports failures', async () => {
  const menu = harness({ filename: 'custom-report', rows: records, onDownload: async () => { throw new Error('Export access denied') } })
  await menu.csv.props.onClick()
  assert.deepEqual(menu.errors, ['Export access denied'])
  assert.deepEqual(menu.successes, [])
  assert.equal(menu.downloads.length, 0)
})

test('academic-year CSV contains only user-facing mapped fields', async () => {
  const year = { id: '1', name: '2025-2026', startDate: '2025-06-02', endDate: '2026-05-31', status: 'ACTIVE', createdAt: '2025-01-01T10:22:45Z', updatedAt: '2025-02-03T12:30:00Z' }
  const menu = harness({ filename: 'academic-years', rows: [year], columns: yearColumns })
  await menu.csv.props.onClick()
  assert.equal(menu.downloads[0].csv, '\uFEFF"Academic Year","Start Date","End Date","Status"\r\n"2025-2026","2025-06-02","2026-05-31","ACTIVE"')
  assert.doesNotMatch(menu.downloads[0].csv, /createdAt|updatedAt|2025-01-01T10:22:45Z|2025-02-03T12:30:00Z/i)
})

test('blocked print preview reports an error without success', async () => {
  const menu = harness({ filename: 'colleges', rows: records }, new Error('Allow pop-ups to open the print preview.'))
  await menu.pdf.props.onClick()
  assert.deepEqual(menu.errors, ['Allow pop-ups to open the print preview.'])
  assert.deepEqual(menu.successes, [])
  assert.equal(menu.prints.length, 0)
})
