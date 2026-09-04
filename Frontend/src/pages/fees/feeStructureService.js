const ACADEMIC_KEY = 'pirnav-fee-structures-v3'
const LEGACY_KEY = 'pirnav-fee-structures-v2'
const HOSTEL_KEY = 'pirnav-hostel-fee-structures-v1'
const TRANSPORT_KEY = 'pirnav-transport-fee-structures-v1'

const parse = key => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }
const write = (key, rows, event) => { localStorage.setItem(key, JSON.stringify(rows)); window.dispatchEvent(new Event(event)); return rows }
const number = value => Number(value) || 0
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number(value))
export const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
export const feeComponent = () => ({ id: uid('FC'), feeHeadId: '', name: '', category: 'Academic', amount: '', frequency: 'Per Semester', requirement: 'Mandatory', refundable: 'Non-refundable', concessionAllowed: false, fineApplicable: false, dueRule: '', status: 'Active' })
export const componentTotals = items => (items || []).reduce((a, x) => { const n = number(x.amount); if (x.refundable === 'Refundable') a.refundable += n; else if (x.requirement === 'Optional') a.optional += n; else a.mandatory += n; a.total += n; return a }, { mandatory: 0, optional: 0, refundable: 0, total: 0 })

const codePart = value => { const words = String(value || '').match(/[A-Za-z0-9]+/g) || []; return (words.length > 1 ? words.map(x => x[0]).join('') : words[0] || '').slice(0, 7).toUpperCase() }
export const structureName = s => [s.courseName, s.branchName, s.feePeriod === 'Per Semester' ? s.semesterName : s.yearOfStudy, s.quota, s.academicYearName].filter(Boolean).join(' – ')
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
  const nextValue = normalizeAcademic({ ...value, id: createVersion || !value.id ? uid('FS') : value.id, version: createVersion ? number(value.version) + 1 : number(value.version) || 1, updatedAt: new Date().toISOString() })
  nextValue.name = structureName(nextValue); nextValue.code = structureCode(nextValue)
  const conflict = findConflict(rows, nextValue); if (conflict) return { error: `Active effective period overlaps ${conflict.code}.` }
  const next = [nextValue, ...rows.filter(x => x.id !== nextValue.id)]
  persistStructures(next); return { rows: next, value: nextValue }
}
export const readHostelStructures = () => parse(HOSTEL_KEY)
export const persistHostelStructures = rows => write(HOSTEL_KEY, rows, 'hostel-fees-updated')
export const readTransportStructures = () => parse(TRANSPORT_KEY)
export const persistTransportStructures = rows => write(TRANSPORT_KEY, rows, 'transport-fees-updated')
