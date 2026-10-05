import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const workflow = readFileSync(new URL('./timetableWorkflowService.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replaceAll('export ', '').replaceAll('import.meta.env', 'env')

test('mock persistence requires explicit development opt-in and is unavailable in production', () => {
  for (const DEV of [false, true]) for (const flag of [undefined, 'false', 'true']) {
    let reads = 0
    const context = vm.createContext({ env: { DEV, VITE_TIMETABLE_DRAFT_ADAPTER: flag }, createDraftAdapter: () => { reads++; return {} }, localStorage: {}, navigator: {} })
    vm.runInContext(workflow, context)
    const enabled = DEV && flag === 'true'
    assert.equal(vm.runInContext('draftCapabilityEnabled', context), enabled)
    if (enabled) vm.runInContext('workflowAdapter()', context)
    else assert.throws(() => vm.runInContext('workflowAdapter()', context), /explicit/)
    assert.equal(reads, enabled ? 1 : 0)
  }
})
