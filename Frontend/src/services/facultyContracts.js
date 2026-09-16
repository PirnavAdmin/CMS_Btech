// Payloads follow the Faculty Swagger DTOs; UI labels never substitute for IDs.
const optionalNumber = value => value === '' || value == null ? null : Number(value)
export const requiredNumber = (value, label) => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} is required. Select a valid record.`)
  return number
}
export const facultyCreatePayload = value => ({
  userId: requiredNumber(value.userId, 'Linked user ID'),
  employeeProfileId: optionalNumber(value.employeeProfileId),
  collegeId: requiredNumber(value.collegeId, 'College'),
  departmentId: requiredNumber(value.departmentId, 'Department'),
  facultyCode: value.employeeId.trim(), facultyName: value.fullName.trim(),
  designation: value.designation || null, qualification: value.qualification || null,
  specialization: value.specialization || null, experienceYears: Number(value.experience) || 0,
  employmentType: value.employmentType, dateOfJoining: value.joiningDate || null,
  officialEmail: value.email.trim(), mobile: value.mobile.trim(),
  isHod: Number(value.isHod) || 0, status: typeof value.status === 'number' ? value.status : 1,
})
export const facultyUpdatePayload = value => {
  const [firstName, ...lastName] = value.fullName.trim().split(/\s+/)
  return { firstName, lastName: lastName.join(' '), email: value.email.trim(), phoneNumber: value.mobile.trim(), departmentId: requiredNumber(value.departmentId, 'Department'), designation: value.designation || null, qualification: value.qualification || null, status: typeof value.status === 'number' ? value.status : 1 }
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
export const normalizeAllocation = row => ({ ...row, id: String(row.allocationId ?? row.facultySubjectAllocationId ?? row.id ?? ''), academicYear: row.academicYearName ?? row.academicYear ?? '', course: row.courseName ?? row.course ?? '', branch: row.branchName ?? row.branch ?? '', semester: row.semesterName ?? row.semester ?? '', section: row.sectionName ?? row.section ?? '', assignmentType: row.allocationType ?? row.assignmentType ?? '', weeklyHours: row.periodsPerWeek ?? row.weeklyHours ?? 0 })
export const allocationPayload = (row, updating = false) => ({
  facultyId: requiredNumber(row.facultyId, 'Faculty'), courseId: optionalNumber(row.courseId),
  branchId: requiredNumber(row.branchId, 'Branch'), semesterId: requiredNumber(row.semesterId, 'Semester'),
  sectionId: optionalNumber(row.sectionId), subjectId: optionalNumber(row.subjectId), academicYearId: optionalNumber(row.academicYearId),
  allocationType: row.assignmentType || row.allocationType, isPrimaryFaculty: Boolean(row.isPrimaryFaculty), remarks: row.remarks || null,
  ...(updating ? { periodsPerWeek: Number(row.weeklyHours) || 0, status: row.status !== false } : {}),
})
export const attendanceTime = (date, value) => !value || value === '—' ? null : value.includes('T') ? value : `${date}T${value.length === 5 ? `${value}:00` : value}`
export const attendancePayload = row => ({ attendanceDate: row.date, status: row.status, checkIn: attendanceTime(row.date, row.checkIn), checkOut: attendanceTime(row.date, row.checkOut), remarks: row.remarks || null })
export const normalizeLeaveType = row => ({ ...row, id: String(row.id ?? row.leaveTypeId ?? ''), name: row.name ?? row.leaveTypeName ?? '' })
export const normalizeLeavePolicy = row => ({ ...row, id: String(row.id ?? row.policyId ?? ''), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), entitlements: (row.entitlements || []).map(rule => ({ ...rule, typeId: String(rule.leaveTypeId ?? rule.typeId ?? '') })) })
export const normalizeLeaveRequest = row => ({ ...row, id: String(row.id ?? row.requestId ?? row.leaveRequestId ?? ''), facultyId: String(row.facultyId ?? row.employee?.id ?? ''), policyId: String(row.policyId ?? ''), typeId: String(row.leaveTypeId ?? row.typeId ?? ''), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), applied: row.appliedOn ?? row.applied, days: Number(row.days) || 0 })
export const leavePolicyPayload = row => ({ name: row.name.trim(), academicYear: row.academicYear, applicableTo: row.applicableTo, fromDate: row.from, toDate: row.to, entitlements: row.entitlements.map(rule => ({ leaveTypeId: rule.typeId, entitlement: optionalNumber(rule.entitlement), maxDays: optionalNumber(rule.maxDays), carryForward: Boolean(rule.carryForward), maxCarryForward: optionalNumber(rule.maxCarryForward), documentRequired: Boolean(rule.documentRequired) })) })
export const normalizePayroll = row => ({ ...row, id: String(row.payrollId ?? row.id ?? ''), employeeId: row.employeeId ?? row.facultyCode ?? row.employeeCode ?? '', fullName: row.fullName ?? row.facultyName ?? row.employeeName ?? '', type: row.facultyType ?? row.employeeCategory ?? row.type ?? '', department: row.departmentName ?? row.department ?? '', working: row.workingDays ?? row.working ?? 0, present: row.presentDays ?? row.present ?? 0, late: row.lateDays ?? row.late ?? 0, halfDay: row.halfDays ?? row.halfDay ?? 0, paidLeave: row.paidLeaveDays ?? row.paidLeave ?? 0, lop: row.lopDays ?? row.lop ?? 0, month: row.payrollMonth ?? row.month, status: row.status ?? row.payrollStatus ?? '', grossSalary: row.grossSalary ?? null, deductions: row.deductions ?? row.totalDeductions ?? null, netSalary: row.netSalary ?? null })
