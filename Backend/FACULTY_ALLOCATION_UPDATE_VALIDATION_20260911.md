# Faculty Subject Allocation - Update With Validation

## Added API
`PUT /api/v1/faculty-subject-allocations/{allocationId}`

No existing API route was removed or changed.

## Request
```json
{
  "facultyId": 1,
  "courseId": 1,
  "branchId": 1,
  "semesterId": 1,
  "sectionId": 1,
  "subjectId": 1,
  "academicYearId": 2,
  "allocationType": "TEACHING",
  "isPrimaryFaculty": true,
  "periodsPerWeek": 5,
  "status": true,
  "remarks": "Updated faculty allocation",
  "updatedBy": 1
}
```

Optional: `courseId`, `sectionId`, `subjectId`, `academicYearId`, `remarks`, `updatedBy`.

## Validation
- Allocation exists and is not deleted.
- Faculty exists and is active.
- Course, when supplied, exists and is active.
- Branch exists, is active, and belongs to the selected course when course is supplied.
- Semester exists, is active/not archived, and belongs to selected branch/course.
- Academic year, when supplied, exists/not archived and matches the semester.
- Section, when supplied, is active/not archived and matches course/branch/semester/academic year.
- Subject, when supplied, is actively mapped to the selected semester through `subject_semester_assignments`.
- Duplicate active allocation is rejected (excluding the row being edited).
- Conflicting active primary-faculty allocation is rejected (excluding the row being edited).
- `periodsPerWeek` cannot be negative.
- `allocationType` max 50 chars, `remarks` max 500 chars.

## Logging / exception behavior
- Existing `RequestLoggingMiddleware` remains.
- Existing `ExceptionMiddleware` remains.
- Added `ApiConsoleLoggingMiddleware` to log request/response data for `/api` calls with secret redaction.
- Update controller logs requested IDs, successful updates, validation failures, conflicts and unexpected exceptions.
- Password/token/OTP/cookie/authorization values are redacted from request/response body logs.

## SQL
- Added stored procedure `sp_FacultySubjectAllocation_UpdateValidated`.
- Added safe repair for historical allocation academic-year mismatches.
- If an existing section link conflicts with its allocation's course/branch/semester/year, only the invalid `section_id` is cleared because section is optional; the allocation row is preserved.

## Static verification
- C# structure: 336 files checked, 0 failures.
- Existing routes before: 253.
- Routes after: 254.
- Removed existing routes: 0.
- Added route: `PUT /api/v1/faculty-subject-allocations/{}`.
- Stored procedures called by backend: 106.
- Missing procedures in updated dump: 0.

Live .NET/MySQL execution was not available in the build environment, so runtime DB execution still needs to be tested locally after applying the SQL patch.
