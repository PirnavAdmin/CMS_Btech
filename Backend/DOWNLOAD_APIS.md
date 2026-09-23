# Download API reference

Send `Authorization: Bearer <accessToken>`. CSV is the default; add `?format=json` for JSON. `GET /api/v1/exports` returns the live catalog, columns, and supported filters.

| Dataset / screen | GET download route |
|---|---|
| colleges | `/api/v1/colleges/download` |
| college-settings | `/api/college-settings/download` |
| academic-years | `/api/v1/academic-years/download` |
| academic-levels | `/api/academic-levels/download` |
| departments | `/api/v1/departments/download` |
| courses | `/api/v1/courses/download` |
| branches | `/api/v1/branches/download` |
| semesters | `/api/semester/download` |
| sections | `/api/v1/sections/download` |
| course-structures | `/api/v1/course-structures/download` |
| students | `/api/v1/students/download` |
| student-profiles | `/api/v1/student-profiles/download` |
| student-admissions | `/api/v1/student-admissions/download` |
| promotions | `/api/v1/promotions/download` |
| users | `/api/v1/users/download` |
| roles | `/api/roles/download` |
| faculty | `/api/v1/faculty/download` |
| fee-structures | `/api/v1/fee-structures/download` |
| hostel-fees | `/api/v1/hostel-fees/download` |
| transport-fees | `/api/v1/transport-fees/download` |

Each listed route also has an `/export` alias. The shared form is `/api/v1/exports/{dataset}`. The original document route remains `GET /api/v1/students/{studentId}/documents/{documentId}/download`.

Supported filter names are `search`, `status`, `collegeId`, `departmentId`, `courseId`, `branchId`, `semesterId`, and `academicYearId`, where the selected dataset contains the corresponding field. Unsupported or non-positive ID filters return 400. Check the catalog for the exact fields. No paging parameters are needed for downloads.

College administrators are scoped to their college. Unscoped hostel/transport fee exports require SUPER_ADMIN. CSV files are UTF-8 with BOM, quote embedded commas/newlines, and protect text that starts with spreadsheet formula characters. JSON returns a plain array with the documented column names.
