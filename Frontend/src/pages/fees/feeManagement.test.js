import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { academicFeeComponent, checkDuplicateStructure, DEFAULT_FEE_HEADS, studentMatchesFee, hasSingleStructureFee, structureTotalFeeComponents, workflowAcademicRow, componentTotals, allocatePaise, assignFeeStructure, cents, collectWorkspacePayment, emptyFeeWorkspace, feeLedger, feeToday, feeTotal, newFeeStructure, readFeeWorkspace, saveFeeAdjustment, saveFeeComponent, saveWorkflowStructure, transitionFeeAdjustment, transitionFeeStructure, validateFeeStructure, writeFeeWorkspace } from './feeStructureService.js'
import { feeNavigation, feeNavigationItem, feeBreadcrumbs, isFeeRoute, studentAccountOperations } from './feeNavigation.js'

test('academic fee configuration uses a single workspace with three sections and persistent live summary', async () => {
  const source = await readFile(new URL('./FeeStructureWizard.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /Review & Publish|Academic Mapping/)
  assert.doesNotMatch(source, /const steps =/)
  assert.doesNotMatch(source, /step === 3|setStep\(|Save & Next/)
  assert.match(source, /Basic Details/)
  assert.match(source, /Fee Heads/)
  assert.match(source, /Payment Schedule/)
  assert.match(source, /fw-form-scrollable/)
  assert.match(source, /fw-live-preview/)
  assert.match(source, /checkDuplicateStructure/)
  assert.match(source, /eligibleStudentsCount/)
  assert.match(source, /const issue = status === 'Draft'[\s\S]*validateFeeStructure\(s\)/)
})

test('fee sidebar maps existing routes and contextual screens to one owning section', () => {
  assert.deepEqual(feeNavigation.map(item => item.label), ['Overview', 'Fee Structures', 'Student Accounts', 'Collections', 'Reports'])
  for (const item of feeNavigation) {
    assert.equal(feeNavigationItem(item.to), item)
    assert.equal(feeNavigationItem(`${item.to}/`), item)
    assert.deepEqual(feeBreadcrumbs(item.to).map(c => c.label), ['Finance', 'Fee Management', item.label])
  }
  for (const [path, label] of [['/fees', 'Overview'], ['/fees/structures/create', 'Fee Structures'], ['/fees/structures/draft/edit', 'Fee Structures'], ['/fees/components', 'Fee Structures'], ['/fees/legacy', 'Fee Structures'], ['/fees/ledger/account', 'Student Accounts'], ['/fees/collection', 'Collections'], ['/fees/receipts/receipt', 'Collections'], ['/fees/refunds', 'Collections']]) {
    assert.equal(isFeeRoute(path), true)
    assert.equal(feeNavigationItem(path)?.label, label)
  }
  for (const path of ['/fees-other', '/dashboard', '/faculty/fees']) {
    assert.equal(isFeeRoute(path), false)
    assert.equal(feeNavigationItem(path), null)
    assert.equal(feeBreadcrumbs(path), null)
  }
  assert.equal(feeBreadcrumbs('/fees/structures/create').at(-1).label, 'Create Fee Structure')
  assert.equal(feeBreadcrumbs('/fees/structures/draft/edit').at(-1).label, 'Edit Fee Structure')
  for (const [type, label] of [['hostel', 'Hostel'], ['transport', 'Transport']]) {
    for (const [suffix, action] of [['create', 'Create'], ['saved-plan/edit', 'Edit']]) {
      const path = `/fees/structures/${type}/${suffix}`
      assert.equal(feeNavigationItem(path)?.label, 'Fee Structures')
      assert.equal(feeBreadcrumbs(path).at(-1).label, `${action} ${label} Fee Structure`)
    }
  }
  assert.equal(feeBreadcrumbs('/fees/ledger/account').at(-1).label, 'Student Financial Profile')
  assert.equal(feeNavigation.some(item => item.to === '/fees/components' || item.to === '/fees/refunds'), false)
  assert.equal(feeNavigationItem('/fees/accounts')?.label, 'Student Accounts')
  assert.equal(feeNavigationItem('/fees/structures//edit')?.label, 'Fee Structures')
  assert.equal(feeBreadcrumbs('/fees/structures/').at(-1).label, 'Fee Structures')
  assert.equal(studentAccountOperations.length, 3)
  for (const operation of studentAccountOperations) {
    assert.equal(feeNavigation.some(item => item.to === operation.to), false)
    for (const path of [operation.to, `${operation.to}/`]) {
      assert.equal(feeNavigationItem(path)?.label, 'Student Accounts')
      assert.deepEqual(feeBreadcrumbs(path).map(c => c.label), ['Finance', 'Fee Management', 'Student Accounts', operation.label])
    }
  }
})

test('configuration presentation preserves workflow records, component totals and statuses', () => {
  const structure = { ...newFeeStructure('2026'), id: 'structure', status: 'Published', name: 'Academic plan', components: [
    { masterId: 'tuition', name: 'Tuition', amount: 700, mandatory: true, refundable: false },
    { masterId: 'deposit', name: 'Deposit', amount: 200, mandatory: true, refundable: true },
    { masterId: 'optional', name: 'Optional', amount: 100, mandatory: false, refundable: false },
  ] }
  const before = structuredClone(structure), row = workflowAcademicRow(structure)
  assert.deepEqual(structure, before)
  assert.equal(row.workflowStructure, structure)
  assert.equal(row.status, 'Published')
  assert.equal(row.feePeriod, 'Per Academic Year')
  assert.deepEqual(componentTotals(row.feeComponents), { total: 1000, mandatory: 700, refundable: 200, optional: 100 })
  assert.equal(workflowAcademicRow({ ...structure, cycle: 'Semester-wise' }).feePeriod, 'Per Semester')
  assert.equal(feeBreadcrumbs('/fees/legacy').at(-1).label, 'Fee Structures')
})

test('single total fee preserves approval, installment allocation and student balances without a master', () => {
  const draft = { ...newFeeStructure('2026'), name: 'Single fee', courseId: '1', branchId: '2', batch: '2026-2030', plan: 'Installment Plan', installments: [{ id: 'one', dueDate: '2026-01-01', amount: 500 }, { id: 'two', dueDate: '2026-06-01', amount: 500.01 }] }
  draft.components = structureTotalFeeComponents(draft, '1000.01')
  assert.equal(hasSingleStructureFee(draft), true)
  assert.equal(validateFeeStructure(draft), '')
  assert.equal(feeTotal(draft), 1000.01)
  for (const amount of ['', '0', '-1', '10.001', 'not a number']) {
    assert.notEqual(validateFeeStructure({ ...draft, components: structureTotalFeeComponents(draft, amount) }, 1), '')
  }
  assert.notEqual(validateFeeStructure({ ...draft, installments: [{ id: 'one', dueDate: '2026-01-01', amount: 1000 }] }), '')
  let state = saveWorkflowStructure(emptyFeeWorkspace(), draft, 'Pending Approval', 'Admin')
  const id = state.structures[0].id
  state = transitionFeeStructure(state, id, 'Approved', 'Approver')
  state = transitionFeeStructure(state, id, 'Published', 'Admin')
  state = assignFeeStructure(state, id, [{ id: 'one', academicYearId: '2026', courseId: '1', branchId: '2', batch: '2026-2030' }])
  state = collectWorkspacePayment(state, { assignmentId: state.assignments[0].id, amount: 100, mode: 'Cash', date: feeToday() }, 'Cashier')
  assert.equal(feeLedger(state, state.assignments[0]).outstanding, 90001)
  const existing = { ...draft, components: [{ masterId: 'deposit', name: 'Deposit', amount: 1000.01, refundable: true }] }
  assert.equal(hasSingleStructureFee(existing), false)
  assert.throws(() => structureTotalFeeComponents(existing, 2000), /refund rules/)
  assert.equal(existing.components[0].refundable, true)
})

const student = { id: '1', name: 'Test Student', academicYearId: '2026', courseId: '1', branchId: '2', batch: '2026-2030', category: 'Regular', semesterId: '1' }
test('academic eligibility is branch-specific and never substitutes for facility allocation', () => {
  const scope = { ...newFeeStructure('2026'), courseId: '1', branchId: '2', batch: '2026-2030', cycle: 'Semester-wise', semesterId: '1', applicableTo: 'Selected Category', category: 'Regular' }
  assert.equal(studentMatchesFee(student, scope), true)
  for (const change of [{ branchId: '3' }, { courseId: '2' }, { batch: '2025-2029' }, { semesterId: '2' }, { category: 'Management' }, { academicYearId: '2025' }]) {
    assert.equal(studentMatchesFee({ ...student, ...change }, scope), false)
  }
  assert.equal(studentMatchesFee({ ...student, branchId: '' }, { ...scope, branchId: '' }), false)
  for (const domain of ['Hostel', 'Transport']) {
    assert.equal(studentMatchesFee(student, { ...scope, domain }), false)
    assert.notEqual(validateFeeStructure({ ...scope, domain }, 0), '')
    assert.equal(academicFeeComponent({ category: domain }), false)
    const state = saveFeeComponent(emptyFeeWorkspace(), { id: 'facility', name: 'Facility charge', code: 'FAC', category: domain, status: 'Active' })
    const value = { ...scope, name: 'Wrong domain', dueDate: '2026-10-01', components: [{ masterId: 'facility', name: 'Facility charge', category: domain, amount: 100 }] }
    assert.throws(() => saveWorkflowStructure(state, value, 'Pending Approval', 'Admin'), /Hostel and Transport/)
  }
})
test('restored component workflow preserves previously saved single-fee charges', () => {
  const value = { ...newFeeStructure('2026'), name: 'Existing total plus charge', courseId: '1', branchId: '2', batch: '2026-2030', dueDate: '2026-10-01' }
  value.components = [...structureTotalFeeComponents(value, 1000), { masterId: 'tuition', name: 'Tuition', category: 'Academic', amount: 200 }]
  const state = saveFeeComponent(emptyFeeWorkspace(), { id: 'tuition', name: 'Tuition', code: 'TUI', category: 'Academic', status: 'Active' })
  const saved = saveWorkflowStructure(state, value, 'Pending Approval', 'Admin')
  assert.equal(feeTotal(saved.structures[0]), 1200)
  assert.equal(saved.structures[0].components[0].refundable, false)
})
function configured() {
  let state = emptyFeeWorkspace()
  state = saveFeeComponent(state, { id: 'tuition', name: 'Tuition', code: 'TUI', category: 'Academic', status: 'Active' })
  state = saveFeeComponent(state, { id: 'deposit', name: 'Deposit', code: 'DEP', category: 'Deposit', status: 'Active' })
  const structure = { ...newFeeStructure('2026'), name: 'Engineering fees', courseId: '1', branchId: '2', batch: '2026-2030', components: [{ masterId: 'tuition', name: 'Tuition', amount: 700, refundable: false }, { masterId: 'deposit', name: 'Deposit', amount: 300, refundable: true }], plan: 'Installment Plan', installments: [{ id: 'one', dueDate: '2026-01-01', amount: 600 }, { id: 'two', dueDate: '2026-06-01', amount: 400 }], penaltyType: 'Percentage', penaltyValue: 5, maximumPenalty: 25, grace: 5 }
  state = saveWorkflowStructure(state, structure, 'Pending Approval', 'Admin')
  const id = state.structures[0].id
  state = transitionFeeStructure(state, id, 'Approved', 'Approver')
  state = transitionFeeStructure(state, id, 'Published', 'Admin')
  state = assignFeeStructure(state, id, [student])
  return state
}
const payment = (state, overrides = {}) => collectWorkspacePayment(state, { assignmentId: state.assignments[0].id, amount: 100, mode: 'Cash', date: feeToday(), reference: '', ...overrides }, 'Cashier')
const approve = (state, kind, input) => {
  state = saveFeeAdjustment(state, kind, { assignmentId: state.assignments[0].id, type: 'Scholarship', unit: 'Amount', value: 100, reason: 'Approved aid', ...input })
  const id = state[kind][0].id
  state = transitionFeeAdjustment(state, kind, id, 'Submitted', 'Admin')
  return transitionFeeAdjustment(state, kind, id, 'Approved', 'Approver')
}
const wizardSource = await readFile(new URL('./FeeStructureWizard.jsx', import.meta.url), 'utf8')
const serverUiSource = await readFile(new URL('./ServerFeeCollection.jsx', import.meta.url), 'utf8')
const dueSource = serverUiSource.slice(serverUiSource.indexOf('function serverDueAmounts('), serverUiSource.indexOf('const duesColumns'))
const serverDueAmounts = new Function('cents', `${dueSource}; return serverDueAmounts`)(cents)
test('dues presentation retains server totals without counting assessed penalties twice', () => {
  assert.deepEqual(serverDueAmounts({ payableAmount: 1000, paidAmount: 200, balanceAmount: 850, finePending: 50, overdue: true }), { outstanding: 80000, overdue: 85000, penalty: 5000, total: 85000 })
  assert.deepEqual(serverDueAmounts({ payableAmount: 100.01, paidAmount: 20, balanceAmount: 80.01, finePending: 0, overdue: false }), { outstanding: 8001, overdue: 0, penalty: 0, total: 8001 })
})
const ledgerPresentation = wizardSource.slice(wizardSource.indexOf('export function financialLedgerRows('), wizardSource.indexOf('export function FeeStats(')).replace('export ', '')
const financialLedgerRows = new Function('cents', `${ledgerPresentation}; return financialLedgerRows`)(cents)
const academicPresentation = wizardSource.slice(wizardSource.indexOf('function academicFeeErrors('), wizardSource.indexOf('export default function FeeStructureWizard('))
const academicFeeErrors = new Function(`${academicPresentation}; return academicFeeErrors`)()
const previewStatusSource = wizardSource.slice(wizardSource.indexOf('function feePreviewStatus('), wizardSource.indexOf('function FeeStructurePreview('))
const feePreviewStatus = new Function('validateFeeStructure', `${previewStatusSource}; return feePreviewStatus`)(validateFeeStructure)
test('preview readiness derives from current form validation without changing workflow status', () => {
  const empty = newFeeStructure()
  assert.equal(feePreviewStatus(empty, false), 'Draft')
  assert.equal(feePreviewStatus(empty, true), 'Incomplete')
  const valid = { ...configured().structures[0], status: 'Draft' }
  assert.equal(feePreviewStatus(valid, false), 'Ready for Review')
  assert.equal(valid.status, 'Draft')
  assert.equal(feePreviewStatus({ ...valid, components: [] }, false), 'Draft')
  assert.equal(feePreviewStatus({ ...valid, status: 'Pending Approval' }, false), 'Pending Approval')
  assert.equal(feePreviewStatus({ ...valid, installments: [{ id: 'one', dueDate: '2026-01-01', amount: 999.99 }] }, true), 'Incomplete')
})
const managementSource = await readFile(new URL('./FeeManagement.jsx', import.meta.url), 'utf8')
const deletionSource = managementSource.slice(managementSource.indexOf('function structureDraftAssigned('), managementSource.indexOf('function StructureRowActions('))
const deleteStructureDraft = new Function(`${deletionSource}; return deleteStructureDraft`)()
test('draft deletion protects workflow statuses, student assignments and revision references', () => {
  const draft = { ...newFeeStructure(), id: 'draft', name: 'Unused draft' }
  const base = { ...emptyFeeWorkspace(), structures: [draft, { ...draft, id: 'retained' }] }
  const deleted = deleteStructureDraft(base, draft.id)
  assert.deepEqual(deleted.structures.map(s => s.id), ['retained'])
  assert.equal(base.structures.length, 2)
  assert.equal(deleted.assignments, base.assignments)
  assert.equal(deleted.payments, base.payments)
  assert.throws(() => deleteStructureDraft(base, 'missing'), /not found/)
  for (const status of ['Pending Approval', 'Approved', 'Published', 'Archived']) {
    assert.throws(() => deleteStructureDraft({ ...base, structures: [{ ...draft, status }] }, draft.id), /Only drafts/)
  }
  for (const assignment of [{ structureId: draft.id }, { structure: { id: draft.id } }]) {
    assert.throws(() => deleteStructureDraft({ ...base, assignments: [assignment] }, draft.id), /student assignments/)
  }
  assert.throws(() => deleteStructureDraft({ ...base, structures: [...base.structures, { ...draft, id: 'child', parentId: draft.id }] }, draft.id), /revisions/)
})
test('academic inline errors match existing required and conditional validation', () => {
  const empty = academicFeeErrors(newFeeStructure())
  assert.deepEqual(Object.keys(empty).filter(key => empty[key]), ['name', 'academicYearId', 'courseId', 'branchId', 'batch'])
  const valid = configured().structures[0]
  assert.equal(Object.values(academicFeeErrors(valid)).some(Boolean), false)
  assert.equal(validateFeeStructure(valid, 0), '')
  for (const key of ['name', 'academicYearId', 'courseId', 'branchId', 'batch']) {
    const missing = { ...valid, [key]: key === 'name' || key === 'batch' ? '   ' : '' }
    assert.ok(academicFeeErrors(missing)[key])
    assert.ok(validateFeeStructure(missing, 0))
  }
  const conditional = { ...valid, applicableTo: 'Selected Category', category: '', cycle: 'Semester-wise', semesterId: '' }
  assert.ok(academicFeeErrors(conditional).category)
  assert.ok(academicFeeErrors(conditional).semesterId)
  assert.equal(Object.values(academicFeeErrors({ ...conditional, category: 'Regular', semesterId: '1' })).some(Boolean), false)
})
test('partial drafts remain editable while approval still requires the complete configuration', () => {
  const draft = { ...newFeeStructure(), name: 'Configuration in progress' }
  const state = saveWorkflowStructure(emptyFeeWorkspace(), draft, 'Draft', 'Admin')
  const saved = state.structures[0]
  assert.ok(saved.id)
  assert.equal(saved.status, 'Draft')
  assert.equal(saved.components.length, 0)
  assert.throws(() => saveWorkflowStructure(state, saved, 'Pending Approval', 'Admin'), /Complete/)
  const edited = saveWorkflowStructure(state, { ...saved, batch: '2026-2030' }, 'Draft', 'Admin')
  assert.equal(edited.structures.length, 1)
  assert.equal(edited.structures[0].id, saved.id)
  assert.equal(edited.structures[0].batch, '2026-2030')
  assert.equal(edited.structures[0].audit.length, 2)
})
test('financial ledger presentation reconciles paise balances with payments, concessions and refunds', () => {
  let state = configured()
  state = payment(state, { amount: 500 })
  state = approve(state, 'concessions', { value: 100 })
  state = approve(state, 'refunds', { paymentId: state.payments[0].id, value: 50 })
  const assignment = state.assignments[0], ledger = feeLedger(state, assignment)
  const rows = financialLedgerRows(assignment, ledger, state.concessions)
  assert.equal(rows.length, 4)
  assert.equal(rows.at(-1).balance, ledger.outstanding)
  assert.equal(rows.reduce((sum, r) => sum + r.debit - r.credit, 0), ledger.outstanding)
  assert.equal(rows.find(r => r.id === state.payments[0].id).credit, 50000)
  assert.equal(rows.find(r => r.id === state.refunds[0].id).debit, 5000)
  const draft = saveFeeAdjustment(state, 'concessions', { assignmentId: assignment.id, type: 'Aid', unit: 'Amount', value: 25, reason: 'Pending request' })
  assert.equal(financialLedgerRows(assignment, feeLedger(draft, assignment), draft.concessions).length, 4)
})
test('workflow requires approval, protects published records and snapshots assignments', () => {
  const state = configured(), s = state.structures[0]
  assert.throws(() => transitionFeeStructure(state, s.id, 'Approved', 'Admin'), /not allowed/)
  assert.throws(() => saveWorkflowStructure(state, { ...s, name: 'Changed' }, 'Draft', 'Admin'), /revision/)
  const archived = transitionFeeStructure(state, s.id, 'Archived', 'Admin')
  assert.equal(archived.assignments[0].structure.status, 'Published')
  assert.throws(() => assignFeeStructure(archived, s.id, [{ ...student, id: '2' }]), /published/)
  assert.throws(() => assignFeeStructure(state, s.id, [student]), /already/)
  assert.throws(() => assignFeeStructure(state, s.id, [{ ...student, id: '2', branchId: '8' }]), /scope/)
})
test('installment sums, dates, monetary precision and mandatory scope are validated', () => {
  const s = configured().structures[0]
  assert.equal(validateFeeStructure(s), '')
  assert.match(validateFeeStructure({ ...s, installments: [{ id: '1', dueDate: '2026-01-01', amount: 999.99 }] }), /exactly/)
  assert.match(validateFeeStructure({ ...s, installments: [{ id: '1', dueDate: '', amount: 1000 }] }), /due date/)
  assert.match(validateFeeStructure({ ...s, components: [{ ...s.components[0], amount: Infinity }] }), /positive/)
  assert.match(validateFeeStructure({ ...s, discount: -1 }), /Concession/)
  assert.match(validateFeeStructure({ ...s, grace: 0.5 }), /whole number/)
  assert.equal(feeTotal(s), 1000)
})
test('paise allocation conserves totals with uneven components and installments', () => {
  assert.deepEqual(allocatePaise(100, [1, 1, 1]), [34, 33, 33])
  for (let total = 1; total < 500; total++) assert.equal(allocatePaise(total, [17, 23, 61]).reduce((a, b) => a + b, 0), total)
  const state = configured(), a = state.assignments[0], l = feeLedger(state, a, '2026-10-08')
  assert.equal(l.cells.reduce((s, c) => s + c.amount, 0), 100000)
  assert.equal(l.cells.filter(c => c.installmentId === 'one').reduce((s, c) => s + c.amount, 0), 60000)
  assert.equal(l.penalty, 2500)
  assert.equal(feeLedger(state, a, '2026-01-06').overdue, 0)
})
test('collection updates component and installment balances and prevents overpayment', () => {
  let state = configured()
  assert.throws(() => payment(state, { amount: 1000.01 }), /exceeds/)
  assert.throws(() => payment(state, { amount: 500, installmentId: 'two', componentId: 'deposit' }), /exceeds/)
  assert.throws(() => payment(state, { amount: 0 }), /positive/)
  assert.throws(() => payment(state, { amount: 1.001 }), /decimal/)
  assert.throws(() => payment(state, { mode: 'UPI' }), /reference/)
  state = payment(state, { amount: 100, mode: 'UPI', reference: 'TXN-1', installmentId: 'one', componentId: 'deposit' })
  const ledger = feeLedger(state, state.assignments[0])
  assert.equal(ledger.paid, cents(100)); assert.equal(ledger.outstanding, cents(900))
  assert.equal(ledger.cells.find(c => c.id === 'one:deposit').paid, cents(100))
  assert.equal(ledger.cells.find(c => c.id === 'two:deposit').paid, 0)
  assert.throws(() => payment(state, { mode: 'UPI', reference: 'TXN-1' }), /already/)
})
test('approved concessions reduce only unpaid balances and cannot be approved twice', () => {
  let state = payment(configured(), { amount: 800 })
  state = approve(state, 'concessions', { unit: 'Percentage', value: 10 })
  const ledger = feeLedger(state, state.assignments[0])
  assert.equal(ledger.concession, 10000); assert.equal(ledger.outstanding, 10000)
  assert.equal(state.concessions[0].approvedBy, 'Approver')
  assert.throws(() => approve(state, 'concessions', { value: 101 }), /exceeds/)
  assert.throws(() => transitionFeeAdjustment(state, 'concessions', state.concessions[0].id, 'Approved', 'Admin'), /Invalid/)
})
test('refunds only reverse refundable paid components and cannot exceed the original payment', () => {
  let state = payment(configured(), { amount: 1000 })
  const paymentId = state.payments[0].id
  assert.throws(() => approve(state, 'refunds', { paymentId, value: 301 }), /exceeds/)
  state = approve(state, 'refunds', { paymentId, value: 100 })
  assert.equal(feeLedger(state, state.assignments[0]).outstanding, 10000)
  assert.throws(() => approve(state, 'refunds', { paymentId, value: 201 }), /exceeds/)
  state = approve(state, 'refunds', { paymentId, value: 200 })
  assert.equal(feeLedger(state, state.assignments[0]).paid, 70000)
})
test('component codes are unique without changing historical assigned components', () => {
  const state = configured()
  assert.throws(() => saveFeeComponent(state, { name: 'Another tuition', code: 'tui', category: 'Academic' }), /unique/)
  const next = saveFeeComponent(state, { ...state.components[0], name: 'Changed' })
  assert.equal(next.assignments[0].structure.components[1].name, 'Deposit')
})
test('workspace storage isolates colleges and rejects stale saves or corrupt data', () => {
  const original = globalThis.localStorage, memory = new Map()
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  try {
    const a = emptyFeeWorkspace(), saved = writeFeeWorkspace(a, '1')
    assert.equal(saved.revision, 1); assert.equal(readFeeWorkspace('2').revision, 0)
    assert.throws(() => writeFeeWorkspace(a, '1'), /another tab/)
    assert.throws(() => writeFeeWorkspace(a, ''), /college/)
    memory.set('pirnav-fee-workspace-v1:college:3', '{broken')
    assert.throws(() => readFeeWorkspace('3'))
  } finally { globalThis.localStorage = original }
})

const source = (await readFile(new URL('../../api/apiEndpoints.js', import.meta.url), 'utf8')).replace(/^import .*$/gm, '').replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { feeCollectionApi } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test-token'; const collegeRequest = (url, options) => ({ url, options });\n${source}`).toString('base64')}`)
test('server fee adapter uses existing routes, auth, filters and response envelopes', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.test/api/v1/fee-collection/pending?studentId=12&page=2')
      assert.equal(options.headers.Authorization, 'Bearer test-token')
      return Response.json({ success: true, data: { items: [{ studentFeeId: 9 }], totalPages: 3 } })
    }
    assert.equal((await feeCollectionApi.pending({ studentId: 12, page: 2 })).items[0].studentFeeId, 9)
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.test/api/v1/fee-collection/payments')
      assert.equal(options.method, 'POST')
      assert.deepEqual(JSON.parse(options.body), { studentFeeId: 9, feeAmount: 100, fineAmount: 0, paymentMode: 'CASH' })
      return Response.json({ success: true, data: { receiptId: 5, receiptNumber: 'R-5' } })
    }
    assert.equal((await feeCollectionApi.collect({ studentFeeId: 9, feeAmount: 100, fineAmount: 0, paymentMode: 'CASH' })).receiptNumber, 'R-5')
  } finally { globalThis.fetch = original }
})

test('checkDuplicateStructure validates uniqueness across academic applicability and cycle', () => {
  const existing = [
    { id: 'struct-1', name: 'B.Tech CSE Regular 2026-30', academicYearId: '2026', courseId: 'c1', branchId: 'b1', batch: '2026-2030', applicableTo: 'Selected Category', category: 'Regular', cycle: 'Annual' },
    { id: 'struct-2', name: 'B.Tech ECE Regular 2026-30', academicYearId: '2026', courseId: 'c1', branchId: 'b2', batch: '2026-2030', applicableTo: 'All Students', cycle: 'Annual' },
  ]
  // Exact duplicate candidate
  const duplicate = { id: '', academicYearId: '2026', courseId: 'c1', branchId: 'b1', batch: '2026-2030', applicableTo: 'Selected Category', category: 'Regular', cycle: 'Annual' }
  const conflict = checkDuplicateStructure(existing, duplicate)
  assert.ok(conflict)
  assert.equal(conflict.id, 'struct-1')

  // Different branch is not a duplicate
  const diffBranch = { id: '', academicYearId: '2026', courseId: 'c1', branchId: 'b3', batch: '2026-2030', applicableTo: 'Selected Category', category: 'Regular', cycle: 'Annual' }
  assert.equal(checkDuplicateStructure(existing, diffBranch), null)

  // Different batch is not a duplicate
  const diffBatch = { id: '', academicYearId: '2026', courseId: 'c1', branchId: 'b1', batch: '2027-2031', applicableTo: 'Selected Category', category: 'Regular', cycle: 'Annual' }
  assert.equal(checkDuplicateStructure(existing, diffBatch), null)

  // Same structure when editing does not conflict with itself
  const editingSelf = { id: 'struct-1', academicYearId: '2026', courseId: 'c1', branchId: 'b1', batch: '2026-2030', applicableTo: 'Selected Category', category: 'Regular', cycle: 'Annual' }
  assert.equal(checkDuplicateStructure(existing, editingSelf), null)
})

test('DEFAULT_FEE_HEADS includes standard B.Tech heads and auto-registers on save without prior master', () => {
  assert.ok(DEFAULT_FEE_HEADS.length >= 7)
  const tuitionHead = DEFAULT_FEE_HEADS.find(h => h.name === 'Tuition Fee')
  assert.ok(tuitionHead)
  assert.equal(tuitionHead.category, 'Academic')
  assert.equal(tuitionHead.mandatory, true)

  const emptyState = emptyFeeWorkspace()
  assert.equal(emptyState.components.length, 0)
  const draft = {
    ...newFeeStructure('2026'),
    name: 'B.Tech Standard Fees',
    courseId: 'c1',
    branchId: 'b1',
    batch: '2026-2030',
    dueDate: '2026-10-01',
    components: [
      { masterId: 'fh-tuition', name: 'Tuition Fee', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, recurring: true, amount: '85000' }
    ]
  }
  const savedState = saveWorkflowStructure(emptyState, draft, 'Draft', 'Admin')
  assert.equal(savedState.structures.length, 1)
  assert.ok(savedState.components.some(c => c.name === 'Tuition Fee'))
})

test('hostel and transport fee structures operate independently from academic branches in FacilityEditor', async () => {
  const source = await readFile(new URL('./FeeStructure.jsx', import.meta.url), 'utf8')
  assert.match(source, /export function FacilityEditor/)
  assert.doesNotMatch(source, /facility-step-panel/)
  assert.match(source, /fw-form-scrollable/)
  assert.match(source, /Basic Details/)
  assert.match(source, /Charges/)
  assert.match(source, /Effective Period/)
  // Facility editor should not ask for course or branch
  const editorFn = source.slice(source.indexOf('export function FacilityEditor'), source.indexOf('function FacilityPreview'))
  assert.doesNotMatch(editorFn, /masters\.courses|masters\.branches/)
})

test('FeeReports supports Course-wise, Branch-wise, Daily, and Head-wise collection reports', async () => {
  const source = await readFile(new URL('./ServerFeeCollection.jsx', import.meta.url), 'utf8')
  assert.match(source, /id: 'course', name: 'Course-wise Collection'/)
  assert.match(source, /id: 'branch', name: 'Branch-wise Collection'/)
  assert.match(source, /id: 'daily', name: 'Daily Collection'/)
  assert.match(source, /id: 'category', name: 'Head-wise Collection \(Fee Category\)'/)
})
