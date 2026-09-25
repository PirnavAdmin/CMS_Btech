import { newestFirst, rememberCreated } from '../../../utils/newestFirst'
import { admissionDetailSections } from '../../../utils/recordDetailSections'
import useToastState from '../../../hooks/useToastState'
import { isApiResult } from '../../../utils/exportProvenance'
import ExportMenu, { PrintDetailsButton } from '../../../components/ExportMenu'
import { admissionColumns } from '../../../utils/exportColumns'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAlertCircle, FiArrowLeft, FiArrowRight, FiBookOpen, FiCamera, FiCheck, FiCheckCircle,
  FiChevronRight, FiClock, FiEdit2, FiEye, FiFileText, FiGrid,
  FiHome, FiInbox, FiPhone, FiPlus, FiSearch, FiShield,
  FiTrash2, FiUploadCloud, FiUser, FiUsers, FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import FilterPanel from '../../../components/FilterPanel'
import TablePagination, { PAGE_SIZE } from '../../../components/TablePagination'
import CompactSummary from '../../../components/CompactSummary'
import StatusBadge from '../../../components/StatusBadge'
import { academicYearApi, branchApi, courseApi, lookupIndianPincode, studentAdmissionApi, studentAcademicDetailsApi, studentAdmissionStatusApi, studentDocumentApi, studentFeeApi, studentParentApi, studentPreviousEducationApi } from '../../../api/apiEndpoints'
import { getOperationalAcademicYearOptions, resolveAcademicYearId } from '../../../utils/academicYearUtils'
import { getColleges, getSemesters } from '../../../auth/collegeApi'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import {
  apiAssetUrl,
  blankAddress,
  createEmptyCanonicalStudent,
  dateInputValue,
  DOCUMENTS_CONFIG,
  formatAddress,
  formatDateTime,
  formatDisplay,
  formatMoney,
  HOSTEL_FEES_DEFAULT,
  normalizeAddressObj,
  normalizeAdmissionStatus,
  normalizeCanonicalStudent,
  readAdmissionPhoto,
  REQUIRED_FIELDS,
  saveAdmissionPhoto,
  studentFullName,
  studentInitials,
  studentQuotaDisplay,
  tenDigitMobile,
} from '../../../utils/studentCanonicalModel'
import { useAcademic } from '../../../context/AcademicContext'
import './StudentAdmission.css'
import './AdmissionFixes.css'
import './DocumentPreviewFixes.css'

const STEPS = ['Basic Information', 'Contact & Address', 'Parent / Guardian', 'Academic Information', 'Previous Education', 'Admission Details', 'Fees', 'Documents Upload', 'Preview & Submit']
const STEP_ICONS = [FiUser, FiPhone, FiUsers, FiBookOpen, FiFileText, FiHome, FiInbox, FiUploadCloud, FiCheckCircle]
const STATUS = { DRAFT: 'Draft', PENDING: 'Pending', SUBMITTED: 'Submitted', APPLICATION_SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified', APPROVED: 'Approved', CORRECTION_REQUIRED: 'Correction Required', REJECTED: 'Rejected' }
const normalizeStatus = raw => normalizeAdmissionStatus(raw)
// Activation is owned by the backend. Only surface an email confirmation when
// the approval response explicitly supplies one; never infer delivery.
const approvalNotice = result => {
  const data = result && typeof result === 'object' ? result : {}
  const emailSent = [data.activationEmailSent, data.emailSent, data.activation?.emailSent, data.accountActivation?.emailSent].some(value => value === true)
  return emailSent
    ? 'Admission approved successfully. An account activation email has been sent to the student’s registered email address.'
    : 'Admission approved successfully. Account activation email delivery was not confirmed by the backend.'
}
const FILTERS = [
  ['status', 'Admission Status'], ['course', 'Course'],
  ['branch', 'Branch'], ['admissionType', 'Admission Type'], ['feeStatus', 'Fee Status'],
]
const DETAIL_TABS = [
  ['overview', 'Overview', FiGrid], ['personal', 'Personal & Contact', FiUser],
  ['academic', 'Academic', FiBookOpen], ['education', 'Previous Education', FiFileText],
  ['services', 'Admission & Services', FiHome], ['fees', 'Fees', FiInbox], ['documents', 'Documents', FiFileText], ['activity', 'Activity', FiClock],
]
const DOCUMENTS = DOCUMENTS_CONFIG
const ADMISSION_TYPES = ['Regular / Counselling','Management','Spot Admission','Lateral Entry','Transfer','Direct Admission','Re-Admission','International Admission']
const ADMISSION_QUOTAS = ['Government / Convener','Management','NRI','NRI Sponsored','Institutional','Other']
const HOSTEL_FEES = HOSTEL_FEES_DEFAULT
const TRANSPORT_FEES = { 'Route 1': 18000, 'Route 2': 22000, 'Route 3': 26000, 'Route 4': 30000 }

const empty = () => createEmptyCanonicalStudent()

const merge = row => {
  const base = empty()
  return normalizeCanonicalStudent({ ...base, ...row })
}

const admissionFromApi = row => {
  if (!row) return empty()
  return normalizeCanonicalStudent(row)
}

const documentsFromApi = rows => {
  const mapped = { ...Object.fromEntries(DOCUMENTS.map(([key]) => [key, null])), otherCertificates: [] }
  for (const row of Array.isArray(rows) ? rows : []) {
    const type = String(row.documentType ?? row.type ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const key = DOCUMENTS.find(([candidate, label]) => [candidate, label].some(value => String(value).replace(/[^a-z0-9]/gi, '').toLowerCase() === type))?.[0]
    const document = { ...row, id: row.documentId ?? row.id, name: row.fileName ?? row.name ?? row.originalFileName, data: apiAssetUrl(row.data ?? row.fileUrl ?? row.documentUrl ?? row.downloadUrl ?? row.url), uploadedAt: row.uploadedAt ?? row.createdAt, uploaded: true }
    if (key) mapped[key] = document
    else mapped.otherCertificates.push(document)
  }
  return mapped
}
const mergeDocumentStatuses = (savedDocuments, uploadedDocuments) => {
  const uploaded = uploadedDocuments || {}
  const merged = { ...(savedDocuments || {}) }
  DOCUMENTS.forEach(([key]) => {
    if (uploaded[key]) merged[key] = uploaded[key]
  })
  if (Array.isArray(uploaded.otherCertificates) && uploaded.otherCertificates.length) merged.otherCertificates = uploaded.otherCertificates
  return merged
}
const documentStatus = document => {
  const savedStatus = typeof document === 'object' ? document?.status : document
  if (text(savedStatus)) return String(savedStatus)
  return document?.uploaded || document?.file || document?.data || document?.id ? 'Submitted' : 'Not Submitted'
}
const idsFromApi = (row = {}, fallbackAdmissionId = null) => ({
  admissionId: row.admissionId ?? row.studentAdmissionId ?? row.admission?.admissionId ?? row.id ?? fallbackAdmissionId,
  studentId: row.studentId ?? row.student?.studentId ?? row.student?.id ?? row.studentDetails?.studentId ?? row.personalInformation?.studentId ?? null,
  academicId: row.academicId ?? row.academicInformationId ?? row.academicInformation?.academicId ?? row.academicDetails?.academicId ?? null,
})
const read = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)
const setPath = (object, path, value) => { const clone = structuredClone(object); const keys = path.split('.'); let cursor = clone; keys.slice(0, -1).forEach(key => { if (!cursor[key]) cursor[key] = {}; cursor = cursor[key] }); cursor[keys.at(-1)] = value; return clone }
const text = value => String(value ?? '').trim()
const same = (left,right) => String(left ?? '') === String(right ?? '')
const studentName = student => studentFullName(student)
const display = value => formatDisplay(value)
const money = value => formatMoney(value)
const dateTime = value => formatDateTime(value)
const quota = student => studentQuotaDisplay(student)
const normalizeFeeSummary = response => {
  if (!response || typeof response !== 'object') return {}
  const nested = response.feeSummary ?? response.summary ?? response.feeDetails ?? response.feeStructure ?? {}
  const summary = { ...(typeof nested === 'object' ? nested : {}), ...response }
  const componentSource = summary.components ?? summary.feeComponents ?? summary.feeHeads ?? summary.feeHeadDetails ?? summary.feeStructureDetails ?? summary.feeBreakdown ?? summary.breakdown ?? summary.feeItems ?? summary.items ?? summary.fees ?? []
  const components = (Array.isArray(componentSource) ? componentSource : []).map(item => ({ ...item, name: item.name ?? item.feeHeadName ?? item.feeName ?? item.componentName ?? item.description, amount: item.amount ?? item.feeAmount ?? item.amountPayable ?? item.totalAmount ?? item.value ?? item.fee }))
  const componentAmount = pattern => components.filter(item => pattern.test(String(item.name || ''))).reduce((total,item) => total + Number(item.amount || 0),0)
  const componentsTotal = components.reduce((total,item) => total + Number(item.amount || 0),0)
  const tuition = Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) > 0 ? Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) : (componentAmount(/tuition|academic/i) || 50000)
  const admission = Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) > 0 ? Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) : (componentAmount(/admission|registration/i) || 4000)
  const hostel = Number((summary.hostelFee ?? summary.hostelAmount) || 0)
  const transport = Number((summary.transportFee ?? summary.transportationFee ?? summary.transportAmount) || 0)
  const scholarship = Number((summary.scholarshipAmount ?? summary.discountAmount ?? summary.concessionAmount) || 0)
  const computedTotal = Math.max(0, tuition + admission + hostel + transport - scholarship)
  const total = Number(summary.firstYearTotal ?? summary.totalFee ?? summary.totalAmount ?? summary.grandTotal ?? summary.netPayable ?? summary.totalPayable ?? summary.netAmount ?? summary.payableAmount) > 0 ? Number(summary.firstYearTotal ?? summary.totalFee ?? summary.totalAmount ?? summary.grandTotal ?? summary.netPayable ?? summary.totalPayable ?? summary.netAmount ?? summary.payableAmount) : (componentsTotal > 0 ? componentsTotal : computedTotal)
  return {
    ...summary,
    feeStructureId: summary.feeStructureId ?? summary.structureId ?? summary.feeStructure?.feeStructureId ?? summary.feeStructure?.id ?? 'FS-STANDARD',
    structureId: summary.structureId ?? summary.feeStructureId ?? summary.feeStructure?.id ?? 'FS-STANDARD',
    components: Array.isArray(components) ? components : [],
    tuitionFee: tuition,
    admissionFee: admission,
    hostelFee: hostel,
    transportFee: transport,
    scholarshipAmount: scholarship,
    totalFee: total,
    paymentStatus: summary.paymentStatus || 'Pending',
    paymentPlan: summary.paymentPlan || 'Full Payment',
  }
}
const hasFeeSummary = response => {
  const summary = normalizeFeeSummary(response)
  const componentAmount = summary.components.reduce((total, item) => total + Number(item.amount ?? item.feeAmount ?? item.value ?? 0), 0)
  const summaryAmount = [summary.tuitionFee, summary.admissionFee, summary.totalFee].reduce((total, value) => total + Number(value || 0), 0)
  return componentAmount > 0 || summaryAmount > 0
}
const mergeFeeResponses = (summaryResponse, structureResponse) => {
  const summary = normalizeFeeSummary(summaryResponse)
  const structure = normalizeFeeSummary(structureResponse)
  const amount=(summaryValue,structureValue)=>Number(summaryValue)>0?summaryValue:structureValue
  return normalizeFeeSummary({ ...structure, ...summary, components: structure.components.length ? structure.components : summary.components, feeComponents: structure.feeComponents?.length ? structure.feeComponents : summary.feeComponents,tuitionFee:amount(summary.tuitionFee,structure.tuitionFee),admissionFee:amount(summary.admissionFee,structure.admissionFee),hostelFee:amount(summary.hostelFee,structure.hostelFee),transportFee:amount(summary.transportFee,structure.transportFee),scholarshipAmount:amount(summary.scholarshipAmount,structure.scholarshipAmount),totalFee:amount(summary.totalFee,structure.totalFee) })
}
const defaultFeeSummary = data => {
  const tuition = Number(data.fees?.tuitionFee) > 0 ? Number(data.fees.tuitionFee) : 50000
  const admission = Number(data.fees?.admissionFee !== undefined && data.fees?.admissionFee !== '' ? data.fees.admissionFee : 4000)
  const hostelFee = data.admission?.hostel === 'Yes' ? Number(HOSTEL_FEES[data.admission?.hostelRoomType] || data.fees?.hostelFee || 0) : 0
  const transportFee = data.admission?.transport === 'Yes' ? Number(TRANSPORT_FEES[data.admission?.transportRoute] || data.fees?.transportFee || 0) : 0
  const scholarshipAmount = Number(data.fees?.scholarshipAmount || 0)
  const total = Math.max(0, tuition + admission + hostelFee + transportFee - scholarshipAmount)
  return {
    structureId: data.fees?.structureId || 'FS-STANDARD',
    feeStructureId: data.fees?.feeStructureId || data.fees?.structureId || 'FS-STANDARD',
    tuitionFee: tuition,
    admissionFee: admission,
    hostelFee,
    transportFee,
    scholarshipAmount,
    totalFee: total,
    paymentStatus: data.fees?.paymentStatus || 'Pending',
    paymentPlan: data.fees?.paymentPlan || 'Full Payment',
    source: 'standard'
  }
}
const resolveFeeSummary = (data, summaryResponse, structureResponse) => {
  const backend = mergeFeeResponses(summaryResponse, structureResponse)
  if (hasFeeSummary(backend)) return { ...backend, admissionFee: Number(backend.admissionFee)>0?backend.admissionFee:(data.fees?.admissionFee || 4000), source: 'backend' }
  return defaultFeeSummary(data)
}
const normalizeEmail = value => text(value).toLowerCase()
const validEmail = value => { const email = normalizeEmail(value); return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(email) && !email.includes('..') }
const academicEndYear = data => Number(String(data.academic.academicYear || new Date().getFullYear()).slice(0,4)) || new Date().getFullYear()
const validPassingYear = (value, data, level) => { if (!/^\d{4}$/.test(text(value))) return 'Enter a valid 4-digit passing year.'; const year=Number(value), limit=academicEndYear(data); if(year>limit)return 'Year of passing cannot be in the future.'; const birthYear=data.personal.dob?new Date(`${data.personal.dob}T00:00:00`).getFullYear():null; if(birthYear&&year<birthYear+(level==='tenth'?14:16))return 'Year of passing is not valid for the student date of birth.'; if(level==='intermediate'&&data.previousEducation.tenth.passingYear&&year<Number(data.previousEducation.tenth.passingYear))return 'Qualification year cannot be earlier than the 10th passing year.'; return '' }
const validScore = item => { const value=text(item.score); if(!value)return ''; if(!/^\d+(\.\d{1,2})?$/.test(value))return `Enter a valid ${item.scoreType.toLowerCase()}.`; const number=Number(value), max=item.scoreType==='CGPA'?10:100; return number<0||number>max?`${item.scoreType} must be between 0 and ${max}.`:'' }

const _aadhaarChecksum = value => {
  const digits = text(value).replace(/\D/g, '')
  if (!/^\d{12}$/.test(digits) || /^(\d)\1{11}$/.test(digits)) return false
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
  return [...digits].reverse().reduce((checksum, digit, index) => d[checksum][p[index % 8][Number(digit)]], 0) === 0
}
const validAadhaar = value => /^\d{12}$/.test(text(value)) && !/^(\d)\1{11}$/.test(text(value))
const validDob = value => {
  if (!text(value)) return true
  const dob = new Date(`${value}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return false
  const today = new Date()
  const latestEligibleDob = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
  return dob <= latestEligibleDob
}
const REQUIRED = ['personal.firstName','personal.lastName','personal.gender','personal.dob','personal.aadhaar','contact.mobile','contact.email','contact.currentAddress.line1','contact.currentAddress.town','contact.currentAddress.city','contact.currentAddress.district','contact.currentAddress.state','contact.currentAddress.pincode','academic.academicYear','academic.admissionType','academic.course','academic.branch','admission.collegeId']
const requiredPaths = new Set(REQUIRED)
const validationStep = path => {
  const prefixes = ['personal.','contact.','parents.','academic.','previousEducation.','admission.','fees.','documents.']
  const index = prefixes.findIndex(prefix => path.startsWith(prefix))
  return index < 0 ? 0 : index
}
const validationLabel = path => {
  const labels = {
    'admission.hostelPreference':'Hostel preference',
    'admission.hostelRoomType':'Hostel room type',
    'admission.transportRoute':'Transport route',
  }
  return labels[path] || path.split('.').at(-1).replace(/([A-Z])/g,' $1').replace(/^./,value=>value.toUpperCase())
}
const validate = data => {
  const errors = {}
  REQUIRED.forEach(path => { if (!text(read(data, path))) errors[path] = 'This field is required.' })
  if (data.personal.dob && !validDob(data.personal.dob)) errors['personal.dob'] = 'Student must be at least 17 years old.'
  if (!data.contact.sameAddress) ['line1','town','city','district','state','pincode'].forEach(key => { if (!text(data.contact.permanentAddress[key])) errors[`contact.permanentAddress.${key}`] = 'This field is required.' })
  if (data.personal.aadhaar && !validAadhaar(data.personal.aadhaar)) errors['personal.aadhaar'] = 'Enter a valid 12-digit Aadhaar number.'
  ;['contact.mobile','contact.alternateMobile','parents.father.mobile','parents.mother.mobile','parents.guardian.mobile'].forEach(path => { if (read(data, path) && !/^[6-9]\d{9}$/.test(read(data, path))) errors[path] = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' })
  ;['contact.email','contact.alternateEmail','parents.father.email','parents.mother.email','parents.guardian.email'].forEach(path => { if (text(read(data,path)) && !validEmail(read(data,path))) errors[path] = 'Enter a valid email address.' })
  if (text(data.contact.alternateMobile) && data.contact.mobile === data.contact.alternateMobile) errors['contact.alternateMobile'] = 'Alternate mobile number must be different from the student mobile number.'
  if (text(data.contact.alternateEmail) && text(data.contact.email).toLowerCase() === text(data.contact.alternateEmail).toLowerCase()) errors['contact.alternateEmail'] = 'Alternate email must be different from the student email.'
  ;[['tenth','tenth'],['intermediate','intermediate']].forEach(([key,level]) => { const item=data.previousEducation[key], yearError=item.passingYear?validPassingYear(item.passingYear,data,level):''; if(yearError)errors[`previousEducation.${key}.passingYear`]=yearError; const scoreError=validScore(item); if(scoreError)errors[`previousEducation.${key}.score`]=scoreError })
  if (data.academic.admissionType === 'Lateral Entry' && !text(data.academic.quota)) errors['academic.quota'] = 'Select the admission quota for lateral entry.'
  if (data.academic.admissionType === 'Lateral Entry' && data.academic.quota === 'Other' && !text(data.academic.quotaOther)) errors['academic.quotaOther'] = 'Enter the admission quota.'
  if (data.previousEducation.intermediate.stream === 'Other' && !text(data.previousEducation.intermediate.streamOther)) errors['previousEducation.intermediate.streamOther'] = 'Enter the stream name.'
  if (data.admission.hostel === 'Yes' && !text(data.admission.hostelPreference)) errors['admission.hostelPreference'] = 'Select a hostel preference.'
  if (data.admission.hostel === 'Yes' && !text(data.admission.hostelRoomType)) errors['admission.hostelRoomType'] = 'Select a room type / number of beds.'
  if (data.admission.transport === 'Yes' && !text(data.admission.transportRoute)) errors['admission.transportRoute'] = 'Select a transport route.'
  ;['tuitionFee','admissionFee','scholarshipAmount','hostelFee','transportFee'].forEach(key => { if (text(data.fees[key]) && Number(data.fees[key]) < 0) errors[`fees.${key}`] = 'Amount cannot be negative.' })
  const grossFee = ['tuitionFee','admissionFee','hostelFee','transportFee'].reduce((sum,key) => sum + Number(data.fees[key] || 0), 0)
  if (Number(data.fees.scholarshipAmount || 0) > grossFee) errors['fees.scholarshipAmount'] = 'Scholarship cannot exceed the gross fee.'
  ;['permanentAddress','currentAddress'].forEach(section => { if (section === 'permanentAddress' && data.contact.sameAddress) return; const item = data.contact[section]; if (item.pincode && !/^\d{6}$/.test(item.pincode)) errors[`contact.${section}.pincode`] = 'Enter a valid 6-digit PIN code.'; if (item.line1 && item.line1.length < 5) errors[`contact.${section}.line1`] = 'Enter a complete address.' })
  return errors
}

const duplicateAdmissionMessage = (rows, candidate, currentAdmissionId = '') => {
  const digits = value => String(value || '').replace(/\D/g, '')
  const candidateId = String(currentAdmissionId || candidate.admissionId || candidate.studentAdmissionId || '')
  const match = rows.map(admissionFromApi).find((row) => {
    // Normalized admissions use `id` for the student profile when one exists;
    // compare the admission-specific ID first so editing this same record does
    // not report its Aadhaar/mobile as a duplicate of itself.
    const rowAdmissionId = String(row.admissionId ?? row.studentAdmissionId ?? row.id ?? '')
    if (candidateId && rowAdmissionId === candidateId) return false
    return (digits(candidate.personal?.aadhaar).length === 12 && digits(row.personal?.aadhaar) === digits(candidate.personal?.aadhaar))
      || (digits(candidate.contact?.mobile).length === 10 && digits(row.contact?.mobile) === digits(candidate.contact?.mobile))
  })
  if (!match) return ''
  if (digits(candidate.personal?.aadhaar).length === 12 && digits(match.personal?.aadhaar) === digits(candidate.personal?.aadhaar)) return 'An admission with this Aadhaar number already exists.'
  return 'An admission with this student mobile number already exists.'
}

function Badge({ value }) { const norm = normalizeStatus(value); return <span className={`sa-badge status-${norm.toLowerCase().replaceAll('_', '-')}`}><i />{STATUS[norm] || STATUS[value] || value}</span> }
function Button({ primary = false, danger = false, children, ...props }) { return <button className={danger ? 'sa-danger' : primary ? 'sa-primary' : 'sa-secondary'} {...props}>{children}</button> }
function ConfirmDialog({ title, children, confirmLabel, tone = 'primary', icon: Icon = FiShield, onCancel, onConfirm, busy = false, error }) { return <div className="sa-overlay" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}><section className="sa-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title"><button className="sa-dialog-close" disabled={busy} onClick={onCancel} aria-label="Close"><FiX /></button><div className={`sa-dialog-icon tone-${tone}`}><Icon /></div><h2 id="sa-confirm-title">{title}</h2><div className="sa-dialog-copy">{children}{error && <p role="alert" className="sa-decision-error">{error}</p>}</div><footer><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy} primary={tone !== 'danger'} danger={tone === 'danger'} onClick={onConfirm}>{busy ? 'Saving...' : confirmLabel}</Button></footer></section></div> }
function Section({ title, icon: Icon = FiFileText, hint, children, className = '' }) { const shownTitle = title === 'Application Information' ? 'Registration Details' : title; return <section className={`sa-form-section ${className}`}><header><span><Icon /></span><div><h2>{shownTitle}</h2>{hint && <p>{hint}</p>}</div></header><div className="sa-form-grid">{children}</div></section> }

function Field({ data, path, label, update, options, type = 'text', readOnly = false, error, placeholder, disabled = false, required }) {
  const isRequired = required !== undefined ? required : (
    requiredPaths.has(path) ||
    (!data?.contact?.sameAddress && path.startsWith('contact.permanentAddress.') && ['line1','town','city','district','state','pincode'].includes(path.split('.').at(-1))) ||
    (data?.academic?.admissionType === 'Lateral Entry' && path === 'academic.quota') ||
    (data?.academic?.admissionType === 'Lateral Entry' && data?.academic?.quota === 'Other' && path === 'academic.quotaOther') ||
    (data?.previousEducation?.intermediate?.stream === 'Other' && path === 'previousEducation.intermediate.streamOther') ||
    (data?.admission?.hostel === 'Yes' && ['admission.hostelPreference', 'admission.hostelRoomType'].includes(path)) ||
    (data?.admission?.transport === 'Yes' && path === 'admission.transportRoute')
  )
  const value = read(data, path) ?? ''
  const shownLabel = ({ 'Application Number': 'Registration Number', 'Application Date': 'Registration Date' })[label] || label
  const numeric = /mobile|pincode|aadhaar|passingYear/i.test(path)
  const maxLength = /aadhaar$/i.test(path) ? 12 : /pincode/i.test(path) ? 6 : /mobile/i.test(path) ? 10 : /passingYear/i.test(path) ? 4 : undefined
  const id = `sa-${path.replaceAll('.', '-')}`
  const change = event => update(path, numeric ? event.target.value.replace(/\D/g, '').slice(0, maxLength) : event.target.value)
  const blur = () => { if (/email/i.test(path) && value !== text(value)) update(path, text(value)) }
  return (
    <label className={`sa-field ${error ? 'invalid' : ''}`} htmlFor={id}>
      <span>{shownLabel}{isRequired && <b> *</b>}</span>
      {options ? (
        <select id={id} value={value} disabled={disabled || readOnly} onChange={change} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
          <option value="">{placeholder || `Select ${shownLabel}`}</option>
          {options.map(option => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input id={id} type={type} value={value} readOnly={readOnly || path === 'admission.batch'} disabled={disabled} inputMode={numeric ? 'numeric' : type === 'number' ? 'decimal' : undefined} min={type === 'number' ? 0 : undefined} maxLength={maxLength} placeholder={placeholder} onChange={change} onBlur={blur} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      )}
      {error && <small id={`${id}-error`} role="alert">{error}</small>}
    </label>
  )
}
function AddressFields({ data, prefix, update, errors }) { return [['line1','Address Line 1'],['line2','Landmark (Optional)'],['town','Village / Town'],['city','City'],['district','District'],['state','State'],['country','Country'],['pincode','PIN Code']].map(([key,label]) => <Field key={key} data={data} path={`${prefix}.${key}`} label={label} update={update} error={errors[`${prefix}.${key}`]} />) }
function Breadcrumb({ tail }) { return <div className="sa-breadcrumb"><span>Student Management</span><FiChevronRight /><span>Admissions</span>{tail && <><FiChevronRight /><strong>{tail}</strong></>}</div> }

function AdmissionFilters({ rows, query, setQuery, filters, setFilters }) {
  const options = key => [...new Set(rows.map(item => key === 'status' ? item.status : key === 'feeStatus' ? (item.fees?.paymentStatus || 'Pending') : key === 'quota' ? quota(item) : item.academic?.[key]).filter(Boolean))].sort()
  const active = Object.entries(filters).filter(([,value]) => value)
  const clear = () => { setQuery(''); setFilters(Object.fromEntries(FILTERS.map(([key]) => [key, '']))) }
  return <FilterPanel active={Boolean(query || active.length)} onClear={clear} className="sa-filter-panel"><div className="sa-toolbar"><label className="sa-search"><FiSearch /><input value={query} onChange={event => setQuery(event.target.value)} title="Search name, registration, admission, mobile or email" placeholder="Search name, registration, admission, mobile or email" /></label></div><div className="sa-filter-grid">{FILTERS.map(([key,label]) => <label key={key}><span>{label}</span><select value={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value }))}><option value="">All {label}</option>{options(key).map(value => <option value={value} key={value}>{key === 'status' ? (STATUS[value] || value) : value}</option>)}</select></label>)}</div>{active.length > 0 && <div className="sa-filter-chips">{active.map(([key,value]) => <button key={key} onClick={() => setFilters(current => ({ ...current, [key]: '' }))}>{FILTERS.find(item => item[0] === key)?.[1]}: {key === 'status' ? (STATUS[value] || value) : value} <FiX /></button>)}</div>}</FilterPanel>
}
function EmptyState({ hasRows, filtered, onCreate, onClear }) {
  return <div className="sa-empty"><span><FiInbox /></span><h3>{hasRows && filtered ? 'No applications match the selected filters.' : 'No admission applications found'}</h3><p>{hasRows && filtered ? 'Adjust or clear the active filters to view applications.' : 'Create a new admission application to begin student enrollment.'}</p>{hasRows && filtered ? <Button onClick={onClear}>Clear Filters</Button> : <Button primary onClick={onCreate}><FiPlus /> New Admission</Button>}</div>
}

function AdmissionList() {
  const navigate = useNavigate()
  const { selectedCollegeId, selectedCollege, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const [rows, setRows] = useState([])
  const [, setLoadError] = useToastState('', 'error')
  const [exportReady, setExportReady] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const initialFilters = Object.fromEntries(FILTERS.map(([key]) => [key, '']))
  const [filters, setFilters] = useState(initialFilters)
  useEffect(() => { let active = true; studentAdmissionApi.getAll().then(items => { if (active) { setExportReady(isApiResult(items)); setRows(newestFirst('admissions', items).map(admissionFromApi)) } }).catch(error => { if (active) setLoadError(error.message || 'Unable to load admissions.') }); return () => { active = false } }, [setLoadError])

  const normYear = y => String(y || '').replace(/[^0-9]/g, '')
  const scopedRows = useMemo(() => {
    return rows.filter(item => {
      let collegeMatches = true
      if (selectedCollegeId) {
        const itemCollegeId = item.admission?.collegeId ?? item.collegeId ?? item.academic?.collegeId ?? ''
        const itemCollegeName = item.admission?.college ?? item.college ?? ''
        const matchById = itemCollegeId && String(itemCollegeId) === String(selectedCollegeId)
        const matchByName = selectedCollege?.name && itemCollegeName && itemCollegeName.trim().toLowerCase() === selectedCollege.name.trim().toLowerCase()
        collegeMatches = Boolean(matchById || matchByName)
      }

      let yearMatches = true
      if (selectedAcademicYearId) {
        const itemYearId = item.academic?.academicYearId ?? item.academicYearId ?? ''
        const itemYearName = item.academic?.academicYear ?? item.academicYear ?? ''
        const matchById = itemYearId && String(itemYearId) === String(selectedAcademicYearId)
        const matchByName = selectedAcademicYear?.name && itemYearName && (
          normYear(itemYearName) === normYear(selectedAcademicYear.name) ||
          itemYearName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase()
        )
        yearMatches = Boolean(matchById || matchByName)
      }

      return collegeMatches && yearMatches
    })
  }, [rows, selectedCollegeId, selectedCollege, selectedAcademicYearId, selectedAcademicYear])

  const shown = useMemo(() => scopedRows.filter(item => {
    const needle = [studentName(item),item?.application?.number,item?.application?.admissionNumber,item?.application?.registrationNumber,item?.contact?.mobile,item?.contact?.email].join(' ').toLowerCase()
    const normStat = normalizeStatus(item?.status)
    const values = { status: normStat, course: item?.academic?.course, department: item?.academic?.department, branch: item?.academic?.branch, semester: item?.academic?.semester, admissionType: item?.academic?.admissionType, quota: quota(item), feeStatus: item?.fees?.paymentStatus || 'Pending' }
    return needle.includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key,value]) => !value || values[key] === value)
  }), [scopedRows, query, filters])
  useEffect(() => { setPage(1) }, [query, filters])
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const clear = () => { setQuery(''); setFilters(initialFilters); setPage(1) }
  const stats = {
    total: scopedRows.length,
    approved: scopedRows.filter(item => normalizeStatus(item.status) === 'APPROVED').length,
    pending: scopedRows.filter(item => ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(normalizeStatus(item.status))).length,
    draft: scopedRows.filter(item => normalizeStatus(item.status) === 'DRAFT').length,
  }

  return (
    <>
      <header className="sa-page-header cm-header">
        <div>
          <h1>Student Admissions</h1>
          <p>Manage student registrations, verification, approval and enrollment</p>
        </div>
        <div className="cm-row-actions">
          <CompactSummary
            label="Admission summary"
            items={[
              { label: 'Total', value: stats.total },
              { label: 'Approved', value: stats.approved, tone: 'active' },
              { label: 'Pending', value: stats.pending, tone: 'upcoming' },
              { label: 'Draft', value: stats.draft, tone: 'inactive' },
            ]}
          />
        </div>
      </header>
      <section className="sa-directory cm-panel">
        <header className="course-directory-heading">
          <div>
            <span className="cm-eyebrow">Admission Directory</span>
            <p>{shown.length} records</p>
          </div>
          <div className="directory-export-actions">
            <ExportMenu rows={shown} columns={admissionColumns} recordSections={admissionDetailSections} title="Student Admissions" filename="student-admissions" loading={!exportReady} scope="Current filtered API results" />
            <button className="cm-button" type="button" onClick={() => navigate('/student-management/admissions/new')}>
              <FiPlus /> New Admission
            </button>
          </div>
        </header>
        <AdmissionFilters rows={scopedRows} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} />
        {!scopedRows.length || !shown.length ? (
          <EmptyState hasRows={Boolean(scopedRows.length)} filtered={Boolean(query || Object.values(filters).some(Boolean))} onCreate={() => navigate('/student-management/admissions/new')} onClear={clear} />
        ) : (
          <div className="sa-table-wrap" tabIndex={0} role="region" aria-label="Admissions table, scroll horizontally to see all columns">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Registration Number</th>
                  <th style={{ minWidth: '200px' }}>Student</th>
                  <th style={{ minWidth: '170px' }}>Academic Enrollment</th>
                  <th style={{ minWidth: '130px', maxWidth: '160px' }}>Admission Type</th>
                  <th className="table-center" style={{ width: '120px' }}>Fee Status</th>
                  <th className="table-center" style={{ width: '140px' }}>Application Status</th>
                  <th className="table-center" style={{ width: '140px' }}>Updated</th>
                  <th className="table-center" style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(item => {
                  const normStat = normalizeStatus(item.status)
                  const feeStat = item.fees?.paymentStatus || 'Pending'
                  const isEditable = ['DRAFT', 'CORRECTION_REQUIRED'].includes(normStat)
                  const isReviewable = ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(normStat)
                  const sName = studentName(item)
                  const sContact = item.contact.email || item.contact.mobile || 'Contact pending'
                  return (
                    <tr key={item.id}>
                      <td style={{ minWidth: '150px' }}>
                        <div className="table-primary-cell">
                          <strong title={item.application.number}>{item.application.number}</strong>
                          <small title={item.application.admissionNumber || 'Admission pending'}>{item.application.admissionNumber || 'Admission pending'}</small>
                        </div>
                      </td>
                      <td style={{ minWidth: '200px' }}>
                        <div className="sa-student">
                          <i>{item.personal.photo ? <img src={item.personal.photo} alt={sName} /> : sName.split(' ').map(part => part[0]).slice(0, 2).join('')}</i>
                          <span>
                            <strong title={sName}>{sName}</strong>
                            <small title={sContact}>{sContact}</small>
                          </span>
                        </div>
                      </td>
                      <td style={{ minWidth: '170px' }}>
                        <div className="table-primary-cell">
                          <strong title={display(item.academic.course)}>{display(item.academic.course)}</strong>
                          <small title={display(item.academic.branch)}>{display(item.academic.branch)}</small>
                        </div>
                      </td>
                      <td style={{ minWidth: '130px', maxWidth: '160px' }}><span className="table-cell-truncate" title={display(item.academic.admissionType)}>{display(item.academic.admissionType)}</span></td>
                      <td className="table-center" style={{ width: '120px' }}><StatusBadge value={feeStat} /></td>
                      <td className="table-center" style={{ width: '140px' }}><StatusBadge value={STATUS[normStat] || normStat} /></td>
                      <td className="table-center" style={{ width: '140px' }}><span className="sa-updated">{dateTime(item.updatedAt || item.createdAt)}</span></td>
                      <td className="table-center" style={{ width: '160px', minWidth: '160px' }}>
                        <div className="sa-icon-actions table-actions-group">
                          <button
                            className="table-action-btn action-view"
                            title="View Details"
                            aria-label="View details"
                            onClick={() => {
                              const targetId = item.admissionId || item.id || item.studentAdmissionId
                              if (targetId) navigate(`/student-management/admissions/${targetId}`)
                            }}
                          >
                            <FiEye />
                          </button>
                          {isEditable && (
                            <button
                              className="table-action-btn action-edit"
                              title="Edit Application"
                              aria-label="Edit application"
                              onClick={() => {
                                const targetId = item.admissionId || item.id || item.studentAdmissionId
                                if (targetId) navigate(`/student-management/admissions/${targetId}/edit`)
                              }}
                            >
                              <FiEdit2 />
                            </button>
                          )}
                          {isReviewable && (
                            <button
                              className="table-action-btn action-activate"
                              title="Review / Approve"
                              aria-label="Review application"
                              onClick={() => {
                                const targetId = item.admissionId || item.id || item.studentAdmissionId
                                if (targetId) navigate(`/student-management/admissions/${targetId}/approval`)
                              }}
                            >
                              <FiCheckCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > 0 && <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />}
      </section>
    </>
  )
}

function PhotoUpload({ data, update, notify }) {
  const upload = event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return notify('Upload a JPG, PNG or WebP student photo.', 'error')
    if (file.size > 1024 * 1024) return notify('Student photo must be 1 MB or smaller.', 'error')
    const reader = new FileReader()
    reader.onload = () => {
      update('personal.photo', reader.result)
      update('personal.photoUrl', reader.result)
      notify('Photo selected. Save the admission step to keep it.', 'info')
    }
    reader.onerror = () => notify('Unable to read the selected photo.', 'error')
    reader.readAsDataURL(file)
  }
  const photoSrc = data.personal.photo ? apiAssetUrl(data.personal.photo) : (data.personal.photoUrl ? apiAssetUrl(data.personal.photoUrl) : '')
  const initials = studentInitials(data)
  return (
    <div className="sa-photo-upload">
      <div className="sa-photo-preview">
        {photoSrc ? <img src={photoSrc} alt="Student live preview" /> : initials || <FiUser />}
      </div>
      <div>
        <strong>Student Photo</strong>
        <span>JPG, PNG or WebP · Maximum 1 MB</span>
        <label className="sa-photo-button">
          <FiCamera />
          {photoSrc ? 'Change Photo' : 'Upload Photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
        </label>
        {photoSrc && (
          <button
            type="button"
            className="sa-photo-remove"
            onClick={() => {
              update('personal.photo', '')
              update('personal.photoUrl', '')
            }}
          >
            <FiTrash2 className="module-action-icon module-action-icon--danger" /> Remove
          </button>
        )}
      </div>
    </div>
  )
}
function DocumentsUpload({ data, update }) {
  const selected = DOCUMENTS.filter(([key]) => text(data.documents?.[key]?.status || data.documents?.[key])).length
  return <section className="sa-documents"><header><div><h2>Document Status</h2><p>Mark the current status for each document. File uploads are not required for this admission form.</p></div><span>{selected}/{DOCUMENTS.length} marked</span></header><div className="sa-document-grid">{DOCUMENTS.map(([key,label]) => { const value=data.documents?.[key]?.status || (data.documents?.[key] ? 'Submitted' : ''); return <article className={value === 'Submitted' ? 'uploaded' : ''} key={key}><div className="sa-document-icon">{value === 'Submitted' ? <FiCheckCircle /> : <FiFileText />}</div><div className="sa-document-copy"><strong>{label}</strong><span>{value || 'Status not selected'}</span></div><div className="sa-document-actions"><select aria-label={`${label} status`} value={value} onChange={event=>update(`documents.${key}`,event.target.value ? { status:event.target.value } : null)}><option value="">Select status</option><option>Submitted</option><option>Pending</option></select></div></article>})}</div></section>
  /* Legacy file-upload UI intentionally disabled while document status tracking is used.
  const upload = async (key, event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) return notify('Only PDF, JPG and PNG documents are allowed.', 'error'); if (file.size > 500 * 1024) return notify('Each document must be 500 KB or smaller.', 'error');try{const preview=await fileDataUrl(file);update(`documents.${key}`, { name: file.name, type: file.type, size: file.size, file, data:preview, uploaded:true, uploadedAt: new Date().toISOString() });notify('Document selected. Save the documents step to upload it.', 'info')}catch(error){notify(error.message,'error')} }
  const uploadOthers = async event => { const files = [...(event.target.files || [])]; event.target.value = ''; const valid = files.filter(file => { if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) { notify(`${file.name}: only PDF, JPG and PNG files are allowed.`, 'error'); return false } if (file.size > 500 * 1024) { notify(`${file.name}: file must be 500 KB or smaller.`, 'error'); return false } return true }); if(valid.length){try{const previews=await Promise.all(valid.map(file=>fileDataUrl(file)));update('documents.otherCertificates', [...(data.documents.otherCertificates || []), ...valid.map((file,index) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, file, data:previews[index], uploaded:true, uploadedAt: new Date().toISOString() }))]);notify('Documents selected. Save the documents step to upload them.', 'info')}catch(error){notify(error.message,'error')}} }
  const others = data.documents.otherCertificates || []
  return <section className="sa-documents"><header><div><h2>Supporting Documents</h2><p>Upload clear, readable documents. PDF, JPG or PNG · Maximum 500 KB each.</p></div><span>{DOCUMENTS.filter(([key]) => data.documents?.[key]).length}/{DOCUMENTS.length} uploaded</span></header><div className="sa-document-grid">{DOCUMENTS.map(([key,label,required]) => { const document = data.documents?.[key], mandatory = required || data.admission.scholarship === 'Yes'; return <article className={`${document ? 'uploaded' : ''} ${errors[`documents.${key}`] ? 'invalid' : ''}`} key={key}><div className="sa-document-icon">{document ? <FiCheckCircle /> : <FiFileText />}</div><div className="sa-document-copy"><strong>{label}{mandatory && <b> *</b>}</strong>{document ? <><span title={document.name}>{document.name}</span><small>{Math.ceil(document.size / 1024)} KB · Uploaded</small></> : <span>{mandatory ? 'Required document' : 'Optional document'}</span>}{errors[`documents.${key}`] && <small className="error">{errors[`documents.${key}`]}</small>}</div><div className="sa-document-actions">{document?.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}<label><FiUploadCloud /> {document ? 'Replace' : 'Upload'}<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => upload(key,event)} /></label>{document && <button type="button" onClick={() => update(`documents.${key}`, null)} aria-label={`Remove ${label}`}><FiTrash2 className="module-action-icon module-action-icon--danger" /></button>}</div></article>})}</div><section className="sa-other-certificates"><header><div><h3>Other Certificates</h3><p>Optional — upload any additional certificates relevant to admission.</p></div><label><FiUploadCloud /> Add Certificates<input type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={uploadOthers} /></label></header>{others.length ? <div>{others.map(document => <article key={document.id}><FiFileText /><span><strong title={document.name}>{document.name}</strong><small>{Math.ceil(document.size / 1024)} KB</small></span><a href={document.data} target="_blank" rel="noreferrer">Preview</a><button type="button" onClick={() => update('documents.otherCertificates', others.filter(item => item.id !== document.id))} aria-label={`Remove ${document.name}`}><FiTrash2 className="module-action-icon module-action-icon--danger" /></button></article>)}</div> : <p className="sa-other-empty">No additional certificates uploaded.</p>}</section></section>
*/
}
function WizardStepper({ step, setStep }) {
  const navRef = useRef(null), activeRef = useRef(null)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nav = navRef.current, active = activeRef.current
      if (!nav || !active) return
      const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
      nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [step])
  return <nav ref={navRef} className="sa-stepper" aria-label="Admission form steps">{STEPS.map((label,index) => { const Icon = STEP_ICONS[index]; return <button ref={index === step ? activeRef : null} key={label} type="button" className={index === step ? 'active' : index < step ? 'complete' : ''} onClick={() => index <= step && setStep(index)} aria-disabled={index > step} aria-current={index === step ? 'step' : undefined}><i>{index < step ? <FiCheck /> : <Icon />}</i><span><small>Step {index + 1}</small>{label}</span></button> })}</nav>
}
function FeeSummary({ data }) {
  const tuition = Number(data.fees?.tuitionFee) > 0 ? Number(data.fees.tuitionFee) : 50000
  const admission = Number(data.fees?.admissionFee !== undefined && data.fees?.admissionFee !== '' ? data.fees.admissionFee : 4000)
  const hostel = data.admission?.hostel === 'Yes' ? Number(data.fees?.hostelFee || (data.admission?.hostelRoomType ? HOSTEL_FEES[data.admission?.hostelRoomType] : 0) || 0) : 0
  const transport = data.admission?.transport === 'Yes' ? Number(data.fees?.transportFee || (data.admission?.transportRoute ? TRANSPORT_FEES[data.admission?.transportRoute] : 0) || 0) : 0
  const scholarship = data.admission?.scholarship === 'Yes' ? Number(data.fees?.scholarshipAmount || 0) : 0
  const rows = [
    ['Tuition Fee (per year)', tuition],
    ['Admission Fee (one-time)', admission],
    ...(data.admission?.hostel === 'Yes' ? [['Hostel Fee (per year)', hostel]] : []),
    ...(data.admission?.transport === 'Yes' ? [['Transportation Fee (per year)', transport]] : [])
  ]
  const gross = rows.reduce((sum, [, value]) => sum + Number(value || 0), 0)
  const net = Math.max(0, gross - scholarship)
  return (
    <aside className="sa-fee-summary">
      <header>
        <span><FiInbox /></span>
        <div>
          <h3>Fee Summary</h3>
          <p>Live fee calculation</p>
        </div>
      </header>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
        <div className="subtotal">
          <dt>Gross Fee</dt>
          <dd>{money(gross)}</dd>
        </div>
        {scholarship > 0 && (
          <div className="deduction">
            <dt>Scholarship Deduction</dt>
            <dd>− {money(scholarship)}</dd>
          </div>
        )}
      </dl>
      <footer>
        <span>
          Net Payable
          <small>After applicable deductions</small>
        </span>
        <strong>{money(data.fees?.totalFee || net)}</strong>
      </footer>
    </aside>
  )
}
/* oxlint-disable-next-line react-hooks/exhaustive-deps -- update is intentionally triggered only when academic matching inputs change */
function ApplicantFeeStructure({ data, update, error }) {
  const fees = data.fees || {}, components = Array.isArray(fees.components) ? fees.components : Array.isArray(fees.feeComponents) ? fees.feeComponents : []
  const componentName = item => item.name ?? item.feeHeadName ?? item.componentName ?? item.description ?? 'Fee Component'
  const admissionComponents = components.filter(item => /admission|registration/i.test(componentName(item)))
  const shownComponents = components.filter(item => !/admission|hostel|transport|scholarship|discount/i.test(componentName(item)) && Number(item.amount ?? item.feeAmount ?? 0) > 0)
  const tuition = Number(fees.tuitionFee ?? fees.academicFee ?? 0) > 0 ? Number(fees.tuitionFee ?? fees.academicFee) : (shownComponents.length ? shownComponents.reduce((sum, c) => sum + Number(c.amount ?? 0), 0) : 50000)
  const admission = Number(fees.admissionFee !== undefined && fees.admissionFee !== '' ? fees.admissionFee : 4000)
  const hostel = data.admission?.hostel === 'Yes' ? Number(HOSTEL_FEES[data.admission.hostelRoomType] || fees.hostelFee || 0) : 0
  const transport = data.admission?.transport === 'Yes' ? Number(TRANSPORT_FEES[data.admission.transportRoute] || fees.transportFee || 0) : 0
  const scholarship = Number(fees.scholarshipAmount ?? fees.discountAmount ?? 0)
  const firstYear = Math.max(0, tuition + admission + hostel + transport - scholarship)
  const entireCourse = Math.max(0, (tuition + hostel + transport) * 4 + admission - scholarship)
  const plan = String(fees.paymentPlan || 'Full Payment').toUpperCase()
  const termWise = plan.includes('TERM') || plan.includes('INSTALLMENT') || plan === 'SEMESTER_WISE'
  const firstTerm = Math.ceil(firstYear / 2)
  const secondTerm = Math.max(0, firstYear - firstTerm)
  const futureTerm = Math.ceil(Math.max(0, tuition + hostel + transport) / 2)
  const setPlan = value => update('fees.paymentPlan', value)
  return (
    <div className="sa-fee-structure-view">
      <section className="sa-applicant-fees">
        <header>
          <FiInbox />
          <div>
            <h2>Fee Structure</h2>
            <p>Applicable fee structure for the selected academic details.</p>
          </div>
        </header>
        <dl>
          <div>
            <dt>Course / Branch</dt>
            <dd>{display(data.academic.course)} · {display(data.academic.branch)}</dd>
          </div>
          {shownComponents.length ? (
            shownComponents.map((item, index) => (
              <div key={item.feeComponentId ?? item.id ?? index}>
                <dt>{componentName(item)}</dt>
                <dd>{money(item.amount)}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>Tuition Fee (per year)</dt>
              <dd>{money(tuition)}</dd>
            </div>
          )}
          <div className={`sa-admission-fee ${error ? 'invalid' : ''}`}>
            <dt>
              <label htmlFor="sa-admission-fee">
                {componentName(admissionComponents[0] || { name: 'Admission Fee (one-time)' })}
                <small>One-time charge</small>
              </label>
            </dt>
            <dd>
              <span>₹</span>
              <input
                id="sa-admission-fee"
                type="number"
                min="0"
                step="1"
                value={fees.admissionFee ?? '4000'}
                onChange={event => update('fees.admissionFee', event.target.value)}
                placeholder="Enter amount"
              />
            </dd>
            {error && <small role="alert">{error}</small>}
          </div>
          {hostel > 0 && (
            <div>
              <dt>Hostel Fee (per year){data.admission.hostelRoomType ? ` · ${data.admission.hostelRoomType}` : ''}</dt>
              <dd>{money(hostel)}</dd>
            </div>
          )}
          {transport > 0 && (
            <div>
              <dt>Transportation Fee (per year){data.admission.transportRoute ? ` · ${data.admission.transportRoute}` : ''}</dt>
              <dd>{money(transport)}</dd>
            </div>
          )}
          {scholarship > 0 && (
            <div>
              <dt>Scholarship / Discount</dt>
              <dd>− {money(scholarship)}</dd>
            </div>
          )}
        </dl>
        <div className="sa-fee-estimates">
          <div>
            <span>Estimated First-Year Total</span>
            <strong>{money(firstYear)}</strong>
          </div>
          <div>
            <span>Estimated Entire 4-Year Total</span>
            <strong>{money(entireCourse)}</strong>
          </div>
          <small>Tuition, hostel and transportation are annual charges. Admission fee is charged only once.</small>
        </div>
      </section>
      <section className={`sa-payment-plan ${error ? 'invalid' : ''}`}>
        <h3>Payment Preference <b>*</b></h3>
        <p>Select how you prefer to pay the estimated fee.</p>
        <div>
          <label className={!termWise ? 'selected' : ''}>
            <input type="radio" name="paymentPlan" checked={!termWise} onChange={() => setPlan('Full Payment')} />
            <span>
              <strong>Full Payment</strong>
              <small>Pay the complete first-year amount</small>
            </span>
          </label>
          <label className={termWise ? 'selected' : ''}>
            <input type="radio" name="paymentPlan" checked={termWise} onChange={() => setPlan('Term-wise Payment')} />
            <span>
              <strong>Term-wise Payment</strong>
              <small>Pay the first-year amount in two terms</small>
            </span>
          </label>
        </div>
        {termWise && (
          <section className="sa-term-breakdown">
            <header>
              <strong>Term-wise Estimate</strong>
              <span>Two terms per academic year</span>
            </header>
            <dl>
              <div>
                <dt>First Term</dt>
                <dd>{money(firstTerm)}</dd>
                <small>Includes half of annual charges and the one-time admission fee share.</small>
              </div>
              <div>
                <dt>Second Term</dt>
                <dd>{money(secondTerm)}</dd>
                <small>Remaining first-year estimated amount.</small>
              </div>
            </dl>
            <p>From the second year onward, each term is approximately {money(futureTerm)} at the current fee structure.</p>
          </section>
        )}
        {error && <small className="field-error" role="alert">{error}</small>}
      </section>
    </div>
  )
}
function ReviewSection({ title, step, edit, items }) {
  const terms = { 'Application Number': 'Registration Number', 'Application Date': 'Registration Date' }
  const titles = { 'Student Information': 'Student Details', 'Academic Enrollment': 'Academic Enrollment', 'Admission & Services': 'Registration & Services', 'Fee Summary': 'Fee Structure & Payment', 'Uploaded Documents': 'Supporting Documents' }
  const normalized = items.map(([label, ...rest]) => [terms[label] || label, ...rest])
  const visible = normalized.filter(([, value, optional]) => !optional || text(value))
  return (
    <section className="sa-review-section">
      <header>
        <h2>{titles[title] || title}</h2>
        {edit && (
          <button type="button" onClick={() => edit(step)}>
            <FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit
          </button>
        )}
      </header>
      <dl>
        {visible.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{display(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
function CoreReview({ data, edit }) {
  const address = value => formatAddress(value)
  return (
    <div className="sa-full-review">
      <ReviewSection
        title="Student Information"
        step={0}
        edit={edit}
        items={[
          ['Student', studentName(data)],
          ['First Name', data.personal.firstName],
          ['Middle Name', data.personal.middleName, true],
          ['Last Name', data.personal.lastName],
          ['Gender', data.personal.gender],
          ['Date of Birth', data.personal.dob],
          ['Blood Group', data.personal.bloodGroup, true],
          ['Nationality', data.personal.nationality],
          ['Aadhaar Number', data.personal.aadhaar],
        ]}
      />
      <ReviewSection
        title="Contact Information"
        step={1}
        edit={edit}
        items={[
          ['Student Mobile', data.contact.mobile],
          ['Alternate Mobile', data.contact.alternateMobile, true],
          ['Student Email', data.contact.email],
          ['Alternate Email', data.contact.alternateEmail, true],
          ['Current Address', address(data.contact.currentAddress)],
          ['Permanent Address', address(data.contact.permanentAddress) || address(data.contact.currentAddress)],
        ]}
      />
      <ReviewSection
        title="Parent / Guardian"
        step={2}
        edit={edit}
        items={[
          ['Father Name', data.parents.father.name, true],
          ['Father Mobile', data.parents.father.mobile, true],
          ['Father Email', data.parents.father.email, true],
          ['Father Occupation', data.parents.father.occupation, true],
          ['Father Qualification', data.parents.father.qualification, true],
          ['Annual Income', data.parents.father.income, true],
          ['Mother Name', data.parents.mother.name, true],
          ['Mother Mobile', data.parents.mother.mobile, true],
          ['Mother Email', data.parents.mother.email, true],
          ['Mother Occupation', data.parents.mother.occupation, true],
          ['Mother Qualification', data.parents.mother.qualification, true],
          ['Mother Annual Income', data.parents.mother.income, true],
          ['Guardian Name', data.parents.guardian.name, true],
          ['Guardian Relationship', data.parents.guardian.relationship === 'Other' ? data.parents.guardian.relationshipOther : data.parents.guardian.relationship, true],
          ['Guardian Mobile', data.parents.guardian.mobile, true],
          ['Guardian Email', data.parents.guardian.email, true],
          ['Guardian Occupation', data.parents.guardian.occupation, true],
          ['Guardian Qualification', data.parents.guardian.qualification, true],
          ['Guardian Annual Income', data.parents.guardian.income, true],
          ['Primary Contact', data.parents.primaryContact, true],
          ['Emergency Contact', data.parents.emergencyMobile, true],
        ]}
      />
      <ReviewSection
        title="Academic Enrollment"
        step={3}
        edit={edit}
        items={[
          ['Academic Year', data.academic.academicYear],
          ['Joining College', data.admission.college],
          ['Admission Type', data.academic.admissionType],
          ['Quota', quota(data), true],
          ['Course', data.academic.course],
          ['Course Code', data.academic.courseCode, true],
          ['Department', data.academic.department, true],
          ['Branch', data.academic.branch],
          ['Branch Code', data.academic.branchCode, true],
          ['Student Category', data.academic.studentCategory, true],
          ['Regulation', data.academic.regulation, true],
        ]}
      />
      <ReviewSection
        title="Previous Education"
        step={4}
        edit={edit}
        items={[
          ['10th Board', data.previousEducation.tenth.board, true],
          ['10th School Name', data.previousEducation.tenth.institution, true],
          ['10th Roll Number', data.previousEducation.tenth.rollNumber, true],
          ['10th Passing Year', data.previousEducation.tenth.passingYear, true],
          ['10th Score Type', data.previousEducation.tenth.scoreType, true],
          ['10th Score', data.previousEducation.tenth.score, true],
          ['Qualification', data.previousEducation.intermediate.qualification, true],
          ['Board / University', data.previousEducation.intermediate.board, true],
          ['College Name', data.previousEducation.intermediate.institution, true],
          ['Passing Year', data.previousEducation.intermediate.passingYear, true],
          ['Stream', data.previousEducation.intermediate.stream === 'Other' ? data.previousEducation.intermediate.streamOther : data.previousEducation.intermediate.stream, true],
          ['Score Type', data.previousEducation.intermediate.scoreType, true],
          ['Score', data.previousEducation.intermediate.score, true],
        ]}
      />
      <ReviewSection
        title="Admission & Services"
        step={5}
        edit={edit}
        items={[
          ['Registration Number', data.application.registrationNumber || data.application.number],
          ['Registration Date', data.application.registrationDate || data.application.date],
          ['Admission Number', data.application.admissionNumber, true],
          ['Admission Date', data.application.admissionDate, true],
          ['College', data.admission.college],
          ['Batch', data.admission.batch],
          ['Scholarship', data.admission.scholarship],
          ['Hostel', data.admission.hostel],
          ['Hostel Preference', data.admission.hostelPreference, true],
          ['Room Type / Beds', data.admission.hostelRoomType, true],
          ['Transportation', data.admission.transport],
          ['Transport Route', data.admission.transportRoute, true],
        ]}
      />
      <ReviewSection
        title="Fee Summary"
        step={6}
        edit={edit}
        items={[
          ['Tuition Fee (per year)', money(data.fees.tuitionFee)],
          ['Admission Fee (one-time)', money(data.fees.admissionFee)],
          ['Scholarship Deduction', data.fees.scholarshipAmount ? `- ${money(data.fees.scholarshipAmount)}` : '', true],
          ['Hostel Room Type', data.admission.hostelRoomType, true],
          ['Hostel Fee (per year)', money(data.fees.hostelFee), data.admission.hostel !== 'Yes'],
          ['Transportation Fee (per year)', money(data.fees.transportFee), data.admission.transport !== 'Yes'],
          ['Estimated First-Year Total', money(data.fees.totalFee)],
          ['Estimated Entire 4-Year Total', money((Number(data.fees.tuitionFee || 0) + Number(data.fees.hostelFee || 0) + Number(data.fees.transportFee || 0)) * 4 + Number(data.fees.admissionFee || 0))],
          ['Payment Preference', data.fees.paymentPlan],
          ['Estimated Amount per Term', data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.ceil(Number(data.fees.totalFee || 0) / 2)) : '', true],
        ]}
      />
    </div>
  )
}
function DocumentPreview({ document, studentId }) {
  const [opening,setOpening]=useState(false)
  const [error, setError] = useToastState('', 'error')
  const href=document?.data??document?.fileUrl??document?.documentUrl??document?.downloadUrl??document?.url
  if(href)return <a href={href} target="_blank" rel="noreferrer">Preview</a>
  if(!studentId||!document?.id)return null
  const open=async()=>{const tab=window.open('','_blank');setOpening(true);setError('');try{const result=await studentDocumentApi.download(studentId,document.id),url=URL.createObjectURL(result.blob);if(tab)tab.location.href=url;else window.open(url,'_blank');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(reason){tab?.close();setError(reason.message||'Unable to preview document.')}finally{setOpening(false)}}
  return <><button type="button" className="sa-document-preview-button" disabled={opening} onClick={open}>{opening?'Opening...':'Preview'}</button>{error&&<small className="error">{error}</small>}</>
}
function DocumentReview({ data, edit, studentId }) {
  const documents = [
    ...DOCUMENTS.map(([key, label]) => ({ key, label, document: data.documents?.[key], ...(typeof data.documents?.[key] === 'object' ? data.documents[key] : {}) })),
    ...(data.documents?.otherCertificates || []).map(item => ({ key: item.id, label: 'Other Certificate', ...item }))
  ]
  return (
    <section className="sa-review-section sa-document-preview-list">
      <header>
        <h2>Supporting Documents</h2>
        {edit && <button type="button" onClick={() => edit(7)}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit</button>}
      </header>
      <div>
        {documents.map(document => {
          const ready = Boolean(document.uploaded || document.file || document.data || document.id)
          const status = documentStatus(document.document || document)
          return (
            <article key={document.key}>
              <FiFileText />
              <span>
                <strong>{document.label}</strong>
                <small>{status}</small>
              </span>
              <Badge value={status} />
              {ready && <DocumentPreview document={document} studentId={studentId} />}
            </article>
          )
        })}
      </div>
    </section>
  )
}
function FullReview({ data, edit, studentId }) { return <><CoreReview data={data} edit={edit} /><DocumentReview data={data} edit={edit} studentId={studentId} /></> }
function PreviewHeader({ data }) {
  const marked = DOCUMENTS.filter(([key]) => text(data.documents?.[key]?.status || data.documents?.[key])).length
  const photoSrc = data.personal?.photo ? apiAssetUrl(data.personal.photo) : (data.personal?.photoUrl ? apiAssetUrl(data.personal.photoUrl) : '')
  return (
    <section className="sa-preview-header">
      <div className="sa-preview-photo">
        {photoSrc ? <img src={photoSrc} alt={studentName(data)} /> : <FiUser />}
      </div>
      <div className="sa-preview-identity">
        <span>Admission Preview</span>
        <h2>{studentName(data)}</h2>
        <p>{data.application?.registrationNumber || data.application?.number} · {display(data.academic?.course)} · {display(data.academic?.branch)}</p>
      </div>
      <dl>
        <div>
          <dt>Academic Year</dt>
          <dd>{display(data.academic?.academicYear)}</dd>
        </div>
        <div>
          <dt>Payment Preference</dt>
          <dd>{display(data.fees?.paymentPlan)}</dd>
        </div>
        <div>
          <dt>Document Status</dt>
          <dd>{marked}/{DOCUMENTS.length} marked</dd>
        </div>
      </dl>
    </section>
  )
}

function AdmissionForm() {
  const { id } = useParams(); const navigate = useNavigate(); const validId = (id && id !== 'undefined' && id !== 'null') ? id : null;
  const { selectedCollegeId: globalCollegeId, selectedCollege: globalCollege, selectedAcademicYearId: globalAcademicYearId, selectedAcademicYear: globalAcademicYear } = useAcademic();
  const [data, setData] = useState(() => {
    const init = empty();
    if (!validId) {
      if (globalCollegeId) {
        init.admission.collegeId = globalCollegeId;
        init.admission.college = globalCollege?.name || globalCollege?.collegeName || '';
      }
      if (globalAcademicYearId) {
        init.academic.academicYearId = globalAcademicYearId;
        init.academic.academicYear = globalAcademicYear?.name || globalAcademicYear?.academicYearName || '';
      }
    }
    return init;
  });
  const [recordIds, setRecordIds] = useState({ admissionId: validId, studentId: null, academicId: null })
  const [step, setStep] = useState(0); const [errors, setErrors] = useToastState({}, 'error'); const [declared, setDeclared] = useState(false); const [, setToast] = useToastState(null, 'success'); const [pinStatus, setPinStatus] = useState({}); const [confirmSubmit, setConfirmSubmit] = useState(false); const [submitting, setSubmitting] = useState(false); const [savingStep, setSavingStep] = useState(false); const [feeState, setFeeState] = useState({ loading: false, loaded: false, error: '' })
  const [masters,setMasters]=useState({years:[],courses:[],branches:[],colleges:[],semesters:[]})
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { if (!data.application.date) setData(current => ({ ...current, application: { ...current.application, date: new Date().toISOString().slice(0, 10) } })) }, [data.application.date])
  useEffect(() => {
    setData(current => {
      let next = current;
      if (!next.admission?.collegeId && globalCollegeId) {
        next = setPath(next, 'admission.collegeId', globalCollegeId);
        next = setPath(next, 'admission.college', globalCollege?.name || globalCollege?.collegeName || next.admission?.college || '');
      }
      if (!next.academic?.academicYearId && globalAcademicYearId) {
        next = setPath(next, 'academic.academicYearId', globalAcademicYearId);
        next = setPath(next, 'academic.academicYear', globalAcademicYear?.name || globalAcademicYear?.academicYearName || next.academic?.academicYear || '');
      }
      return next;
    });
  }, [validId, globalCollegeId, globalCollege, globalAcademicYearId, globalAcademicYear, data.admission.collegeId, data.academic.academicYearId]);
  useEffect(() => {
    if (!masters.colleges.length) return;
    const college = masters.colleges.find(item =>
      (data.admission.collegeId && same(item.collegeId ?? item.id, data.admission.collegeId)) ||
      (data.admission.college && String(item.collegeName ?? item.name ?? item.institutionName ?? '').trim().toLowerCase() === String(data.admission.college).trim().toLowerCase())
    );
    if (!college) return;
    const collegeId = college.collegeId ?? college.id;
    const collegeName = college.collegeName ?? college.name ?? college.institutionName ?? '';
    if ((!data.admission.collegeId && collegeId) || (!data.admission.college && collegeName)) {
      setData(current => ({ ...current, admission: { ...current.admission, collegeId: current.admission.collegeId || collegeId, college: current.admission.college || collegeName } }));
    }
  }, [masters.colleges, data.admission.collegeId, data.admission.college]);
  useEffect(() => {
    if (data.admission.hostel !== 'Yes') return
    const preference = data.personal.gender === 'Male' ? 'Boys Hostel' : data.personal.gender === 'Female' ? 'Girls Hostel' : ''
    if (preference && data.admission.hostelPreference !== preference) setData(current => ({ ...current, admission: { ...current.admission, hostelPreference: preference } }))
  }, [data.admission.hostel, data.admission.hostelPreference, data.personal.gender])
  const notify = (message, tone = 'success') => setToast({ message, tone })
  useEffect(()=>{let active=true;Promise.all([academicYearApi.getAll(),courseApi.getAll(),branchApi.getAll(),getColleges(),getSemesters()]).then(([years,courses,branches,collegeResponse,semesterResponse])=>{if(!active)return;const list=response=>{let value=response;for(let depth=0;depth<5&&value&&typeof value==='object';depth+=1){if(Array.isArray(value))return value;const rows=value.items??value.content??value.results??value.records;if(Array.isArray(rows))return rows;value=value.data}return[]};const operationalYears = getOperationalAcademicYearOptions(years);setMasters({years: operationalYears, courses, branches, colleges:list(collegeResponse), semesters:list(semesterResponse)})}).catch(error=>notify(error.message||'Unable to load admission selections.','error'));return()=>{active=false}},[])
  useEffect(() => {
    if (step !== 6) return
    let active = true
    setFeeState({ loading: false, loaded: true, error: '' })
    if (recordIds.admissionId) {
      Promise.allSettled([
        studentFeeApi.getSummary(recordIds.admissionId),
        studentFeeApi.getStructure(recordIds.admissionId)
      ]).then(results => {
        if (!active) return
        const summaryResponse = results[0].status === 'fulfilled' ? results[0].value : null
        const structureResponse = results[1].status === 'fulfilled' ? results[1].value : null
        const summary = resolveFeeSummary(dataRef.current, summaryResponse, structureResponse)
        if (summary) {
          setData(current => ({
            ...current,
            fees: {
              ...current.fees,
              ...summary,
              structureId: summary.feeStructureId ?? summary.structureId ?? current.fees.structureId ?? 'FS-STANDARD',
              tuitionFee: String(summary.tuitionFee || current.fees.tuitionFee || 50000),
              admissionFee: String(summary.admissionFee || current.fees.admissionFee || 4000),
              paymentPlan: current.fees.paymentPlan || summary.paymentPlan || 'Full Payment',
            }
          }))
        }
      }).catch(() => {})
    }
    return () => { active = false }
  }, [step, recordIds.admissionId])
  useEffect(() => { const start=Number(String(data.academic.academicYear).slice(0,4)); const batch=start&&data.academic.course?`${start}-${start+4}`:''; if(data.admission.batch!==batch)queueMicrotask(()=>setData(current=>({...current,admission:{...current.admission,batch}}))) }, [data.academic.academicYear,data.academic.course,data.admission.batch])
  useEffect(() => { const n=Number(String(data.academic.semester).match(/\d+/)?.[0]||0), year=n?`${Math.ceil(n/2)}${['th','st','nd','rd'][Math.ceil(n/2)]||'th'} Year`:''; if(data.academic.yearOfStudy!==year)queueMicrotask(()=>setData(current=>({...current,academic:{...current.academic,yearOfStudy:year}}))) }, [data.academic.semester,data.academic.yearOfStudy])
  useEffect(() => { queueMicrotask(()=>setData(current => { let next=current; for(const key of ['tenth','intermediate']){const item=current.previousEducation[key],max=item.scoreType==='CGPA'?10:100;if(text(item.score)&&Number(item.score)>max)next=setPath(next,`previousEducation.${key}.score`,'')}return next })) }, [data.previousEducation.tenth.scoreType,data.previousEducation.intermediate.scoreType])
  useEffect(() => { if (!validId) return; let active = true; studentAdmissionApi.getById(validId).then(async row => {
    const loadedIds = idsFromApi(row, validId), admissionId = loadedIds.admissionId, studentId = loadedIds.studentId
    const sections = await Promise.allSettled([studentAcademicDetailsApi.get(admissionId), studentPreviousEducationApi.get(admissionId), studentId ? studentParentApi.get(studentId) : Promise.resolve(null), studentId ? studentDocumentApi.getAll(studentId) : Promise.resolve([]), studentFeeApi.getSummary(admissionId), studentFeeApi.getStructure(admissionId)])
    if (!active) return
    const loaded = admissionFromApi({ ...row, academicDetails: sections[0].status === 'fulfilled' ? sections[0].value : row.academicDetails, previousEducation: sections[1].status === 'fulfilled' ? sections[1].value : row.previousEducation, parents: sections[2].status === 'fulfilled' ? sections[2].value : row.parents, documents: sections[3].status === 'fulfilled' ? mergeDocumentStatuses(row.documents, documentsFromApi(sections[3].value)) : row.documents })
    const feeSummary = resolveFeeSummary(loaded, sections[4].status === 'fulfilled' ? sections[4].value : row.feeSummary, sections[5].status === 'fulfilled' ? sections[5].value : null)
    setData(feeSummary ? { ...loaded, fees: { ...loaded.fees, ...feeSummary } } : loaded)
    setRecordIds(loadedIds)
  }).catch(error => notify(error.message || 'Unable to load this admission.', 'error')); return () => { active = false } }, [validId])
  const update = (path, value) => {
    setData(current => {
      let next = setPath(current, path, value);
      if (path === 'personal.gender') {
        if (next.admission.hostel === 'Yes') {
          next.admission.hostelPreference = (value === 'Male' ? 'Boys Hostel' : value === 'Female' ? 'Girls Hostel' : next.admission.hostelPreference || 'Boys Hostel');
        }
      }
      if (path === 'contact.sameAddress' && value) next.contact.permanentAddress = { ...next.contact.currentAddress };
      if (path.startsWith('contact.currentAddress.') && next.contact.sameAddress) next.contact.permanentAddress = { ...next.contact.currentAddress };
      if (path === 'academic.course' || path === 'academic.courseId') Object.assign(next.academic, { branch: '', branchId: '', branchCode: '' });
      if (path === 'academic.admissionType' && value !== 'Lateral Entry') {
        next.academic.quota = '';
        next.academic.quotaOther = '';
      }
      if (path === 'academic.quota' && value !== 'Other') next.academic.quotaOther = '';
      if (path === 'parents.guardian.relationship' && value !== 'Other') next.parents.guardian.relationshipOther = '';
      if (path === 'previousEducation.intermediate.stream' && value !== 'Other') next.previousEducation.intermediate.streamOther = '';
      if (path === 'admission.scholarship' && value === 'No') { next.admission.scholarshipType = ''; next.fees.scholarshipAmount = '' }
      if (path === 'admission.hostel') {
        if (value === 'No') {
          next.admission.hostelPreference = '';
          next.admission.hostelRoomType = '';
          next.fees.hostelFee = '';
        } else if (value === 'Yes') {
          next.admission.hostelPreference = (current.personal?.gender === 'Male' ? 'Boys Hostel' : current.personal?.gender === 'Female' ? 'Girls Hostel' : 'Boys Hostel');
          if (next.admission.hostelRoomType) {
            next.fees.hostelFee = String(HOSTEL_FEES[next.admission.hostelRoomType] || '');
          }
        }
      }
      if (path === 'admission.hostelRoomType') {
        next.fees.hostelFee = String(HOSTEL_FEES[value] || '');
      }
      if (path === 'admission.transport') {
        if (value === 'No') {
          next.admission.transportRoute = '';
          next.fees.transportFee = '';
        } else if (next.admission.transportRoute) {
          next.fees.transportFee = String(TRANSPORT_FEES[next.admission.transportRoute] || '');
        }
      }
      if (path === 'admission.transportRoute') {
        next.fees.transportFee = String(TRANSPORT_FEES[value] || '');
      }
      const tuition = Number(next.fees.tuitionFee) > 0 ? Number(next.fees.tuitionFee) : 50000;
      const admission = Number(next.fees.admissionFee !== undefined && next.fees.admissionFee !== '' ? next.fees.admissionFee : 4000);
      const hostel = next.admission.hostel === 'Yes' ? Number(next.fees.hostelFee || (next.admission.hostelRoomType ? HOSTEL_FEES[next.admission.hostelRoomType] : 0) || 0) : 0;
      const transport = next.admission.transport === 'Yes' ? Number(next.fees.transportFee || (next.admission.transportRoute ? TRANSPORT_FEES[next.admission.transportRoute] : 0) || 0) : 0;
      const scholarship = Number(next.fees.scholarshipAmount || 0);
      const total = Math.max(0, tuition + admission + hostel + transport - scholarship);
      next.fees.tuitionFee = String(tuition);
      next.fees.admissionFee = String(admission);
      next.fees.hostelFee = String(hostel);
      next.fees.transportFee = String(transport);
      next.fees.totalFee = String(total);
      return next;
    });
    setErrors(current => ({ ...current, [path]: '' }));
  }
  const currentPincode = data.contact.currentAddress.pincode, permanentPincode = data.contact.permanentAddress.pincode, sameAddress = data.contact.sameAddress
  useEffect(() => {
    const targets = [['contact.currentAddress','current',currentPincode], ...(!sameAddress ? [['contact.permanentAddress','permanent',permanentPincode]] : [])]
    let active = true
    const timer = window.setTimeout(async () => {
      await Promise.all(targets.map(async ([prefix, key, pin]) => {
        if (!/^\d{6}$/.test(pin)) { setPinStatus(current => ({ ...current, [key]: '' })); return }
        setPinStatus(current => ({ ...current, [key]: 'Fetching location...' }))
        try {
          const location = await lookupIndianPincode(pin)
          if (!active) return
          setData(current => {
            if (read(current, `${prefix}.pincode`) !== pin) return current
            let next = setPath(current, `${prefix}.town`, location.town || location.city || '')
            next = setPath(next, `${prefix}.city`, location.city || '')
            next = setPath(next, `${prefix}.district`, location.district || '')
            next = setPath(next, `${prefix}.state`, location.state || '')
            next = setPath(next, `${prefix}.country`, 'India')
            if (prefix === 'contact.currentAddress' && next.contact.sameAddress) next.contact.permanentAddress = { ...next.contact.currentAddress }
            return next
          })
          setPinStatus(current => ({ ...current, [key]: 'Address details filled' }))
        } catch (error) {
          if (active) setPinStatus(current => ({ ...current, [key]: error.message || 'PIN code not found — enter manually' }))
        }
      }))
    }, 350)
    return () => { active = false; window.clearTimeout(timer) }
  }, [currentPincode, permanentPincode, sameAddress])
  useEffect(() => {
    if (!masters.years.length || !data.academic.academicYearId) return
    const resolvedAcademicYearId = resolveAcademicYearId(masters.years, data.academic.academicYearId)
    if (!data.academic.academicYearId || String(data.academic.academicYearId) !== String(resolvedAcademicYearId)) {
      setData(current => ({
        ...current,
        academic: { ...current.academic, academicYearId: resolvedAcademicYearId, academicYear: masters.years.find(item => String(item.academicYearId ?? item.id) === String(resolvedAcademicYearId))?.academicYearName ?? masters.years.find(item => String(item.academicYearId ?? item.id) === String(resolvedAcademicYearId))?.name ?? current.academic.academicYear }
      }))
    }
  }, [masters.years, data.academic.academicYearId])

  useEffect(() => {
    if (data.academic.admissionType === 'Lateral Entry') return
    if (!data.academic.quota && !data.academic.quotaOther) return
    setData(current => ({ ...current, academic: { ...current.academic, quota: '', quotaOther: '' } }))
  }, [data.academic.admissionType, data.academic.quota, data.academic.quotaOther])

  const allErrors = validate(data)
  const field = (path,label,options,type,readOnly,placeholder,disabled) => <Field {...{ data,path,label,options,type,readOnly,placeholder,disabled,update }} error={errors[path]} />
  const academicOption=(item,idKeys,nameKeys)=>({id:idKeys.map(key=>read(item,key)).find(value=>value!=null&&value!==''),name:nameKeys.map(key=>read(item,key)).find(Boolean)||''})
  const yearOptions=masters.years.map(item=>academicOption(item,['academicYearId','id'],['academicYearName','name'])).filter(item=>item.id)
  const selectedCollegeId = data.admission.collegeId
  const courseOptions=masters.courses.map(item=>({...academicOption(item,['courseId','id'],['courseName','name']),code:item.courseCode??item.code??item.shortName??'',collegeId:item.collegeId??item.college?.collegeId??item.college?.id})).filter(item=>item.id&&(!selectedCollegeId||!item.collegeId||same(item.collegeId,selectedCollegeId)))
  const collegeCourseIds = new Set(courseOptions.map(item => String(item.id)))
  const branchOptions=masters.branches.map(item=>({...academicOption(item,['branchId','id'],['branchName','name','branchShortName','shortName']),code:item.branchCode??item.code??item.shortName??'',courseId:item.courseId??item.course?.courseId??item.course?.id,collegeId:item.collegeId??item.college?.collegeId??item.college?.id})).filter(item=>item.id&&(!selectedCollegeId||same(item.collegeId,selectedCollegeId)||collegeCourseIds.has(String(item.courseId)))&&(!data.academic.courseId||!item.courseId||same(item.courseId,data.academic.courseId)))
  const collegeOptions=masters.colleges.map(item=>({id:item.collegeId??item.id,name:item.collegeName??item.name??item.institutionName??''})).filter(item=>item.id&&item.name)
  const masterField=(namePath,idPath,label,options,disabled=false,resets=[])=>{const id=`sa-${idPath.replaceAll('.','-')}`;return <label className={`sa-field ${errors[namePath]?'invalid':''}`} htmlFor={id}><span>{label}<b> *</b></span><select id={id} value={read(data,idPath)||''} disabled={disabled} onChange={event=>{const option=options.find(item=>same(item.id,event.target.value));setData(current=>{let next=setPath(current,idPath,event.target.value);next=setPath(next,namePath,option?.name||'');if(idPath==='academic.courseId')next=setPath(next,'academic.courseCode',option?.code||'');if(idPath==='academic.branchId')next=setPath(next,'academic.branchCode',option?.code||'');resets.forEach(([resetId,resetName])=>{next=setPath(next,resetId,'');next=setPath(next,resetName,'')});return next});setErrors(current=>({...current,[namePath]:''}))}}><option value="">{disabled?'Select Course first':`Select ${label}`}</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>{errors[namePath]&&<small role="alert">{errors[namePath]}</small>}</label>}
  const screens = [
    <Section key="identity" title="Student Identity" icon={FiUser} hint="Core identity and government identification details"><PhotoUpload data={data} update={update} notify={notify} />{field('personal.firstName','First Name')}{field('personal.middleName','Middle Name')}{field('personal.lastName','Last Name')}{field('personal.gender','Gender',['Female','Male','Non-binary'])}{field('personal.dob','Date of Birth',null,'date')}{field('personal.bloodGroup','Blood Group',['A+','A-','B+','B-','AB+','AB-','O+','O-'])}{field('personal.nationality','Nationality')}{field('personal.aadhaar','Aadhaar Number')}</Section>,
    <><Section title="Contact Information" icon={FiPhone}>{field('contact.mobile','Student Mobile')}{field('contact.alternateMobile','Alternate Mobile')}{field('contact.email','Student Email',null,'email')}{field('contact.alternateEmail','Alternate Email',null,'email')}</Section><Section title="Current Address" icon={FiHome}><AddressFields data={data} prefix="contact.currentAddress" update={update} errors={errors} />{pinStatus.current && <p className={`sa-pincode-status ${pinStatus.current.includes('filled') ? 'success' : ''}`}>{pinStatus.current}</p>}</Section><Section title="Permanent Address" icon={FiHome}><label className="sa-check sa-span-all"><input type="checkbox" checked={data.contact.sameAddress} onChange={event => update('contact.sameAddress', event.target.checked)} /><span>Permanent address same as current address</span></label>{!data.contact.sameAddress && <><AddressFields data={data} prefix="contact.permanentAddress" update={update} errors={errors} />{pinStatus.permanent && <p className={`sa-pincode-status ${pinStatus.permanent.includes('filled') ? 'success' : ''}`}>{pinStatus.permanent}</p>}</>}</Section></>,
    <><Section title="Father Details" icon={FiUsers} hint="Optional parent or guardian contact information.">{field('parents.father.name','Father Name')}{field('parents.father.mobile','Father Mobile')}{field('parents.father.email','Father Email',null,'email')}{field('parents.father.occupation','Father Occupation')}{field('parents.father.qualification','Father Qualification')}{field('parents.father.income','Father Annual Income',null,'number')}</Section><Section title="Mother Details" icon={FiUsers}>{field('parents.mother.name','Mother Name')}{field('parents.mother.mobile','Mother Mobile')}{field('parents.mother.email','Mother Email',null,'email')}{field('parents.mother.occupation','Mother Occupation')}{field('parents.mother.qualification','Mother Qualification')}{field('parents.mother.income','Mother Annual Income',null,'number')}</Section><Section title="Guardian Details" icon={FiUsers}>{field('parents.guardian.name','Guardian Name')}{field('parents.guardian.relationship','Relationship',['Father','Mother','Guardian','Other'])}{data.parents.guardian.relationship === 'Other' && field('parents.guardian.relationshipOther','Specify Relationship')}{field('parents.guardian.mobile','Guardian Mobile')}{field('parents.guardian.email','Guardian Email',null,'email')}{field('parents.guardian.occupation','Guardian Occupation')}{field('parents.guardian.qualification','Guardian Qualification')}{field('parents.guardian.income','Guardian Annual Income',null,'number')}{field('parents.primaryContact','Primary Contact',['Father','Mother','Guardian'])}{field('parents.emergencyMobile','Emergency Contact Mobile')}</Section></>,
    <Section key="academic" title="Academic Enrollment" icon={FiBookOpen} hint="Review college and academic year, then select the available course and branch.">{field('academic.academicYear','Academic Year',null,'text',true)}{field('admission.college','Joining College',null,'text',true)}{field('academic.admissionType','Admission Type',ADMISSION_TYPES)}{data.academic.admissionType === 'Lateral Entry' && <>{field('academic.quota','Admission Quota',ADMISSION_QUOTAS)}{data.academic.quota === 'Other' && field('academic.quotaOther','Specify Admission Quota')}</>}{masterField('academic.course','academic.courseId','Course',courseOptions,!selectedCollegeId,[['academic.branchId','academic.branch']])}{field('academic.courseCode','Course Code',null,'text',true)}{masterField('academic.branch','academic.branchId','Branch',branchOptions,!data.academic.courseId)}{field('academic.branchCode','Branch Code',null,'text',true)}{field('academic.studentCategory','Student Category',['General','SC','ST','BC','EWS','Other'])}{field('academic.regulation','Regulation')}</Section>,
    <><Section title="10th / SSC" icon={FiBookOpen} hint="Enter only the essential school details.">{field('previousEducation.tenth.board','Board')}{field('previousEducation.tenth.institution','School Name')}{field('previousEducation.tenth.passingYear','Year of Passing')}{field('previousEducation.tenth.score','Percentage (0–100)',null,'number')}</Section><Section title="Intermediate / Diploma" icon={FiBookOpen} hint="Enter only the essential qualifying-education details.">{field('previousEducation.intermediate.board','Board / University')}{field('previousEducation.intermediate.institution','College Name')}{field('previousEducation.intermediate.passingYear','Year of Passing')}{field('previousEducation.intermediate.stream','Stream',['MPC','Other'])}{data.previousEducation.intermediate.stream === 'Other' && field('previousEducation.intermediate.streamOther','Specify Stream')}{field('previousEducation.intermediate.score','Percentage (0–100)',null,'number')}</Section></>,
    <><Section title="Application Information" icon={FiFileText} hint="Registration details.">{field('application.number','Registration Number',null,'text',true)}{field('application.date','Registration Date',null,'date',false)}{field('admission.batch','Batch')}</Section><Section title="Student Services" icon={FiHome}>{field('admission.hostel','Hostel Required',['No','Yes'])}{data.admission.hostel === 'Yes' && <>{field('admission.hostelPreference','Hostel Preference',data.personal.gender === 'Male' ? ['Boys Hostel'] : data.personal.gender === 'Female' ? ['Girls Hostel'] : ['Boys Hostel','Girls Hostel'],undefined,data.personal.gender === 'Male' || data.personal.gender === 'Female')}{field('admission.hostelRoomType','Room Type / Beds',Object.keys(HOSTEL_FEES))}</>}{field('admission.transport','Transportation Required',['No','Yes'])}{data.admission.transport === 'Yes' && field('admission.transportRoute','Transport Route',Object.keys(TRANSPORT_FEES))}</Section></>,
    <div key="fees"><ApplicantFeeStructure data={data} update={update} error={errors['fees.paymentPlan']} /></div>,
    <DocumentsUpload key="documents" data={data} update={update} errors={errors} notify={notify} />,
    <div key="review" className="sa-preview"><PreviewHeader data={data} /><FullReview data={data} edit={setStep} studentId={recordIds.studentId} /></div>,
  ]
  const focusFirst = () => window.setTimeout(() => document.querySelector('.student-admission .sa-field.invalid :is(input,select)')?.focus({ preventScroll: false }), 0)
  const nextStep = async () => {
    if (savingStep) return
    const prefixes = [['personal.'],['contact.'],['parents.'],['academic.'],['previousEducation.'],['application.','admission.'],['fees.'],['documents.'],[]][step]
    const relevant = Object.fromEntries(Object.entries(allErrors).filter(([path]) => prefixes.some(prefix => path.startsWith(prefix))))
    setErrors(relevant)
    if (Object.keys(relevant).length) { notify('Correct the highlighted fields before continuing.', 'error'); focusFirst(); return }
    setSavingStep(true)
    try {
      let result, ids = recordIds
      if (!ids.admissionId) {
        const duplicate = duplicateAdmissionMessage(await studentAdmissionApi.getAll(), data)
        if (duplicate) throw new Error(duplicate)
        result = await studentAdmissionApi.create(data)
        rememberCreated('admissions', idsFromApi(result).admissionId)
        ids = idsFromApi(result)
        if (!ids.admissionId) throw new Error('The admission was created but no admission ID was returned.')
        setRecordIds(ids)
        navigate(`/student-management/admissions/${ids.admissionId}/edit`, { replace: true })
      } else if ([0, 1, 5].includes(step)) result = await studentAdmissionApi.update(ids.admissionId, data)
      else if (step === 2) {
        result = ids.studentId
          ? await studentParentApi.update(ids.studentId, data)
          : await studentAdmissionApi.update(ids.admissionId, data)
      } else if (step === 3) result = await studentAcademicDetailsApi.update(ids.admissionId, data)
      else if (step === 4) result = await studentPreviousEducationApi.update(ids.admissionId, data)
      else if (step === 6) {
        if (!data.fees.paymentPlan) {
          update('fees.paymentPlan', 'Full Payment')
        }
        if (ids.admissionId) {
          try {
            await studentAdmissionApi.update(ids.admissionId, data)
            const responses = await Promise.allSettled([studentFeeApi.getSummary(ids.admissionId), studentFeeApi.getStructure(ids.admissionId)])
            const mergedSummary = resolveFeeSummary(data, responses[0].status === 'fulfilled' ? responses[0].value : null, responses[1].status === 'fulfilled' ? responses[1].value : null)
            if (mergedSummary) {
              setData(current => ({ ...current, fees: { ...current.fees, ...mergedSummary } }))
            }
          } catch (error) {
            throw new Error(error.message || 'Unable to save fee information.')
          }
        }
      } else if (step === 7) {
        const pending = [...DOCUMENTS.map(([key, label]) => ({ key, label, document: data.documents[key] })), ...(data.documents.otherCertificates || []).map(document => ({ key: 'otherCertificate', label: 'Other Certificate', document }))].filter(item => item.document?.file)
        if(ids.studentId){for (const item of pending) await studentDocumentApi.upload(ids.studentId, item.document.file, { documentType: item.key, documentName: item.label });const uploadedRows = await studentDocumentApi.getAll(ids.studentId);setData(current => ({ ...current, documents: documentsFromApi(uploadedRows) }))}
        // Submission status is selected in this step even when no file exists.
        // Save it with the admission record so it is available in View mode.
        if (ids.admissionId) await studentAdmissionApi.update(ids.admissionId, data)
      }
      if (data.personal?.photo) {
        saveAdmissionPhoto(ids.admissionId, data.personal.photo)
        if (ids.studentId) saveAdmissionPhoto(ids.studentId, data.personal.photo)
      }
      if (result) {
        const returnedIds = idsFromApi(result, ids.admissionId)
        if (data.personal?.photo) {
          saveAdmissionPhoto(returnedIds.admissionId ?? ids.admissionId, data.personal.photo)
          if (returnedIds.studentId ?? ids.studentId) saveAdmissionPhoto(returnedIds.studentId ?? ids.studentId, data.personal.photo)
        }
        setRecordIds(current => ({ admissionId: returnedIds.admissionId ?? current.admissionId, studentId: returnedIds.studentId ?? current.studentId, academicId: returnedIds.academicId ?? current.academicId }))
      }
      notify(step === 7 && !ids.studentId ? 'Documents are ready to upload when the admission is submitted.' : 'Admission step saved successfully.', step === 7 && !ids.studentId ? 'info' : 'success')
      setStep(current => current + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) { notify(error.message || 'Unable to save this step.', 'error') }
    finally { setSavingStep(false) }
  }
  const requestSubmit = () => {
    const entries=Object.entries(allErrors)
    setErrors(allErrors)
    if(entries.length){
      const [path,message]=entries[0]
      setStep(validationStep(path))
      notify(`${validationLabel(path)}: ${message}`, 'error')
      focusFirst()
      return
    }
    if (!declared) { notify('Confirm the declaration before submitting.', 'error'); return }
    setConfirmSubmit(true)
  }
  const skipCurrentStep = () => {
    if (![2, 4, 7].includes(step)) return
    if (step === 2) {
      setData(current => ({ ...current, parents: empty().parents }))
      setErrors(current => Object.fromEntries(Object.entries(current).filter(([path]) => !path.startsWith('parents.'))))
      notify('Parent / Guardian details skipped.', 'info')
    } else if (step === 4) {
      // Previous education is optional. Clear partially entered values so this
      // step can be skipped without optional format validation blocking submit.
      setData(current => ({ ...current, previousEducation: empty().previousEducation }))
      setErrors(current => Object.fromEntries(Object.entries(current).filter(([path]) => !path.startsWith('previousEducation.'))))
      notify('Previous education details skipped.', 'info')
    } else {
      notify('Document status step skipped.', 'info')
    }
    setStep(current => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const submit = async () => {
    if (submitting || !recordIds.admissionId) return;
    setSubmitting(true);
    try {
      const duplicate = duplicateAdmissionMessage(await studentAdmissionApi.getAll(), data, recordIds.admissionId);
      if (duplicate) throw new Error(duplicate);
      const submitted = await studentAdmissionApi.submit(recordIds.admissionId);
      const submittedIds = idsFromApi(submitted, recordIds.admissionId);
      const studentId = submittedIds.studentId ?? recordIds.studentId;
      rememberCreated('admissions', recordIds.admissionId);
      if (studentId) rememberCreated('student-profiles', studentId);
      const pending = [...DOCUMENTS.map(([key, label]) => ({ key, label, document: data.documents[key] })), ...(data.documents?.otherCertificates || []).map(document => ({ key: 'otherCertificate', label: 'Other Certificate', document }))].filter(item => item.document?.file);
      if (studentId) {
        for (const item of pending) await studentDocumentApi.upload(studentId, item.document.file, { documentType: item.key, documentName: item.label });
      }
      const latest = await studentAdmissionStatusApi.get(recordIds.admissionId);
      setData(current => ({ ...current, status: latest.status ?? 'SUBMITTED' }));
      setRecordIds(current => ({ ...current, studentId: studentId ?? current.studentId }));
      setConfirmSubmit(false);
      eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { admissionId: recordIds.admissionId, status: 'SUBMITTED' });
      notify(studentId && pending.length ? 'Admission submitted and documents uploaded successfully' : 'Admission application submitted successfully');
      window.setTimeout(() => navigate('/student-management/admissions'), 700);
    } catch (error) {
      notify(error.message || 'Unable to submit this admission.', 'error');
      setSubmitting(false);
    }
  }
  return <><Breadcrumb tail={id ? 'Edit Admission' : 'New Admission'} /><header className="sa-page-header sa-wizard-header"><div><h1>{id ? 'Edit Student Admission' : 'New Student Admission'}</h1><p>Registration Number <strong>{data.application.number}</strong></p></div><div><Badge value={data.status} /><Button onClick={() => navigate('/student-management/admissions')}>Cancel</Button></div></header><WizardStepper step={step} setStep={setStep} /><form className="sa-wizard-card" onSubmit={event => event.preventDefault()}><header className="sa-step-heading"><div><small>Step {step + 1} of {STEPS.length}</small><h2>{STEPS[step]}</h2></div><span>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span></header>{screens[step]}{step === STEPS.length - 1 && <label className="sa-declaration"><input type="checkbox" checked={declared} onChange={event => setDeclared(event.target.checked)} /><span><strong>Registration Declaration</strong>I confirm that the information entered above is correct.</span></label>}<footer className="sa-wizard-actions"><Button disabled={!step || submitting} onClick={() => setStep(current => current - 1)}><FiArrowLeft /> Previous</Button><span />{[2, 4, 7].includes(step) && <Button disabled={submitting} onClick={skipCurrentStep}>Skip</Button>}{step < STEPS.length - 1 ? <Button primary onClick={nextStep}>Save & Continue <FiArrowRight /></Button> : <Button primary disabled={!declared || submitting} onClick={requestSubmit}>{submitting ? 'Submitting...' : 'Submit Application'}</Button>}</footer></form>{confirmSubmit && <ConfirmDialog icon={FiCheckCircle} title="Confirm Registration Submission" confirmLabel="Confirm & Submit" onCancel={() => setConfirmSubmit(false)} onConfirm={submit}><p>Please verify the student details below. Once submitted, the registration will be sent to the admissions team for review.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Registration Number</dt><dd>{data.application.number}</dd></div></dl></ConfirmDialog>}</>
}

function InfoGrid({ title, items }) {
  const terms = {
    'Application Date': 'Registration Date',
    'Application Overview': 'Registration Overview',
    'Admission & Services': 'Registration & Services',
    'Fee Record': 'Fee Structure & Payment'
  };
  return (
    <section className="sa-detail-panel">
      <header><h2>{terms[title] || title}</h2></header>
      <dl>
        {items.filter(([label, value]) => {
          if (['Current Address', 'Permanent Address', 'Student Mobile', 'Student Email'].includes(label)) return true;
          return text(value);
        }).map(([label, value]) => (
          <div key={label}>
            <dt>{terms[label] || label}</dt>
            <dd>{display(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function DocumentDetails({ data }) { const documents = [...DOCUMENTS.map(([key,label]) => [key,label,data.documents?.[key]]), ...(data.documents?.otherCertificates || []).map(item => [item.id,'Other Certificate',item])]; return <section className="sa-detail-panel"><header><h2>Document Status</h2><p>Current submission status for this admission</p></header><div className="sa-document-detail-list">{documents.map(([key,label,document]) => { const status = documentStatus(document); return <article key={key}><FiFileText /><div><strong>{label}</strong><span>{status}</span></div><Badge value={status} />{document?.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}</article> })}</div></section> }
function Timeline({ activity }) { return <section className="sa-detail-panel"><header><h2>Admission Activity</h2><p>Complete application history</p></header><ol className="sa-timeline">{[...activity].reverse().map((item,index) => <li key={`${item.date}-${index}`}><i>{index === 0 ? <FiCheck /> : ''}</i><div><strong>{item.label}</strong>{item.remarks && <p>{item.remarks}</p>}<span>{dateTime(item.date)}</span></div></li>)}</ol></section> }
function DetailContent({ data, tab }) {
  const address = value => formatAddress(value)
  if (tab === 'personal') {
    return (
      <>
        <InfoGrid
          title="Personal Information"
          items={[
            ['Student Name', studentName(data)],
            ['First Name', data.personal.firstName],
            ['Middle Name', data.personal.middleName],
            ['Last Name', data.personal.lastName],
            ['Gender', data.personal.gender],
            ['Date of Birth', data.personal.dob],
            ['Blood Group', data.personal.bloodGroup],
            ['Nationality', data.personal.nationality],
            ['Aadhaar Number', data.personal.aadhaar],
          ]}
        />
        <InfoGrid
          title="Contact & Address"
          items={[
            ['Student Mobile', data.contact.mobile],
            ['Alternate Mobile', data.contact.alternateMobile],
            ['Student Email', data.contact.email],
            ['Alternate Email', data.contact.alternateEmail],
            ['Current Address', address(data.contact.currentAddress)],
            ['Permanent Address', address(data.contact.permanentAddress) || address(data.contact.currentAddress)],
          ]}
        />
        <InfoGrid
          title="Parent / Guardian"
          items={[
            ['Father Name', data.parents.father.name],
            ['Father Mobile', data.parents.father.mobile],
            ['Father Email', data.parents.father.email],
            ['Father Occupation', data.parents.father.occupation],
            ['Father Qualification', data.parents.father.qualification],
            ['Father Annual Income', data.parents.father.income],
            ['Mother Name', data.parents.mother.name],
            ['Mother Mobile', data.parents.mother.mobile],
            ['Mother Email', data.parents.mother.email],
            ['Mother Occupation', data.parents.mother.occupation],
            ['Mother Qualification', data.parents.mother.qualification],
            ['Mother Annual Income', data.parents.mother.income],
            ['Guardian Name', data.parents.guardian.name],
            ['Guardian Relationship', data.parents.guardian.relationship === 'Other' ? data.parents.guardian.relationshipOther : data.parents.guardian.relationship],
            ['Guardian Mobile', data.parents.guardian.mobile],
            ['Guardian Email', data.parents.guardian.email],
            ['Guardian Occupation', data.parents.guardian.occupation],
            ['Guardian Qualification', data.parents.guardian.qualification],
            ['Guardian Annual Income', data.parents.guardian.income],
            ['Primary Contact', data.parents.primaryContact],
            ['Emergency Contact', data.parents.emergencyMobile],
          ]}
        />
      </>
    )
  }
  if (tab === 'academic') {
    return (
      <InfoGrid
        title="Academic Enrollment"
        items={[
          ['Academic Year', data.academic.academicYear],
          ['Joining College', data.admission.college],
          ['Admission Type', data.academic.admissionType],
          ['Quota', quota(data)],
          ['Course', data.academic.course],
          ['Course Code', data.academic.courseCode],
          ['Department', data.academic.department],
          ['Branch', data.academic.branch],
          ['Branch Code', data.academic.branchCode],
          ['Student Category', data.academic.studentCategory],
          ['Regulation', data.academic.regulation],
        ]}
      />
    )
  }
  if (tab === 'education') {
    return (
      <>
        <InfoGrid
          title="10th / SSC"
          items={[
            ['Board', data.previousEducation.tenth.board],
            ['School', data.previousEducation.tenth.institution],
            ['Roll Number', data.previousEducation.tenth.rollNumber],
            ['Passing Year', data.previousEducation.tenth.passingYear],
            ['Score Type', data.previousEducation.tenth.scoreType],
            ['Score', data.previousEducation.tenth.score],
          ]}
        />
        <InfoGrid
          title="Intermediate / Diploma"
          items={[
            ['Qualification', data.previousEducation.intermediate.qualification],
            ['Board / University', data.previousEducation.intermediate.board],
            ['College', data.previousEducation.intermediate.institution],
            ['Roll Number', data.previousEducation.intermediate.rollNumber],
            ['Passing Year', data.previousEducation.intermediate.passingYear],
            ['Stream', data.previousEducation.intermediate.stream === 'Other' ? data.previousEducation.intermediate.streamOther : data.previousEducation.intermediate.stream],
            ['Score Type', data.previousEducation.intermediate.scoreType],
            ['Score', data.previousEducation.intermediate.score],
          ]}
        />
      </>
    )
  }
  if (tab === 'services') {
    return (
      <InfoGrid
        title="Admission & Services"
        items={[
          ['Registration Number', data.application.registrationNumber || data.application.number],
          ['Registration Date', data.application.registrationDate || data.application.date],
          ['Admission Number', data.application.admissionNumber],
          ['Admission Date', data.application.admissionDate],
          ['College', data.admission.college],
          ['Batch', data.admission.batch],
          ['Scholarship', data.admission.scholarship],
          ['Hostel', data.admission.hostel],
          ['Hostel Preference', data.admission.hostelPreference],
          ['Room Type / Beds', data.admission.hostelRoomType],
          ['Transportation', data.admission.transport],
          ['Transport Route', data.admission.transportRoute],
        ]}
      />
    )
  }
  if (tab === 'fees') {
    return (
      <>
        <InfoGrid
          title="Fee Structure"
          items={[
            ['Tuition Fee (per year)', money(data.fees.tuitionFee)],
            ['Admission Fee (one-time)', money(data.fees.admissionFee)],
            ['Scholarship Deduction', data.fees.scholarshipAmount ? `- ${money(data.fees.scholarshipAmount)}` : 'None'],
            ['Hostel Room Type', data.admission.hostelRoomType],
            ['Hostel Fee (per year)', data.admission.hostel === 'Yes' ? money(data.fees.hostelFee) : 'Not selected'],
            ['Transportation Fee (per year)', data.admission.transport === 'Yes' ? money(data.fees.transportFee) : 'Not selected'],
            ['Estimated First-Year Total', money(data.fees.totalFee)],
            ['Estimated Entire 4-Year Total', money((Number(data.fees.tuitionFee || 0) + Number(data.fees.hostelFee || 0) + Number(data.fees.transportFee || 0)) * 4 + Number(data.fees.admissionFee || 0))],
            ['Payment Preference', data.fees.paymentPlan],
            ['First Term Estimate', data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.ceil(Number(data.fees.totalFee || 0) / 2)) : 'Not applicable'],
            ['Second Term Estimate', data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.floor(Number(data.fees.totalFee || 0) / 2)) : 'Not applicable'],
          ]}
        />
        <FeeSummary data={data} />
      </>
    )
  }
  if (tab === 'documents') return <DocumentDetails data={data} />
  if (tab === 'activity') return <Timeline activity={data.activity} />
  return (
    <InfoGrid
      title="Application Overview"
      items={[
        ['Registration Number', data.application.registrationNumber || data.application.number],
        ['Registration Date', data.application.registrationDate || data.application.date],
        ['Admission Number', data.application.admissionNumber],
        ['Admission Date', data.application.admissionDate],
        ['College', data.admission.college],
        ['Academic Year', data.academic.academicYear],
        ['Admission Type', data.academic.admissionType],
        ['Course', data.academic.course],
        ['Branch', data.academic.branch],
        ['Quota', quota(data)],
        ['Fee Status', data.fees.paymentStatus],
        ['Admission Status', STATUS[data.status] || data.status],
      ]}
    />
  )
}
function StudentHeader({ data }) {
  const normStat = normalizeStatus(data.status);
  const initials = studentInitials(data);
  const photoSrc = data.personal?.photo ? apiAssetUrl(data.personal.photo) : (data.personal?.photoUrl ? apiAssetUrl(data.personal.photoUrl) : '');
  return (
    <div className="cm-profile-banner">
      <div className="cm-profile-avatar-wrap">
        {photoSrc ? (
          <img src={photoSrc} alt={studentName(data)} className="cm-profile-logo" />
        ) : (
          <div className="cm-profile-placeholder">{initials}</div>
        )}
      </div>
      <div className="cm-profile-header-info">
        <div className="cm-profile-badges">
          {(data.application?.registrationNumber || data.application?.number) && <span className="cm-badge cm-badge-code">Reg: {data.application.registrationNumber || data.application.number}</span>}
          {data.application?.admissionNumber && <span className="cm-badge cm-badge-type">Adm: {data.application.admissionNumber}</span>}
          <span className={`cm-status-badge ${normStat === 'APPROVED' ? 'active' : 'inactive'}`}>
            {STATUS[normStat] || normStat}
          </span>
        </div>
        <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{studentName(data)}</span></h1>
        <p className="cm-profile-subtitle">
          <span style={{ color: '#fff' }}>{[display(data.academic?.course), display(data.academic?.branch), display(data.academic?.academicYear)].filter(Boolean).join(' · ')}</span>
        </p>
      </div>
    </div>
  );
}

function AdmissionDetails({ approval = false }) {
  const { id } = useParams(); const navigate = useNavigate(); const validId = (id && id !== 'undefined' && id !== 'null') ? id : null; const [data, setData] = useState(null); const [loadingDetail, setLoadingDetail] = useState(Boolean(validId)); const [tab, setTab] = useState('overview'); const [remarks, setRemarks] = useState(''); const [toast, setToast] = useToastState(null, 'success'); const [confirmApproval, setConfirmApproval] = useState(false); const [reviewed, setReviewed] = useState(false); const [savingStatus, setSavingStatus] = useState(false)
  useEffect(() => {
    if (!validId) { setLoadingDetail(false); return }
    let active = true
    studentAdmissionApi.getById(validId).then(async row => {
      const admissionId = row.admissionId ?? row.id ?? validId
      const studentId=idsFromApi(row,admissionId).studentId
      const optional = await Promise.allSettled([studentAcademicDetailsApi.get(admissionId), studentPreviousEducationApi.get(admissionId), studentFeeApi.getSummary(admissionId), studentAdmissionStatusApi.get(admissionId),studentId?studentParentApi.get(studentId):Promise.resolve(null),studentId?studentDocumentApi.getAll(studentId):Promise.resolve([])])
      const hydrated = admissionFromApi({ ...row, academicDetails: optional[0].status === 'fulfilled' ? optional[0].value : row.academicDetails, previousEducation: optional[1].status === 'fulfilled' ? optional[1].value : row.previousEducation, feeSummary: optional[2].status === 'fulfilled' && hasFeeSummary(optional[2].value) ? optional[2].value : row.feeSummary, status: optional[3].status === 'fulfilled' ? optional[3].value?.status ?? row.status : row.status,parents:optional[4].status==='fulfilled'&&optional[4].value?optional[4].value:row.parents,documents:optional[5].status==='fulfilled'?mergeDocumentStatuses(row.documents, documentsFromApi(optional[5].value)):row.documents })
      if (active) setData(hydrated)
    }).catch(error => setToast({ message: error.message || 'Unable to load admission.', tone: 'error' })).finally(() => { if (active) setLoadingDetail(false) }); return () => { active = false } }, [validId, setToast])
  if (loadingDetail) return <section className="sa-empty"><FiClock /><h2>Loading admission...</h2></section>
  if (!data) return <section className="sa-empty"><FiAlertCircle /><h2>Admission not found</h2><Button onClick={() => navigate('/student-management/admissions')}>Back to Admissions</Button></section>
  const transition = async status => { if (savingStatus) return; if (['CORRECTION_REQUIRED','REJECTED'].includes(status) && !text(remarks)) { setToast({ message: 'Admission officer remarks are required for this decision.', tone: 'error' }); return } setSavingStatus(true); try { const result = await studentAdmissionStatusApi.update(id, { status, remarks }); setData(current => ({ ...current, status: normalizeStatus(result.status), remarks })); setRemarks(''); eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { admissionId: id, status }); setToast({ message: status === 'APPROVED' ? approvalNotice(result) : `${STATUS[status] || status} saved successfully`, tone: 'success' }); setConfirmApproval(false); if (status === 'APPROVED') { window.setTimeout(() => navigate('/student-management/admissions'), 1200) } } catch (error) { setToast({ message: error.message || 'Unable to update admission status.', tone: 'error' }) } finally { setSavingStatus(false) } }
  if (approval) return <><Breadcrumb tail="Admission Review" /><button className="sa-back sa-review-back" onClick={() => navigate('/student-management/admissions')}><FiArrowLeft /> Back to Admissions</button><header className="sa-review-header"><ExportMenu mode="single" title="Student Admission" filename={`admission_${data.application.admissionNumber || data.application.number || id}`} recordSections={admissionDetailSections(data)} /><div><span>Admission Officer Workspace</span><h1>Admission Review</h1><p>{studentName(data)} · {data.application.number} · {display(data.academic.course)} / {display(data.academic.branch)}</p></div><Badge value={data.status} /></header><section className="sa-review-workspace"><PreviewHeader data={data} /><FullReview data={data} /></section><section className="sa-approval"><header><div><h2>Review Decision</h2><p>Complete the application review before recording a workflow decision.</p></div><Badge value={data.status} /></header><label className="sa-review-confirm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>I have reviewed all admission sections and supporting information.</span></label><label className="sa-remarks"><span>Admission Officer Remarks</span><textarea maxLength="500" value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add verification, correction or decision remarks..." /><small>{remarks.length}/500</small></label><footer>{['SUBMITTED','PENDING','UNDER_REVIEW','VERIFIED'].includes(data.status) && <Button danger disabled={!reviewed || savingStatus || !remarks.trim()} onClick={() => transition('REJECTED')}>Reject</Button>}{['SUBMITTED','PENDING','UNDER_REVIEW','VERIFIED'].includes(data.status) && <Button primary disabled={!reviewed || savingStatus} onClick={() => { setToast(null); setConfirmApproval(true) }}>Approve Admission</Button>}{data.status === 'APPROVED' && <span className="sa-approved-note"><FiCheckCircle /> Admission approved as {data.application.admissionNumber}</span>}</footer></section>{confirmApproval && <ConfirmDialog busy={savingStatus} error={toast?.tone === 'error' ? toast.message : null} title="Approve Student Admission?" confirmLabel="Approve Admission" onCancel={() => setConfirmApproval(false)} onConfirm={() => transition('APPROVED')}><p>This will mark the student admission as approved and generate an admission number.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Course / Branch</dt><dd>{data.academic.course} · {data.academic.branch}</dd></div><div><dt>Academic Year</dt><dd>{data.academic.academicYear}</dd></div><div><dt>Fee Status</dt><dd>{data.fees.paymentStatus}</dd></div></dl></ConfirmDialog>}</>
  return (
    <div className="cm-profile-view" data-export-record>
      <Breadcrumb tail="Admission Details" />
      <div className="cm-profile-top-bar">
        <ExportMenu mode="single" title="Student Admission" filename={`admission_${data.application.admissionNumber || data.application.number || id}`} recordSections={admissionDetailSections(data)} />
        <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={() => navigate('/student-management/admissions')}>
          &larr; Back to Admissions List
        </button>
      </div>

      <div className="cm-profile-card">
        <StudentHeader data={data} />
        <nav className="sa-tabs">
          {DETAIL_TABS.map(([value, label, Icon]) => (
            <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>
              <Icon /> {label}
            </button>
          ))}
        </nav>

        <section className="sa-detail-card">
          <DetailContent data={data} tab={tab} />
        </section>
      </div>
    </div>
  );
}

export default function StudentAdmission() {
  const { pathname } = useLocation()
  let screen = <AdmissionList />
  if (pathname.endsWith('/new') || pathname.endsWith('/edit')) screen = <AdmissionForm />
  else if (pathname.endsWith('/approval')) screen = <AdmissionDetails approval />
  else if (/\/admissions\/[^/]+$/.test(pathname)) screen = <AdmissionDetails />
  return <DashboardLayout><main className="student-admission">{screen}</main></DashboardLayout>
}
