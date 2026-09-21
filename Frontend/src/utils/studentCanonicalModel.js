/**
 * Canonical Data Model & Utilities for Student Admissions and Student Profiles.
 * Single source of truth across Add, Edit, View, Review/Approval, and Profile.
 */

export const API_BASE_URL_FALLBACK = 'https://abreast-curling-tutor.ngrok-free.dev'

export const apiAssetUrl = (value) => {
  if (!value || ['string', 'null', 'undefined'].includes(String(value).trim().toLowerCase())) return ''
  const str = String(value).trim()
  if (/^(?:https?:|data:|blob:)/i.test(str)) return str
  const base = String(import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.DEV ? '' : API_BASE_URL_FALLBACK)).replace(/\/+$/, '')
  if (import.meta.env?.DEV && !base) return str.startsWith('/') ? str : `/${str}`
  return `${base}/${str.replace(/^\/+/, '')}`
}

export const firstFilled = (...values) =>
  values.find((item) => item !== null && item !== undefined && (typeof item !== 'string' || item.trim() !== ''))

// Master-data references can be returned either as a display string or as a
// nested object, depending on the endpoint. Keep table labels readable in
// both cases instead of allowing an empty/missing alias to hide the value.
export const referenceLabel = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' || typeof value === 'number') {
      if (String(value).trim()) return String(value).trim()
      continue
    }
    if (typeof value === 'object') {
      const label = firstFilled(
        value.name,
        value.collegeName,
        value.institutionName,
        value.displayName,
        value.title,
      )
      if (label !== undefined && String(label).trim()) return String(label).trim()
    }
  }
  return ''
}

export const photoStorageKey = (kind, id) => `pirnav-${kind}-photo-${id}`

export const readStoredPhoto = (kind, id) => {
  try {
    return id ? localStorage.getItem(photoStorageKey(kind, id)) || '' : ''
  } catch {
    return ''
  }
}

export const saveStoredPhoto = (kind, id, photo) => {
  try {
    if (!id) return
    if (photo) localStorage.setItem(photoStorageKey(kind, id), photo)
    else localStorage.removeItem(photoStorageKey(kind, id))
  } catch { /* storage fallback */ }
}

export const saveAdmissionPhoto = (id, photo) => {
  saveStoredPhoto('admission', id, photo)
  saveStoredPhoto('student-profile', id, photo)
}

export const readAdmissionPhoto = (id) => {
  return readStoredPhoto('admission', id) || readStoredPhoto('student-profile', id)
}

export const firstPhoto = (...values) => {
  for (const item of values) {
    if (typeof item === 'string' && item.trim()) {
      const lower = item.trim().toLowerCase()
      if (!['null', 'undefined', 'n/a', '—', '[object object]'].includes(lower)) {
        return apiAssetUrl(item.trim())
      }
    }
  }
  return ''
}

export const blankAddress = () => ({
  line1: '',
  line2: '',
  town: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
})

export const normalizeAddressObj = (addr) => {
  if (!addr) return blankAddress()
  if (typeof addr === 'string') {
    const trimmed = addr.trim()
    if (/^\s*\[object Object\]\s*$/i.test(trimmed) || ['null', 'undefined', 'n/a', '—'].includes(trimmed.toLowerCase())) return blankAddress()
    return { line1: trimmed, line2: '', town: '', city: '', district: '', state: '', country: 'India', pincode: '' }
  }
  if (typeof addr === 'object' && addr !== null) {
    const nested = [addr.currentAddress, addr.permanentAddress, addr.address, addr.value, addr.details].find((item) => item && typeof item === 'object')
    if (nested) {
      return normalizeAddressObj({
        ...nested,
        ...Object.fromEntries(Object.entries(addr).filter(([, item]) => typeof item !== 'object')),
      })
    }
    const line1 = firstFilled(addr.line1, addr.addressLine1, addr.currentAddressLine1, addr.permanentAddressLine1, addr.address, addr.street, addr.line_1, addr.address_line_1, '')
    const line2 = firstFilled(addr.line2, addr.addressLine2, addr.currentAddressLine2, addr.permanentAddressLine2, addr.landmark, addr.line_2, addr.address_line_2, '')
    const town = firstFilled(addr.town, addr.village, addr.townVillage, addr.currentTown, addr.permanentTown, addr.currentVillage, addr.permanentVillage, '')
    const city = firstFilled(addr.city, addr.currentCity, addr.permanentCity, addr.block, addr.townCity, '')
    const district = firstFilled(addr.district, addr.currentDistrict, addr.permanentDistrict, addr.dist, '')
    const state = firstFilled(addr.state, addr.currentState, addr.permanentState, '')
    const country = firstFilled(addr.country, addr.currentCountry, addr.permanentCountry, 'India')
    const pincode = firstFilled(addr.pincode, addr.currentPincode, addr.permanentPincode, addr.postalCode, addr.currentPostalCode, addr.permanentPostalCode, addr.postal_code, addr.zip, addr.zipCode, '')
    return {
      line1: String(line1 || ''),
      line2: String(line2 || ''),
      town: String(town || ''),
      city: String(city || ''),
      district: String(district || ''),
      state: String(state || ''),
      country: String(country || 'India'),
      pincode: String(pincode || ''),
    }
  }
  return blankAddress()
}

export const formatAddress = (item) => {
  if (!item) return ''
  if (typeof item === 'string') {
    const str = item.trim()
    if (/^\s*\[object Object\]\s*$/i.test(str) || ['null', 'undefined', 'n/a', '—'].includes(str.toLowerCase())) return ''
    return str
  }
  if (typeof item === 'object' && item !== null) {
    const clean = (val) => (typeof val === 'string' && !/^\s*\[object Object\]\s*$/i.test(val) && !['null', 'undefined', 'n/a', '—'].includes(val.trim().toLowerCase()) ? val.trim() : typeof val === 'number' ? String(val) : '')
    const parts = [
      item.line1,
      item.addressLine1,
      item.currentAddressLine1,
      item.permanentAddressLine1,
      item.street,
      item.line2,
      item.addressLine2,
      item.currentAddressLine2,
      item.permanentAddressLine2,
      item.town,
      item.village,
      item.currentTown,
      item.permanentTown,
      item.city,
      item.currentCity,
      item.permanentCity,
      item.district,
      item.currentDistrict,
      item.permanentDistrict,
      item.state,
      item.currentState,
      item.permanentState,
      item.country && item.country !== 'India' ? item.country : '',
      item.pincode,
      item.currentPincode,
      item.permanentPincode,
      item.postalCode,
      item.zip,
    ]
      .map(clean)
      .filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    if (item.address && typeof item.address !== 'object') return clean(item.address)
    if (item.fullAddress && typeof item.fullAddress !== 'object') return clean(item.fullAddress)
  }
  return ''
}

export const splitFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts.at(-1) : '',
  }
}

export const dateInputValue = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const dayFirst = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

export const tenDigitMobile = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

export const normalizeAdmissionStatus = (raw) => {
  const str = String(raw || 'DRAFT').trim().replaceAll(' ', '_').toUpperCase()
  if (['APPLICATION_SUBMITTED', 'SUBMITTED', 'SUBMIT'].includes(str)) return 'SUBMITTED'
  if (['UNDER_REVIEW', 'IN_REVIEW', 'REVIEWING'].includes(str)) return 'UNDER_REVIEW'
  if (['CORRECTION_REQUIRED', 'CORRECTION', 'NEEDS_CORRECTION'].includes(str)) return 'CORRECTION_REQUIRED'
  if (['VERIFIED', 'VERIFY'].includes(str)) return 'VERIFIED'
  if (['APPROVED', 'APPROVE', 'ENROLLED', 'ADMITTED'].includes(str)) return 'APPROVED'
  if (['REJECTED', 'REJECT'].includes(str)) return 'REJECTED'
  if (['DRAFT'].includes(str)) return 'DRAFT'
  return str
}

export const DOCUMENTS_CONFIG = [
  ['aadhaarCard', 'Aadhaar Card'],
  ['tenthMemo', '10th / SSC Marks Memo'],
  ['qualifyingMemo', 'Intermediate / Diploma Marks Memo'],
  ['transferCertificate', 'Transfer Certificate'],
  ['casteCertificate', 'Caste Certificate'],
  ['incomeCertificate', 'Income Certificate'],
]

export const HOSTEL_FEES = {
  'Single Room': 45000,
  'Double Sharing': 35000,
  'Triple Sharing': 28000,
  'Four Sharing': 22000,
}
export const HOSTEL_FEES_DEFAULT = HOSTEL_FEES

export const TRANSPORT_FEES = {
  'Route 1 - City Center': 12000,
  'Route 2 - North Suburbs': 15000,
  'Route 3 - South Suburbs': 15000,
  'Route 4 - East District': 18000,
  'Route 5 - West District': 18000,
}
export const TRANSPORT_FEES_DEFAULT = TRANSPORT_FEES

export const normalizeFeeSummary = (response) => {
  if (!response || typeof response !== 'object') {
    return {
      components: [],
      tuitionFee: 0,
      admissionFee: 0,
      hostelFee: 0,
      transportFee: 0,
      scholarshipAmount: 0,
      totalFee: 0,
      paymentStatus: 'Pending',
      paymentPlan: 'Full Payment',
    }
  }
  const nested = response.feeSummary ?? response.summary ?? response.feeDetails ?? response.feeStructure ?? {}
  const summary = { ...(typeof nested === 'object' ? nested : {}), ...response }
  const componentSource = summary.components ?? summary.feeComponents ?? summary.feeHeads ?? summary.feeHeadDetails ?? summary.feeStructureDetails ?? summary.feeBreakdown ?? summary.breakdown ?? summary.feeItems ?? summary.items ?? summary.fees ?? []
  const components = (Array.isArray(componentSource) ? componentSource : []).map((item) => ({ ...item, name: item.name ?? item.feeHeadName ?? item.feeName ?? item.componentName ?? item.description, amount: item.amount ?? item.feeAmount ?? item.amountPayable ?? item.totalAmount ?? item.value ?? item.fee }))
  const componentAmount = (pattern) => components.filter((item) => pattern.test(String(item.name || ''))).reduce((total, item) => total + Number(item.amount || 0), 0)
  const componentsTotal = components.reduce((total, item) => total + Number(item.amount || 0), 0)
  const tuition = Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) > 0 ? Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) : (componentAmount(/tuition|academic/i) || 0)
  const admission = Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) > 0 ? Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) : (componentAmount(/admission|registration/i) || 0)
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

export const hasFeeSummary = (response) => {
  if (!response || typeof response !== 'object') return false
  const summary = normalizeFeeSummary(response)
  const componentAmount = (summary.components || []).reduce((total, item) => total + Number(item.amount ?? item.feeAmount ?? item.value ?? 0), 0)
  const summaryAmount = [summary.tuitionFee, summary.admissionFee, summary.totalFee].reduce((total, value) => total + Number(value || 0), 0)
  return componentAmount > 0 || summaryAmount > 0
}

export const mergeFeeResponses = (summaryResponse, structureResponse) => {
  const summary = normalizeFeeSummary(summaryResponse)
  const structure = normalizeFeeSummary(structureResponse)
  const amount = (summaryValue, structureValue) => (Number(summaryValue) > 0 ? summaryValue : structureValue)
  const structureComps = Array.isArray(structure.components) ? structure.components : []
  const summaryComps = Array.isArray(summary.components) ? summary.components : []
  return normalizeFeeSummary({
    ...structure,
    ...summary,
    components: structureComps.length ? structureComps : summaryComps,
    feeComponents: structure.feeComponents?.length ? structure.feeComponents : summary.feeComponents,
    tuitionFee: amount(summary.tuitionFee, structure.tuitionFee),
    admissionFee: amount(summary.admissionFee, structure.admissionFee),
    hostelFee: amount(summary.hostelFee, structure.hostelFee),
    transportFee: amount(summary.transportFee, structure.transportFee),
    scholarshipAmount: amount(summary.scholarshipAmount, structure.scholarshipAmount),
    totalFee: amount(summary.totalFee, structure.totalFee),
  })
}

export const defaultFeeSummary = (data = {}) => {
  const fees = data.fees || {}
  const admission = data.admission || {}
  const tuition = Number(fees.tuitionFee) > 0 ? Number(fees.tuitionFee) : 50000
  const admissionFee = Number(fees.admissionFee !== undefined && fees.admissionFee !== '' ? fees.admissionFee : 4000)
  const hostelFee = admission.hostel === 'Yes' ? Number(HOSTEL_FEES[admission.hostelRoomType] || fees.hostelFee || 0) : 0
  const transportFee = admission.transport === 'Yes' ? Number(TRANSPORT_FEES[admission.transportRoute] || fees.transportFee || 0) : 0
  const scholarshipAmount = Number(fees.scholarshipAmount || 0)
  const total = Math.max(0, tuition + admissionFee + hostelFee + transportFee - scholarshipAmount)
  return {
    structureId: fees.structureId || fees.feeStructureId || 'FS-STANDARD',
    feeStructureId: fees.feeStructureId || fees.structureId || 'FS-STANDARD',
    tuitionFee: tuition,
    admissionFee: admissionFee,
    hostelFee,
    transportFee,
    scholarshipAmount,
    totalFee: total,
    paymentStatus: fees.paymentStatus || 'Pending',
    paymentPlan: fees.paymentPlan || 'Full Payment',
    components: Array.isArray(fees.components) ? fees.components : [],
    source: 'standard',
  }
}

export const resolveFeeSummary = (data = {}, summaryResponse = null, structureResponse = null) => {
  const backend = mergeFeeResponses(summaryResponse, structureResponse)
  if (hasFeeSummary(backend)) {
    return {
      ...backend,
      admissionFee: Number(backend.admissionFee) > 0 ? backend.admissionFee : (data.fees?.admissionFee || 4000),
      tuitionFee: Number(backend.tuitionFee) > 0 ? backend.tuitionFee : (data.fees?.tuitionFee || 50000),
      totalFee: Number(backend.totalFee) > 0 ? backend.totalFee : (Number(backend.tuitionFee || 50000) + Number(backend.admissionFee || 4000)),
      paymentPlan: data.fees?.paymentPlan || backend.paymentPlan || 'Full Payment',
      paymentStatus: data.fees?.paymentStatus || backend.paymentStatus || 'Pending',
      source: 'backend',
    }
  }
  return defaultFeeSummary(data)
}

export const createEmptyCanonicalStudent = () => {
  const regNumber = `REG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}`,
    admissionId: '',
    studentId: '',
    studentCode: '',
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remarks: '',
    application: {
      number: regNumber,
      registrationNumber: regNumber,
      admissionNumber: '',
      date: new Date().toISOString().slice(0, 10),
      registrationDate: new Date().toISOString().slice(0, 10),
      admissionDate: '',
    },
    personal: {
      firstName: '',
      middleName: '',
      lastName: '',
      fullName: '',
      gender: '',
      dob: '',
      bloodGroup: '',
      nationality: 'Indian',
      aadhaar: '',
      photo: '',
      photoUrl: '',
    },
    contact: {
      mobile: '',
      alternateMobile: '',
      email: '',
      alternateEmail: '',
      sameAddress: true,
      currentAddress: blankAddress(),
      permanentAddress: blankAddress(),
    },
    parents: {
      father: {
        name: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      mother: {
        name: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      guardian: {
        name: '',
        relationship: '',
        relationshipOther: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      primaryContact: 'Father',
      emergencyMobile: '',
    },
    academic: {
      academicYearId: '',
      academicYear: '',
      admissionType: '',
      quota: '',
      quotaOther: '',
      courseId: '',
      course: '',
      courseCode: '',
      departmentId: '',
      department: '',
      branchId: '',
      branch: '',
      branchCode: '',
      semesterId: '',
      semester: '',
      sectionId: '',
      section: '',
      studentCategory: '',
      regulation: '',
      entryType: '',
      yearOfStudy: '',
      rollNumber: '',
    },
    previousEducation: {
      tenth: {
        board: '',
        institution: '',
        rollNumber: '',
        passingYear: '',
        scoreType: 'Percentage',
        score: '',
      },
      intermediate: {
        qualification: 'Intermediate / 12th',
        board: '',
        institution: '',
        rollNumber: '',
        passingYear: '',
        stream: '',
        streamOther: '',
        scoreType: 'Percentage',
        score: '',
      },
    },
    admission: {
      collegeId: '',
      college: '',
      batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
      scholarship: 'No',
      scholarshipType: '',
      hostel: 'No',
      hostelPreference: '',
      hostelRoomType: '',
      transport: 'No',
      transportRoute: '',
    },
    fees: {
      structureId: 'FS-STANDARD',
      feeStructureId: 'FS-STANDARD',
      tuitionFee: '50000',
      admissionFee: '4000',
      scholarshipAmount: '',
      hostelFee: '',
      transportFee: '',
      totalFee: '54000',
      paymentStatus: 'Pending',
      paymentPlan: 'Full Payment',
      components: [],
    },
    documents: {
      ...Object.fromEntries(DOCUMENTS_CONFIG.map(([key]) => [key, null])),
      otherCertificates: [],
    },
    activity: [{ label: 'Application created', date: new Date().toISOString() }],
  }
}

export const normalizeCanonicalStudent = (source = {}) => {
  if (!source || typeof source !== 'object') return createEmptyCanonicalStudent()
  const base = createEmptyCanonicalStudent()

  const raw = source.data && typeof source.data === 'object' && !Array.isArray(source.data) ? { ...source, ...source.data } : source
  const header = raw.header ?? {}
  const summary = raw.summary ?? {}
  const personalRaw = raw.personalInformation ?? raw.personal ?? {}
  const contactRaw = raw.contactInformation ?? raw.contact ?? {}
  const parentRaw = raw.parentGuardianInformation ?? raw.parentDetails ?? raw.parents ?? {}
  const academicRaw = raw.academicInformation ?? raw.academicDetails ?? raw.academic ?? {}
  const previousRaw = raw.previousEducationDetails ?? raw.previousEducation ?? {}
  const admissionRaw = raw.admissionDetails ?? raw.admission ?? {}
  const feeRaw = raw.feeSummary ?? raw.feeDetails ?? raw.fees ?? {}

  const admissionId = String(firstFilled(raw.admissionId, raw.studentAdmissionId, raw.application?.admissionId, admissionRaw.admissionId, raw.id, base.id))
  const studentId = String(firstFilled(raw.studentId, raw.student?.studentId, raw.student?.id, header.studentId, personalRaw.studentId, ''))
  const status = normalizeAdmissionStatus(firstFilled(raw.status, raw.admissionStatus, raw.applicationStatus, raw.currentStatus, header.status, summary.studentStatus, 'DRAFT'))

  // Names
  const parsedName = splitFullName(firstFilled(raw.studentName, raw.fullName, personalRaw.fullName, header.studentName, ''))
  const firstName = firstFilled(personalRaw.firstName, raw.firstName, parsedName.firstName) ?? ''
  const middleName = firstFilled(personalRaw.middleName, raw.middleName, parsedName.middleName) ?? ''
  const lastName = firstFilled(personalRaw.lastName, raw.lastName, parsedName.lastName) ?? ''
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || firstFilled(personalRaw.fullName, raw.fullName, raw.studentName, '')

  // Photo resolution
  const photo = firstPhoto(
    raw.profilePhoto,
    raw.profilePhotoUrl,
    raw.photo,
    raw.photoUrl,
    raw.studentPhoto,
    header.profilePhoto,
    header.photo,
    personalRaw.profilePhoto,
    personalRaw.photo,
    personalRaw.photoUrl,
    personalRaw.profilePhotoUrl,
  )

  // Address
  const flatCurrent = {
    line1: firstFilled(raw.currentAddressLine1, raw.addressLine1, raw.currentAddress?.line1, contactRaw.currentAddress?.line1, raw.address, personalRaw.address, contactRaw.address, raw.currentAddress),
    line2: firstFilled(raw.currentAddressLine2, raw.addressLine2, raw.currentAddress?.line2, contactRaw.currentAddress?.line2, raw.landmark, raw.currentLandmark),
    town: firstFilled(raw.currentTown, raw.currentVillage, raw.town, raw.village, raw.townVillage, raw.currentAddress?.town, contactRaw.currentAddress?.town),
    city: firstFilled(raw.currentCity, raw.city, personalRaw.city, contactRaw.city, raw.currentAddress?.city, contactRaw.currentAddress?.city),
    district: firstFilled(raw.currentDistrict, raw.district, personalRaw.district, contactRaw.district, raw.currentAddress?.district, contactRaw.currentAddress?.district),
    state: firstFilled(raw.currentState, raw.state, personalRaw.state, contactRaw.state, raw.currentAddress?.state, contactRaw.currentAddress?.state),
    country: firstFilled(raw.currentCountry, raw.country, personalRaw.country, contactRaw.country, raw.currentAddress?.country, contactRaw.currentAddress?.country, 'India'),
    pincode: firstFilled(raw.currentPincode, raw.currentPostalCode, raw.pincode, raw.postalCode, raw.zip, personalRaw.pincode, contactRaw.pincode, raw.currentAddress?.pincode, contactRaw.currentAddress?.pincode),
  }
  const flatPermanent = {
    line1: firstFilled(raw.permanentAddressLine1, raw.permanentAddress?.line1, contactRaw.permanentAddress?.line1, raw.permanentAddress, personalRaw.permanentAddress, contactRaw.permanentAddress),
    line2: firstFilled(raw.permanentAddressLine2, raw.permanentAddress?.line2, contactRaw.permanentAddress?.line2, raw.permanentLandmark),
    town: firstFilled(raw.permanentTown, raw.permanentVillage, raw.permanentTownVillage, raw.permanentAddress?.town, contactRaw.permanentAddress?.town),
    city: firstFilled(raw.permanentCity, raw.permanentAddressCity, raw.permanentAddress?.city, contactRaw.permanentAddress?.city),
    district: firstFilled(raw.permanentDistrict, raw.permanentAddressDistrict, raw.permanentAddress?.district, contactRaw.permanentAddress?.district),
    state: firstFilled(raw.permanentState, raw.permanentAddressState, raw.permanentAddress?.state, contactRaw.permanentAddress?.state),
    country: firstFilled(raw.permanentCountry, raw.permanentAddressCountry, raw.permanentAddress?.country, contactRaw.permanentAddress?.country, 'India'),
    pincode: firstFilled(raw.permanentPincode, raw.permanentPostalCode, raw.permanentZip, raw.permanentAddress?.pincode, contactRaw.permanentAddress?.pincode),
  }

  const currentAddressCandidate = [contactRaw.currentAddress, raw.currentAddress, personalRaw.currentAddress, personalRaw.address, raw.address, flatCurrent].find((addr) => formatAddress(normalizeAddressObj(addr)))
  const currentAddress = normalizeAddressObj(currentAddressCandidate || flatCurrent || base.contact.currentAddress)

  const permanentAddressCandidate = [contactRaw.permanentAddress, raw.permanentAddress, personalRaw.permanentAddress, flatPermanent].find((addr) => formatAddress(normalizeAddressObj(addr)))
  const permanentAddress = normalizeAddressObj(permanentAddressCandidate || flatPermanent)

  const hasPerm = Boolean(formatAddress(permanentAddress))
  const sameAddress = contactRaw.sameAddress !== undefined ? Boolean(contactRaw.sameAddress) : raw.sameAddress !== undefined ? Boolean(raw.sameAddress) : !hasPerm

  // Dates & Registration Numbers
  const regNumber = firstFilled(raw.registrationNumber, raw.application?.registrationNumber, raw.application?.number, summary.registrationNumber, academicRaw.registrationNumber, raw.number, base.application.number)
  // Profile and admission endpoints use different DTOs for this value.  Read
  // all supported aliases so the directory never loses an admission number
  // that is already stored on the approved admission.
  const admNumber = firstFilled(
    raw.admissionNumber,
    raw.admissionNo,
    raw.studentAdmissionNumber,
    raw.applicationNumber,
    raw.application?.admissionNumber,
    raw.application?.admissionNo,
    raw.application?.applicationNumber,
    raw.application?.number,
    admissionRaw.admissionNumber,
    admissionRaw.admissionNo,
    admissionRaw.studentAdmissionNumber,
    admissionRaw.applicationNumber,
    admissionRaw.number,
    summary.admissionNumber,
    summary.admissionNo,
    summary.studentAdmissionNumber,
    ''
  )
  const regDate = dateInputValue(firstFilled(raw.registrationDate, raw.applicationDate, raw.application?.date, summary.registrationDate, base.application.date))
  const admDate = dateInputValue(firstFilled(raw.admissionDate, raw.application?.admissionDate, summary.admissionDate, ''))

  // Parents
  const fatherRaw = parentRaw.father ?? {}
  const motherRaw = parentRaw.mother ?? {}
  const guardianRaw = parentRaw.guardian ?? {}

  const father = {
    name: firstFilled(raw.fatherName, parentRaw.fatherName, fatherRaw.name, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.parentMobile, raw.fatherMobile, parentRaw.fatherMobile, parentRaw.parentMobile, fatherRaw.mobile, '')),
    email: firstFilled(raw.fatherEmail, parentRaw.fatherEmail, parentRaw.email, fatherRaw.email, '') ?? '',
    occupation: firstFilled(raw.fatherOccupation, raw.occupation, parentRaw.fatherOccupation, parentRaw.occupation, fatherRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.fatherQualification, parentRaw.fatherQualification, fatherRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.fatherIncome, raw.annualIncome, parentRaw.fatherIncome, parentRaw.annualIncome, fatherRaw.income, '') ?? ''),
  }

  const mother = {
    name: firstFilled(raw.motherName, parentRaw.motherName, motherRaw.name, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.motherMobile, parentRaw.motherMobile, motherRaw.mobile, '')),
    email: firstFilled(raw.motherEmail, parentRaw.motherEmail, motherRaw.email, '') ?? '',
    occupation: firstFilled(raw.motherOccupation, parentRaw.motherOccupation, motherRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.motherQualification, parentRaw.motherQualification, motherRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.motherIncome, parentRaw.motherIncome, motherRaw.income, '') ?? ''),
  }

  const guardian = {
    name: firstFilled(raw.guardianName, parentRaw.guardianName, guardianRaw.name, '') ?? '',
    relationship: firstFilled(raw.guardianRelationship, parentRaw.guardianRelationship, guardianRaw.relationship, '') ?? '',
    relationshipOther: firstFilled(raw.guardianRelationshipOther, parentRaw.guardianRelationshipOther, guardianRaw.relationshipOther, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.guardianMobile, parentRaw.guardianMobile, guardianRaw.mobile, '')),
    email: firstFilled(raw.guardianEmail, parentRaw.guardianEmail, guardianRaw.email, '') ?? '',
    occupation: firstFilled(raw.guardianOccupation, parentRaw.guardianOccupation, guardianRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.guardianQualification, parentRaw.guardianQualification, guardianRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.guardianIncome, parentRaw.guardianIncome, guardianRaw.income, '') ?? ''),
  }

  // Previous Education
  const tenthRaw = previousRaw.tenth || previousRaw.ssc || previousRaw.tenthDetails || {}
  const interRaw = previousRaw.intermediate || previousRaw.qualifyingEducation || previousRaw.intermediateDetails || previousRaw.diploma || {}

  const tenth = {
    board: firstFilled(tenthRaw.board, raw.tenthBoard, '') ?? '',
    institution: firstFilled(tenthRaw.institution, tenthRaw.schoolName, raw.tenthInstitution, '') ?? '',
    rollNumber: firstFilled(tenthRaw.rollNumber, tenthRaw.hallTicket, '') ?? '',
    passingYear: String(firstFilled(tenthRaw.passingYear, tenthRaw.yearOfPassing, '') ?? ''),
    scoreType: firstFilled(tenthRaw.scoreType, 'Percentage') ?? 'Percentage',
    score: tenthRaw.score !== undefined && tenthRaw.score !== null && tenthRaw.score !== '' ? tenthRaw.score : '',
  }

  const intermediate = {
    qualification: firstFilled(interRaw.qualification, interRaw.educationLevel, 'Intermediate / 12th') ?? 'Intermediate / 12th',
    board: firstFilled(interRaw.board, interRaw.university, '') ?? '',
    institution: firstFilled(interRaw.institution, interRaw.collegeName, '') ?? '',
    rollNumber: firstFilled(interRaw.rollNumber, interRaw.hallTicket, '') ?? '',
    passingYear: String(firstFilled(interRaw.passingYear, interRaw.yearOfPassing, '') ?? ''),
    stream: firstFilled(interRaw.stream, '') ?? '',
    streamOther: firstFilled(interRaw.streamOther, '') ?? '',
    scoreType: firstFilled(interRaw.scoreType, 'Percentage') ?? 'Percentage',
    score: interRaw.score !== undefined && interRaw.score !== null && interRaw.score !== '' ? interRaw.score : '',
  }

  // Admission / Services
  const hostelVal = raw.hostel === true || raw.hostel === 'Yes' || admissionRaw.hostel === true || admissionRaw.hostel === 'Yes' ? 'Yes' : (raw.hostel === false || raw.hostel === 'No' || admissionRaw.hostel === 'No' ? 'No' : (admissionRaw.hostel || ''))
  const transportVal = raw.transport === true || raw.transport === 'Yes' || admissionRaw.transport === true || admissionRaw.transport === 'Yes' ? 'Yes' : (raw.transport === false || raw.transport === 'No' || admissionRaw.transport === 'No' ? 'No' : (admissionRaw.transport || ''))
  const scholarshipVal = raw.scholarship === true || raw.scholarship === 'Yes' || admissionRaw.scholarship === true || admissionRaw.scholarship === 'Yes' ? 'Yes' : (raw.scholarship === false || raw.scholarship === 'No' || admissionRaw.scholarship === 'No' ? 'No' : (admissionRaw.scholarship || ''))

  // Fees
  const tuitionFee = firstFilled(feeRaw.tuitionFee, feeRaw.tuitionAmount, feeRaw.academicFee, raw.tuitionFee, '')
  const admissionFee = firstFilled(feeRaw.admissionFee, feeRaw.admissionAmount, feeRaw.registrationFee, feeRaw.oneTimeFee, raw.admissionFee, '')
  const scholarshipAmount = firstFilled(feeRaw.scholarshipAmount, feeRaw.discountAmount, feeRaw.concessionAmount, raw.scholarshipAmount, '')
  const hostelFee = firstFilled(feeRaw.hostelFee, feeRaw.hostelAmount, raw.hostelFee, '')
  const transportFee = firstFilled(feeRaw.transportFee, feeRaw.transportationFee, feeRaw.transportAmount, raw.transportFee, '')
  const totalFee = firstFilled(feeRaw.firstYearTotal, feeRaw.totalFee, feeRaw.totalAmount, feeRaw.grandTotal, feeRaw.netPayable, raw.totalFee, '')
  const paymentPlan = firstFilled(feeRaw.paymentPlan, raw.paymentPlan, 'Full Payment')
  const paymentStatus = firstFilled(feeRaw.paymentStatus, raw.paymentStatus, 'Pending')
  const feeStructureId = firstFilled(feeRaw.feeStructureId, feeRaw.structureId, raw.feeStructureId, 'FS-STANDARD')

  // Documents
  const rawDocs = raw.documents || {}
  const docStatuses = raw.documentStatuses || {}
  const mappedDocs = { ...base.documents }
  DOCUMENTS_CONFIG.forEach(([key]) => {
    if (rawDocs[key]) mappedDocs[key] = typeof rawDocs[key] === 'object' ? { ...rawDocs[key] } : { status: rawDocs[key] }
    else if (docStatuses[key]) mappedDocs[key] = { status: docStatuses[key] }
  })
  if (Array.isArray(rawDocs.otherCertificates)) mappedDocs.otherCertificates = [...rawDocs.otherCertificates]

  return {
    ...raw,
    id: studentId || admissionId,
    admissionId,
    studentId,
    studentCode: raw.studentCode ?? '',
    status,
    createdAt: raw.createdAt ?? raw.createdDate ?? base.createdAt,
    updatedAt: raw.updatedAt ?? raw.updatedDate ?? base.updatedAt,
    remarks: raw.remarks ?? raw.reviewRemarks ?? raw.officerRemarks ?? '',
    application: {
      number: regNumber,
      registrationNumber: regNumber,
      admissionNumber: admNumber,
      date: regDate,
      registrationDate: regDate,
      admissionDate: admDate,
    },
    personal: {
      firstName,
      middleName,
      lastName,
      fullName,
      gender: firstFilled(personalRaw.gender, raw.gender, '') ?? '',
      dob: dateInputValue(firstFilled(personalRaw.dob, personalRaw.dateOfBirth, raw.dob, raw.dateOfBirth, '')),
      bloodGroup: firstFilled(personalRaw.bloodGroup, raw.bloodGroup, '') ?? '',
      nationality: firstFilled(personalRaw.nationality, raw.nationality, 'Indian') ?? 'Indian',
      aadhaar: firstFilled(personalRaw.aadhaar, personalRaw.aadhaarNumber, raw.aadhaar, raw.aadhaarNumber, '') ?? '',
      photo,
      photoUrl: photo,
    },
    contact: {
      mobile: tenDigitMobile(firstFilled(contactRaw.mobile, contactRaw.studentMobile, raw.mobile, raw.studentMobile, personalRaw.mobile, personalRaw.studentMobile, '')),
      alternateMobile: tenDigitMobile(firstFilled(contactRaw.alternateMobile, raw.alternateMobile, '')),
      email: firstFilled(contactRaw.email, contactRaw.studentEmail, raw.email, raw.studentEmail, personalRaw.email, personalRaw.studentEmail, '') ?? '',
      alternateEmail: firstFilled(contactRaw.alternateEmail, raw.alternateEmail, '') ?? '',
      sameAddress,
      currentAddress,
      permanentAddress: hasPerm ? permanentAddress : sameAddress ? { ...currentAddress } : blankAddress(),
    },
    parents: {
      father,
      mother,
      guardian,
      primaryContact: firstFilled(parentRaw.primaryContact, raw.primaryContact, 'Father'),
      emergencyMobile: tenDigitMobile(firstFilled(parentRaw.emergencyMobile, parentRaw.emergencyContact, raw.emergencyMobile, raw.emergencyContact, '')),
    },
    academic: {
      academicYearId: firstFilled(academicRaw.academicYearId, raw.academicYearId, ''),
      academicYear: firstFilled(academicRaw.academicYear, academicRaw.academicYearName, raw.academicYear, raw.academicYearName, '') ?? '',
      admissionType: firstFilled(academicRaw.admissionType, raw.admissionType, '') ?? '',
      quota: firstFilled(academicRaw.quota, raw.quota, '') ?? '',
      quotaOther: firstFilled(academicRaw.quotaOther, raw.quotaOther, '') ?? '',
      courseId: firstFilled(academicRaw.courseId, raw.courseId, ''),
      course: referenceLabel(academicRaw.course, academicRaw.courseName, raw.course, raw.courseName),
      courseCode: firstFilled(
        academicRaw.courseCode,
        academicRaw.course?.code,
        academicRaw.course?.courseCode,
        raw.courseCode,
        raw.course?.code,
        raw.course?.courseCode,
        ''
      ) ?? '',
      departmentId: firstFilled(academicRaw.departmentId, raw.departmentId, ''),
      // Some profile responses only carry the department as part of the
      // selected branch/course master. Resolve those nested references for
      // the directory's Academic details line as well.
      department: referenceLabel(
        academicRaw.department,
        academicRaw.departmentName,
        academicRaw.branch?.department,
        academicRaw.branch?.departmentName,
        academicRaw.course?.department,
        academicRaw.course?.departmentName,
        raw.department,
        raw.departmentName,
        raw.branch?.department,
        raw.branch?.departmentName,
        raw.course?.department,
        raw.course?.departmentName,
        // The admission form's branch is scoped to a department. Older
        // records persisted only that branch label, so use it as the final
        // readable fallback rather than rendering "Not provided".
        academicRaw.branch,
        academicRaw.branchName,
        raw.branch,
        raw.branchName,
      ),
      branchId: firstFilled(academicRaw.branchId, raw.branchId, ''),
      branch: referenceLabel(academicRaw.branch, academicRaw.branchName, raw.branch, raw.branchName),
      branchCode: firstFilled(
        academicRaw.branchCode,
        academicRaw.branch?.code,
        academicRaw.branch?.branchCode,
        raw.branchCode,
        raw.branch?.code,
        raw.branch?.branchCode,
        ''
      ) ?? '',
      semesterId: firstFilled(academicRaw.semesterId, raw.semesterId, ''),
      semester: firstFilled(academicRaw.semester, academicRaw.semesterName, raw.semester, raw.semesterName, '') ?? '',
      sectionId: firstFilled(academicRaw.sectionId, raw.sectionId, ''),
      section: firstFilled(academicRaw.section, academicRaw.sectionName, raw.section, raw.sectionName, '') ?? '',
      studentCategory: firstFilled(academicRaw.studentCategory, raw.studentCategory, '') ?? '',
      regulation: firstFilled(academicRaw.regulation, raw.regulation, '') ?? '',
      entryType: firstFilled(academicRaw.entryType, raw.entryType, '') ?? '',
      yearOfStudy: firstFilled(academicRaw.yearOfStudy, raw.yearOfStudy, '') ?? '',
      rollNumber: firstFilled(academicRaw.rollNumber, raw.rollNumber, '') ?? '',
    },
    previousEducation: {
      tenth,
      intermediate,
    },
    admission: {
      collegeId: firstFilled(admissionRaw.collegeId, admissionRaw.college?.collegeId, admissionRaw.college?.id, raw.collegeId, raw.college?.collegeId, raw.college?.id, ''),
      college: referenceLabel(admissionRaw.college, admissionRaw.collegeName, admissionRaw.institutionName, raw.college, raw.collegeName, raw.institutionName, raw.collegeDetails, raw.institution),
      batch: firstFilled(admissionRaw.batch, raw.batch, base.admission.batch) ?? base.admission.batch,
      scholarship: scholarshipVal || 'No',
      scholarshipType: firstFilled(admissionRaw.scholarshipType, raw.scholarshipType, '') ?? '',
      hostel: hostelVal || 'No',
      hostelPreference: firstFilled(admissionRaw.hostelPreference, raw.hostelPreference, '') ?? '',
      hostelRoomType: firstFilled(admissionRaw.hostelRoomType, raw.hostelRoomType, '') ?? '',
      transport: transportVal || 'No',
      transportRoute: firstFilled(admissionRaw.transportRoute, raw.transportRoute, '') ?? '',
    },
    fees: (() => {
      const resolved = resolveFeeSummary(
        {
          admission: {
            hostel: hostelVal,
            hostelRoomType: firstFilled(admissionRaw.hostelRoomType, raw.hostelRoomType, ''),
            transport: transportVal,
            transportRoute: firstFilled(admissionRaw.transportRoute, raw.transportRoute, ''),
          },
          fees: {
            structureId: feeStructureId,
            feeStructureId,
            tuitionFee,
            admissionFee,
            scholarshipAmount,
            hostelFee,
            transportFee,
            totalFee,
            paymentPlan,
            paymentStatus,
            components: Array.isArray(feeRaw.components) ? feeRaw.components : [],
          },
        },
        feeRaw,
        raw.feeStructure
      );
      return {
        structureId: resolved.structureId || feeStructureId || 'FS-STANDARD',
        feeStructureId: resolved.feeStructureId || feeStructureId || 'FS-STANDARD',
        tuitionFee: String(resolved.tuitionFee || '50000'),
        admissionFee: String(resolved.admissionFee || '4000'),
        scholarshipAmount: String(resolved.scholarshipAmount || ''),
        hostelFee: String(resolved.hostelFee || ''),
        transportFee: String(resolved.transportFee || ''),
        totalFee: String(resolved.totalFee || '54000'),
        paymentPlan: resolved.paymentPlan || 'Full Payment',
        paymentStatus: resolved.paymentStatus || 'Pending',
        components: Array.isArray(resolved.components) ? resolved.components : [],
      };
    })(),
    documents: mappedDocs,
    activity: Array.isArray(raw.activity) && raw.activity.length ? raw.activity : base.activity,
  }
}

/**
 * Display formatters
 */
export const studentFullName = (student) => {
  if (!student) return ''
  const p = student.personal || {}
  const nameParts = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  return nameParts || p.fullName || student.studentName || student.fullName || ''
}

export const studentInitials = (student) => {
  const name = studentFullName(student)
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'S'
}

export const studentQuotaDisplay = (student) => {
  const a = student?.academic || {}
  if (a.quota === 'Other' && a.quotaOther) return a.quotaOther
  return a.quota || '—'
}

export const formatDisplay = (value) => {
  if (value === null || value === undefined || String(value).trim() === '' || String(value).trim() === '—') return 'Not provided'
  return String(value).trim()
}

export const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/**
 * Required fields metadata for single source of truth
 */
export const REQUIRED_FIELDS = [
  'personal.firstName',
  'personal.lastName',
  'personal.gender',
  'personal.dob',
  'personal.aadhaar',
  'contact.mobile',
  'contact.email',
  'contact.currentAddress.line1',
  'contact.currentAddress.town',
  'contact.currentAddress.city',
  'contact.currentAddress.district',
  'contact.currentAddress.state',
  'contact.currentAddress.pincode',
  'academic.academicYear',
  'academic.admissionType',
  'academic.course',
  'academic.branch',
  'admission.collegeId',
]

