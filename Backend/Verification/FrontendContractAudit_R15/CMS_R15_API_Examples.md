# R15 API changes and examples

Use your configured backend base URL, a valid Bearer token, and IDs belonging to the selected college. IDs below are illustrative. Existing endpoint methods and aliases remain available unless an explicitly unfinished placeholder is listed as 501. The complete route/DTO inventory is in the backend verification folder.

**Common errors and scope**

Authenticated APIs return 401 for missing/invalid/inactive sessions, 403 for denied actions or an explicitly forbidden college, and 404 for a record outside the accessible scope. Invalid references/payloads return 400; active dependencies, conflicting workflows and incompatible invoices return 409. No claim of successful persistence is returned for an unfinished workflow.

```json
{"success":false,"code":"WORKFLOW_NOT_IMPLEMENTED","message":"Institutional result publication has no integrated persistence workflow in this release. No changes were saved.","statusCode":501,"correlationId":"<trace-id>"}
```

**Automatic semesters and filtered lists**

```http
POST /api/semester?collegeId=10
Authorization: Bearer <token>
Content-Type: application/json

{"courseId":20,"branchId":30,"academicYearId":40,"semesterNumber":1,"semesterName":"Semester 1","yearNumber":1,"startDate":null,"endDate":null,"status":1}
```

200, with persisted ID in `data.semesterId`. Repeating the same branch/year/number reuses the active record. The tested eight-semester sequence sends flat objects numbered 1–8 with year numbers 1–4.

```json
{"success":true,"message":"Semester saved successfully","data":{"semesterId":50,"courseId":20,"branchId":30,"academicYearId":40,"semesterNumber":1,"semesterName":"Semester 1","yearNumber":1,"startDate":null,"endDate":null,"status":1}}
```

```http
GET /api/semester?collegeId=10&courseId=20&branchId=30&academicYearId=40&status=1
```

200: existing `{success,message,data:[...]}` envelope, now filtered by these fields. Existing additional semester fields are preserved.

**Course/semester removal**

```http
DELETE /api/v1/courses/20?collegeId=10
DELETE /api/semester/50?collegeId=10
Authorization: Bearer <token>
```

200 for an unreferenced accessible record. Courses are soft deleted; semesters are archived. Records/history are retained. A later detail read hides the removed record. Automatic setup can recreate a semester still required by the branch structure.

```json
{"success":true,"message":"Record removed from the active directory; history retained.","data":{"id":50,"status":0}}
```

409 with `code: "ACTIVE_DEPENDENCIES"` and dependency counts when active records prevent removal; 404 for a missing/inaccessible record.

**Profile photograph**

```http
POST /api/v1/profile/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=<boundary>

<file part named "file", PNG/JPEG/WebP, maximum 5 MB>
```

200:

```json
{"success":true,"data":{"profileImagePath":"/uploads/profile-photos/<generated-guid>.png"}}
```

The response is saved to the authenticated employee profile. The generated photo URL serves image bytes for normal image rendering; private documents are not exposed by this file provider. Invalid size/extension/signature returns 400. Student photograph edits continue through the student profile workflow.

**Faculty leave policy details and transitions**

```http
GET /api/v1/faculty-leave/policies/POL-001?collegeId=10
Authorization: Bearer <token>
```

200:

```json
{"success":true,"data":{"id":"POL-001","collegeId":10,"name":"Teaching policy","academicYear":"2026-2027","applicableTo":"Teaching","departmentId":null,"branchId":null,"from":"2026-06-01T00:00:00","to":"2027-05-31T00:00:00","status":"Active","entitlements":[{"typeId":"CL","entitlement":12,"maxDays":3,"carryForward":false,"maxCarryForward":null,"documentRequired":false}]}}
```

```http
POST /api/v1/faculty-leave/policies/POL-001/deactivate?collegeId=10
POST /api/v1/faculty-leave/policies/POL-001/activate?collegeId=10
Authorization: Bearer <token>
```

200 with `data: {id,status,collegeId}`. These are edit actions and require an authorized employee administrator. Activation enforces same-college/year/type/organizational/date overlap rules; 409 `ACTIVE_POLICY_CONFLICT` includes conflicts. Unresolved legacy ownership is not guessed.

**Faculty existing-account selection (frontend integration still required)**

```http
POST /api/v1/faculty/account-lookup?collegeId=10
Authorization: Bearer <administrator-token>
Content-Type: application/json

{"email":"faculty@example.invalid","mobile":"9876543210"}
```

Use an eligible returned `data.items[].userId` in faculty creation, retaining its canonical contact values. Do not submit `userId:0` when a known account must be linked. Preserve distinct conflict codes such as `USER_SELECTION_REQUIRED`, `USER_CONTACTS_DIFFERENT_ACCOUNTS`, `USER_CONTACT_MISMATCH`, `USER_INACTIVE`, and `FACULTY_USER_ALREADY_LINKED`. A faculty create remains 201 on success; cross-college/unavailable accounts must not be linked or disclosed. Full existing R14 contract remains in the project documentation.

**College user invitation alias**

```http
POST /api/v1/admin/users
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{"collegeId":10,"fullName":"Test Faculty","email":"faculty@example.invalid","mobile":"9876543210","roleIds":[3]}
```

This aliases the existing `/api/v1/admin/users/invite` workflow with the same validated DTO and live Super Admin rule. A valid execution creates an account/invitation and attempts delivery; examples use `.invalid` addresses and are not delivery tests. 201 retains the existing `{success,message,data,correlationId}` invitation response. Delivery failure retains the existing truthful 503 invitation contract. Empty required fields return 400 before mail is attempted.

**Placement companies**

```http
POST /api/v1/placements/companies?collegeId=10
Authorization: Bearer <token>
Content-Type: application/json

{"collegeId":10,"companyName":"Example Engineering","website":"https://example.invalid","industry":"Engineering","contactPerson":"Recruiter","email":"recruiter@example.invalid","phone":"9876543210","address":"Hyderabad","status":"Active"}
```

201 retains the existing top-level company contract, including `companyId`, `collegeId`, generated `companyCode`, and saved fields. The selected authorized college is used; the first college in the database is never substituted. Omitting body collegeId is allowed when the query/verified account supplies it. Lists, details, update, delete/status and company reports enforce the same tenant boundary.

```http
GET /api/v1/placements/companies?collegeId=10
PUT /api/v1/placements/companies/60?collegeId=10
DELETE /api/v1/placements/companies/60?collegeId=10
GET /api/v1/placements/reports?collegeId=10
```

Reports return real `data.registeredCompanies`; inaccessible IDs return 404. Existing update request field names are retained.

**Legacy student fee assignment now creates a collectible installment**

```http
POST /api/v1/students/70/fee-structures?collegeId=10
Authorization: Bearer <token>
Content-Type: application/json

{"feeStructureId":80,"assignedAmount":100,"assignedOn":"2026-11-07","dueDate":"2026-12-01","remarks":"Approved assignment"}
```

201:

```json
{"success":true,"message":"Fee structure assigned to student successfully.","data":{"assignmentId":90,"studentFeeId":91,"assignmentCode":"FEE-...","studentId":70,"feeStructureId":80,"assignedAmount":100,"assignedOn":"2026-11-07T00:00:00","dueDate":"2026-12-01T00:00:00","remarks":"Approved assignment"}}
```

`dueDate` is now required: 400 if absent/invalid. Assignment, installment and actor audit commit together. Duplicate active assignment remains 409. Managed academic fee plans must be assigned through admission snapshots, not this legacy route.

```http
POST /api/v1/fee-collection/payments
Authorization: Bearer <token>
Content-Type: application/json

{"studentFeeId":91,"feeAmount":25,"fineAmount":0,"paymentMode":"CASH","paymentDate":"2026-11-07T10:00:00"}
```

201 retains the existing payment/receipt DTO. Overpayment is rejected with no payment/receipt persisted. Non-cash payments still require a transaction reference.

```http
GET /api/v1/fee-students/70/balance?collegeId=10
GET /api/v1/fee-students/70/ledger?collegeId=10
GET /api/v1/fee-collection/reports/summary?collegeId=10
```

The tested 100 assignment/25 payment returns `balance:75` and one real ledger row. Ledger fields include `studentFeeId`, `feeAssignmentId`, `studentId`, `feeCode`, `dueDate`, `amount`, `paidAmount`, `feeBalance`, `fineBalance`, and `balance`. Summary uses authorized-college payment rows. Existing receipt JSON APIs remain available; PDF download/refund placeholders return explicit 501.

**Academic fee plans: approval and repair**

Draft/save, submit, approve, publish, archive, picker and immutable snapshots retain their existing contracts and expected revisions. On admission approval, the immutable full-payment/installment schedule now materializes in `fee_assignments` and `student_fees` within the approval transaction. Retrying approval does not duplicate students, accounts or charges.

For an existing approved admission that has a valid fee snapshot and student but lacks charges:

```http
POST /api/v1/student-admissions/100/fee-ledger?collegeId=10
Authorization: Bearer <authorized-admission-administrator-token>
```

200:

```json
{"success":true,"data":{"assignmentId":110,"studentFeeIds":[111,112],"createdInstallments":2}}
```

Retry returns the same IDs with `createdInstallments:0`. It requires `student_admissions` edit access and an active administrator role. 404 if the approved student/snapshot is absent or inaccessible; 409 `ADMISSION_APPROVAL_REQUIRED`, `INVALID_FEE_SCHEDULE`, `FEE_SCOPE_MISMATCH`, or `FEE_LEDGER_CONFLICT` on invalid state. Existing amounts, canceled invoices or payments are never overwritten to force a match. SQL preflight lists existing approved snapshots requiring review/repair.

**Grade preview policy versus official grade rules**

```http
POST /api/v1/grade-policies?collegeId=10
Authorization: Bearer <token>
Content-Type: application/json

{"collegeId":10,"academicYearId":40,"bands":[{"grade":"F","min":0,"max":40,"points":0,"pass":false},{"grade":"P","min":40,"max":100,"points":6,"pass":true}]}
```

201 retains top-level `id`. The saved row is scoped and audited; GET returns rows with the existing `{id,key,collegeId,data,status,createdAt,updatedAt}` storage envelope used by the frontend normalizer. PUT `/grade-policies/{id}` uses the same payload. Bands must cover 0–100 contiguously with unique names and valid 0–10 points; invalid input returns 400. This is the UI's preview scale, not a silent change to published official results.

```http
POST /api/v1/grades?collegeId=10
Authorization: Bearer <academic-administrator-token>
Content-Type: application/json

{"collegeId":10,"gradeCode":"P","gradeName":"Pass","minPercentage":40,"maxPercentage":100,"gradePoint":6,"isPass":true,"status":1}
```

201 `{success:true,id:<id>,gradeId:<id>}` writes the domain `grades` table. GET `/grades` and `/grades/{id}` return canonical saved fields. PUT uses the same DTO. Active ranges must not overlap existing official ranges (409 `GRADE_RULE_CONFLICT`). Official grade selection is college-scoped.

**Published results and student ownership**

```http
GET /api/v1/results?collegeId=10&academicYearId=40&page=1&pageSize=100
Authorization: Bearer <token>
```

200, with page/pageSize/totalCount/totalPages:

```json
{"success":true,"data":[{"id":"70:120","studentId":70,"examId":120,"collegeId":10,"academicYearId":40,"examName":"Semester Exam","status":"Published","publishedAt":"2026-11-07T10:00:00","sgpa":6,"cgpa":6,"percentage":70,"overallGrade":"P","records":[{"studentId":70,"studentName":"Example Student","rollNumber":"ADM-001","subjectId":130,"subjectCode":"CS101","subjectName":"Programming","totalMarks":70,"maximumMarks":100,"percentage":70,"grade":"P","gradePoint":6,"credits":3,"status":"PASS"}]}],"page":1,"pageSize":100,"totalCount":1,"totalPages":1}
```

This reads actual latest published `exam_results`, not supplemental JSON. Student tokens receive their own published records only, including on existing `/api/v1/results/student/{studentId}` and backlog routes. Unpublished records are hidden; another student's history is denied. `calculate`/`validate` retain their existing student/exam contracts and require real examination result data.

`POST /results`, `/results/publish`, result approve/revoke, publication-history and official transcript placeholders return explicit 501 until an integrated institutional publication/import workflow is implemented. Saving arbitrary JSON is not treated as publication.

**Unchanged contracts with stricter scope/collation**

Subject lists/lookups/exports, faculty attendance/payroll/leave lists and record reads, legacy fee structure reads/updates, elective lists and timetable lists retain their existing field names and envelopes. They now enforce verified college/ownership and valid text comparisons. An inaccessible record may return 403/404 where the original implementation leaked it. Legacy fee structures cannot be moved between colleges by changing `collegeId`; shared multi-college subjects require Super Admin for mutations. No role ceiling or identity rule was weakened for frontend convenience.
