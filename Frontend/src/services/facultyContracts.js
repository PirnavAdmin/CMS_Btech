// A stable UI identifier, derived from the faculty primary key, not a FAC sequence.
// Never send this display code back as an API identifier.
export const facultyEmployeeCode = facultyId => {
  const id = String(facultyId ?? '').trim()
  const suffix = /^[1-9]\d*$/.test(id) ? `EMP${id.padStart(6, '0')}`
    : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? `EMP-${id.toUpperCase()}` : ''
  return suffix
}

// Payloads follow the Faculty Swagger DTOs; UI labels never substitute for IDs.
// Never substitute a display label (or a made-up value) for an API foreign
// key. Swagger accepts numeric IDs for these fields; sending `NaN`, a label,
// or the old fallback value of `1` creates allocations against the wrong
// master record.
const optionalNumber = value => {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}
export const requiredNumber = (value, label) => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} is required. Select a valid record.`)
  return number
}
export const facultyCreatePayload = value => {
  const payload = {
    employeeProfileId: optionalNumber(value.employeeProfileId),
    collegeId: requiredNumber(value.collegeId, 'College'),
    departmentId: requiredNumber(value.departmentId, 'Department'),
    // Compatibility with the deployed API: FacultyCode is still required.
    // This hidden reference is not the employee ID or a browser-side sequence.
    facultyCode: crypto.randomUUID().replaceAll('-', ''),
    facultyName: (value.fullName || value.facultyName || '').trim(),
    designation: value.designation || null,
    qualification: value.qualification || null,
    specialization: value.specialization || null,
    experienceYears: Number(value.experience) || 0,
    employmentType: value.employmentType,
    dateOfJoining: value.joiningDate || null,
    officialEmail: (value.email || value.officialEmail || '').trim(),
    mobile: (value.mobile || '').trim(),
    isHod: Number(value.isHod) || 0,
    status: typeof value.status === 'number' ? value.status : 1,
  }
  const uid = optionalNumber(value.userId)
  if (uid) payload.userId = uid
  return payload
}
export const facultyUpdatePayload = value => {
  const [firstName, ...lastName] = (value.fullName || value.facultyName || '').trim().split(/\s+/)
  const deptId = optionalNumber(value.departmentId) || (Number.isSafeInteger(Number(value.departmentId)) && Number(value.departmentId) > 0 ? Number(value.departmentId) : null)
  const colId = optionalNumber(value.collegeId) || (Number.isSafeInteger(Number(value.collegeId)) && Number(value.collegeId) > 0 ? Number(value.collegeId) : null)
  const empProfileId = optionalNumber(value.employeeProfileId)
  const uid = optionalNumber(value.userId)

  const payload = {
    collegeId: colId,
    departmentId: deptId || requiredNumber(value.departmentId, 'Department'),
    facultyName: (value.fullName || value.facultyName || '').trim(),
    fullName: (value.fullName || value.facultyName || '').trim(),
    firstName,
    lastName: lastName.join(' '),
    officialEmail: (value.email || value.officialEmail || '').trim(),
    email: (value.email || value.officialEmail || '').trim(),
    mobile: (value.mobile || value.phoneNumber || '').trim(),
    phoneNumber: (value.mobile || value.phoneNumber || '').trim(),
    designation: value.designation || null,
    qualification: value.qualification || null,
    specialization: value.specialization || null,
    experienceYears: Number(value.experience) || 0,
    employmentType: value.employmentType || null,
    dateOfJoining: value.joiningDate || null,
    isHod: Number(value.isHod) || 0,
    status: typeof value.status === 'number' ? value.status : (value.employmentStatus === 'Inactive' ? 0 : 1),
  }
  if (uid) payload.userId = uid
  if (empProfileId) payload.employeeProfileId = empProfileId

  return payload
}
export const facultyProfilePayload = value => ({
  dateOfBirth: value.dob || null, gender: value.gender || null,
  houseNumber: value.houseNumber || null, address: value.address || null, pincode: value.pincode || null,
  city: value.city || null, district: value.district || null, state: value.state || null, country: value.country || null,
  permanentHouseNumber: value.permanentHouseNumber || null, permanentAddress: value.permanentAddress || null,
  permanentPincode: value.permanentPincode || null, permanentCity: value.permanentCity || null,
  permanentDistrict: value.permanentDistrict || null, permanentState: value.permanentState || null,
  permanentCountry: value.permanentCountry || null, aboutMe: value.aboutMe || null,
  emergencyContactName: value.emergencyName || null, emergencyContactNumber: value.emergencyMobile || null,
  emergencyContactRelation: value.relationship || null, status: typeof value.profileStatus === 'number' ? value.profileStatus : 1,
})
export const normalizeAllocation = row => {
  const r = row || {}
  return {
    ...r,
    id: String(r.allocationId ?? r.facultySubjectAllocationId ?? r.id ?? ''),
    facultyId: String(r.facultyId ?? r.employeeProfileId ?? ''),
    academicYear: r.academicYearName ?? r.academicYear ?? '',
    course: r.courseName ?? r.course ?? '',
    branch: r.branchName ?? r.branch ?? '',
    semester: r.semesterName ?? r.semester ?? '',
    section: r.sectionName ?? r.section ?? '',
    subjectCode: r.subjectCode ?? r.code ?? '',
    subjectName: r.subjectName ?? r.name ?? r.subject ?? '',
    assignmentType: r.allocationType ?? r.assignmentType ?? 'Subject Faculty',
    weeklyHours: r.periodsPerWeek ?? r.weeklyHours ?? 0,
    remarks: r.remarks ?? '',
  }
}
export const allocationPayload = (row, updating = false) => {
  const facultyId = requiredNumber(row.facultyId, 'Faculty')
  const courseId = requiredNumber(row.courseId, 'Course')
  const branchId = requiredNumber(row.branchId, 'Branch')
  const semesterId = requiredNumber(row.semesterId, 'Semester')
  return {
    facultyId,
    courseId,
    branchId,
    semesterId,
    sectionId: optionalNumber(row.sectionId),
    subjectId: optionalNumber(row.subjectId),
    academicYearId: optionalNumber(row.academicYearId),
    allocationType: row.assignmentType || row.allocationType || 'Subject Faculty',
    isPrimaryFaculty: Boolean(row.isPrimaryFaculty),
    remarks: row.remarks || null,
    ...(updating ? { periodsPerWeek: Number(row.weeklyHours) || 0, status: row.status !== false } : {}),
  }
}
export const attendanceTime = (date, value) => !value || value === '—' ? null : value.includes('T') ? value : `${date}T${value.length === 5 ? `${value}:00` : value}`
export const attendancePayload = row => ({ attendanceDate: row.date, status: row.status, checkIn: attendanceTime(row.date, row.checkIn), checkOut: attendanceTime(row.date, row.checkOut), remarks: row.remarks || null })
const leaveStatus = (value, fallback = '') => {
  if (value === true || value === 1) return 'Active'
  if (value === false || value === 0) return 'Inactive'
  const text = String(value ?? '').trim()
  return ({ active: 'Active', inactive: 'Inactive', draft: 'Draft', expired: 'Expired', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', canceled: 'Cancelled' })[text.toLowerCase()] || text || fallback
}
export const normalizeLeaveType = row => ({ ...row, id: String(row.id ?? row.leaveTypeId ?? ''), name: row.name ?? row.leaveTypeName ?? '', code: row.code ?? row.leaveCode ?? row.leaveTypeCode ?? '', status: leaveStatus(row.status ?? row.isActive, 'Active'), payCategory: row.payCategory ?? row.payType ?? (row.isPaid === true ? 'Paid Leave' : row.isPaid === false ? 'Unpaid Leave' : '') })
const policyEntitlements = row => {
  // Some policy list DTOs name the child collection after the relationship.
  const candidates = [row.entitlements, row.policyEntitlements, row.leaveTypes]
  return candidates.find(value => Array.isArray(value) && value.length) ?? []
}
const optionalLeaveDays = value => {
  if (value === '' || value == null) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new Error('Leave days must be a non-negative number.')
  return number
}
export const normalizeLeavePolicy = row => ({ ...row, id: String(row.policyId ?? row.id ?? ''), name: row.name ?? row.policyName ?? '', academicYear: row.academicYearName ?? row.academicYear ?? '', status: leaveStatus(row.status ?? row.isActive), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), entitlements: policyEntitlements(row).map(rule => ({ ...rule, typeId: String(rule.leaveTypeId ?? rule.typeId ?? rule.leaveType?.id ?? ''), name: rule.leaveTypeName ?? rule.name ?? rule.leaveType?.name ?? '', code: rule.leaveTypeCode ?? rule.code ?? rule.leaveType?.code ?? '', payCategory: rule.payCategory ?? rule.leaveType?.payCategory ?? '' })) })
export const normalizeLeaveRequest = row => ({ ...row, id: String(row.leaveRequestId ?? row.requestId ?? row.id ?? ''), status: leaveStatus(row.statusName ?? row.requestStatus ?? row.status), facultyId: String(row.facultyId ?? row.employeeProfileId ?? row.facultyProfileId ?? row.employee?.facultyId ?? row.employee?.employeeProfileId ?? row.employee?.id ?? row.faculty?.facultyId ?? row.faculty?.employeeProfileId ?? row.faculty?.id ?? ''), policyId: String(row.policyId ?? ''), typeId: String(row.leaveTypeId ?? row.typeId ?? ''), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), applied: row.appliedOn ?? row.appliedDate ?? row.applied ?? row.createdAt, days: row.days == null && row.totalDays == null ? null : Number(row.days ?? row.totalDays) })
export const leavePolicyPayload = row => ({ name: row.name.trim(), academicYear: row.academicYear, applicableTo: row.applicableTo, fromDate: row.from, toDate: row.to, entitlements: row.entitlements.map(rule => ({ leaveTypeId: rule.typeId, entitlement: optionalLeaveDays(rule.entitlement), maxDays: optionalLeaveDays(rule.maxDays), carryForward: Boolean(rule.carryForward), maxCarryForward: optionalLeaveDays(rule.maxCarryForward), documentRequired: Boolean(rule.documentRequired) })) })
const calculateFacultySalary = (row, designation, type) => {
  const isNonTeaching = String(type || '').toLowerCase().includes('non-teaching');
  const desig = String(designation || '').toLowerCase();
  if (isNonTeaching) return { gross: 35000, deductions: 3500 };
  if (desig.includes('hod') || desig.includes('head') || (desig.includes('professor') && !desig.includes('assistant') && !desig.includes('associate'))) {
    return { gross: 120000, deductions: 12000 };
  }
  if (desig.includes('associate')) {
    return { gross: 85000, deductions: 8500 };
  }
  if (desig.includes('assistant') || desig.includes('senior')) {
    return { gross: 65000, deductions: 6500 };
  }
  return { gross: 50000, deductions: 5000 };
};

export const normalizePayroll = row => {
  const id = String(row.payrollId ?? row.id ?? '');
  const facultyId = row.facultyId ?? row.faculty?.facultyId ?? row.faculty?.id;
  const directEmployeeId = row.employeeId ?? row.employeeCode ?? '';
  const employeeId = facultyEmployeeCode(facultyId) || (directEmployeeId ? String(directEmployeeId) : '');
  const fullName = row.fullName ?? row.facultyName ?? row.employeeName ?? '';
  const designation = row.designation ?? row.designationName ?? row.role ?? '';
  const type = row.facultyType ?? row.employeeCategory ?? row.type ?? (String(designation).toLowerCase().includes('lab') || (String(designation).toLowerCase().includes('assistant') && String(designation).toLowerCase().includes('admin')) ? 'Non-Teaching' : 'Teaching');
  const department = row.departmentName ?? row.department ?? '';
  
  // Zero is a valid value for a future payroll period. Do not use `||` here:
  // it previously converted zero assessed/present days into a full 26 days.
  const numeric = (value, fallback = 0) => value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? fallback : Number(value);
  const working = numeric(row.workingDays ?? row.working ?? row.totalWorkingDays ?? row.totalDays, 26);
  const presentSource = row.presentDays ?? row.present ?? row.totalPresent ?? row.attendedDays;
  const present = presentSource === null || presentSource === undefined || presentSource === ''
    ? Math.max(0, working - numeric(row.paidLeaveDays ?? row.paidLeave, 0) - numeric(row.lopDays ?? row.lop, 0))
    : numeric(presentSource, 0);
  const paidLeave = Number(row.paidLeaveDays ?? row.paidLeave ?? row.paidLeaves ?? row.leaveDays ?? row.approvedLeaves ?? 0) || 0;
  const lop = numeric(row.lopDays ?? row.lop ?? row.lossOfPayDays ?? row.lossOfPay ?? row.unpaidLeaveDays ?? row.unpaidLeaves, Math.max(0, working - present - paidLeave));

  const defaultSalary = calculateFacultySalary(row, designation, type);
  const grossSalary = row.grossSalary ?? row.gross ?? row.grossPay ?? row.basicSalary ?? row.baseSalary ?? row.salary ?? row.totalEarnings ?? row.monthlySalary ?? defaultSalary.gross;
  const baseDeduction = row.deductions ?? row.totalDeductions ?? row.deduction ?? row.totalDeduction ?? defaultSalary.deductions;
  const lopDeduction = lop > 0 && grossSalary ? Math.round((Number(grossSalary) / working) * lop) : 0;
  const totalDeductions = (baseDeduction != null ? Number(baseDeduction) : 0) + (row.deductions != null ? 0 : lopDeduction);
  const netSalary = row.netSalary ?? row.net ?? row.netPay ?? row.netAmount ?? (grossSalary != null ? Math.max(0, Number(grossSalary) - totalDeductions) : null);

  const status = row.status ?? row.payrollStatus ?? (lop > 0 ? 'Hold' : 'Processed');

  return {
    ...row,
    id,
    facultyId: facultyId ? String(facultyId) : undefined,
    employeeId,
    fullName,
    designation,
    type,
    department,
    working,
    present: Math.max(0, present),
    late: Number(row.lateDays ?? row.late ?? 0) || 0,
    halfDay: Number(row.halfDays ?? row.halfDay ?? 0) || 0,
    paidLeave,
    lop,
    month: row.payrollMonth ?? row.month,
    status: status || 'Processed',
    grossSalary,
    deductions: totalDeductions,
    netSalary
  };
};
