import test from 'node:test'
import assert from 'node:assert/strict'
import { admissionSemesterOptions, resolveAdmissionAcademicIds, currentAdmissionSemester, admissionSemesterError, resetAdmissionAcademicDependents } from './admissionAcademicMapping.js'

test('semester choices require matching course, branch, year and college, and exclude archived rows', () => {
  const scope = { collegeId: 9, courseId: 1, branchId: 2, academicYearId: 3 }
  const rows = [
    { ...scope, semesterId: 4, semesterName: 'Semester 1' },
    ...['collegeId', 'courseId', 'branchId', 'academicYearId'].map((key, i) => ({ ...scope, [key]: 99, semesterId: 10 + i })),
    { ...scope, semesterId: 20, isArchived: true },
  ]
  const options = admissionSemesterOptions(rows, scope, '9')
  assert.deepEqual(options, [{ id: 4, name: 'Semester 1' }])
  assert.equal(admissionSemesterError({ semesterId: '4' }, options), '')
  assert.match(admissionSemesterError({ semesterId: 10 }, options), /does not match/)
})

test('changing a parent selection clears dependent IDs and requires a new semester when one was assigned', () => {
  const previous = { academic: { courseId: '1', branchId: '2', semesterId: '4', sectionId: '5' } }
  const next = { academic: { ...previous.academic, courseId: '9' } }
  const result = resetAdmissionAcademicDependents(next, previous, 'academic.courseId')
  assert.equal(result.academic.branchId, '')
  assert.equal(result.academic.semesterId, '')
  assert.equal(result.academic.sectionId, '')
  assert.match(admissionSemesterError(result.academic, []), /Select a semester/)
  assert.equal(previous.academic.semesterId, '4')
  assert.equal(next.academic.semesterId, '4')
  assert.equal(resetAdmissionAcademicDependents(previous, previous, 'academic.courseId'), previous)
})

test('new drafts can be saved before selecting an optional semester', () => {
  assert.equal(admissionSemesterError({ semesterId: '' }, []), '')
})

test('resolves only a unique active semester for the selected academic scope',()=>{
 const scope={collegeId:9,courseId:1,branchId:2,academicYearId:3}
 const current={...scope,id:4,name:'Semester 1',status:'Active',startDate:'2026-11-01',endDate:'2027-03-01'}
 const future={...scope,id:5,name:'Semester 2',status:'Active',startDate:'2027-04-01',endDate:'2027-08-01'}
 assert.deepEqual(currentAdmissionSemester([current,future],scope,9,'2026-11-12'),{id:4,name:'Semester 1'})
 assert.equal(currentAdmissionSemester([current,{...current,id:6}],scope,9,'2026-11-12'),null)
 assert.equal(currentAdmissionSemester([current],{...scope,branchId:99},9,'2026-11-12'),null)
})

test('legacy saved names resolve to real program and branch ids within the selected college',()=>{
 const courses=[{courseId:12,collegeId:119,courseName:'B.Tech'}]
 const branches=[{branchId:13,courseId:12,departmentId:8,branchName:'Artificial Intelligence'}]
 assert.deepEqual(resolveAdmissionAcademicIds({course:'B.Tech',branch:'Artificial Intelligence'},courses,branches,119),{course:'B.Tech',branch:'Artificial Intelligence',courseId:'12',branchId:'13',departmentId:'8'})
 assert.equal(resolveAdmissionAcademicIds({course:'B.Tech'},courses,branches,120).courseId,undefined)
 assert.equal(resolveAdmissionAcademicIds({course:'B.Tech'},[...courses,{...courses[0],courseId:15}],branches,119).courseId,undefined)
})
