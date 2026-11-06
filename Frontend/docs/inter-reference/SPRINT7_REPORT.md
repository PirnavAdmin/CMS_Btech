# Sprint 7 — Attendance and Fees

Attendance is code-complete for the existing frontend-supported workflows. Browser and authorized live API sign-off remain pending. Fee Management reconstruction has started with academic fee structures and payment receipt handling.

| Attendance screen | Code status | Backend limitations | Live/visual |
| --- | --- | --- | --- |
| Faculty classroom | Implemented and code-tested | Only assigned scopes; completed sessions must be reopened before editing | Pending |
| Student register and marking | Implemented and code-tested | Real section assignment required; no implicit absent marks | Pending |
| Faculty daily and bulk | Implemented and code-tested | Uses existing attendance and bulk contracts | Pending |
| Faculty self-attendance | Implemented and code-tested | Writes require existing permissions; punch times come from the server | Pending |
| Attendance reports | Implemented and code-tested | Reports use returned marks/statuses; no inferred leave or LOP | Pending |

Classroom history, scoped rosters and correction now use the real APIs. An acknowledged session survives a failed marking request. Student marking separates an acknowledged write from a failed read refresh. Faculty self-attendance replaces seeded records and local punches with the signed-in faculty identity, backend history and server-timed punches. Daily, weekly, monthly and per-student reports use the filtered data for export.

Fees: the academic directory reads scoped backend plans, draft edits use the existing revisioned PUT contract, and lifecycle actions refresh from the backend. A confirmed payment is distinct from an official receipt; missing amounts, modes and balances are unavailable. A payment ID alone does not enable printing an official receipt.

Fee Types remain read-only because there is no verified writable endpoint. The academic fee plan API does not expose draft deletion. Hostel/transport configuration is not part of the completed academic directory work; its existing local paths need backend integration. Next: finish the wider fee workflow, including academic directory pagination, facility fee persistence, student assignment, partial/full collection, consolidated history, overdue and report sign-off using the existing Student Integration and finance APIs.

Reference sources inspected: CMS Inter modules/faculty/pages/FacultyStudentAttendance.jsx and FacultyMyAttendance.jsx, with the corresponding CSS in modules/faculty/styles; modules/admin/AdminAttendance/AttendancePage.jsx/.css and modules/admin/AdminFees/FeeManagementPage.jsx/.css. Applied the existing reference layout and interaction patterns with B-Tech forms, permissions and academic mappings.

Frontend files changed:
- src/pages/portals/FacultyAttendance.jsx
- src/pages/portals/FacultySelfAttendance.jsx
- src/pages/attendance/Attendance.jsx
- src/pages/fees/FeeManagement.jsx
- src/api/apiEndpoints.js
- src/services/portals/teachingContract.js
- src/services/portals/teachingContract.test.js
- src/services/academicFeeDraftUpdate.js
- src/services/academicFeeDraftUpdate.test.js
- src/services/verifiedFeeCollection.js
- src/components/FacultyClassAttendance.vitest.test.jsx
- src/components/FacultySelfAttendance.vitest.test.jsx
- src/components/AttendanceWorkspace.vitest.test.jsx
- src/components/VerifiedFeeCollection.vitest.test.js
- src/pages/fees/academicFeePlan.vitest.test.jsx

Verification: the first full run passed all 356 tests. The final full run passed 359 of 360; an unchanged public-route test timed out and passed on the separate 16-test rerun. Focused workflow run: 28 passed; updated directory and faculty checks: 16 passed. Service/contract tests: 460 passed. Build passed. Lint: 0 errors, 679 to 676 warnings. All 1,663 protected hashes matched. See SPRINT7_VERIFICATION.json and sprint7-evidence. No backend files, endpoints, DTOs, authentication, routes or CSS patch files were changed. The frontend API wrapper calls the existing academic draft update endpoint.
