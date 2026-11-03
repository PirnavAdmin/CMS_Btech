# Exam Management Downstream Screen/API Contract Audit

Scope: Exam Setup, Exam Timetable, Marks Management, Grade System & Results, and related screen actions visible in the supplied frontend ZIP.

## Important result

This is an additive audit package. Existing backend files have not been overwritten, removed, or renamed. The supplied backend already contains many controllers for these areas, so adding duplicate controllers blindly could cause route conflicts and integration failures. A 100% field-level match cannot honestly be claimed until the API DTOs and the frontend service calls are checked together and the application is built/run against the target database.

## Existing backend routes found in the supplied ZIP

### Exam setup
- `GET /api/v1/exams`
- `GET /api/v1/exams/{examId}`
- `POST /api/v1/exams`
- `PUT /api/v1/exams/{examId}`
- `DELETE /api/v1/exams/{examId}`
- `GET /api/v1/exams/{examId}/schedules`
- `POST /api/v1/exams/{examId}/schedules`
- `GET /api/v1/exams/{examId}/rules`
- `POST /api/v1/exams/{examId}/rules`
- `GET /api/v1/exam-types`
- `POST /api/v1/exam-types`

### Timetable and hall allocation
- `GET/POST /api/v1/timetables`
- `GET /api/v1/timetables/view/class`
- `GET /api/v1/timetables/view/faculty`
- `PUT /api/v1/timetables/{timetableId}/publish`
- `GET /api/v1/exam-schedules/views`
- `GET /api/v1/exam-schedules/views/hall-summary`
- `GET/POST /api/v1/exam-schedules/hall-allocations`
- `GET/POST /api/v1/timetable-entries`

### Marks management
- `GET/POST /api/v1/marks`
- `GET /api/v1/marks/{markId}`
- `PUT /api/v1/marks/{markId}`
- `POST /api/v1/marks/bulk/preview`
- `POST /api/v1/marks/bulk/upload`
- `POST /api/v1/marks/bulk/file-preview`
- `GET /api/v1/marks/reports/summary`
- `GET /api/v1/marks/reports/student`
- `GET /api/v1/marks/reports/subjects`
- `GET /api/v1/marks/approvals/pending`
- `POST /api/v1/marks/workflow/submit`
- `POST /api/v1/marks/workflow/approve`
- `POST /api/v1/marks/workflow/reject`
- `GET /api/v1/marks/{markId}/approval-history`

### Grades and official results
- `GET/POST /api/v1/grades`
- `GET/PUT /api/v1/grades/{id}`
- `GET/POST /api/v1/grade-policies`
- `GET/PUT /api/v1/grade-policies/{id}`
- `GET /api/v1/results`
- `GET /api/v1/results/students/{studentId}/transcript`
- `POST /api/v1/results/publish`
- `GET /api/v1/results/publication-history`
- `GET /api/v1/results/{id}`
- `POST /api/v1/results/{id}/approve`
- `POST /api/v1/results/{id}/revoke-publication`

## Frontend integration risks confirmed from the supplied source

1. `Frontend/src/services/examService.js` defines local-storage keys and seeded exam/hall/student data. Its screen workflows must be checked for backend calls; a seed/local-storage data path is not a substitute for API integration.
2. `Frontend/src/services/resultsService.js` can fall back to local storage and seeded result sheets when API calls fail or return no data. This can mask backend integration failures.
3. Screens under `Frontend/src/pages/examinations/` include exam setup, timetable, hall allocation, marks entry/edit/approval, grade configuration/policy, results generation, transcript/memo and reporting. Each screen's read, create, update, delete, publish, approve, reject, export and validation actions need a contract check.

## Required validation before declaring 100% integration

- Compare every form field to the request DTO (name, type, nullability, enum values, validation rules).
- Compare every displayed column to response DTO fields.
- Verify IDs and foreign keys against the SQL dump; don't assume frontend display codes are numeric database IDs.
- Check pagination/filter/sort parameter names and date/time/time-zone formats.
- Test every success path and expected 400/401/403/404/409/500 path in Swagger or automated integration tests.
- Run `dotnet build` and endpoint tests against the same database configuration used by the application.
- Disable local fallback in integration-test mode so API errors are not silently hidden by sample data.

## Safety/change policy

No existing teammate source file is changed by this audit. Do not add duplicate routes until the request/response DTO mismatch is identified. This avoids duplicate-route ambiguity and unintended database schema changes.
