import { collegeStorageKey, selectedCollegeId } from '../../utils/collegeScope.js'
const ACADEMIC_KEY = 'pirnav-fee-structures-v3'
const LEGACY_KEY = 'pirnav-fee-structures-v2'
const HOSTEL_KEY = 'pirnav-hostel-fee-structures-v1'
const TRANSPORT_KEY = 'pirnav-transport-fee-structures-v1'

const parse = key => { try { return JSON.parse(localStorage.getItem(collegeStorageKey(key))) || [] } catch { return [] } }
const write = (key, rows, event) => { localStorage.setItem(collegeStorageKey(key), JSON.stringify(rows.map(row => ({ ...row, collegeId: selectedCollegeId() })))); window.dispatchEvent(new Event(event)); return rows }
const number = value => Number(value) || 0
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number(value))
export const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
export const feeComponent = () => ({ id: uid('FC'), feeHeadId: '', name: '', category: 'Academic', amount: '', frequency: 'Per Semester', requirement: 'Mandatory', refundable: 'Non-refundable', concessionAllowed: false, fineApplicable: false, dueRule: '', status: 'Active' })
export const componentTotals = items => (items || []).reduce((a, x) => { const n = number(x.amount); if (x.refundable === 'Refundable') a.refundable += n; else if (x.requirement === 'Optional') a.optional += n; else a.mandatory += n; a.total += n; return a }, { mandatory: 0, optional: 0, refundable: 0, total: 0 })

export const workflowAcademicRow = structure => ({
  ...structure,
  workflowStructure: structure,
  code: structure.code || structure.id,
  feePeriod: structure.cycle === 'Semester-wise' ? 'Per Semester' : 'Per Academic Year',
  feeComponents: structure.components.map(component => ({
    ...component,
    requirement: component.mandatory === false ? 'Optional' : 'Mandatory',
    refundable: component.refundable ? 'Refundable' : 'Non-refundable',
  })),
  quota: structure.category || '',
  effectiveFrom: '',
  effectiveTo: '',
})

const codePart = value => { const words = String(value || '').match(/[A-Za-z0-9]+/g) || []; return (words.length > 1 ? words.map(x => x[0]).join('') : words[0] || '').slice(0, 7).toUpperCase() }
export const structureName = s => [s.courseName, s.branchName, s.feePeriod === 'Per Semester' ? s.semesterName : s.yearOfStudy, s.quota, s.academicYearName].filter(Boolean).join(' - ')
export const structureCode = s => ['FS', codePart(s.courseName), codePart(s.branchName), s.feePeriod === 'Per Semester' ? codePart(s.semesterName) : codePart(s.yearOfStudy), codePart(s.quota), String(s.academicYearName || '').replace(/\D/g, '').slice(-4), `V${s.version || 1}`].filter(Boolean).join('-')
export const blankAcademic = () => ({ id: '', name: '', code: '', version: 1, academicYearId: '', academicYearName: '', departmentId: '', departmentName: '', courseId: '', courseName: '', branchId: '', branchName: '', feePeriod: 'Per Semester', yearOfStudy: '', semesterId: '', semesterName: '', admissionType: 'Regular', quota: 'Convener', studentCategory: '', effectiveFrom: '', effectiveTo: '', feeComponents: [feeComponent()], paymentPlan: { mode: 'Full Payment', allocationMode: 'Amount', dueDate: '', includeRefundable: false, installments: [] }, fineRules: { type: 'No Fine', gracePeriod: '', value: '', maximumFine: '', applicableComponentIds: [] }, concessionPolicy: { allowed: false, eligibleComponentIds: [] }, status: 'Draft', assignedCount: 0 })
const normalizeComponent = x => ({ ...feeComponent(), ...x, category: x.category === 'Academic Fees' ? 'Academic' : x.category })
export const normalizeAcademic = row => {
  const base = blankAcademic()
  const legacy = [...(row.components || []), ...(row.otherFees || [])]
  let feeComponents = (row.feeComponents?.length ? row.feeComponents : legacy).map(normalizeComponent)
  if (!feeComponents.length && row.branchFees?.[0]?.amount) feeComponents = [{ ...feeComponent(), name: 'Tuition Fee', amount: row.branchFees[0].amount }]
  const paymentPlan = row.paymentPlan && typeof row.paymentPlan === 'object' ? row.paymentPlan : { mode: row.paymentMode || 'Full Payment', dueDate: row.dueDate || '', installments: row.installments || [] }
  const normalized = { ...base, ...row, feeComponents, paymentPlan: { ...base.paymentPlan, ...paymentPlan }, fineRules: { ...base.fineRules, ...(row.fineRules || row.lateFee || {}) }, concessionPolicy: { ...base.concessionPolicy, ...row.concessionPolicy } }
  delete normalized.branchFees; delete normalized.components; delete normalized.otherFees; delete normalized.hostel; delete normalized.transport; delete normalized.installments; delete normalized.lateFee; delete normalized.paymentMode; delete normalized.dueDate
  normalized.name = normalized.name || structureName(normalized); normalized.code = normalized.code || structureCode(normalized)
  return normalized
}
export const readStructures = () => {
  const current = parse(ACADEMIC_KEY)
  if (current.length) return current.map(normalizeAcademic)
  const legacy = parse(LEGACY_KEY).map(normalizeAcademic)
  if (legacy.length) write(ACADEMIC_KEY, legacy, 'fee-structures-updated')
  return legacy
}
export const persistStructures = rows => write(ACADEMIC_KEY, rows.map(normalizeAcademic), 'fee-structures-updated')
const same = (a, b) => String(a || '') === String(b || '')
export const applicabilityKey = s => [s.academicYearId || s.academicYearName, s.departmentId || s.departmentName, s.courseId || s.courseName, s.branchId || s.branchName, s.feePeriod, s.feePeriod === 'Per Semester' ? s.semesterId || s.semesterName : s.yearOfStudy, s.admissionType, s.quota, s.studentCategory || '*'].map(String).join('|')
const dateValue = (value, fallback) => value ? new Date(`${value}T00:00:00`).getTime() : fallback
export const periodsOverlap = (a, b) => dateValue(a.effectiveFrom, -Infinity) <= dateValue(b.effectiveTo, Infinity) && dateValue(b.effectiveFrom, -Infinity) <= dateValue(a.effectiveTo, Infinity)
export const findConflict = (rows, candidate) => rows.find(x => x.id !== candidate.id && x.status === 'Active' && candidate.status === 'Active' && applicabilityKey(x) === applicabilityKey(candidate) && periodsOverlap(x, candidate))
export const matchesStructure = (s, a, onDate = new Date().toISOString().slice(0, 10)) => s.status === 'Active' && same(s.academicYearName, a.academicYear) && same(s.departmentName, a.department) && same(s.courseName, a.course) && same(s.branchName, a.branch) && same(s.admissionType, a.entryType || a.admissionType) && (s.quota === 'Other' ? a.quota === 'Other' : same(s.quota, a.quota)) && (!s.studentCategory || same(s.studentCategory, a.studentCategory)) && (s.feePeriod === 'Per Semester' ? same(s.semesterName, a.semester) : same(s.yearOfStudy, a.yearOfStudy)) && dateValue(s.effectiveFrom, -Infinity) <= dateValue(onDate, Infinity) && dateValue(s.effectiveTo, Infinity) >= dateValue(onDate, -Infinity)
export const saveAcademic = (rows, value, createVersion = false) => {
  const nextValue = normalizeAcademic({ ...value, collegeId: selectedCollegeId(), id: createVersion || !value.id ? uid('FS') : value.id, version: createVersion ? number(value.version) + 1 : number(value.version) || 1, updatedAt: new Date().toISOString() })
  nextValue.name = structureName(nextValue); nextValue.code = structureCode(nextValue)
  const conflict = findConflict(rows, nextValue); if (conflict) return { error: `Active effective period overlaps ${conflict.code}.` }
  const next = [nextValue, ...rows.filter(x => x.id !== nextValue.id)]
  persistStructures(next); return { rows: next, value: nextValue }
}
export const readHostelStructures = () => parse(HOSTEL_KEY)
export const persistHostelStructures = rows => write(HOSTEL_KEY, rows, 'hostel-fees-updated')
export const readTransportStructures = () => parse(TRANSPORT_KEY)
export const persistTransportStructures = rows => write(TRANSPORT_KEY, rows, 'transport-fees-updated')

// The new workflow is a separate, explicitly local workspace until matching
// backend write contracts exist. Never mix its preview receipts with server money.
const WORKSPACE_KEY = 'pirnav-fee-workspace-v1'
export const cents = value => Math.round(Number(value || 0) * 100)
export const rupees = value => value / 100
export const feeMoney = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value || 0))
export const feeToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const emptyFeeWorkspace = () => ({ revision: 0, components: [], structures: [], assignments: [], payments: [], concessions: [], refunds: [] })
export function readFeeWorkspace(collegeId) {
  const raw = localStorage.getItem(collegeStorageKey(WORKSPACE_KEY, collegeId))
  if (!raw) return emptyFeeWorkspace()
  const state = JSON.parse(raw)
  if (!state || !['components', 'structures', 'assignments', 'payments', 'concessions', 'refunds'].every(key => Array.isArray(state[key]))) throw new Error('Fee workspace could not be read. Restore its saved data before making changes.')
  return state
}
export function writeFeeWorkspace(state, collegeId) {
  if (!collegeId) throw new Error('Select a college first.')
  const current = readFeeWorkspace(collegeId)
  if (current.revision !== state.revision) throw new Error('Fees changed in another tab. Reload before saving.')
  const next = { ...state, revision: state.revision + 1 }
  localStorage.setItem(collegeStorageKey(WORKSPACE_KEY, collegeId), JSON.stringify(next))
  return next
}
export const newFeeStructure = (yearId = '') => ({ id: '', name: '', version: 1, status: 'Draft', academicYearId: yearId, courseId: '', branchId: '', batch: '', category: '', applicableTo: 'All Students', cycle: 'Yearly', semesterId: '', components: [], discount: 0, plan: 'Full Payment', dueDate: '', installments: [], grace: 0, penaltyType: 'None', penaltyValue: 0, maximumPenalty: '', audit: [] })
export const hasSingleStructureFee = structure => !structure.components.length || (structure.components.length === 1 && structure.components[0].masterId === 'structure-total-fee')
export function structureTotalFeeComponents(structure, amount) {
  if (!hasSingleStructureFee(structure)) throw new Error('Existing fee breakdown and refund rules must be preserved.')
  return [{ masterId: 'structure-total-fee', name: 'Total Fee', category: 'Academic', amount, mandatory: true, refundable: false, recurring: true, frequency: structure.cycle }]
}
export const academicFeeComponent = component => !['Hostel', 'Transport'].includes(component.domain || component.category)
const structureComponentsActive = (state, structure) => structure.components.every(component =>
  (component.masterId === 'structure-total-fee' && component.name === 'Total Fee' && component.category === 'Academic' && component.mandatory === true && component.refundable === false) ||
  (academicFeeComponent(component) && state.components.some(master => master.id === component.masterId && master.status === 'Active' && academicFeeComponent(master))))
export const feeTotal = structure => rupees(structure.components.reduce((sum, row) => sum + cents(row.amount), 0) - cents(structure.discount))
const fail = message => { throw new Error(message) }
const validAmount = (value, zero = false) => Number.isFinite(Number(value)) && (zero ? Number(value) >= 0 : Number(value) > 0) && Number(value) <= 100000000 && Math.abs(Number(value) * 100 - cents(value)) < 0.00001
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value))
export function validateFeeStructure(s, step = 3) {
  if (s.domain && s.domain !== 'Academic') return 'Use the service-specific fee workflow; facility allocation is not available in academic assignment.'
  if (!s.name.trim() || !s.academicYearId || !s.courseId || !s.branchId || !s.batch.trim()) return 'Complete the structure name, academic year, course, branch and batch.'
  if (s.applicableTo === 'Selected Category' && !s.category) return 'Select an admission category / quota.'
  if (s.cycle === 'Semester-wise' && !s.semesterId) return 'Select an applicable semester.'
  if (step < 1) return ''
  if (!s.components.length || s.components.some(c => !c.masterId || !validAmount(c.amount))) return 'Select fee components and enter positive amounts with at most two decimal places.'
  if (s.components.some(c => !academicFeeComponent(c))) return 'Hostel and Transport components cannot be included in an academic structure.'
  if (new Set(s.components.map(c => c.masterId)).size !== s.components.length) return 'A fee component can only be added once.'
  if (!validAmount(s.discount, true) || feeTotal(s) <= 0) return 'Concession must be non-negative and less than the subtotal.'
  if (step < 2) return ''
  if (s.plan === 'Full Payment' && !validDate(s.dueDate)) return 'Enter a valid payment due date.'
  if (s.plan === 'Installment Plan') {
    if (!s.installments.length || s.installments.some(i => !validDate(i.dueDate) || !validAmount(i.amount))) return 'Every installment needs a valid due date and positive amount.'
    if (s.installments.some((i, n) => n > 0 && i.dueDate < s.installments[n - 1].dueDate)) return 'Installment due dates must be in chronological order.'
    if (s.installments.reduce((sum, i) => sum + cents(i.amount), 0) !== cents(feeTotal(s))) return 'Installment amounts must equal the total fee exactly.'
  }
  if (!Number.isInteger(Number(s.grace)) || Number(s.grace) < 0 || Number(s.grace) > 365) return 'Grace period must be a whole number from 0 to 365 days.'
  if (s.penaltyType !== 'None' && (!validAmount(s.penaltyValue) || (s.penaltyType === 'Percentage' && Number(s.penaltyValue) > 100))) return 'Enter a valid penalty value (percentage cannot exceed 100).'
  if (s.maximumPenalty !== '' && !validAmount(s.maximumPenalty, true)) return 'Maximum penalty must be a non-negative amount.'
  return ''
}
export const DEFAULT_FEE_HEADS = [
  { id: 'fh-tuition', name: 'Tuition Fee', code: 'TUI', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-university', name: 'University Fee', code: 'UNI', category: 'University', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-lab', name: 'Laboratory Fee', code: 'LAB', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-library', name: 'Library Fee', code: 'LIB', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-exam', name: 'Examination Fee', code: 'EXAM', category: 'Examination', frequency: 'Semester-wise', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-development', name: 'Development Fee', code: 'DEV', category: 'Academic', frequency: 'Yearly', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-admission', name: 'Admission Fee', code: 'ADM', category: 'Admission', frequency: 'One Time', mandatory: true, refundable: false, status: 'Active' },
  { id: 'fh-caution', name: 'Caution Deposit', code: 'CAU', category: 'Deposit', frequency: 'One Time', mandatory: false, refundable: true, status: 'Active' },
]

export function checkDuplicateStructure(existingStructures = [], candidate) {
  if (!candidate || !candidate.academicYearId || !candidate.courseId || !candidate.branchId || !candidate.batch?.trim()) {
    return null
  }
  return existingStructures.find(s =>
    s.id !== candidate.id &&
    s.status !== 'Archived' &&
    String(s.academicYearId) === String(candidate.academicYearId) &&
    String(s.courseId) === String(candidate.courseId) &&
    String(s.branchId) === String(candidate.branchId) &&
    String(s.batch || '').trim().toLowerCase() === String(candidate.batch || '').trim().toLowerCase() &&
    (s.cycle || 'Yearly') === (candidate.cycle || 'Yearly') &&
    (candidate.cycle !== 'Semester-wise' || String(s.semesterId || '') === String(candidate.semesterId || '')) &&
    (candidate.applicableTo === 'All Students' || s.applicableTo === 'All Students' || String(s.category || '') === String(candidate.category || ''))
  ) || null
}

export const feeTransitions = { Draft: ['Pending Approval'], 'Pending Approval': ['Approved', 'Draft'], Approved: ['Published', 'Draft'], Published: ['Archived'], Archived: [] }
export function saveWorkflowStructure(state, value, status, actor) {
  const previous = state.structures.find(s => s.id === value.id)
  if (previous && (previous.status !== 'Draft' || state.assignments.some(a => a.structureId === previous.id))) fail('Only unassigned drafts can be edited. Create a revision instead.')
  if (!value.name.trim()) fail('Structure name is required to save a draft.')
  if (!['Draft', 'Pending Approval'].includes(status)) fail('Submit the draft for approval before publishing.')
  const missingStandard = (value.components || [])
    .filter(c => c.masterId !== 'structure-total-fee')
    .map(c => DEFAULT_FEE_HEADS.find(df => df.id === c.masterId || df.name.toLowerCase() === (c.name || '').toLowerCase()))
    .filter(Boolean)
  if (missingStandard.length > 0) {
    state = {
      ...state,
      components: [...state.components, ...missingStandard.filter(m => !state.components.some(sc => sc.id === m.id || sc.code === m.code))]
    }
  }
  if (status !== 'Draft') {
    const error = validateFeeStructure(value)
    if (error) fail(error)
    if (!structureComponentsActive(state, value)) fail('All selected fee components must be active in the master.')
  }
  const saved = { ...structuredClone(value), id: value.id || uid('FS'), status, audit: [...(previous?.audit || []), { status, actor, at: new Date().toISOString() }] }
  return { ...state, structures: [saved, ...state.structures.filter(s => s.id !== saved.id)] }
}
export function transitionFeeStructure(state, id, status, actor) {
  const s = state.structures.find(row => row.id === id)
  if (!s || !feeTransitions[s.status]?.includes(status)) fail('That status transition is not allowed.')
  if (status !== 'Draft' && status !== 'Archived') {
    const error = validateFeeStructure(s)
    if (error) fail(error)
    if (!structureComponentsActive(state, s)) fail('A component is inactive or missing. Return the structure to draft.')
  }
  return { ...state, structures: state.structures.map(row => row.id === id ? { ...row, status, audit: [...row.audit, { status, actor, at: new Date().toISOString() }] } : row) }
}
export function saveFeeComponent(state, component) {
  if (!component.name.trim() || !component.code.trim() || !component.category) fail('Component name, code and category are required.')
  if (state.components.some(c => c.id !== component.id && c.code.toLowerCase() === component.code.trim().toLowerCase())) fail('Component code must be unique.')
  const row = { ...component, id: component.id || uid('FC'), name: component.name.trim(), code: component.code.trim().toUpperCase() }
  return { ...state, components: [row, ...state.components.filter(c => c.id !== row.id)] }
}
export const studentMatchesFee = (student, s) => (!s.domain || s.domain === 'Academic') && ['academicYearId', 'courseId', 'branchId', 'batch'].every(k => Boolean(s[k]) && String(student[k] || '') === String(s[k])) && (s.cycle !== 'Semester-wise' || (Boolean(s.semesterId) && String(student.semesterId) === String(s.semesterId))) && (s.applicableTo !== 'Selected Category' || (Boolean(s.category) && student.category === s.category))
export function assignFeeStructure(state, structureId, students) {
  const s = state.structures.find(row => row.id === structureId)
  if (!s || s.status !== 'Published') fail('Only published structures can be assigned.')
  if (!students.length || new Set(students.map(s => s.id)).size !== students.length) fail('Select students once each.')
  if (students.some(student => !studentMatchesFee(student, s))) fail('One or more students do not match the structure academic scope.')
  if (students.some(student => state.assignments.some(a => a.student.id === student.id && String(a.structure.academicYearId) === String(s.academicYearId) && (s.cycle === 'Yearly' || a.structure.cycle === 'Yearly' || String(a.structure.semesterId) === String(s.semesterId))))) fail('A student already has a fee assignment for this academic period.')
  return { ...state, assignments: [...state.assignments, ...students.map(student => ({ id: uid('FA'), structureId, student: structuredClone(student), structure: structuredClone(s), at: new Date().toISOString() }))] }
}
// Largest-remainder allocation keeps all fee arithmetic exact to the paise.
export function allocatePaise(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return weights.map(() => 0)
  const raw = weights.map(w => total * w / sum), result = raw.map(Math.floor)
  let left = total - result.reduce((a, b) => a + b, 0)
  raw.map((v, i) => ({ i, fraction: v - result[i] })).sort((a, b) => b.fraction - a.fraction).forEach(({ i }) => { if (left > 0) { result[i]++; left-- } })
  return result
}
export function feeLedger(state, assignment, today = feeToday()) {
  const s = assignment.structure, total = cents(feeTotal(s))
  const components = allocatePaise(total, s.components.map(c => cents(c.amount)))
  const schedule = s.plan === 'Full Payment' ? [{ id: 'full', dueDate: s.dueDate, amount: feeTotal(s) }] : s.installments
  const remaining = [...components], cells = []
  schedule.forEach((installment, n) => {
    const parts = n === schedule.length - 1 ? [...remaining] : allocatePaise(cents(installment.amount), remaining)
    parts.forEach((amount, i) => { remaining[i] -= amount; cells.push({ id: `${installment.id}:${s.components[i].masterId}`, installmentId: installment.id, installment: n + 1, dueDate: installment.dueDate, componentId: s.components[i].masterId, name: s.components[i].name, refundable: s.components[i].refundable, amount, paid: 0, concession: 0 }) })
  })
  const payments = state.payments.filter(p => p.assignmentId === assignment.id)
  const refunds = state.refunds.filter(r => r.assignmentId === assignment.id && r.status === 'Approved')
  const concessions = state.concessions.filter(c => c.assignmentId === assignment.id && c.status === 'Approved')
  cells.forEach(cell => {
    cell.paid = payments.reduce((sum, p) => sum + (p.allocations[cell.id] || 0), 0) - refunds.reduce((sum, r) => sum + (r.allocations?.[cell.id] || 0), 0)
    cell.concession = concessions.reduce((sum, c) => sum + (c.allocations?.[cell.id] || 0), 0)
    cell.balance = cell.amount - cell.concession - cell.paid
    const lateDate = new Date(`${cell.dueDate}T00:00:00Z`)
    lateDate.setUTCDate(lateDate.getUTCDate() + Number(s.grace || 0))
    cell.overdue = cell.balance > 0 && today > lateDate.toISOString().slice(0, 10)
    cell.status = cell.balance === 0 ? 'Paid' : cell.overdue ? 'Overdue' : cell.paid > 0 ? 'Partially Paid' : 'Pending'
  })
  const paid = cells.reduce((sum, c) => sum + c.paid, 0), concession = cells.reduce((sum, c) => sum + c.concession, 0), overdue = cells.filter(c => c.overdue).reduce((sum, c) => sum + c.balance, 0)
  let penalty = overdue && s.penaltyType !== 'None' ? (s.penaltyType === 'Fixed Amount' ? cents(s.penaltyValue) : Math.round(overdue * Number(s.penaltyValue) / 100)) : 0
  if (s.maximumPenalty !== '') penalty = Math.min(penalty, cents(s.maximumPenalty))
  return { cells, total, paid, concession, outstanding: total - concession - paid, overdue, penalty, payments, refunds }
}
function waterfall(cells, amount, key = 'balance') {
  let remaining = amount
  const allocations = {}
  for (const cell of cells) { const part = Math.min(remaining, cell[key]); if (part > 0) allocations[cell.id] = part; remaining -= part }
  if (remaining) fail('Amount exceeds the eligible balance.')
  return allocations
}
export function collectWorkspacePayment(state, input, actor) {
  const assignment = state.assignments.find(a => a.id === input.assignmentId)
  if (!assignment) fail('Select a fee assignment.')
  if (!validAmount(input.amount)) fail('Enter a positive payment with at most two decimal places.')
  if (!validDate(input.date) || input.date > feeToday()) fail('Payment date must be valid and cannot be in the future.')
  if (!['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Online Gateway'].includes(input.mode)) fail('Select a payment mode.')
  if (input.mode !== 'Cash' && !input.reference?.trim()) fail('Transaction reference is required for non-cash payments.')
  if (input.reference?.trim() && state.payments.some(p => p.reference === input.reference.trim() && p.mode === input.mode)) fail('This transaction reference has already been recorded.')
  const ledger = feeLedger(state, assignment), cells = ledger.cells.filter(c => (!input.installmentId || c.installmentId === input.installmentId) && (!input.componentId || c.componentId === input.componentId))
  const allocations = waterfall(cells, cents(input.amount))
  const payment = { ...input, reference: input.reference?.trim() || '', amount: rupees(cents(input.amount)), allocations, id: uid('PAY'), receipt: `PREVIEW-${String(state.payments.length + 1).padStart(6, '0')}`, actor, at: new Date().toISOString() }
  return { ...state, payments: [payment, ...state.payments] }
}
export function saveFeeAdjustment(state, kind, input) {
  if (!['concessions', 'refunds'].includes(kind)) fail('Invalid adjustment type.')
  const assignment = state.assignments.find(a => a.id === input.assignmentId)
  if (!assignment || !input.reason?.trim() || !validAmount(input.value)) fail('Select a student, enter a positive value and provide a reason.')
  if (input.unit === 'Percentage' && Number(input.value) > 100) fail('Percentage cannot exceed 100.')
  if (kind === 'refunds' && !state.payments.some(p => p.id === input.paymentId && p.assignmentId === input.assignmentId)) fail('Select the original payment.')
  const row = { ...input, id: uid(kind === 'refunds' ? 'RF' : 'SC'), status: 'Draft', at: new Date().toISOString() }
  return { ...state, [kind]: [row, ...state[kind]] }
}
export function transitionFeeAdjustment(state, kind, id, status, actor) {
  const row = state[kind].find(r => r.id === id)
  if (!row || !({ Draft: ['Submitted'], Submitted: ['Approved', 'Rejected'] }[row.status] || []).includes(status)) fail('Invalid approval transition.')
  let allocations = row.allocations, amount = row.amount
  if (status === 'Approved') {
    const assignment = state.assignments.find(a => a.id === row.assignmentId), ledger = feeLedger(state, assignment)
    if (kind === 'concessions') {
      amount = row.unit === 'Percentage' ? Math.round(ledger.total * Number(row.value) / 100) : cents(row.value)
      allocations = waterfall(ledger.cells, amount)
    } else {
      const payment = state.payments.find(p => p.id === row.paymentId)
      const prior = state.refunds.filter(r => r.paymentId === payment.id && r.status === 'Approved')
      const eligible = ledger.cells.filter(c => c.refundable).map(c => ({ ...c, eligible: Math.min(c.paid, (payment.allocations[c.id] || 0) - prior.reduce((sum, r) => sum + (r.allocations[c.id] || 0), 0)) }))
      amount = cents(row.value)
      allocations = waterfall(eligible, amount, 'eligible')
    }
  }
  return { ...state, [kind]: state[kind].map(r => r.id === id ? { ...r, status, allocations, amount, approvedBy: ['Approved', 'Rejected'].includes(status) ? actor : '', updatedAt: new Date().toISOString() } : r) }
}
