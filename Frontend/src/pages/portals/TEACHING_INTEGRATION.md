# Teaching faculty workspace

`/faculty-portal/:screen` now uses `TeachingPortal.jsx`. Existing administrator
screens and student portal behaviour remain in place. Existing user changes to
the API base URL, environment, and auth integration are preserved.

## Connected contracts

- Identity: `GET /api/v1/profile`. If its DTO omits `facultyId`, use targeted
  `/api/v1/faculty/search` requests for the profile employee code/email, requiring
  an exact `userId` and `collegeId` match. Ambiguous mappings are rejected.
  The authentication user ID is never guessed to be a faculty primary key.
- Assignments: `GET /api/v1/faculty-subject-allocations?facultyId=...`.
- Student directory: `GET /api/v1/sections/{assignedSectionId}/students`.
- Subject details: `GET /api/v1/subjects/{assignedSubjectId}`, matching the
  current SubjectsController used by the faculty master data.
- Published schedule: `GET /api/v1/timetable-management/views/faculty/{facultyId}`.
  A missing route or non-JSON response permits the scoped legacy
  `/api/v1/timetables/view/faculty?facultyId=...` route. Authentication and
  permission errors never trigger this fallback.
- Attendance: GET/POST `/api/v1/student-attendance/sessions`, followed by
  PUT `/api/v1/student-attendance/sessions/{sessionId}/mark`.
  `FacultyAttendance.jsx` loads saved registers from the session `/students`
  endpoint after verifying faculty, subject, section and date ownership. Completed
  and cancelled sessions are read-only. History requests cover the last 30 days.
  Bulk marking is explicit, selected students are confirmed before overwrite,
  and submission always includes the full assigned roster regardless of filters.
  A retry can resume a single open session after session creation succeeded but
  marking failed; completed sessions are never overwritten through this flow.
- Examinations and marks: GET `/api/v1/exams`; GET/POST `/api/v1/marks`.
- Leave application: active types/policies from `/api/v1/faculty-leave`, POST
  `/api/v1/faculty-leave/requests` with the authenticated faculty ID.

Teaching screens do not fall back to local mock records. All table headers,
filters and form controls render even when an assignment has no records.
Student detail and CSV export use the loaded assigned roster only. Incomplete
responses and permission failures are surfaced separately from empty data.
The dashboard uses a compact dismissible availability notice; raw HTTP diagnostics
stay in the development console. Unavailable student/schedule metrics show a dash,
and workload charts appear only when a valid timetable response was loaded.
Student administration, setup, marks approval, and result publication controls
are not exposed in this faculty workspace.

## Backend gaps

No faculty learning-material or notifications endpoints were found in the local
backend contracts. These screens explicitly show the missing integration.
The leave list endpoint does not implement a faculty-ID filter, so this portal
does not fetch the institution-wide employee leave history. Provide an
authenticated self-service history endpoint to enable this view.

Backend authorization must independently enforce that the authenticated account
owns the requested faculty identity and subject/section assignment. Client-side
filters are not an authorization boundary. Live API permissions, profile mapping,
and deployment response shapes still need verification with a real faculty session.

## Checks

`node --test src/services/portals/teachingContract.test.js`

`npm run build`

Test coverage includes account/college isolation, missing faculty mapping, failed
roster loading, attendance DTOs, marks ranges, and out-of-assignment students.
