import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'

// Exercise the actual async save handler with API/storage/router boundaries mocked.
const source = await readFile(new URL('./StudentAdmission.jsx', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('  const nextStep = async () => {'), source.indexOf('  const requestSubmit = () => {'))
function setup({ result = { admissionId: 123 }, failure, recordIds = {}, allErrors = {} } = {}) {
  const events = []
  const context = {
    savingStep: false, step: 0, allErrors, recordIds, STEPS: Array(8),
    data: { personal: {} }, locallySavedAdmission: { current: null },
    setSaveError: value => events.push(['error', value]),
    setTouched: () => {}, setErrors: () => {}, focusFirst: () => {},
    setSavingStep: value => events.push(['saving', value]),
    setRecordIds: () => {}, rememberCreated: () => {},
    duplicateAdmissionMessage: () => '',
    idsFromApi: (row, fallback) => ({ admissionId: row.admissionId ?? fallback }),
    studentAdmissionApi: {
      getAll: async () => [],
      create: async () => { if (failure) throw failure; events.push(['created']); return result },
      update: async () => { if (failure) throw failure; events.push(['updated']); return result },
    },
    localStorage: { setItem: () => events.push(['cached']) },
    notify: message => events.push(['notice', message]),
    setStep: value => events.push(['step', value]),
    navigate: (url, options) => events.push(['navigate', url, options]),
    window: { scrollTo: () => {} },
  }
  return { events, context, save: runInNewContext(`${handler}; nextStep`, context) }
}

test('successful creation caches the draft before navigation and resumes on Contact & Address', async () => {
  const { events, context, save } = setup()
  await save()
  const navigation = events.find(event => event[0] === 'navigate')
  assert.equal(navigation[1], '/student-management/admissions/123/edit')
  assert.equal(navigation[2].state.admissionWizard.step, 1)
  assert.equal(navigation[2].state.admissionWizard.admissionId, 123)
  assert.ok(events.findIndex(event => event[0] === 'cached') < events.indexOf(navigation))
  assert.ok(events.some(event => event[0] === 'step' && event[1] === 1))
  assert.equal(context.locallySavedAdmission.current, 123)
})

test('successful update advances without replacing the route', async () => {
  const { events, save } = setup({ recordIds: { admissionId: 123 } })
  await save()
  assert.ok(events.some(event => event[0] === 'updated'))
  assert.ok(events.some(event => event[0] === 'step' && event[1] === 1))
  assert.ok(!events.some(event => event[0] === 'navigate'))
})

test('save failure keeps the current tab and exposes a persistent error', async () => {
  const { events, save } = setup({ failure: new Error('Please check the submitted information.') })
  await save()
  assert.ok(events.some(event => event[0] === 'error' && event[1] === 'Please check the submitted information.'))
  assert.ok(!events.some(event => event[0] === 'step' || event[0] === 'navigate'))
  assert.deepEqual(events.at(-1), ['saving', false])
})

test('a successful HTTP response without an admission ID does not pretend the draft was saved', async () => {
  const { events, save } = setup({ result: {} })
  await save()
  assert.ok(events.some(event => event[0] === 'error' && event[1].includes('no admission ID')))
  assert.ok(!events.some(event => event[0] === 'step' || event[0] === 'navigate'))
})
