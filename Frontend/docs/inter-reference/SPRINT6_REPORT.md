# Sprint 6 — Curriculum and Timetable progress

Superseded for current status by [Sprint 6 finalization](SPRINT6_FINALIZATION.md). This report preserves the pre-finalization evidence.

Sprint A remains OPEN. No module or sprint is declared code-complete, and Sprints B–E were not started. Prior Phase 1–5 changes were retained. No backend, endpoint definitions, DTOs, database or authentication contracts were changed.

## Implemented

- Subjects: reused the full existing engineering editor for Electives, with safe once-only route entry after academic options load and return navigation on save/cancel. Removed the truncated elective-only edit dialog. Restored the existing supported delete workflow in the directory. It checks real dependency counts, respects delete permissions, requires confirmation, blocks concurrent deletes and keeps backend errors visible. Added edit-failure/retry, activation and dependency/delete regression checks. Existing engineering fields, status workflows and direct details routes remain intact.
- Credits: restored the previously unreachable Student Credit Registrations workspace alongside Credit Configurations. Replaced its old hidden student layout with a compact API-backed directory, student/status/search filters, pagination, details, filtered exports and create/edit/drop actions. New registrations start Registered without inventing grades or completion. Completed/Failed states require an explicit valid grade. Student/subject course, branch and semester IDs must match; selected working year scopes registration reads and student choices. Existing registration identity is locked during edit and after partial creation failure. Acknowledged IDs/writes survive retry; missing IDs block blind creation. Configuration minimum/maximum credits are editable and preserved on save/deactivation. Subject configuration uses actual subject ID rather than first matching code. Failed summary reads now expose a read-only retry. Backend summaries and missing values remain authoritative; no graduation eligibility or missing grade points are fabricated. Removed obsolete cache/filter/render helpers belonging to the unreachable layout.
- Electives: semester options now come from actual scoped API records and save their IDs; course/branch/year changes clear semester choices. Group-subject loading failure is visible and blocks linking until retry. Partial allocations retain acknowledged selection IDs so retries do not repeat successful allocations. Replaced signed-in account profile identity with an explicit authorized student-directory picker. Student Selection reads actual student selections/results using existing services and offers only groups matching the student's course/branch/semester/year. Acknowledged selection writes are retained for read-refresh retry. Existing groups, subject links, approvals, allocation reports and engineering fields were preserved.
- Timetable: fixed filtered export column accessors and resumable batch publication that skips already published history. Added builder, slot/conflict/revision/publication and acknowledged-write refresh regression coverage. added explicit load retry and readonly create protection. Mutations check existing permissions and immediate request locks. An acknowledged write followed by failed refresh blocks further changes and exposes a refresh-only retry, preventing repetition of the saved operation. Existing planning, conflict checks, preview, faculty schedule, publication and backend workflow services remain in place.

## Screen accounting and completion checklist

Counts below identify primary screen families examined in the existing source, not new pages. Dialogs, steppers and confirmations belong to their owning workspace. Updated is not equivalent to reconstruction sign-off.

| Area | Primary families inspected | Fully signed off | Updated/partial this sprint | Untouched primary families this sprint |
| --- | ---: | ---: | ---: | ---: |
| Subjects (directory/editor flow; direct details) | 2 | 0 | 1 | 1 |
| Credits (configuration; student registrations) | 2 | 0 | 2 | 0 |
| Electives (subjects, groups, selection, approval, allocation, report) | 6 | 0 | 3 | 3 |
| Timetable (dashboard, builder/preview, faculty schedule) | 3 | 0 | 2 | 1 |
| Faculty assignment dialog | 1 | 0 | 0 | 1 |

Untouched means unchanged in this sprint, not absent from prior migrations. Faculty allocation's existing seven regression tests were rerun. Attendance, Fees, Examinations/Results and Administration were not re-inspected or modified in Sprint 6; their Phase 5 partial status remains unchanged.

Supported workflows exercised by focused tests: subject list/details/create/edit retry/activate/deactivate/delete dependency checks/readonly/direct routes; credit configuration edit/deactivation/create, registration create, Registered state, completion with real grade, update retry without duplicate create, missing identity, drop confirmation, details, readonly and loading retry; elective group creation/read-refresh retry and missing identity, subject-link retry, approval failure retry, partial allocation retry, student selection submission/read-refresh retry and actual student identity/mapping; timetable load retry and readonly creation; existing faculty allocation create/edit/delete/dependencies/permissions/retry checks. Existing timetable service/domain/lifecycle tests were also rerun.

## Exact remaining Sprint A work

1. Complete the remaining negative/dependency/context-race coverage for Credits and Subject direct-route failures. The supported create/edit/status/delete/drop paths have focused tests; this is not all-workflow sign-off.
2. Finish full screen sign-off for elective reports and faculty schedule/assignment interactions. Group update/delete/status, group-wide credits/type/dates are backend-blocked: the verified controller exposes group GET/POST and group-subject GET/POST only. Unsupported actions are explicitly unavailable; no local persistence is substituted.
3. Finish timetable weekly-requirement mutation/recovery coverage. Builder date/setup, save/remove failures, conflicts, validation/publication, readonly preview, revision conflicts and root acknowledged-write/read-refresh recovery now have component tests. Partial publication retries only remaining drafts; reopening published timetables remains unsupported by the existing backend workflow.
4. Complete reference-level visual review when browser access is available. Sprint B remains queued until Sprint A's frontend-supported workflows meet the completion bar.

## References and files

Actual reference sources used: CMS Inter Frontend/src/modules/admin/AdminSubjects/SubjectManagementPage.jsx and SubjectManagementPage.css (compact directory, context, grouped form and dependency-aware delete/deactivate); AdminTimetable/TimetablePage.jsx and TimetablePage.css (context, slot edit/delete/publication, directory/form structure). Prior StaffSubjectAllocation.jsx comparison was retained for the unchanged faculty-allocation regression checks. Inter has no identical engineering credit/elective DTO; its subject configuration patterns were applied while preserving B-Tech APIs and academic rules.

Twelve actual frontend source/test files are listed in SPRINT6_CHANGES.json. No new page, route or CSS patch file was added. Backend source was read only to verify existing Credit, Subject and Student Elective capabilities.

## Verification and limitations

Current exact results are recorded in SPRINT6_VERIFICATION.json. Production build and lint pass; lint has zero errors and 689 warnings (710 at sprint start). Service/contract run: 443 passed. The final focused run passed 52 tests across six files. The initial full run was interrupted after a new edit-entry regression stalled; the once-only entry guard fixed it and the focused rerun passed. The fresh full suite passed all 323 tests in 43 files (323.22 seconds). No assertions, timeouts or lint rules were relaxed. All 1,663 protected backend/reference hashes matched; backend changed-file list is empty.

Backend-blocked: institution-wide credit framework/graduation persistence has no existing credit endpoint, so the UI does not infer eligibility. Elective group update/delete/status and group-wide credits/type/dates have no verified writable contract; their controls remain unavailable. Other listed Sprint A gaps are frontend implementation/verification work. Existing backend permissions and academic/dependency validation still govern every request.

Browser and live API verification remain PENDING/BLOCKED by the previously recorded origin/socket limitation. No browser interaction was repeated or bypassed, and no desktop/mobile/theme visual parity or live mutation success is claimed.
