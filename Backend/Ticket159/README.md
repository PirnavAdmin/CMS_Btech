# Ticket 159 - Student Attendance

Task: **Session, marking and daily/subject/monthly reports**

This implementation was added without deleting or changing any existing API.
It uses the tables already present in `Dump20260922.sql`:

- `student_attendance` - attendance session/header
- `student_attendance_details` - one attendance mark per student per session
- existing academic/timetable tables for validation and labels

No new database table or stored procedure is required.

## Added APIs

| Purpose | Method | Route |
|---|---|---|
| List/filter sessions | GET | `/api/v1/student-attendance/sessions` |
| Session details | GET | `/api/v1/student-attendance/sessions/{sessionId}` |
| Create session | POST | `/api/v1/student-attendance/sessions` |
| Load marking roster | GET | `/api/v1/student-attendance/sessions/{sessionId}/students` |
| Bulk mark/update attendance | PUT | `/api/v1/student-attendance/sessions/{sessionId}/mark` |
| Complete/reopen/cancel session | PATCH | `/api/v1/student-attendance/sessions/{sessionId}/status` |
| Daily report | GET | `/api/v1/student-attendance/reports/daily` |
| Subject report | GET | `/api/v1/student-attendance/reports/subject` |
| Monthly report | GET | `/api/v1/student-attendance/reports/monthly` |

## Attendance statuses

`PRESENT`, `ABSENT`, `LATE`, `LEAVE`

## Session statuses

`OPEN`, `COMPLETED`, `CANCELLED`

Completed/cancelled sessions cannot be marked. A completed session can be reopened with the status API when a correction is required.

## Bulk marking

`markUnlistedAsAbsent=true` is useful for normal classroom flow: all active students in the section are first marked absent, then the explicitly supplied marks overwrite those students as present/late/leave/etc.

`completeSession=true` closes the session only when every currently active student in the section has a mark.

## College security

For normal college users, `collegeId` is taken from the JWT claim and cross-college access is blocked.
For SUPER_ADMIN, which has no fixed `collegeId` claim in this project, pass `collegeId` as request/query input.

## Logging

The new controller uses `ILogger<StudentAttendanceController>` for:

- session list/detail/create actions
- duplicate/invalid session attempts
- roster access
- marking success/failures
- status changes
- daily/subject/monthly report generation
- database/unexpected exceptions

The existing project already enables `DailyFileLoggerProvider` in `Program.cs` and `appsettings.json` (`Logging:File`), so Ticket 159 logs are written through the existing logging pipeline into the configured `Logs` folder. No existing logging setup was changed.
