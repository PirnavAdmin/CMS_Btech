# CMS API Contract Update — 2026-09-09

## Implemented
- Preserved all existing API routes.
- Extended `PromoteStudentRequestDto` and bulk request with `targetAcademicYearId`, `targetSemesterId`, nullable `targetSectionId`, `degreeConferred`, and `degreeConferredAt`.
- Added persisted `from_semester_id` / `to_semester_id` promotion history columns through an idempotent SQL patch.
- Added `sp_student_promote_contract` with target academic-year/semester/section validation, capacity validation, section reallocation, promotion-history insert, student academic-year update, and Semester-8/final-semester graduation handling.
- Existing `POST /api/v1/promotions/promote` remains. It uses the new contract when target fields are supplied and keeps the legacy procedure path for old callers.
- Existing `POST /api/v1/promotions/promote-bulk` remains and is now routed through one database transaction for all students.
- Added alias `POST /api/v1/promotions/promote-bulk-atomic`.
- Promotion responses now expose target mapping, graduation flags, and refreshed complete promotion history.
- Confirmed existing `GET/PUT /api/student-parents/{studentId}`.
- Confirmed existing `GET/PUT /api/v1/student-academic-information/{id}`.
- Confirmed existing `GET /api/StudentProfile/my-profile`.
- Confirmed existing `GET /api/v1/section-assignments`.
- Added `GET /api/v1/student-admissions/{admissionId}/status-history`.
- Preserved `POST /api/v1/student-admissions/{admissionId}/status` request contract (`newStatus`, `remarks`, `rejectionReason`).
- Added `CORRECTION_REQUIRED` workflow normalization/transition support.
- Approval status change now idempotently creates/links a `students` row and returns `studentId`.
- Added `AdmissionId` mapping to the Student EF model so local source matches the integrated database.

## Verification performed in this environment
- C# structural checker: 314 files checked, 0 structural failures.
- Frontend route checker: 123 frontend contracts, 0 missing routes.
- Current source route inventory: 246 route operations according to the project route checker.
- Required route presence check: all requested routes present.
- SQL contract static check: target mapping fields, atomic transaction handling, graduation branch, section assignment handling, and new promotion procedure present.

## Environment limitation
The container does not have the .NET SDK or a running MySQL server, therefore a fresh `dotnet build` and live HTTP/MySQL integration run could not be executed here. Run the included SQL patch before starting the updated backend.

## Database file to apply
`Database/CMS_API_CONTRACT_PATCH_20260909.sql`

The same patch is also appended to `Database/CMS_BTech_SQL_Changes_20260908.sql` and `Database/CompleteDatabase/CMS_BTECH_COMPLETE_UPDATED_20260909.sql`.
