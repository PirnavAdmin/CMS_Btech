# Sprint 6 finalization

Sprint A is code-complete for existing frontend-supported workflows; visual and authorized live verification remain pending. Sprint B has begun. No backend, API endpoint, DTO, authentication, database or route changes were made.

| Module | Code status | Backend limitations | Live/visual status |
| --- | --- | --- | --- |
| Subjects | Implemented and code-tested | Backend dependency restrictions still govern deletion | Pending |
| Credits | Implemented and code-tested | Institutional framework/graduation persistence unavailable; no eligibility inferred | Pending |
| Electives | Implemented and code-tested for supported actions | Group edit/delete/status and group-wide credits/type/dates remain explicitly unavailable | Pending |
| Timetable | Implemented and code-tested for supported actions | Destructive reopen unsupported; published history remains read-only | Pending |
| Faculty assignment | Implemented and code-tested | Existing hierarchy and permission contracts retained | Pending |
| Student Attendance | Core admin workflows implemented and code-tested; portal migration still partial | Section-assigned backend roster required; no fallback IDs or marks | Pending |
| Faculty Attendance | Daily, bulk and check-in/out recovery implemented and code-tested; broader portal sign-off partial | Leave/LOP shown only from records; no inferred balances or times | Pending |
| Attendance Reports | Admin reports, filters and exports implemented and code-tested; full portal report coverage partial | Totals use returned sessions/records; missing data stays unavailable | Pending |

## Changes

- Curriculum: weekly requirements now retain write acknowledgement and retry only refresh, validate whole periods, enforce readonly and block repeated writes. Credit context changes clear stale dialogs and ignore old responses, including delayed errors. Added direct Subject error/dependency retry, credit stale-year, elective filtered-export and published faculty-schedule tests. Existing assignment create/update/delete, duplicate and partial-refresh tests were rerun.
- Attendance: compact date/status filters, native dialogs, context-scoped reads, visible error/retry states, current-filter exports, weekly/monthly grouping and actual per-session student reports. Missing rates display Unavailable. Subject/academic selection uses real mapped IDs; new rosters require explicit marks.
- Save recovery: student session creation preserves real identities across roster/mark failures; no fallback subject/section IDs or automatic absent marks. Faculty status/check-in/check-out steps preserve acknowledgements and resume incomplete steps. Successful writes followed by failed reads offer refresh-only recovery. Faculty report exports now retain frontend filters and use actual dated records.
- Faculty classroom attendance now starts with the live service. Removed default sample-student initialization and demo toggle entry paths.

## Actual source references

CMS Inter Frontend/src/modules/admin/AdminSubjects/SubjectManagementPage.jsx/.css and AdminTimetable/TimetablePage.jsx/.css (retained Sprint 6 comparisons); AdminAttendance/AttendancePage.jsx/.css (actual register, summary, filter, status, date, bulk confirmation and report patterns). Engineering academic dependencies and existing B-Tech services were retained.

## Files changed in this continuation

- Frontend/src/pages/timetable/TimetableManagement.jsx
- Frontend/src/pages/credits-management/CreditsManagement.jsx
- Frontend/src/pages/attendance/Attendance.jsx
- Frontend/src/pages/attendance/Attendance.css
- Frontend/src/pages/faculty/FacultyManagement.jsx
- Frontend/src/pages/portals/FacultyAttendance.jsx
- Frontend/src/services/attendanceService.js
- Frontend/src/services/studentAttendanceSaveWorkflow.js
- Frontend/src/services/facultyAttendanceSaveWorkflow.js
- Frontend/src/services/attendanceSaveWorkflows.test.js
- Frontend/src/components/CurriculumFinalization.vitest.test.jsx
- Frontend/src/components/SubjectScreens.vitest.test.jsx
- Frontend/src/components/CurriculumConfiguration.vitest.test.jsx
- Frontend/src/components/ElectiveWorkflows.vitest.test.jsx
- Frontend/src/components/TimetableInteractions.vitest.test.jsx
- Frontend/src/components/AttendanceWorkspace.vitest.test.jsx
- Frontend/src/components/FacultyAttendanceWorkspace.vitest.test.jsx
- Frontend/src/components/FacultyClassAttendance.vitest.test.jsx

## Verification

Final results: 347 Vitest tests in 47 files, 456 service/contract tests, latest focused 41/41, faculty recheck 13/13, production build passed, lint 0 errors / 679 warnings (689 at continuation start; 710 at Sprint 6 start). All 1,663 protected hashes matched; backend changed-file list is empty. Evidence: SPRINT6_FINALIZATION_VERIFICATION.json and sprint6-finalization-evidence. Browser inspection was not repeated or bypassed. No visual parity, real API mutation or production data sign-off is claimed.

## Remaining frontend work in Sprint B

1. Complete faculty classroom live submission, history and correction UI reconstruction/coverage; this pass removes its mock entry path and tests live loading/retry only.
2. Add full marking-dialog hierarchy, roster-change and refresh-after-save interaction coverage beyond the tested service recovery and admin read/report flows.
3. Finish the faculty self-attendance portal and cross-college leave/LOP/report interaction checklist. Admin daily/bulk/check-in/out and dated reports are implemented, but Sprint B is not yet declared fully code-complete.
4. Browser sign-off for responsive layouts, keyboard behavior and both themes remains a separate pending gate. No unsupported backend capability blocks continuation.
