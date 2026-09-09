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
import { getColleges } from '../../../auth/collegeApi'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './StudentAdmission.css'
import './AdmissionFixes.css'
import './DocumentPreviewFixes.css'

const STEPS = ['Basic Information', 'Contact & Address', 'Parent / Guardian', 'Academic Information', 'Previous Education', 'Admission Details', 'Fees', 'Documents Upload', 'Preview & Submit']
const STEP_ICONS = [FiUser, FiPhone, FiUsers, FiBookOpen, FiFileText, FiHome, FiInbox, FiUploadCloud, FiCheckCircle]
const STATUS = { DRAFT: 'Draft', PENDING: 'Pending', SUBMITTED: 'Submitted', APPLICATION_SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified', APPROVED: 'Approved', CORRECTION_REQUIRED: 'Correction Required', REJECTED: 'Rejected' }
const normalizeStatus = raw => {
  const str = String(raw || 'DRAFT').trim().replaceAll(' ', '_').toUpperCase()
  if (['APPLICATION_SUBMITTED', 'SUBMITTED', 'SUBMIT'].includes(str)) return 'SUBMITTED'
  if (['UNDER_REVIEW', 'IN_REVIEW', 'REVIEWING'].includes(str)) return 'UNDER_REVIEW'
  if (['CORRECTION_REQUIRED', 'CORRECTION', 'NEEDS_CORRECTION'].includes(str)) return 'CORRECTION_REQUIRED'
  if (['VERIFIED', 'VERIFY'].includes(str)) return 'VERIFIED'
  if (['APPROVED', 'APPROVE', 'ENROLLED'].includes(str)) return 'APPROVED'
  if (['REJECTED', 'REJECT'].includes(str)) return 'REJECTED'
  if (['DRAFT'].includes(str)) return 'DRAFT'
  return str
}
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
  ['status', 'Admission Status'], ['academicYear', 'Academic Year'], ['course', 'Course'],
  ['branch', 'Branch'], ['admissionType', 'Admission Type'], ['feeStatus', 'Fee Status'],
]
const DETAIL_TABS = [
  ['overview', 'Overview', FiGrid], ['personal', 'Personal & Contact', FiUser],
  ['academic', 'Academic', FiBookOpen], ['education', 'Previous Education', FiFileText],
  ['services', 'Admission & Services', FiHome], ['fees', 'Fees', FiInbox], ['documents', 'Documents', FiFileText], ['activity', 'Activity', FiClock],
]
const DOCUMENTS = [['aadhaarCard','Aadhaar Card'],['tenthMemo','10th / SSC Marks Memo'],['qualifyingMemo','Intermediate / Diploma Marks Memo'],['transferCertificate','Transfer Certificate'],['casteCertificate','Caste Certificate'],['incomeCertificate','Income Certificate']]
const ADMISSION_TYPES = ['Regular / Counselling','Management','Spot Admission','Lateral Entry','Transfer','Direct Admission','Re-Admission','International Admission']
const ADMISSION_QUOTAS = ['Government / Convener','Management','NRI','NRI Sponsored','Institutional','Other']
const HOSTEL_FEES = { '2 Bed Sharing': 55000, '3 Bed Sharing': 45000, '4 Bed Sharing': 38000 }
const TRANSPORT_FEES = { 'Route 1': 18000, 'Route 2': 22000, 'Route 3': 26000, 'Route 4': 30000 }
const blankAddress = () => ({ line1: '', line2: '', town: '', city: '', district: '', state: '', country: 'India', pincode: '' })
const admissionPhotoKey=id=>`pirnav-admission-photo-${id}`
const readAdmissionPhoto=id=>{try{return id?localStorage.getItem(admissionPhotoKey(id))||'':''}catch{return''}}
const saveAdmissionPhoto=(id,photo)=>{try{if(!id)return;if(photo)localStorage.setItem(admissionPhotoKey(id),photo);else localStorage.removeItem(admissionPhotoKey(id))}catch{/* storage may be unavailable */}}
const normalizeAddressObj = addr => {
  if (!addr) return blankAddress()
  if (typeof addr === 'string') return { line1: addr.trim(), line2: '', town: '', city: '', district: '', state: '', country: 'India', pincode: '' }
  if (typeof addr === 'object' && addr !== null) {
    const nested = [addr.address,addr.value,addr.details].find(value=>value&&typeof value==='object')
    if(nested)return normalizeAddressObj({...nested,...Object.fromEntries(Object.entries(addr).filter(([,value])=>typeof value!=='object'))})
    const line1 = addr.line1 ?? addr.address ?? addr.street ?? addr.addressLine1 ?? ''
    const line2 = addr.line2 ?? addr.addressLine2 ?? ''
    const town = addr.town ?? addr.village ?? ''
    const city = addr.city ?? ''
    const district = addr.district ?? ''
    const state = addr.state ?? ''
    const country = addr.country ?? 'India'
    const pincode = addr.pincode ?? addr.postalCode ?? addr.zip ?? ''
    return { line1: String(line1), line2: String(line2), town: String(town), city: String(city), district: String(district), state: String(state), country: String(country), pincode: String(pincode) }
  }
  return blankAddress()
}
const formatAddress = item => {
  if (!item) return ''
  if (typeof item === 'string') return /^\s*\[object Object\]\s*$/i.test(item) ? '' : item.trim()
  if (typeof item === 'object' && item !== null) {
    const clean=value=>typeof value==='string'&&!/^\s*\[object Object\]\s*$/i.test(value)?value.trim():typeof value==='number'?String(value):''
    const parts = [item.line1, item.addressLine1, item.street, item.line2, item.addressLine2, item.town, item.village, item.city, item.district, item.state, item.country && item.country !== 'India' ? item.country : '', item.pincode, item.postalCode, item.zip].map(clean).filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    if (item.address) return formatAddress(item.address)
    if (item.fullAddress) return formatAddress(item.fullAddress)
  }
  return ''
}
const empty = () => {
  const registrationNumber = `REG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  return ({
  id: crypto.randomUUID(), status: 'DRAFT', createdAt: new Date().toISOString(), remarks: '',
  application: { number: registrationNumber, date: new Date().toISOString().slice(0, 10), registrationNumber, admissionNumber: '', admissionDate: '' },
  personal: { firstName: '', middleName: '', lastName: '', gender: '', dob: '', photo: '', bloodGroup: '', nationality: 'Indian', aadhaar: '', aadhaarVerification: null },
  contact: { mobile: '', alternateMobile: '', email: '', alternateEmail: '', sameAddress: true, permanentAddress: blankAddress(), currentAddress: blankAddress() },
  parents: { father: { name: '', mobile: '', email: '', occupation: '', qualification: '', income: '' }, mother: { name: '', mobile: '', email: '', occupation: '', qualification: '', income: '' }, guardian: { name: '', relationship: '', relationshipOther: '', mobile: '', email: '', occupation: '', qualification: '', income: '' } },
  academic: { academicYearId: '', academicYear: '', admissionType: '', quota: '', quotaOther: '', courseId: '', course: '', courseCode: '', departmentId: '', department: '', branchId: '', branch: '', branchCode: '', semesterId: '', semester: '', yearOfStudy: '', studentCategory: '', regulation: 'R26', entryType: 'Regular' },
  previousEducation: { tenth: { board: '', institution: '', rollNumber: '', passingYear: '', scoreType: 'Percentage', score: '' }, intermediate: { qualification: 'Intermediate / 12th', board: '', institution: '', passingYear: '', stream: 'MPC', scoreType: 'Percentage', score: '' } },
  admission: { collegeId: '', college: '', batch: '2026-30', hostel: 'No', hostelPreference: '', hostelRoomType: '', transport: 'No', transportRoute: '' },
  fees: { structureId: 'FS-DEFAULT', tuitionFee: '50000', admissionFee: '4000', scholarshipAmount: '', hostelFee: '', transportFee: '', totalFee: '54000', paymentStatus: 'Pending', paymentPlan: 'Full Payment' },
  documents: { ...Object.fromEntries(DOCUMENTS.map(([key]) => [key, null])), otherCertificates: [] },
  activity: [{ label: 'Application created', date: new Date().toISOString() }],
  })
}

const merge = row => {
  const base = empty()
  const currAddr = normalizeAddressObj(row.contact?.currentAddress ?? row.contactInformation?.currentAddress ?? row.currentAddress ?? row.address)
  const permAddr = normalizeAddressObj(row.contact?.permanentAddress ?? row.contactInformation?.permanentAddress ?? row.permanentAddress)
  return {
    ...base, ...row,
    application: { ...base.application, ...row.application, number: row.application?.registrationNumber || row.application?.number || base.application.number, registrationNumber: row.application?.registrationNumber || row.application?.number || base.application.registrationNumber }, personal: { ...base.personal, ...row.personal },
    contact: { ...base.contact, ...row.contact, currentAddress: currAddr, permanentAddress: formatAddress(permAddr) ? permAddr : (row.contact?.sameAddress ? { ...currAddr } : permAddr) },
    parents: { ...base.parents, ...row.parents, father: { ...base.parents.father, ...row.parents?.father }, mother: { ...base.parents.mother, ...row.parents?.mother }, guardian: { ...base.parents.guardian, ...row.parents?.guardian } },
    academic: { ...base.academic, ...row.academic },
    previousEducation: { ...base.previousEducation, ...row.previousEducation, tenth: { ...base.previousEducation.tenth, ...row.previousEducation?.tenth }, intermediate: { ...base.previousEducation.intermediate, ...row.previousEducation?.intermediate } },
    admission: { ...base.admission, ...row.admission, hostel: row.admission?.hostel === true ? 'Yes' : row.admission?.hostel || 'No', transport: row.admission?.transport === true ? 'Yes' : row.admission?.transport || 'No' },
    fees: { ...base.fees, ...row.fees }, documents: { ...base.documents, ...row.documents, otherCertificates: Array.isArray(row.documents?.otherCertificates) ? row.documents.otherCertificates : [] }, activity: Array.isArray(row.activity) ? row.activity : base.activity,
  }
}
const admissionFromApi = row => {
  if (!row) return empty()
  const base = empty()
  const admissionId = row.admissionId ?? row.id ?? row.studentAdmissionId ?? base.id
  const status = normalizeStatus(row.status ?? row.applicationStatus ?? row.admissionStatus ?? 'DRAFT')
  const currAddr = normalizeAddressObj(row.contact?.currentAddress ?? row.contactInformation?.currentAddress ?? row.currentAddress ?? row.address)
  const permAddr = normalizeAddressObj(row.contact?.permanentAddress ?? row.contactInformation?.permanentAddress ?? row.permanentAddress)
  const firstName = row.personal?.firstName ?? row.personalInformation?.firstName ?? row.firstName ?? ''
  const middleName = row.personal?.middleName ?? row.personalInformation?.middleName ?? row.middleName ?? ''
  const lastName = row.personal?.lastName ?? row.personalInformation?.lastName ?? row.lastName ?? ''
  const fullName = row.personal?.fullName ?? row.personalInformation?.fullName ?? row.fullName ?? row.name ?? row.studentName ?? ''
  const parentData = row.parentDetails ?? row.parents ?? {}
  const educationData = row.previousEducation ?? {}
  const tenthData = educationData.tenth ?? educationData.ssc ?? educationData.tenthDetails ?? {}
  const qualifyingData = educationData.intermediate ?? educationData.qualifyingEducation ?? educationData.intermediateDetails ?? educationData.diploma ?? {}

  return {
    ...base,
    ...row,
    id: admissionId,
    admissionId,
    status,
    createdAt: row.createdAt ?? row.createdDate ?? base.createdAt,
    updatedAt: row.updatedAt ?? row.updatedDate ?? new Date().toISOString(),
    remarks: row.remarks ?? row.reviewRemarks ?? row.officerRemarks ?? base.remarks,
    application: {
      ...base.application,
      ...(row.application || {}),
      number: row.registrationNumber ?? row.application?.registrationNumber ?? row.application?.number ?? row.number ?? base.application.number,
      registrationNumber: row.registrationNumber ?? row.application?.registrationNumber ?? row.application?.number ?? row.number ?? base.application.registrationNumber,
      admissionNumber: row.admissionNumber ?? row.application?.admissionNumber ?? base.application.admissionNumber,
      date: row.registrationDate ?? row.applicationDate ?? row.application?.date ?? base.application.date,
      admissionDate: row.admissionDate ?? row.application?.admissionDate ?? base.application.admissionDate
    },
    personal: {
      ...base.personal,
      ...(row.personal || {}),
      ...(row.personalInformation || {}),
      firstName,
      middleName,
      lastName,
      fullName,
      gender: row.gender ?? row.personal?.gender ?? row.personalInformation?.gender ?? base.personal.gender,
      dob: row.dateOfBirth ?? row.dob ?? row.personal?.dob ?? row.personalInformation?.dob ?? base.personal.dob,
      bloodGroup: row.bloodGroup ?? row.personal?.bloodGroup ?? row.personalInformation?.bloodGroup ?? base.personal.bloodGroup,
      nationality: row.nationality ?? row.personal?.nationality ?? row.personalInformation?.nationality ?? base.personal.nationality,
      aadhaar: row.aadhaarNumber ?? row.aadhaar ?? row.personal?.aadhaar ?? row.personalInformation?.aadhaar ?? base.personal.aadhaar,
      photo: row.photo ?? row.photoUrl ?? row.profilePhoto ?? row.profilePhotoUrl ?? row.studentPhoto ?? row.personal?.photo ?? row.personal?.photoUrl ?? row.personalInformation?.photo ?? row.personalInformation?.photoUrl ?? readAdmissionPhoto(admissionId) ?? base.personal.photo
    },
    contact: {
      ...base.contact,
      ...(row.contact || {}),
      ...(row.contactInformation || {}),
      mobile: row.mobile ?? row.studentMobile ?? row.contact?.mobile ?? row.contactInformation?.mobile ?? base.contact.mobile,
      alternateMobile: row.alternateMobile ?? row.contact?.alternateMobile ?? row.contactInformation?.alternateMobile ?? base.contact.alternateMobile,
      email: row.email ?? row.studentEmail ?? row.contact?.email ?? row.contactInformation?.email ?? base.contact.email,
      alternateEmail: row.alternateEmail ?? row.contact?.alternateEmail ?? row.contactInformation?.alternateEmail ?? base.contact.alternateEmail,
      sameAddress: row.sameAddress ?? row.contact?.sameAddress ?? true,
      currentAddress: formatAddress(currAddr) ? currAddr : base.contact.currentAddress,
      permanentAddress: formatAddress(permAddr) ? permAddr : (row.contact?.sameAddress ? currAddr : base.contact.permanentAddress)
    },
    academic: {
      ...base.academic,
      ...(row.academic || {}),
      ...(row.academicDetails || {}),
      ...(row.academicInformation || {}),
      academicYearId: row.academicYearId ?? row.academic?.academicYearId ?? row.academicDetails?.academicYearId ?? '',
      academicYear: row.academicYear ?? row.academicYearName ?? row.academic?.academicYear ?? row.academicDetails?.academicYear ?? '',
      courseId: row.courseId ?? row.academic?.courseId ?? row.academicDetails?.courseId ?? '',
      course: row.course ?? row.courseName ?? row.academic?.course ?? row.academicDetails?.course ?? '',
      departmentId: row.departmentId ?? row.academic?.departmentId ?? row.academicDetails?.departmentId ?? '',
      department: row.department ?? row.departmentName ?? row.academic?.department ?? row.academicDetails?.department ?? '',
      branchId: row.branchId ?? row.academic?.branchId ?? row.academicDetails?.branchId ?? '',
      branch: row.branch ?? row.branchName ?? row.academic?.branch ?? row.academicDetails?.branch ?? '',
      semesterId: row.semesterId ?? row.academic?.semesterId ?? row.academicDetails?.semesterId ?? '',
      semester: row.semester ?? row.semesterName ?? row.academic?.semester ?? row.academicDetails?.semester ?? '',
      sectionId: row.sectionId ?? row.academic?.sectionId ?? row.academicDetails?.sectionId ?? '',
      section: row.section ?? row.sectionName ?? row.academic?.section ?? row.academicDetails?.section ?? '',
      admissionType: row.admissionType ?? row.academic?.admissionType ?? row.academicDetails?.admissionType ?? '',
      entryType: row.entryType ?? row.academic?.entryType ?? row.academicDetails?.entryType ?? 'Regular',
      quota: row.quota ?? row.academic?.quota ?? row.academicDetails?.quota ?? '',
      quotaOther: row.quotaOther ?? row.academic?.quotaOther ?? row.academicDetails?.quotaOther ?? '',
      courseCode: row.courseCode ?? row.academic?.courseCode ?? row.academicDetails?.courseCode ?? '',
      branchCode: row.branchCode ?? row.academic?.branchCode ?? row.academicDetails?.branchCode ?? '',
      regulation: row.regulation ?? row.academic?.regulation ?? row.academicDetails?.regulation ?? 'R26',
      studentCategory: row.studentCategory ?? row.academic?.studentCategory ?? row.academicDetails?.studentCategory ?? ''
    },
    parents: {
      ...base.parents,
      ...(row.parents || {}),
      ...(row.parentDetails || {}),
      father: {
        ...base.parents.father,
        ...(row.parents?.father || {}),
        ...(row.parentDetails?.father || {}),
        name: row.fatherName ?? parentData.fatherName ?? parentData.father?.name ?? '',
        mobile: row.parentMobile ?? row.fatherMobile ?? parentData.parentMobile ?? parentData.fatherMobile ?? parentData.father?.mobile ?? '',
        email: row.fatherEmail ?? parentData.fatherEmail ?? parentData.email ?? parentData.father?.email ?? '',
        occupation: row.fatherOccupation ?? parentData.fatherOccupation ?? parentData.father?.occupation ?? '',
        qualification: row.fatherQualification ?? parentData.fatherQualification ?? parentData.father?.qualification ?? '',
        income: row.fatherIncome ?? parentData.fatherIncome ?? parentData.annualIncome ?? parentData.father?.income ?? ''
      },
      mother: {
        ...base.parents.mother,
        ...(row.parents?.mother || {}),
        ...(row.parentDetails?.mother || {}),
        name: row.motherName ?? parentData.motherName ?? parentData.mother?.name ?? '',
        mobile: row.motherMobile ?? parentData.motherMobile ?? parentData.mother?.mobile ?? '',
        email: row.motherEmail ?? parentData.motherEmail ?? parentData.mother?.email ?? '',
        occupation: row.motherOccupation ?? parentData.motherOccupation ?? parentData.mother?.occupation ?? '',
        qualification: row.motherQualification ?? parentData.motherQualification ?? parentData.mother?.qualification ?? '',
        income: row.motherIncome ?? parentData.motherIncome ?? parentData.mother?.income ?? ''
      },
      guardian: {
        ...base.parents.guardian,
        ...(row.parents?.guardian || {}),
        ...(row.parentDetails?.guardian || {}),
        name: row.guardianName ?? parentData.guardianName ?? parentData.guardian?.name ?? '',
        relationship: row.guardianRelationship ?? parentData.guardianRelationship ?? parentData.guardian?.relationship ?? '',
        relationshipOther: row.guardianRelationshipOther ?? parentData.guardianRelationshipOther ?? parentData.guardian?.relationshipOther ?? '',
        mobile: row.guardianMobile ?? parentData.guardianMobile ?? parentData.guardian?.mobile ?? '',
        email: row.guardianEmail ?? parentData.guardianEmail ?? parentData.guardian?.email ?? '',
        occupation: row.guardianOccupation ?? parentData.guardianOccupation ?? parentData.guardian?.occupation ?? '',
        qualification: row.guardianQualification ?? parentData.guardianQualification ?? parentData.guardian?.qualification ?? '',
        income: row.guardianIncome ?? parentData.guardianIncome ?? parentData.guardian?.income ?? ''
      },
      primaryContact: row.primaryContact ?? parentData.primaryContact ?? 'Father'
    },
    previousEducation: {
      ...base.previousEducation,
      ...(row.previousEducation || {}),
      tenth: {
        ...base.previousEducation.tenth,
        ...tenthData
      },
      intermediate: {
        ...base.previousEducation.intermediate,
        ...qualifyingData
      }
    },
    admission: {
      ...base.admission,
      ...(row.admission || {}),
      collegeId: row.collegeId ?? row.admission?.collegeId ?? base.admission.collegeId,
      college: row.college ?? row.collegeName ?? row.admission?.college ?? base.admission.college,
      batch: row.batch ?? row.admission?.batch ?? base.admission.batch,
      hostel: row.hostel === true ? 'Yes' : row.hostel ?? row.admission?.hostel ?? 'No',
      hostelPreference: row.hostelPreference ?? row.admission?.hostelPreference ?? '',
      hostelRoomType: row.hostelRoomType ?? row.admission?.hostelRoomType ?? '',
      transport: row.transport === true ? 'Yes' : row.transport ?? row.admission?.transport ?? 'No',
      transportRoute: row.transportRoute ?? row.admission?.transportRoute ?? ''
    },
    fees: {
      ...base.fees,
      ...(row.fees || {}),
      ...(row.feeSummary || {})
    },
    documents: {
      ...base.documents,
      ...(row.documents || {}),
      ...Object.fromEntries(Object.entries(row.documentStatuses || {}).map(([key, status]) => [key, { status }]))
    },
    activity: Array.isArray(row.activity) && row.activity.length ? row.activity : base.activity
  }
}
const documentsFromApi = rows => {
  const mapped = { ...Object.fromEntries(DOCUMENTS.map(([key]) => [key, null])), otherCertificates: [] }
  for (const row of Array.isArray(rows) ? rows : []) {
    const type = String(row.documentType ?? row.type ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const key = DOCUMENTS.find(([candidate, label]) => [candidate, label].some(value => String(value).replace(/[^a-z0-9]/gi, '').toLowerCase() === type))?.[0]
    const document = { ...row, id: row.documentId ?? row.id, name: row.fileName ?? row.name ?? row.originalFileName, data: row.data ?? row.fileUrl ?? row.documentUrl ?? row.downloadUrl ?? row.url, uploadedAt: row.uploadedAt ?? row.createdAt, uploaded: true }
    if (key) mapped[key] = document
    else mapped.otherCertificates.push(document)
  }
  return mapped
}
const idsFromApi = (row = {}, fallbackAdmissionId = null) => ({
  admissionId: row.admissionId ?? row.studentAdmissionId ?? row.admission?.admissionId ?? row.id ?? fallbackAdmissionId,
  studentId: row.studentId ?? row.student?.studentId ?? row.student?.id ?? row.studentDetails?.studentId ?? row.personalInformation?.studentId ?? null,
  academicId: row.academicId ?? row.academicInformationId ?? row.academicInformation?.academicId ?? row.academicDetails?.academicId ?? null,
})
const read = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)
const setPath = (object, path, value) => { const clone = structuredClone(object); const keys = path.split('.'); let cursor = clone; keys.slice(0, -1).forEach(key => { cursor = cursor[key] }); cursor[keys.at(-1)] = value; return clone }
const text = value => String(value ?? '').trim()
const same = (left,right) => String(left ?? '') === String(right ?? '')
const studentName = student => {
  if (!student) return 'Unnamed student'
  const p = student.personal || {}
  const joined = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  if (joined) return joined
  if (p.fullName) return p.fullName
  if (p.name) return p.name
  if (student.fullName) return student.fullName
  if (student.name) return student.name
  if (student.studentName) return student.studentName
  return 'Unnamed student'
}
const display = value => text(value) || '—'
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const quota = student => student.academic.quota === 'Other' ? student.academic.quotaOther : student.academic.quota
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
const aadhaarFingerprint = data => [data.personal.aadhaar,studentName(data).trim().toUpperCase(),data.personal.dob,data.personal.gender].join('|')
const isAadhaarVerified = data => Boolean(data.personal.aadhaarVerification?.fingerprint === aadhaarFingerprint(data))
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
const REQUIRED = ['personal.firstName','personal.lastName','personal.gender','personal.dob','personal.aadhaar','contact.mobile','contact.email','contact.currentAddress.line1','contact.currentAddress.town','contact.currentAddress.city','contact.currentAddress.district','contact.currentAddress.state','contact.currentAddress.pincode','academic.academicYear','academic.admissionType','academic.course','academic.branch','previousEducation.tenth.board','previousEducation.tenth.institution','previousEducation.tenth.passingYear','previousEducation.tenth.score','previousEducation.intermediate.board','previousEducation.intermediate.institution','previousEducation.intermediate.passingYear','previousEducation.intermediate.score']
const requiredPaths = new Set(REQUIRED)
const validationStep = path => {
  const prefixes = ['personal.','contact.','parents.','academic.','previousEducation.','admission.','fees.','documents.']
  const index = prefixes.findIndex(prefix => path.startsWith(prefix))
  return index < 0 ? 0 : index
}
const validationLabel = path => {
  const labels = {
    'personal.aadhaarVerification':'Aadhaar verification',
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
  if (data.parents.guardian.relationship === 'Other' && !text(data.parents.guardian.relationshipOther)) errors['parents.guardian.relationshipOther'] = 'Enter the relationship.'
  if (!data.contact.sameAddress) ['line1','town','city','district','state','pincode'].forEach(key => { if (!text(data.contact.permanentAddress[key])) errors[`contact.permanentAddress.${key}`] = 'This field is required.' })
  if (data.personal.aadhaar && !validAadhaar(data.personal.aadhaar)) errors['personal.aadhaar'] = 'Enter a valid 12-digit Aadhaar number.'
  if (data.personal.aadhaar && validAadhaar(data.personal.aadhaar) && !isAadhaarVerified(data)) errors['personal.aadhaarVerification'] = 'Save and verify Aadhaar details before continuing.'
  ;['contact.mobile','contact.alternateMobile','parents.father.mobile','parents.mother.mobile','parents.guardian.mobile'].forEach(path => { if (read(data, path) && !/^[6-9]\d{9}$/.test(read(data, path))) errors[path] = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' })
  ;['contact.email','contact.alternateEmail','parents.father.email','parents.mother.email','parents.guardian.email'].forEach(path => { if (text(read(data,path)) && !validEmail(read(data,path))) errors[path] = 'Enter a valid email address.' })
  if (text(data.contact.alternateMobile) && data.contact.mobile === data.contact.alternateMobile) errors['contact.alternateMobile'] = 'Alternate mobile number must be different from the student mobile number.'
  if (text(data.contact.alternateEmail) && text(data.contact.email).toLowerCase() === text(data.contact.alternateEmail).toLowerCase()) errors['contact.alternateEmail'] = 'Alternate email must be different from the student email.'
  ;[['tenth','tenth'],['intermediate','intermediate']].forEach(([key,level]) => { const item=data.previousEducation[key], yearError=item.passingYear?validPassingYear(item.passingYear,data,level):''; if(yearError)errors[`previousEducation.${key}.passingYear`]=yearError; const scoreError=validScore(item); if(scoreError)errors[`previousEducation.${key}.score`]=scoreError })
  if (data.academic.admissionType === 'Lateral Entry' && !text(data.academic.quota)) errors['academic.quota'] = 'Select the admission quota for lateral entry.'
  if (data.academic.quota === 'Other' && !text(data.academic.quotaOther)) errors['academic.quotaOther'] = 'Enter the admission quota.'
  if (data.admission.hostel === 'Yes' && !text(data.admission.hostelPreference)) errors['admission.hostelPreference'] = 'Select a hostel preference.'
  if (data.admission.hostel === 'Yes' && !text(data.admission.hostelRoomType)) errors['admission.hostelRoomType'] = 'Select a room type / number of beds.'
  if (data.admission.transport === 'Yes' && !text(data.admission.transportRoute)) errors['admission.transportRoute'] = 'Select a transport route.'
  ;['tuitionFee','admissionFee','scholarshipAmount','hostelFee','transportFee'].forEach(key => { if (text(data.fees[key]) && Number(data.fees[key]) < 0) errors[`fees.${key}`] = 'Amount cannot be negative.' })
  const grossFee = ['tuitionFee','admissionFee','hostelFee','transportFee'].reduce((sum,key) => sum + Number(data.fees[key] || 0), 0)
  if (Number(data.fees.scholarshipAmount || 0) > grossFee) errors['fees.scholarshipAmount'] = 'Scholarship cannot exceed the gross fee.'
  ;['permanentAddress','currentAddress'].forEach(section => { if (section === 'permanentAddress' && data.contact.sameAddress) return; const item = data.contact[section]; if (item.pincode && !/^\d{6}$/.test(item.pincode)) errors[`contact.${section}.pincode`] = 'Enter a valid 6-digit PIN code.'; if (item.line1 && item.line1.length < 5) errors[`contact.${section}.line1`] = 'Enter a complete address.' })
  return errors
}

function Badge({ value }) { const norm = normalizeStatus(value); return <span className={`sa-badge status-${norm.toLowerCase().replaceAll('_', '-')}`}><i />{STATUS[norm] || STATUS[value] || value}</span> }
function Button({ primary = false, danger = false, children, ...props }) { return <button className={danger ? 'sa-danger' : primary ? 'sa-primary' : 'sa-secondary'} {...props}>{children}</button> }
function Toast({ message, tone = 'success', onClose }) { if (!message) return null; return <div className={`sa-toast tone-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><FiCheckCircle /><span>{message}</span><button onClick={onClose} aria-label="Dismiss notification"><FiX /></button></div> }
function ConfirmDialog({ title, children, confirmLabel, tone = 'primary', icon: Icon = FiShield, onCancel, onConfirm, busy = false, error }) { return <div className="sa-overlay" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}><section className="sa-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title"><button className="sa-dialog-close" disabled={busy} onClick={onCancel} aria-label="Close"><FiX /></button><div className={`sa-dialog-icon tone-${tone}`}><Icon /></div><h2 id="sa-confirm-title">{title}</h2><div className="sa-dialog-copy">{children}{error && <p role="alert" className="sa-decision-error">{error}</p>}</div><footer><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy} primary={tone !== 'danger'} danger={tone === 'danger'} onClick={onConfirm}>{busy ? 'Saving...' : confirmLabel}</Button></footer></section></div> }
function Section({ title, icon: Icon = FiFileText, hint, children, className = '' }) { const shownTitle = title === 'Application Information' ? 'Registration Details' : title; return <section className={`sa-form-section ${className}`}><header><span><Icon /></span><div><h2>{shownTitle}</h2>{hint && <p>{hint}</p>}</div></header><div className="sa-form-grid">{children}</div></section> }

function Field({ data, path, label, update, options, type = 'text', readOnly = false, error, placeholder, disabled = false, required = requiredPaths.has(path) }) {
  const value = read(data, path) ?? ''
  const shownLabel = ({ 'Application Number': 'Registration Number', 'Application Date': 'Registration Date' })[label] || label
  const numeric = /mobile|pincode|aadhaar|passingYear/i.test(path)
  const maxLength = /aadhaar$/i.test(path) ? 12 : /pincode/i.test(path) ? 6 : /mobile/i.test(path) ? 10 : /passingYear/i.test(path) ? 4 : undefined
  const id = `sa-${path.replaceAll('.', '-')}`
  const change = event => update(path, numeric ? event.target.value.replace(/\D/g, '').slice(0, maxLength) : event.target.value)
  const blur = () => { if (/email/i.test(path) && value !== text(value)) update(path, text(value)) }
  return <label className={`sa-field ${error ? 'invalid' : ''}`} htmlFor={id}><span>{shownLabel}{required && <b> *</b>}</span>{options ? <select id={id} value={value} disabled={disabled || readOnly} onChange={change} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}><option value="">{placeholder || 'Select'}</option>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={id} type={type} value={value} readOnly={readOnly || path === 'admission.batch'} disabled={disabled} inputMode={numeric ? 'numeric' : type === 'number' ? 'decimal' : undefined} min={type === 'number' ? 0 : undefined} maxLength={maxLength} placeholder={placeholder} onChange={change} onBlur={blur} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}{error && <small id={`${id}-error`} role="alert">{error}</small>}</label>
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
  const [rows, setRows] = useState([])
  const [, setLoadError] = useState('')
  const [exportReady, setExportReady] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const initialFilters = Object.fromEntries(FILTERS.map(([key]) => [key, '']))
  const [filters, setFilters] = useState(initialFilters)
  useEffect(() => { let active = true; studentAdmissionApi.getAll().then(items => { if (active) { setExportReady(isApiResult(items)); setRows(items.map(admissionFromApi)) } }).catch(error => { if (active) setLoadError(error.message || 'Unable to load admissions.') }); return () => { active = false } }, [])
  const shown = useMemo(() => rows.filter(item => {
    const needle = [studentName(item),item?.application?.number,item?.application?.admissionNumber,item?.application?.registrationNumber,item?.contact?.mobile,item?.contact?.email].join(' ').toLowerCase()
    const normStat = normalizeStatus(item?.status)
    const values = { status: normStat, academicYear: item?.academic?.academicYear, course: item?.academic?.course, department: item?.academic?.department, branch: item?.academic?.branch, semester: item?.academic?.semester, admissionType: item?.academic?.admissionType, quota: quota(item), feeStatus: item?.fees?.paymentStatus || 'Pending' }
    return needle.includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key,value]) => !value || values[key] === value)
  }), [rows, query, filters])
  useEffect(() => { setPage(1) }, [query, filters])
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const clear = () => { setQuery(''); setFilters(initialFilters); setPage(1) }
  const stats = {
    total: rows.length,
    approved: rows.filter(item => normalizeStatus(item.status) === 'APPROVED').length,
    pending: rows.filter(item => ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(normalizeStatus(item.status))).length,
    draft: rows.filter(item => normalizeStatus(item.status) === 'DRAFT').length,
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
            <ExportMenu rows={shown} columns={admissionColumns} title="Student Admissions" filename="student-admissions" loading={!exportReady} scope="Current filtered API results" />
            <button className="cm-button" type="button" onClick={() => navigate('/student-management/admissions/new')}>
              <FiPlus /> New Admission
            </button>
          </div>
        </header>
        <AdmissionFilters {...{ rows, query, setQuery, filters, setFilters }} />
        {!rows.length || !shown.length ? (
          <EmptyState hasRows={Boolean(rows.length)} filtered={Boolean(query || Object.values(filters).some(Boolean))} onCreate={() => navigate('/student-management/admissions/new')} onClear={clear} />
        ) : (
          <div className="sa-table-wrap" tabIndex={0} role="region" aria-label="Admissions table, scroll horizontally to see all columns">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Registration Number</th>
                  <th style={{ minWidth: '200px' }}>Student</th>
                  <th style={{ minWidth: '170px' }}>Academic Placement</th>
                  <th style={{ minWidth: '130px', maxWidth: '160px' }}>Admission Type</th>
                  <th className="table-center" style={{ width: '130px' }}>Academic Year</th>
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
                      <td className="table-center" style={{ width: '130px' }}>{display(item.academic.academicYear)}</td>
                      <td className="table-center" style={{ width: '120px' }}><StatusBadge value={feeStat} /></td>
                      <td className="table-center" style={{ width: '140px' }}><StatusBadge value={STATUS[normStat] || normStat} /></td>
                      <td className="table-center" style={{ width: '140px' }}><span className="sa-updated">{dateTime(item.updatedAt || item.createdAt)}</span></td>
                      <td className="table-center" style={{ width: '140px' }}>
                        <div className="sa-icon-actions table-actions-group">
                          <button
                            className="table-action-btn action-view"
                            title="View Details"
                            aria-label="View details"
                            onClick={() => navigate(`/student-management/admissions/${item.id}`)}
                          >
                            <FiEye />
                          </button>
                          {isEditable && (
                            <button
                              className="table-action-btn action-edit"
                              title="Edit Application"
                              aria-label="Edit application"
                              onClick={() => navigate(`/student-management/admissions/${item.id}/edit`)}
                            >
                              <FiEdit2 />
                            </button>
                          )}
                          {isReviewable && (
                            <button
                              className="table-action-btn action-activate"
                              title="Review / Approve"
                              aria-label="Review application"
                              onClick={() => navigate(`/student-management/admissions/${item.id}/approval`)}
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
  const upload = event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return notify('Upload a JPG, PNG or WebP student photo.', 'error'); if (file.size > 1024 * 1024) return notify('Student photo must be 1 MB or smaller.', 'error'); const reader = new FileReader(); reader.onload = () => update('personal.photo', reader.result); reader.onerror = () => notify('Unable to read the selected photo.', 'error'); reader.readAsDataURL(file) }
  const initials = [data.personal.firstName?.[0],data.personal.lastName?.[0]].filter(Boolean).join('').toUpperCase()
  return <div className="sa-photo-upload"><div className="sa-photo-preview">{data.personal.photo ? <img src={data.personal.photo} alt="Student live preview" /> : initials || <FiUser />}</div><div><strong>Student Photo</strong><span>JPG, PNG or WebP · Maximum 1 MB</span><label className="sa-photo-button"><FiCamera />{data.personal.photo ? 'Change Photo' : 'Upload Photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>{data.personal.photo && <button type="button" className="sa-photo-remove" onClick={() => update('personal.photo', '')}><FiTrash2 className="module-action-icon module-action-icon--danger" /> Remove</button>}</div></div>
}
function DocumentsUpload({ data, update }) {
  const selected = DOCUMENTS.filter(([key]) => text(data.documents?.[key]?.status || data.documents?.[key])).length
  return <section className="sa-documents"><header><div><h2>Document Status</h2><p>Mark the current status for each document. File uploads are not required for this admission form.</p></div><span>{selected}/{DOCUMENTS.length} marked</span></header><div className="sa-document-grid">{DOCUMENTS.map(([key,label]) => { const value=data.documents?.[key]?.status || (data.documents?.[key] ? 'Submitted' : ''); return <article className={value === 'Submitted' ? 'uploaded' : ''} key={key}><div className="sa-document-icon">{value === 'Submitted' ? <FiCheckCircle /> : <FiFileText />}</div><div className="sa-document-copy"><strong>{label}</strong><span>{value || 'Status not selected'}</span></div><div className="sa-document-actions"><select aria-label={`${label} status`} value={value} onChange={event=>update(`documents.${key}`,event.target.value ? { status:event.target.value } : null)}><option value="">Select status</option><option>Submitted</option><option>Pending</option><option>Not Submitted</option></select></div></article>})}</div></section>
  /* Legacy file-upload UI intentionally disabled while document status tracking is used.
  const upload = async (key, event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) return notify('Only PDF, JPG and PNG documents are allowed.', 'error'); if (file.size > 500 * 1024) return notify('Each document must be 500 KB or smaller.', 'error');try{const preview=await fileDataUrl(file);update(`documents.${key}`, { name: file.name, type: file.type, size: file.size, file, data:preview, uploaded:true, uploadedAt: new Date().toISOString() })}catch(error){notify(error.message,'error')} }
  const uploadOthers = async event => { const files = [...(event.target.files || [])]; event.target.value = ''; const valid = files.filter(file => { if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) { notify(`${file.name}: only PDF, JPG and PNG files are allowed.`, 'error'); return false } if (file.size > 500 * 1024) { notify(`${file.name}: file must be 500 KB or smaller.`, 'error'); return false } return true }); if(valid.length){try{const previews=await Promise.all(valid.map(file=>fileDataUrl(file)));update('documents.otherCertificates', [...(data.documents.otherCertificates || []), ...valid.map((file,index) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, file, data:previews[index], uploaded:true, uploadedAt: new Date().toISOString() }))])}catch(error){notify(error.message,'error')}} }
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
function ReviewSection({ title, step, edit, items }) { const terms = { 'Application Number': 'Registration Number', 'Application Date': 'Registration Date' }; const titles = { 'Student Information': 'Student Details', 'Academic Placement': 'Academic Details', 'Admission & Services': 'Registration & Services', 'Fee Summary': 'Fee Structure & Payment', 'Uploaded Documents': 'Supporting Documents' }; const normalized = items.filter(([label]) => !['Registration Number','Section','Quota'].includes(label)).map(([label,...rest]) => [terms[label] || label,...rest]); const visible = normalized.filter(([,value,optional]) => !optional || text(value)); return <section className="sa-review-section"><header><h2>{titles[title] || title}</h2>{edit && <button type="button" onClick={() => edit(step)}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit</button>}</header><dl>{visible.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl></section> }
function CoreReview({ data, edit }) {
  const address = value => formatAddress(value)
  return <div className="sa-full-review"><ReviewSection title="Student Information" step={0} edit={edit} items={[['Student',studentName(data)],['Gender',data.personal.gender],['Date of Birth',data.personal.dob],['Blood Group',data.personal.bloodGroup,true],['Nationality',data.personal.nationality],['Aadhaar Number',data.personal.aadhaar ? `•••• •••• ${data.personal.aadhaar.slice(-4)}` : '']]} /><ReviewSection title="Contact Information" step={1} edit={edit} items={[['Student Mobile',data.contact.mobile],['Alternate Mobile',data.contact.alternateMobile,true],['Student Email',data.contact.email],['Alternate Email',data.contact.alternateEmail,true],['Current Address',address(data.contact.currentAddress)],['Permanent Address',address(data.contact.permanentAddress) || (data.contact.sameAddress ? (address(data.contact.currentAddress) || 'Same as current address') : 'Same as current address')]]} /><ReviewSection title="Parent / Guardian" step={2} edit={edit} items={[['Father Name',data.parents.father.name],['Father Mobile',data.parents.father.mobile],['Father Email',data.parents.father.email,true],['Father Occupation',data.parents.father.occupation,true],['Father Qualification',data.parents.father.qualification,true],['Annual Income',data.parents.father.income,true],['Mother Name',data.parents.mother.name,true],['Mother Mobile',data.parents.mother.mobile,true],['Guardian Name',data.parents.guardian.name,true],['Guardian Relationship',data.parents.guardian.relationship === 'Other' ? data.parents.guardian.relationshipOther : data.parents.guardian.relationship,true],['Guardian Mobile',data.parents.guardian.mobile,true],['Primary Contact',data.parents.primaryContact],['Emergency Contact',data.parents.emergencyMobile]]} /><ReviewSection title="Academic Placement" step={3} edit={edit} items={[['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Course',data.academic.course],['Branch',data.academic.branch],['Regulation',data.academic.regulation],['Quota',quota(data)],['Entry Type',data.academic.entryType]]} /><ReviewSection title="Previous Education" step={4} edit={edit} items={[['10th Board',data.previousEducation.tenth.board],['School Name',data.previousEducation.tenth.institution],['10th Roll Number',data.previousEducation.tenth.rollNumber,true],['10th Passing Year',data.previousEducation.tenth.passingYear],['10th Score',data.previousEducation.tenth.score],['Qualification',data.previousEducation.intermediate.qualification],['Board / University',data.previousEducation.intermediate.board],['College Name',data.previousEducation.intermediate.institution],['Passing Year',data.previousEducation.intermediate.passingYear],['Stream',data.previousEducation.intermediate.stream],['Score',data.previousEducation.intermediate.score]]} /><ReviewSection title="Admission & Services" step={5} edit={edit} items={[['Application Number',data.application.number],['Application Date',data.application.date],['Registration Number',data.application.registrationNumber,true],['Admission Number',data.application.admissionNumber,true],['Admission Date',data.application.admissionDate,true],['College',data.admission.college],['Batch',data.admission.batch],['Scholarship',data.admission.scholarship],['Scholarship Type',data.admission.scholarshipType,true],['Hostel',data.admission.hostel],['Hostel Preference',data.admission.hostelPreference,true],['Room Type / Beds',data.admission.hostelRoomType,true],['Transportation',data.admission.transport],['Transport Route',data.admission.transportRoute,true]]} /><ReviewSection title="Fee Summary" step={6} edit={edit} items={[['Tuition Fee (per year)',money(data.fees.tuitionFee)],['Admission Fee (one-time)',money(data.fees.admissionFee)],['Hostel Room Type',data.admission.hostelRoomType,true],['Hostel Fee (per year)',money(data.fees.hostelFee),data.admission.hostel !== 'Yes'],['Transportation Fee (per year)',money(data.fees.transportFee),data.admission.transport !== 'Yes'],['Estimated First-Year Total',money(data.fees.totalFee)],['Estimated Entire 4-Year Total',money((Number(data.fees.tuitionFee || 0) + Number(data.fees.hostelFee || 0) + Number(data.fees.transportFee || 0)) * 4 + Number(data.fees.admissionFee || 0))],['Payment Preference',data.fees.paymentPlan],['Estimated Amount per Term',data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.ceil(Number(data.fees.totalFee || 0) / 2)) : '',true]]} /></div>
}
function DocumentPreview({ document, studentId }) {
  const [opening,setOpening]=useState(false)
  const [error,setError]=useState('')
  const href=document?.data??document?.fileUrl??document?.documentUrl??document?.downloadUrl??document?.url
  if(href)return <a href={href} target="_blank" rel="noreferrer">Preview</a>
  if(!studentId||!document?.id)return null
  const open=async()=>{const tab=window.open('','_blank');setOpening(true);setError('');try{const result=await studentDocumentApi.download(studentId,document.id),url=URL.createObjectURL(result.blob);if(tab)tab.location.href=url;else window.open(url,'_blank');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(reason){tab?.close();setError(reason.message||'Unable to preview document.')}finally{setOpening(false)}}
  return <><button type="button" className="sa-document-preview-button" disabled={opening} onClick={open}>{opening?'Opening...':'Preview'}</button>{error&&<small className="error">{error}</small>}</>
}
function DocumentReview({ data, edit, studentId }) { const documents=[...DOCUMENTS.map(([key,label])=>({key,label,...data.documents?.[key]})),...(data.documents?.otherCertificates||[]).map(item=>({key:item.id,label:'Other Certificate',...item}))]; return <section className="sa-review-section sa-document-preview-list"><header><h2>Supporting Documents</h2>{edit&&<button type="button" onClick={()=>edit(7)}><FiEdit2 className="module-action-icon module-action-icon--edit" /> Edit</button>}</header><div>{documents.map(document=>{const ready=Boolean(document.uploaded||document.file||document.data||document.id);return <article key={document.key}><FiFileText/><span><strong>{document.label}</strong><small>{document.name||'Not uploaded'}</small></span><Badge value={ready?'Uploaded':'Not Uploaded'}/>{ready&&<DocumentPreview document={document} studentId={studentId}/>}</article>})}</div></section> }
function FullReview({ data, edit, studentId }) { return <><CoreReview data={data} edit={edit} /><DocumentReview data={data} edit={edit} studentId={studentId} /></> }
function PreviewHeader({ data }) { const uploaded = DOCUMENTS.filter(([key]) => data.documents?.[key]).length; return <section className="sa-preview-header"><div className="sa-preview-photo">{data.personal.photo ? <img src={data.personal.photo} alt={studentName(data)} /> : <FiUser />}</div><div className="sa-preview-identity"><span>Admission Preview</span><h2>{studentName(data)}</h2><p>{data.application.registrationNumber} · {display(data.academic.course)} · {display(data.academic.branch)}</p></div><dl><div><dt>Academic Year</dt><dd>{display(data.academic.academicYear)}</dd></div><div><dt>Payment Preference</dt><dd>{display(data.fees.paymentPlan)}</dd></div><div><dt>Documents</dt><dd>{uploaded}/{DOCUMENTS.length} uploaded</dd></div></dl></section> }

function AadhaarVerification({ data, update, error, notify }) { const verified=isAadhaarVerified(data); const verify=()=>{ if(!validAadhaar(data.personal.aadhaar)||!text(data.personal.firstName)||!text(data.personal.lastName)||!text(data.personal.dob)||!text(data.personal.gender)){ notify('Complete valid student identity details before Aadhaar verification.','error'); return } update('personal.aadhaarVerification',{ fingerprint:aadhaarFingerprint(data), verifiedAt:new Date().toISOString() }); notify('Aadhaar identity details saved and verified.') }; return <div className={`sa-aadhaar-verification ${verified?'verified':error?'invalid':''}`}><FiShield/><span><strong>{verified?'Aadhaar details verified':data.personal.aadhaarVerification?'Student details changed. Please verify Aadhaar again.':'Aadhaar verification required'}</strong><small>{verified?`Aadhaar ending ${data.personal.aadhaar.slice(-4)} · verified ${dateTime(data.personal.aadhaarVerification.verifiedAt)}`:'Verification is tied to the current name, date of birth, gender and Aadhaar number.'}</small>{error&&<small className="error">{error}</small>}</span><Button onClick={verify}>{verified?'Verify Again':'Save & Verify'}</Button></div> }

function AdmissionForm() {
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState(empty); const [recordIds, setRecordIds] = useState({ admissionId: id || null, studentId: null, academicId: null })
  const [step, setStep] = useState(0); const [errors, setErrors] = useState({}); const [declared, setDeclared] = useState(false); const [toast, setToast] = useState(null); const [pinStatus, setPinStatus] = useState({}); const [confirmSubmit, setConfirmSubmit] = useState(false); const [submitting, setSubmitting] = useState(false); const [savingStep, setSavingStep] = useState(false); const [feeState, setFeeState] = useState({ loading: false, loaded: false, error: '' })
  const [masters,setMasters]=useState({years:[],courses:[],branches:[],colleges:[]})
  const toastTimer = useRef(null)
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { if (!data.application.date) setData(current => ({ ...current, application: { ...current.application, date: new Date().toISOString().slice(0, 10) } })) }, [data.application.date])
  useEffect(() => { if (data.admission.collegeId || !data.admission.college || !masters.colleges.length) return; const college = masters.colleges.find(item => String(item.collegeName ?? item.name ?? item.institutionName ?? '').trim().toLowerCase() === String(data.admission.college).trim().toLowerCase()); if (college) setData(current => ({ ...current, admission: { ...current.admission, collegeId: college.collegeId ?? college.id } })) }, [masters.colleges, data.admission.collegeId, data.admission.college])
  const notify = (message, tone = 'success') => { window.clearTimeout(toastTimer.current); setToast({ message, tone }); toastTimer.current = window.setTimeout(() => setToast(null), 2600) }
  useEffect(()=>{let active=true;Promise.all([academicYearApi.getAll(),courseApi.getAll(),branchApi.getAll(),getColleges()]).then(([years,courses,branches,collegeResponse])=>{if(!active)return;const list=response=>{let value=response;for(let depth=0;depth<5&&value&&typeof value==='object';depth+=1){if(Array.isArray(value))return value;const rows=value.items??value.content??value.results??value.records;if(Array.isArray(rows))return rows;value=value.data}return[]};const operationalYears = getOperationalAcademicYearOptions(years);setMasters({years: operationalYears, courses, branches, colleges:list(collegeResponse)})}).catch(error=>notify(error.message||'Unable to load admission selections.','error'));return()=>{active=false}},[])
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
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => { const start=Number(String(data.academic.academicYear).slice(0,4)); const batch=start&&data.academic.course?`${start}-${start+4}`:''; if(data.admission.batch!==batch)queueMicrotask(()=>setData(current=>({...current,admission:{...current.admission,batch}}))) }, [data.academic.academicYear,data.academic.course,data.admission.batch])
  useEffect(() => { const n=Number(String(data.academic.semester).match(/\d+/)?.[0]||0), year=n?`${Math.ceil(n/2)}${['th','st','nd','rd'][Math.ceil(n/2)]||'th'} Year`:''; if(data.academic.yearOfStudy!==year)queueMicrotask(()=>setData(current=>({...current,academic:{...current.academic,yearOfStudy:year}}))) }, [data.academic.semester,data.academic.yearOfStudy])
  useEffect(() => { queueMicrotask(()=>setData(current => { let next=current; for(const key of ['tenth','intermediate']){const item=current.previousEducation[key],max=item.scoreType==='CGPA'?10:100;if(text(item.score)&&Number(item.score)>max)next=setPath(next,`previousEducation.${key}.score`,'')}return next })) }, [data.previousEducation.tenth.scoreType,data.previousEducation.intermediate.scoreType])
  useEffect(() => { if (!id) return; let active = true; studentAdmissionApi.getById(id).then(async row => {
    const loadedIds = idsFromApi(row, id), admissionId = loadedIds.admissionId, studentId = loadedIds.studentId
    const sections = await Promise.allSettled([studentAcademicDetailsApi.get(admissionId), studentPreviousEducationApi.get(admissionId), studentId ? studentParentApi.get(studentId) : Promise.resolve(null), studentId ? studentDocumentApi.getAll(studentId) : Promise.resolve([]), studentFeeApi.getSummary(admissionId), studentFeeApi.getStructure(admissionId)])
    if (!active) return
    const loaded = admissionFromApi({ ...row, academicDetails: sections[0].status === 'fulfilled' ? sections[0].value : row.academicDetails, previousEducation: sections[1].status === 'fulfilled' ? sections[1].value : row.previousEducation, parents: sections[2].status === 'fulfilled' ? sections[2].value : row.parents, documents: sections[3].status === 'fulfilled' ? documentsFromApi(sections[3].value) : row.documents })
    const feeSummary = resolveFeeSummary(loaded, sections[4].status === 'fulfilled' ? sections[4].value : row.feeSummary, sections[5].status === 'fulfilled' ? sections[5].value : null)
    setData(feeSummary ? { ...loaded, fees: { ...loaded.fees, ...feeSummary } } : loaded)
    setRecordIds(loadedIds)
  }).catch(error => notify(error.message || 'Unable to load this admission.', 'error')); return () => { active = false } }, [id])
  const update = (path, value) => { setData(current => { let next = setPath(current, path, value); if (path === 'contact.sameAddress' && value) next.contact.permanentAddress = { ...next.contact.currentAddress }; if (path.startsWith('contact.currentAddress.') && next.contact.sameAddress) next.contact.permanentAddress = { ...next.contact.currentAddress }; if (path === 'academic.course' || path === 'academic.courseId') Object.assign(next.academic, { branch: '', branchId: '', branchCode: '' }); if (path === 'academic.quota' && value !== 'Other') next.academic.quotaOther = ''; if (path === 'parents.guardian.relationship' && value !== 'Other') next.parents.guardian.relationshipOther = ''; if (path === 'admission.scholarship' && value === 'No') { next.admission.scholarshipType = ''; next.fees.scholarshipAmount = '' } if (path === 'admission.hostel') { if (value === 'No') { next.admission.hostelPreference = ''; next.admission.hostelRoomType = ''; next.fees.hostelFee = '' } else if (next.admission.hostelRoomType) { next.fees.hostelFee = String(HOSTEL_FEES[next.admission.hostelRoomType] || '') } } if (path === 'admission.hostelRoomType') { next.fees.hostelFee = String(HOSTEL_FEES[value] || '') } if (path === 'admission.transport') { if (value === 'No') { next.admission.transportRoute = ''; next.fees.transportFee = '' } else if (next.admission.transportRoute) { next.fees.transportFee = String(TRANSPORT_FEES[next.admission.transportRoute] || '') } } if (path === 'admission.transportRoute') { next.fees.transportFee = String(TRANSPORT_FEES[value] || '') } const tuition = Number(next.fees.tuitionFee) > 0 ? Number(next.fees.tuitionFee) : 50000; const admission = Number(next.fees.admissionFee !== undefined && next.fees.admissionFee !== '' ? next.fees.admissionFee : 4000); const hostel = next.admission.hostel === 'Yes' ? Number(next.fees.hostelFee || (next.admission.hostelRoomType ? HOSTEL_FEES[next.admission.hostelRoomType] : 0) || 0) : 0; const transport = next.admission.transport === 'Yes' ? Number(next.fees.transportFee || (next.admission.transportRoute ? TRANSPORT_FEES[next.admission.transportRoute] : 0) || 0) : 0; const scholarship = Number(next.fees.scholarshipAmount || 0); const total = Math.max(0, tuition + admission + hostel + transport - scholarship); next.fees.tuitionFee = String(tuition); next.fees.admissionFee = String(admission); next.fees.totalFee = String(total); return next }); setErrors(current => ({ ...current, [path]: '' })) }
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
    if (!masters.years.length) return
    const resolvedAcademicYearId = resolveAcademicYearId(masters.years, data.academic.academicYearId)
    if (!data.academic.academicYearId || String(data.academic.academicYearId) !== String(resolvedAcademicYearId)) {
      setData(current => ({
        ...current,
        academic: { ...current.academic, academicYearId: resolvedAcademicYearId, academicYear: masters.years.find(item => String(item.academicYearId ?? item.id) === String(resolvedAcademicYearId))?.academicYearName ?? masters.years.find(item => String(item.academicYearId ?? item.id) === String(resolvedAcademicYearId))?.name ?? current.academic.academicYear }
      }))
    }
  }, [masters.years, data.academic.academicYearId])

  const allErrors = validate(data)
  const field = (path,label,options,type,readOnly,placeholder,disabled) => <Field {...{ data,path,label,options,type,readOnly,placeholder,disabled,update }} error={errors[path]} />
  const academicOption=(item,idKeys,nameKeys)=>({id:idKeys.map(key=>read(item,key)).find(value=>value!=null&&value!==''),name:nameKeys.map(key=>read(item,key)).find(Boolean)||''})
  const yearOptions=masters.years.map(item=>academicOption(item,['academicYearId','id'],['academicYearName','name'])).filter(item=>item.id)
  const courseOptions=masters.courses.map(item=>({...academicOption(item,['courseId','id'],['courseName','name']),code:item.courseCode??item.code??item.shortName??''})).filter(item=>item.id)
  const branchOptions=masters.branches.map(item=>({...academicOption(item,['branchId','id'],['branchName','name','branchShortName','shortName']),code:item.branchCode??item.code??item.shortName??'',courseId:item.courseId??item.course?.courseId??item.course?.id})).filter(item=>item.id&&(!data.academic.courseId||!item.courseId||same(item.courseId,data.academic.courseId)))
  const collegeOptions=masters.colleges.map(item=>({id:item.collegeId??item.id,name:item.collegeName??item.name??item.institutionName??''})).filter(item=>item.id&&item.name)
  const masterField=(namePath,idPath,label,options,disabled=false,resets=[])=>{const id=`sa-${idPath.replaceAll('.','-')}`;return <label className={`sa-field ${errors[namePath]?'invalid':''}`} htmlFor={id}><span>{label}<b> *</b></span><select id={id} value={read(data,idPath)||''} disabled={disabled} onChange={event=>{const option=options.find(item=>same(item.id,event.target.value));setData(current=>{let next=setPath(current,idPath,event.target.value);next=setPath(next,namePath,option?.name||'');if(idPath==='academic.courseId')next=setPath(next,'academic.courseCode',option?.code||'');if(idPath==='academic.branchId')next=setPath(next,'academic.branchCode',option?.code||'');resets.forEach(([resetId,resetName])=>{next=setPath(next,resetId,'');next=setPath(next,resetName,'')});return next});setErrors(current=>({...current,[namePath]:''}))}}><option value="">{disabled?'Select previous field first':'Select'}</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>{errors[namePath]&&<small role="alert">{errors[namePath]}</small>}</label>}
  const screens = [
    <Section key="identity" title="Student Identity" icon={FiUser} hint="Core identity and government identification details"><PhotoUpload data={data} update={update} notify={notify} />{field('personal.firstName','First Name')}{field('personal.middleName','Middle Name')}{field('personal.lastName','Last Name')}{field('personal.gender','Gender',['Female','Male','Non-binary'])}{field('personal.dob','Date of Birth',null,'date')}{field('personal.bloodGroup','Blood Group',['A+','A-','B+','B-','AB+','AB-','O+','O-'])}{field('personal.nationality','Nationality')}{field('personal.aadhaar','Aadhaar Number')}<AadhaarVerification data={data} update={update} error={errors['personal.aadhaarVerification']} notify={notify}/></Section>,
    <><Section title="Contact Information" icon={FiPhone}>{field('contact.mobile','Student Mobile')}{field('contact.alternateMobile','Alternate Mobile')}{field('contact.email','Student Email',null,'email')}{field('contact.alternateEmail','Alternate Email',null,'email')}</Section><Section title="Current Address" icon={FiHome}><AddressFields data={data} prefix="contact.currentAddress" update={update} errors={errors} />{pinStatus.current && <p className={`sa-pincode-status ${pinStatus.current.includes('filled') ? 'success' : ''}`}>{pinStatus.current}</p>}</Section><Section title="Permanent Address" icon={FiHome}><label className="sa-check sa-span-all"><input type="checkbox" checked={data.contact.sameAddress} onChange={event => update('contact.sameAddress', event.target.checked)} /><span>Permanent address same as current address</span></label>{!data.contact.sameAddress && <><AddressFields data={data} prefix="contact.permanentAddress" update={update} errors={errors} />{pinStatus.permanent && <p className={`sa-pincode-status ${pinStatus.permanent.includes('filled') ? 'success' : ''}`}>{pinStatus.permanent}</p>}</>}</Section></>,
    <><div className="sa-rule-note"><FiAlertCircle /><span>Enter parent or guardian details as applicable.</span></div><Section title="Father Details" icon={FiUser}>{field('parents.father.name','Father Name')}{field('parents.father.mobile','Father Mobile')}{field('parents.father.email','Father Email',null,'email')}{field('parents.father.occupation','Occupation')}{field('parents.father.qualification','Qualification')}{field('parents.father.income','Annual Income',null,'number')}</Section><Section title="Mother Details" icon={FiUser}>{field('parents.mother.name','Mother Name')}{field('parents.mother.mobile','Mother Mobile')}{field('parents.mother.email','Mother Email',null,'email')}{field('parents.mother.occupation','Occupation')}{field('parents.mother.qualification','Qualification')}{field('parents.mother.income','Annual Income',null,'number')}</Section><Section title="Guardian Details" icon={FiUsers}>{field('parents.guardian.name','Guardian Name')}{field('parents.guardian.relationship','Relationship',['Mother','Brother','Sister','Grandfather','Grandmother','Uncle','Aunt','Legal Guardian','Other'])}{data.parents.guardian.relationship === 'Other' && field('parents.guardian.relationshipOther','Specify Relationship')}{field('parents.guardian.mobile','Guardian Mobile')}{field('parents.guardian.email','Guardian Email',null,'email')}{field('parents.guardian.occupation','Occupation')}{field('parents.guardian.qualification','Qualification')}{field('parents.guardian.income','Annual Income',null,'number')}</Section></>,
    <Section key="academic" title="Academic Placement" icon={FiBookOpen} hint="Select academic year, course, branch and admission categories.">{masterField('academic.academicYear','academic.academicYearId','Academic Year',yearOptions)}{field('academic.admissionType','Admission Type',ADMISSION_TYPES)}{field('academic.quota','Admission Quota',ADMISSION_QUOTAS)}{data.academic.quota === 'Other' && field('academic.quotaOther','Specify Admission Quota')}{masterField('academic.course','academic.courseId','Course',courseOptions,false,[['academic.branchId','academic.branch']])}{field('academic.courseCode','Course Code',null,'text',true)}{masterField('academic.branch','academic.branchId','Branch',branchOptions,!data.academic.courseId)}{field('academic.branchCode','Branch Code',null,'text',true)}{field('academic.studentCategory','Student Category',['General','SC','ST','BC','EWS','Other'])}{field('academic.regulation','Regulation')}{field('academic.entryType','Entry Type',['Regular','Lateral Entry','Transfer'])}</Section>,
    <><Section title="10th / SSC" icon={FiBookOpen} hint="Enter only the essential school details.">{field('previousEducation.tenth.board','Board')}{field('previousEducation.tenth.institution','School Name')}{field('previousEducation.tenth.passingYear','Year of Passing')}{field('previousEducation.tenth.score','Percentage (0–100)',null,'number')}</Section><Section title="Intermediate / Diploma" icon={FiBookOpen} hint="Enter only the essential qualifying-education details.">{field('previousEducation.intermediate.board','Board / University')}{field('previousEducation.intermediate.institution','College Name')}{field('previousEducation.intermediate.passingYear','Year of Passing')}{field('previousEducation.intermediate.stream','Stream (MPC)',null,'text',true)}{field('previousEducation.intermediate.score','Percentage (0–100)',null,'number')}</Section></>,
    <><Section title="Application Information" icon={FiFileText} hint="Registration details and institutional assignment.">{field('application.number','Registration Number',null,'text',true)}{field('application.date','Registration Date',null,'date',false)}<label className="sa-field" htmlFor="sa-admission-college"><span>College</span><select id="sa-admission-college" value={data.admission.collegeId||''} onChange={event=>{const college=collegeOptions.find(item=>same(item.id,event.target.value));update('admission.collegeId',event.target.value);update('admission.college',college?.name||'')}}><option value="">Select College</option>{collegeOptions.map(college=><option key={college.id} value={college.id}>{college.name}</option>)}</select></label>{field('admission.batch','Batch')}</Section><Section title="Student Services" icon={FiHome}>{field('admission.hostel','Hostel Required',['No','Yes'])}{data.admission.hostel === 'Yes' && <>{field('admission.hostelPreference','Hostel Preference',['Boys Hostel','Girls Hostel'])}{field('admission.hostelRoomType','Room Type / Beds',Object.keys(HOSTEL_FEES))}</>}{field('admission.transport','Transportation Required',['No','Yes'])}{data.admission.transport === 'Yes' && field('admission.transportRoute','Transport Route',Object.keys(TRANSPORT_FEES),null,false,'Select route')}</Section></>,
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
        result = await studentAdmissionApi.create(data)
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
          } catch {
            // Gracefully proceed
          }
        }
      } else if (step === 7) {
        const pending = [...DOCUMENTS.map(([key, label]) => ({ key, label, document: data.documents[key] })), ...(data.documents.otherCertificates || []).map(document => ({ key: 'otherCertificate', label: 'Other Certificate', document }))].filter(item => item.document?.file)
        if(ids.studentId){for (const item of pending) await studentDocumentApi.upload(ids.studentId, item.document.file, { documentType: item.key, documentName: item.label });const uploadedRows = await studentDocumentApi.getAll(ids.studentId);setData(current => ({ ...current, documents: documentsFromApi(uploadedRows) }))}
      }
      if (result) {
        const returnedIds = idsFromApi(result, ids.admissionId)
        saveAdmissionPhoto(returnedIds.admissionId??ids.admissionId,data.personal.photo)
        setRecordIds(current => ({ admissionId: returnedIds.admissionId ?? current.admissionId, studentId: returnedIds.studentId ?? current.studentId, academicId: returnedIds.academicId ?? current.academicId }))
      }
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
  const submit = async () => { if (submitting || !recordIds.admissionId) return; setSubmitting(true); try { const submitted=await studentAdmissionApi.submit(recordIds.admissionId),submittedIds=idsFromApi(submitted,recordIds.admissionId),studentId=submittedIds.studentId??recordIds.studentId;const pending=[...DOCUMENTS.map(([key,label])=>({key,label,document:data.documents[key]})),...(data.documents?.otherCertificates||[]).map(document=>({key:'otherCertificate',label:'Other Certificate',document}))].filter(item=>item.document?.file);if(studentId){for(const item of pending)await studentDocumentApi.upload(studentId,item.document.file,{documentType:item.key,documentName:item.label})}const latest = await studentAdmissionStatusApi.get(recordIds.admissionId); setData(current => ({ ...current, status: latest.status ?? 'SUBMITTED' }));setRecordIds(current=>({...current,studentId:studentId??current.studentId})); setConfirmSubmit(false); eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { admissionId: recordIds.admissionId, status: 'SUBMITTED' }); notify(studentId&&pending.length?'Admission submitted and documents uploaded successfully':'Admission application submitted successfully'); window.setTimeout(() => navigate('/student-management/admissions'), 700) } catch (error) { notify(error.message || 'Unable to submit this admission.', 'error'); setSubmitting(false) } }
  return <><Breadcrumb tail={id ? 'Edit Admission' : 'New Admission'} /><header className="sa-page-header sa-wizard-header"><div><h1>{id ? 'Edit Student Admission' : 'New Student Admission'}</h1><p>Registration Number <strong>{data.application.number}</strong></p></div><div><Badge value={data.status} /><Button onClick={() => navigate('/student-management/admissions')}>Cancel</Button></div></header><Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} /><WizardStepper step={step} setStep={setStep} /><form className="sa-wizard-card" onSubmit={event => event.preventDefault()}><header className="sa-step-heading"><div><small>Step {step + 1} of {STEPS.length}</small><h2>{STEPS[step]}</h2></div><span>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span></header>{screens[step]}{step === STEPS.length - 1 && <label className="sa-declaration"><input type="checkbox" checked={declared} onChange={event => setDeclared(event.target.checked)} /><span><strong>Registration Declaration</strong>I confirm that the information entered above is correct.</span></label>}<footer className="sa-wizard-actions"><Button disabled={!step || submitting} onClick={() => setStep(current => current - 1)}><FiArrowLeft /> Previous</Button><span />{step < STEPS.length - 1 ? <Button primary onClick={nextStep}>Save & Continue <FiArrowRight /></Button> : <Button primary disabled={!declared || submitting} onClick={requestSubmit}>{submitting ? 'Submitting...' : 'Submit Application'}</Button>}</footer></form>{confirmSubmit && <ConfirmDialog icon={FiCheckCircle} title="Confirm Registration Submission" confirmLabel="Confirm & Submit" onCancel={() => setConfirmSubmit(false)} onConfirm={submit}><p>Please verify the student details below. Once submitted, the registration will be sent to the admissions team for review.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Registration Number</dt><dd>{data.application.number}</dd></div></dl></ConfirmDialog>}</>
}

function InfoGrid({ title, items }) { const terms = { 'Application Date': 'Registration Date', 'Application Overview': 'Registration Overview', 'Admission & Services': 'Registration & Services', 'Fee Record': 'Fee Structure & Payment' }; return <section className="sa-detail-panel"><header><h2>{terms[title] || title}</h2></header><dl>{items.filter(([,value]) => text(value)).map(([label,value]) => <div key={label}><dt>{terms[label] || label}</dt><dd>{display(value)}</dd></div>)}</dl></section> }
function DocumentDetails({ data }) { const documents = [...DOCUMENTS.map(([key,label]) => [key,label,data.documents?.[key]]), ...(data.documents?.otherCertificates || []).map(item => [item.id,'Other Certificate',item])]; return <section className="sa-detail-panel"><header><h2>Uploaded Documents</h2><p>Documents submitted with the admission application</p></header><div className="sa-document-detail-list">{documents.map(([key,label,document]) => <article key={key}><FiFileText /><div><strong>{label}</strong><span>{document?.name || 'Not uploaded'}</span></div>{document?.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}</article>)}</div></section> }
function Timeline({ activity }) { return <section className="sa-detail-panel"><header><h2>Admission Activity</h2><p>Complete application history</p></header><ol className="sa-timeline">{[...activity].reverse().map((item,index) => <li key={`${item.date}-${index}`}><i>{index === 0 ? <FiCheck /> : ''}</i><div><strong>{item.label}</strong>{item.remarks && <p>{item.remarks}</p>}<span>{dateTime(item.date)}</span></div></li>)}</ol></section> }
function DetailContent({ data, tab }) {
  const address = value => formatAddress(value)
  if (tab === 'personal') return <><InfoGrid title="Personal Information" items={[['Student Name',studentName(data)],['Gender',data.personal.gender],['Date of Birth',data.personal.dob],['Blood Group',data.personal.bloodGroup],['Nationality',data.personal.nationality],['Aadhaar Number',data.personal.aadhaar ? `•••• •••• ${data.personal.aadhaar.slice(-4)}` : '']]} /><InfoGrid title="Contact & Address" items={[['Student Mobile',data.contact.mobile],['Alternate Mobile',data.contact.alternateMobile],['Student Email',data.contact.email],['Alternate Email',data.contact.alternateEmail],['Current Address',address(data.contact.currentAddress)],['Permanent Address',data.contact.sameAddress ? (address(data.contact.currentAddress) || 'Same as current address') : address(data.contact.permanentAddress)]]} /><InfoGrid title="Parent / Guardian" items={[['Father Name',data.parents.father.name],['Father Mobile',data.parents.father.mobile],['Father Email',data.parents.father.email],['Father Occupation',data.parents.father.occupation],['Father Qualification',data.parents.father.qualification],['Annual Income',data.parents.father.income],['Mother Name',data.parents.mother.name],['Mother Mobile',data.parents.mother.mobile],['Mother Occupation',data.parents.mother.occupation],['Guardian Name',data.parents.guardian.name],['Guardian Relationship',data.parents.guardian.relationship==='Other'?data.parents.guardian.relationshipOther:data.parents.guardian.relationship],['Guardian Mobile',data.parents.guardian.mobile],['Primary Contact',data.parents.primaryContact],['Emergency Contact',data.parents.emergencyMobile]]} /></>
  if (tab === 'academic') return <InfoGrid title="Academic Placement" items={[['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Quota',quota(data)],['Course',data.academic.course],['Branch',data.academic.branch],['Student Category',data.academic.studentCategory],['Regulation',data.academic.regulation],['Entry Type',data.academic.entryType]]} />
  if (tab === 'education') return <><InfoGrid title="10th / SSC" items={[['Board',data.previousEducation.tenth.board],['School',data.previousEducation.tenth.institution],['Roll Number',data.previousEducation.tenth.rollNumber],['Passing Year',data.previousEducation.tenth.passingYear],['Score Type',data.previousEducation.tenth.scoreType],['Score',data.previousEducation.tenth.score]]} /><InfoGrid title="Intermediate / Diploma" items={[['Qualification',data.previousEducation.intermediate.qualification],['Board / University',data.previousEducation.intermediate.board],['College',data.previousEducation.intermediate.institution],['Passing Year',data.previousEducation.intermediate.passingYear],['Stream',data.previousEducation.intermediate.stream],['Score Type',data.previousEducation.intermediate.scoreType],['Score',data.previousEducation.intermediate.score]]} /></>
  if (tab === 'services') return <InfoGrid title="Admission & Services" items={[['Registration Number',data.application.number],['Application Date',data.application.date],['Admission Number',data.application.admissionNumber],['Admission Date',data.application.admissionDate],['College',data.admission.college],['Batch',data.admission.batch],['Scholarship',data.admission.scholarship],['Scholarship Type',data.admission.scholarshipType],['Hostel',data.admission.hostel],['Hostel Preference',data.admission.hostelPreference],['Room Type / Beds',data.admission.hostelRoomType],['Transportation',data.admission.transport],['Transport Route',data.admission.transportRoute]]} />
  if (tab === 'fees') return <><InfoGrid title="Fee Structure" items={[['Tuition Fee (per year)',money(data.fees.tuitionFee)],['Admission Fee (one-time)',money(data.fees.admissionFee)],['Hostel Room Type',data.admission.hostelRoomType],['Hostel Fee (per year)',data.admission.hostel === 'Yes' ? money(data.fees.hostelFee) : 'Not selected'],['Transportation Fee (per year)',data.admission.transport === 'Yes' ? money(data.fees.transportFee) : 'Not selected'],['Estimated First-Year Total',money(data.fees.totalFee)],['Estimated Entire 4-Year Total',money((Number(data.fees.tuitionFee || 0) + Number(data.fees.hostelFee || 0) + Number(data.fees.transportFee || 0)) * 4 + Number(data.fees.admissionFee || 0))],['Payment Preference',data.fees.paymentPlan],['First Term Estimate',data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.ceil(Number(data.fees.totalFee || 0) / 2)) : 'Not applicable'],['Second Term Estimate',data.fees.paymentPlan === 'Term-wise Payment' ? money(Math.floor(Number(data.fees.totalFee || 0) / 2)) : 'Not applicable']]} /><FeeSummary data={data} /></>
  if (tab === 'documents') return <DocumentDetails data={data} />
  if (tab === 'activity') return <Timeline activity={data.activity} />
  return <InfoGrid title="Application Overview" items={[['Registration Number',data.application.number],['Application Date',data.application.date],['Admission Number',data.application.admissionNumber],['Admission Date',data.application.admissionDate],['Academic Year',data.academic.academicYear],['Admission Type',data.academic.admissionType],['Course',data.academic.course],['Branch',data.academic.branch],['Fee Status',data.fees.paymentStatus],['Admission Status',STATUS[data.status]]]} />
}
function StudentHeader({ data }) {
  const normStat = normalizeStatus(data.status);
  const initials = studentName(data).split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'S';
  return (
    <div className="cm-profile-banner">
      <div className="cm-profile-avatar-wrap">
        {data.personal?.photo ? (
          <img src={data.personal.photo} alt={studentName(data)} className="cm-profile-logo" />
        ) : (
          <div className="cm-profile-placeholder">{initials}</div>
        )}
      </div>
      <div className="cm-profile-header-info">
        <div className="cm-profile-badges">
          {data.application?.number && <span className="cm-badge cm-badge-code">Reg: {data.application.number}</span>}
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
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState(null); const [loadingDetail, setLoadingDetail] = useState(true); const [tab, setTab] = useState('overview'); const [remarks, setRemarks] = useState(''); const [toast, setToast] = useState(null); const [confirmApproval, setConfirmApproval] = useState(false); const [reviewed, setReviewed] = useState(false); const [savingStatus, setSavingStatus] = useState(false)
  useEffect(() => { let active = true; studentAdmissionApi.getById(id).then(async row => {
    const admissionId = row.admissionId ?? row.id ?? id
    const studentId=idsFromApi(row,admissionId).studentId
    const optional = await Promise.allSettled([studentAcademicDetailsApi.get(admissionId), studentPreviousEducationApi.get(admissionId), studentFeeApi.getSummary(admissionId), studentAdmissionStatusApi.get(admissionId),studentId?studentParentApi.get(studentId):Promise.resolve(null),studentId?studentDocumentApi.getAll(studentId):Promise.resolve([])])
    const hydrated = admissionFromApi({ ...row, academicDetails: optional[0].status === 'fulfilled' ? optional[0].value : row.academicDetails, previousEducation: optional[1].status === 'fulfilled' ? optional[1].value : row.previousEducation, feeSummary: optional[2].status === 'fulfilled' && hasFeeSummary(optional[2].value) ? optional[2].value : row.feeSummary, status: optional[3].status === 'fulfilled' ? optional[3].value?.status ?? row.status : row.status,parents:optional[4].status==='fulfilled'&&optional[4].value?optional[4].value:row.parents,documents:optional[5].status==='fulfilled'?documentsFromApi(optional[5].value):row.documents })
    if (active) setData(hydrated)
  }).catch(error => setToast({ message: error.message || 'Unable to load admission.', tone: 'error' })).finally(() => { if (active) setLoadingDetail(false) }); return () => { active = false } }, [id])
  if (loadingDetail) return <section className="sa-empty"><FiClock /><h2>Loading admission...</h2></section>
  if (!data) return <section className="sa-empty"><FiAlertCircle /><h2>Admission not found</h2><Button onClick={() => navigate('/student-management/admissions')}>Back to Admissions</Button></section>
  const transition = async status => { if (savingStatus) return; if (['CORRECTION_REQUIRED','REJECTED'].includes(status) && !text(remarks)) { setToast({ message: 'Admission officer remarks are required for this decision.', tone: 'error' }); return } setSavingStatus(true); try { const result = await studentAdmissionStatusApi.update(id, { status, remarks }); setData(current => ({ ...current, status: normalizeStatus(result.status), remarks })); setRemarks(''); eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { admissionId: id, status }); setToast({ message: status === 'APPROVED' ? approvalNotice(result) : `${STATUS[status] || status} saved successfully`, tone: 'success' }); setConfirmApproval(false); if (status === 'APPROVED') { let studentId = idsFromApi(result).studentId ?? idsFromApi(data).studentId; if (!studentId) { try { studentId = idsFromApi(await studentAdmissionApi.getById(id)).studentId } catch { /* The profile directory remains available if the ID cannot be resolved. */ } } window.setTimeout(() => navigate(studentId ? `/student-management/profiles?studentId=${encodeURIComponent(studentId)}` : '/student-management/profiles'), 1200) } } catch (error) { setToast({ message: error.message || 'Unable to update admission status.', tone: 'error' }) } finally { setSavingStatus(false) } }
  if (approval) return <><Breadcrumb tail="Admission Review" /><button className="sa-back sa-review-back" onClick={() => navigate('/student-management/admissions')}><FiArrowLeft /> Back to Admissions</button><header className="sa-review-header"><div><span>Admission Officer Workspace</span><h1>Admission Review</h1><p>{studentName(data)} · {data.application.number} · {display(data.academic.course)} / {display(data.academic.branch)}</p></div><Badge value={data.status} /></header><Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} /><section className="sa-review-workspace"><PreviewHeader data={data} /><FullReview data={data} /></section><section className="sa-approval"><header><div><h2>Review Decision</h2><p>Complete the application review before recording a workflow decision.</p></div><Badge value={data.status} /></header><label className="sa-review-confirm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>I have reviewed all admission sections and supporting information.</span></label><label className="sa-remarks"><span>Admission Officer Remarks</span><textarea maxLength="500" value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add verification, correction or decision remarks..." /><small>{remarks.length}/500</small></label><footer>{['SUBMITTED','PENDING','UNDER_REVIEW','VERIFIED'].includes(data.status) && <Button danger disabled={!reviewed || savingStatus || !remarks.trim()} onClick={() => transition('REJECTED')}>Reject</Button>}{['SUBMITTED','PENDING','UNDER_REVIEW','VERIFIED'].includes(data.status) && <Button primary disabled={!reviewed || savingStatus} onClick={() => { setToast(null); setConfirmApproval(true) }}>Approve Admission</Button>}{data.status === 'APPROVED' && <span className="sa-approved-note"><FiCheckCircle /> Admission approved as {data.application.admissionNumber}</span>}</footer></section>{confirmApproval && <ConfirmDialog busy={savingStatus} error={toast?.tone === 'error' ? toast.message : null} title="Approve Student Admission?" confirmLabel="Approve Admission" onCancel={() => setConfirmApproval(false)} onConfirm={() => transition('APPROVED')}><p>This will mark the student admission as approved and generate an admission number.</p><dl><div><dt>Student</dt><dd>{studentName(data)}</dd></div><div><dt>Course / Branch</dt><dd>{data.academic.course} · {data.academic.branch}</dd></div><div><dt>Academic Year</dt><dd>{data.academic.academicYear}</dd></div><div><dt>Fee Status</dt><dd>{data.fees.paymentStatus}</dd></div></dl></ConfirmDialog>}</>
  return (
    <div className="cm-profile-view">
      <Breadcrumb tail="Admission Details" />
      <div className="cm-profile-top-bar">
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
