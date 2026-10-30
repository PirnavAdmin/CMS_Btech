# Tickets 172 & 173 - Exam Management

## Scope completed

### Ticket 172
Created four additive MySQL tables:

1. `exam_types` - college-level exam type master.
2. `exams` - exam master scoped by college, academic year, course, branch and semester.
3. `exam_schedules` - subject/date/time/section/classroom scheduling for an exam.
4. `exam_rules` - flexible exam rules/eligibility/conduct/evaluation values.

Run:

`Database/ExamManagement/Ticket172_Exam_Type_Schedule_Rules.sql`

No existing table is dropped or renamed.

### Ticket 173
Added authenticated APIs without modifying/removing existing routes:

#### Exam type master
- `GET /api/v1/exam-types`
- `GET /api/v1/exam-types/{examTypeId}`
- `POST /api/v1/exam-types`
- `PUT /api/v1/exam-types/{examTypeId}`
- `DELETE /api/v1/exam-types/{examTypeId}`

#### Exam CRUD
- `GET /api/v1/exams`
- `GET /api/v1/exams/{examId}`
- `POST /api/v1/exams`
- `PUT /api/v1/exams/{examId}`
- `DELETE /api/v1/exams/{examId}`

#### Exam schedules
- `GET /api/v1/exams/{examId}/schedules`
- `GET /api/v1/exams/{examId}/schedules/{scheduleId}`
- `POST /api/v1/exams/{examId}/schedules`
- `PUT /api/v1/exams/{examId}/schedules/{scheduleId}`
- `DELETE /api/v1/exams/{examId}/schedules/{scheduleId}`

#### Exam rules
- `GET /api/v1/exams/{examId}/rules`
- `GET /api/v1/exams/{examId}/rules/{ruleId}`
- `POST /api/v1/exams/{examId}/rules`
- `PUT /api/v1/exams/{examId}/rules/{ruleId}`
- `DELETE /api/v1/exams/{examId}/rules/{ruleId}`

#### Integration lookups
- `GET /api/v1/exams/lookups`

## Validations implemented

- College/course ownership validation.
- Branch must belong to the selected course.
- Semester must match academic year + course + branch.
- Exam type must belong to the selected college.
- Exam code is unique per college + academic year.
- Exam dates must be inside the academic year.
- Subject schedule must be mapped through `subject_semesters` to the exam context.
- Optional section must match the exam context.
- Optional classroom must belong to the exam college.
- Section and classroom time overlap conflicts return HTTP 409.
- Duplicate subject/section schedule within the same exam returns HTTP 409.
- Rule code is unique inside one exam.
- Deletes are soft deletes so data history is retained.

## Logging

The new controller and repository use `ILogger`. The project's existing `RequestLoggingMiddleware`, `ApiConsoleLoggingMiddleware`, and `DailyFileLoggerProvider` continue to capture each API request/response and correlation ID.

## Files added

- `Controllers/V1/ExamTypesController.cs`
- `Controllers/V1/ExamsController.cs`
- `DTOs/Exams/ExamManagementRequests.cs`
- `Exceptions/ExamManagementExceptions.cs`
- `Repositories/Implementations/ExamManagementRepository.cs`
- `Database/ExamManagement/Ticket172_Exam_Type_Schedule_Rules.sql`
- `ExamManagement_API_Tests.http`
- `TICKET_172_173_EXAM_MANAGEMENT.md`

## Existing file changed

Only `Program.cs` receives one additive DI registration:

`builder.Services.AddScoped<ExamManagementRepository>();`

No existing API controller or route was removed or renamed.

## Supplied dump compatibility / ready test context

The supplied `Dump2026OCT6th.sql` has a usable test context:

- College: `1`
- Academic year: `2` (`2026-2027`)
- Course: `1`
- Branch: `1` (CSE)
- Semester: `2`
- Subject: `4` (mapped to semester 2)
- Section: `2`
- Classroom: `6`

Use `ExamManagement_API_Tests.http` after running the Ticket 172 migration.
