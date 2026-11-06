# Phase 5 progress — faculty payroll and leave

Continued the Phase 4 working tree. No backend, API endpoint, DTO, database or authentication contract changes. This is a partial Phase 5 delivery, not complete reconstruction or visual parity.

## References actually inspected

CMS Inter root: C:/Users/ADMIN/Desktop/cms inter/CMS_Inter/Frontend/src/modules/admin/.

- AdminPayroll/PayrollPage.jsx and PayrollPage.css: compact payroll directory, category/month controls, real service calls, details/modal pattern.
- AdminLeave/LeaveTypesPage.jsx, LeaveManagementPage.jsx and LeaveManagementPage.css: configuration forms, request/history/balance directories, confirmation patterns.
- AdminFaculty/StaffSubjectAllocation.jsx: allocation interactions. Its static Inter-specific academic choices were deliberately not copied; B-Tech keeps its API-based hierarchy.
- AdminMarksEntry/MarksEntryPage.jsx was inspected at entry level only. No marks reconstruction is claimed for this pass.

B-Tech payroll controller and existing frontend services were read to verify capabilities, without editing them. The actual payroll controller exposes GET list/detail/salary-records/payslips/export and PUT hold. It has no salary configuration, process, release/approve or mark-paid mutation.

## Actual files and changes

- FacultyManagement.jsx: removed old payroll implementation and its cached salary/status/attendance-derived financial fallback paths; existing Payroll export now points to PayrollWorkspace, preserving routes. Removed leave-type/policy/decision browser overrides and temporary synthetic IDs. Leave mutations wait for acknowledged APIs; failed approval/rejection cannot move a pending request into successful local history. Removed automatic employee-profile creation from failed approval retry. Leave totals and per-type balances use backend records and display Not provided for missing metrics, with no twelve-day default. Failures on all leave resources are visible with retry; failed resource data is cleared. Read-only leave mutation controls are disabled/hidden and handlers check existing permission scope. Leave detail/configuration/decision shells use shared native dialogs. Document/status loading callbacks have stable dependencies; leave-type eligibility is memoized. Fifteen unused destructured bindings removed. Allocation handlers check existing permission and retain a returned allocation ID before refreshing, preventing duplicate create on refresh failure; missing acknowledged IDs block another submission.
- New PayrollWorkspace.jsx: actual scoped server payroll directory with month, Teaching/Non-Teaching, status, search and pagination. Amounts, attendance and LOP are displayed only from API fields; unavailable values are explicit. Existing supported hold action uses the payroll primary key, busy lock and failure-preserving dialog. Real details and print view retained. Unsupported salary-save/process/mark-paid actions explicitly unavailable. Export uses shared ExportMenu on filtered college records: backend export does not support college scope and must not export unrelated employees. Payroll rows lacking a verifiable college-associated employee identity are excluded instead of guessed.
- New PayrollWorkspace.vitest.test.jsx: scoped actual records, missing salary, hold failure/retry and exact payroll ID, directory failure/retry.
- New FacultyLeaveMutations.vitest.test.jsx: failed approval remains pending and retries existing identity; missing balances do not fabricate entitlement.

No CSS patch was added. Payroll uses FacultyManagement.css and shared view/form/table components. Existing Teaching/Non-Teaching, registration/photo/document/status functionality from Phase 4 is retained; a full browser re-verification has not occurred.

## Verification

Full suite: 259 Vitest tests in 33 files and 441 Node tests passed (700 total). Final focused faculty run: 18 tests passed. See PHASE5_VERIFICATION.json and phase5-evidence. Initial parallel full-suite run hit a five-second department test timeout. The same department tests passed in the subsequent single-worker run. No timeout limit was raised or assertion removed. Focused payroll tests and leave mutation tests passed. Production build passed. Lint has zero errors and 713 warnings, down 29 from Phase 4's 742; remaining hook/unused warnings were not suppressed. All 1,663 protected reference/backend hashes match and backend changed-file list is empty.

## Completion status and exact remaining work

No entire Phase 5 module is claimed complete in this pass. Payroll's existing read/detail/filter/hold frontend capability is implemented; salary configuration, processing and payment transitions are backend blocked. Leave's listed mutation/balance correctness fixes are implemented; full policy/eligibility combinations and live payroll/leave outcomes remain unverified.

Outstanding tasks:
1. Faculty: broaden allocation create/update/delete/partial-refresh tests, all leave type/policy mutation and permission tests, document/download/photo live tests; verify payroll details/exports/hold against authorized account.
2. Curriculum/Timetable: finish remaining individual screens and workflow coverage for electives, credits, semester mapping, faculty assignment, conflict handling, preview and publication.
3. Attendance: finish remaining editor/detail/bulk dialog adaptation and weekly/monthly/report/LOP coverage, actual exports and context-switch testing.
4. Fees: live verification of assignments, payments, receipts, consolidated history, overdue/report exports; keep fee types read-only until verified writable API exists. No new fee behavior was implemented in this pass.
5. Examinations/Results: full remaining marks-entry, grade editor, processing/publication, student details and print/download reconstruction. Phase 4 changes retained; this pass did not complete them.
6. Administration: full role/module-permission and account-status UI/workflows; existing/new college selection only when existing backend supports it; verify onboarding/invitation/history/password/profile routes and actual email-provider states. Existing invitation behavior remains unchanged; no delivered-email claim was added.
7. Quality: remaining modified-file hook warnings and unused legacy helpers; total warnings 713.

Backend dependencies: writable fee-category APIs, payroll salary/process/mark-paid capability, credit-framework persistence and attendance notifications where absent. Do not invent endpoints or pretend local persistence is backend success.

Browser/live API status: blocked by the previously recorded Windows origin/socket/browser access issue. No new browser attempt, bypass, screenshots or live mutation verification in this pass. Desktop/tablet/mobile, dark/light visuals, real keyboard behavior, end-to-end payments and email delivery remain unverified. jsdom tests are not visual evidence.
