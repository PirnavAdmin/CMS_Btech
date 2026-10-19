import { runInNewContext } from 'node:vm'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8')).replace(/^\uFEFF/, '').replace(/^import .*$/gm, '').replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { sectionApi } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test'; const collegeRequest = (url, options) => ({ url, options });\n${source}`).toString('base64')}`)
const section = { collegeId: 1, academicYearId: 2, courseId: 3, branchId: 4, semesterId: 5, name: 'Section A', code: 'CSE-A', capacity: 60 }

test('section creation sends an explicit numeric department ID', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, 'POST')
      assert.equal(JSON.parse(options.body).departmentId, 7)
      return Response.json({ data: { sectionId: 9 } })
    }
    assert.equal((await sectionApi.create({ ...section, departmentId: '7' })).id, 9)
  } finally { globalThis.fetch = previous }
})

for (const departmentId of [undefined, null, '', 0]) {
  test('section saves without department: ' + String(departmentId), async () => {
    const previous = globalThis.fetch
    let calls = 0
    try {
      globalThis.fetch = async (url, options) => {
        calls++
        assert.equal(options.method, 'POST')
        const body = JSON.parse(options.body)
        assert.equal(body.departmentId, null)
        assert.equal(body.courseId, 3)
        assert.equal(body.branchId, 4)
        return Response.json({ data: { sectionId: 10 } })
      }
      assert.equal((await sectionApi.create({ ...section, departmentId })).id, 10)
      assert.equal(calls, 1)
    } finally { globalThis.fetch = previous }
  })
}

{

const source = await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8')
const block = source.slice(source.indexOf('function financialData('), source.indexOf('export const studentApi'))
function setup(request) {
  return runInNewContext(`${block.replace('export const feeCollectionApi', 'const feeCollectionApi')}\nfeeCollectionApi`, {
    request, endpoint: path => path,
    withQuery: (path, params) => ({ path, params }),
    requiredId: id => id,
  })
}

for (const [method, endpoint, idKey, fields] of [
  ['allPending', 'pending', 'studentFeeId', ['studentId', 'payableAmount', 'paidAmount', 'balanceAmount', 'finePending', 'concessionAmount']],
  ['allHistory', 'history', 'paymentId', ['studentId', 'receiptId', 'feeAmount', 'fineAmount', 'totalAmount']],
  ['allFines', 'fines', 'fineId', ['amount', 'waivedAmount', 'pendingAmount']],
]) {
  test(`${method} loads every page and preserves filters within the backend limit`, async () => {
    const calls = []
    const api = setup(async ({ path, params }) => {
      calls.push(params.page)
      assert.equal(path, `/api/v1/fee-collection/${endpoint}`)
      assert.equal(params.studentId, 7)
      assert.equal(params.pageSize, 100)
      const offset = (params.page - 1) * 100
      return { data: { page: params.page, pageSize: 100, totalCount: 101, totalPages: 2,
        items: Array.from({ length: params.page === 1 ? 100 : 1 }, (_, i) => ({
          ...Object.fromEntries(fields.map(key => [key, 1])), [idKey]: offset + i + 1,
        })),
      } }
    })
    const rows = await api[method]({ studentId: 7 })
    assert.deepEqual(calls, [1, 2])
    assert.equal(rows.length, 101)
    assert.equal(rows.at(-1)[idKey], 101)
  })
}

test('incomplete financial pages reject instead of showing partial balances', async () => {
  const api = setup(async () => ({ data: { page: 1, pageSize: 100, totalCount: 2, totalPages: 1, items: [] } }))
  await assert.rejects(api.allPending({}), /Financial records are incomplete/)
})

test('backend failures propagate to the screen error handler', async () => {
  const api = setup(async () => { throw new Error('Backend unavailable') })
  await assert.rejects(api.allHistory({}), /Backend unavailable/)
})

}

{

// Exercise the actual async save handler with API/storage/router boundaries mocked.
const source = await readFile(new URL('../pages/student-management/StudentAdmission/StudentAdmission.jsx', import.meta.url), 'utf8')
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

}
