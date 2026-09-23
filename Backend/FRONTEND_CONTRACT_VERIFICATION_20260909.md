# Frontend CMS Contract Verification — 09 Sep 2026

## Implemented contract alignment

### Student admission academic flow
`CreateStudentAdmissionDto` / `UpdateStudentAdmissionDto` now explicitly expose `academicYearId`, `collegeId`, `departmentId`, `courseId`, `branchId`, `semesterId`, `admissionType`, `quota`, `quotaOther`, `entryType`, `regulation`, and `batch` in Swagger. Create/update persists the academic mapping through `sp_StudentAdmission_UpdateAcademicDetails_v2` after the base admission write. The academic-details PUT uses COALESCE semantics so omitted fields preserve existing values. Course/branch/semester/academic-year/section mapping is validated.

### Parent/address persistence
Admission DTO explicitly supports father/mother/guardian fields, annual income, flat address fields, `currentAddress` and `permanentAddress`. Complete frontend form JSON remains persisted in `student_admission_form_data`. `student_parents` is extended for guardian, income, address, current/permanent JSON. Parent PUT is now an upsert and synchronizes the linked admission. Approval creates/updates the parent row from admission values.

### Semester API
`GET /api/semester` returns the Semester model containing `semesterId`, `semesterName`, `semesterNumber`, `courseId`, `branchId`, `academicYearId`, and `status` (plus dates, archive and display names where loaded). The frontend can filter by `courseId` and `branchId` from these response rows.

### Promotion atomic API
`POST /api/v1/promotions/promote-bulk-atomic` uses one DB transaction for the complete list. The stored procedure resolves/validates target academic year, immediate next semester and section, updates active section assignment and student academic year, and inserts promotion history. If any student fails, the transaction is rolled back. Semester 8/final-semester processing creates a `GRADUATION` history row, removes active section assignment, does not allocate a new section, and returns `degreeConferred=true`.

### Branch/semester status
`PATCH /api/v1/branches/{id}/status`, `PATCH /api/semester/{id}/status`, and `PATCH /api/v1/semesters/{id}/status` now document `{"status": true}` / `{"status": false}`. Backward-compatible `0/1` input is also accepted by the JSON converter. Response returns `{ id, status }` with boolean status.

### Admission status
`POST /api/v1/student-admissions/{admissionId}/status` retains `newStatus`, `remarks`, `rejectionReason`, supports `CORRECTION_REQUIRED`, and returns the latest normalized status plus `studentId` after approval.

### Academic dependencies
The generic dependency routes accept singular or plural entity names for college, academic-year, department, course, branch, semester, section and student. The SQL response contains dependency counts, `canDeactivate`, and `policy`. Branch/semester deactivation is BLOCKED when active dependent records exist; the status endpoint returns HTTP 409 with the database reason. No cascade delete is performed.

## Static verification performed in this environment
- C# files checked: 314
- Structural failures: 0
- Backend route operations: 246
- Frontend contract routes checked: 123
- Missing frontend routes: 0
- SQL contract presence checks: all passed

## Execution limitation
The container used for this patch does not have the .NET SDK or a live MySQL server configured, so a fresh `dotnet build` and end-to-end HTTP/MySQL execution could not be performed here. The checks above are source/route/schema-contract verification, not a claim of live deployment execution.
