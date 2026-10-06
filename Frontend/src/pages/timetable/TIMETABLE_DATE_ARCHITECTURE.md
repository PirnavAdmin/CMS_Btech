# Timetable date architecture verification

## Result

Semester dates are optional reference information. Timetable validity is independently entered, validated as calendar days, and sent through the real effectiveFrom/effectiveTo fields. The academic hierarchy and semester identity/mapping remain required. No theme or palette changes were made.

The date dependency was removed from schedule setup, input constraints, planner validation, generation, entry validation, draft validation/publication preparation, and occurrence filtering. Missing academic-year dates also no longer impose timetable boundaries. Invalid/equal/reversed timetable dates produce timetable-specific messages. Known disjoint timetable validity periods do not generate false weekly resource conflicts. Today and Week faculty views filter actual calendar occurrences, including holidays.

## Files changed

All paths below are relative to Frontend:

- src/api/apiEndpoints.js
- src/api/timetableManagementApi.test.js
- src/pages/timetable/AcademicSetupStep.jsx
- src/pages/timetable/FacultyTimetable.jsx
- src/pages/timetable/PeriodSetupStep.jsx
- src/pages/timetable/TimetableBuilder.jsx
- src/pages/timetable/TimetableComponents.jsx
- src/pages/timetable/TimetableManagement.jsx
- src/pages/timetable/TimetableWorkspace.jsx
- src/services/backendTimetableService.js
- src/services/backendTimetableService.test.js
- src/services/timetable/timetableBackendWorkflow.js (new)
- src/services/timetable/timetableBackendWorkflow.test.js (new)
- src/services/timetable/timetableDomain.js
- src/utils/timetablePlanner.js
- src/utils/timetablePlanner.test.js
- src/utils/timetableSemester.js
- src/utils/timetableUtils.js
- src/utils/timetableUtils.test.js
- tests/timetable.e2e.mjs
- tests/timetable-backend.e2e.mjs (new)
- src/pages/timetable/TIMETABLE_DATE_ARCHITECTURE.md (this report)

## Real APIs and services reused

The production composition now uses backendTimetableService and a service-oriented backendWorkflow rather than the browser draft adapter. Existing timetableManagementApi/timetableLifecycleApi routes are supported by Backend/Controllers/V1/TimetableManagementController.cs, DTOs/TimetableManagement/TimetableManagementDtos.cs, Services/Implementations/TimetableService.cs and Repositories/Implementations/TimetableRepository.cs, and were checked against the existing timetable-current-openapi.json contract.

Existing /api/v1/timetable-management APIs reused:

- /timetables and /timetables/{id}: master creation, list/detail, draft validity updates.
- /periods, /periods/{id}, /periods/reorder, /timetables/{id}/sync-periods: actual period and slot IDs.
- /calendar: academic-year working days and holiday exceptions; timetable dates are not written into the academic calendar.
- /classrooms and /timetables/{id}/requirements: real classroom IDs and weekly requirements.
- /timetables/{id}/generate, /generate-missing, /regenerate: backend generation.
- /timetables/{id}/entries and /entries/{entryId}: backend manual CRUD.
- /timetables/{id}/validate and /publish: server validation and publication.

The existing entry-only CRUD workflow remains covered by the original browser test in explicit Mock Mode. Academic sources, subjects, departments and faculty allocations continue using existing APIs. Backend request failures propagate; timetable-management 400/500 error bodies are retained in the page alert. No new HTTP endpoints or backend DTO fields were invented.

## Versions, history and remaining backend work

The real master DTO provides timetableId, effectiveFrom, effectiveTo, status, revision and publishedAt. New timetable periods use POST /timetables with a new master ID, and existing periods are opened/edited by ID. Selecting a semester no longer implies one timetable for that semester. Successful publish retains the earlier master and entries in the frontend workflow. Published records are read-only.

This does NOT establish full immutable version lifecycle support in the deployed database. The repository delegates to sp_tt_* procedures whose definitions are absent from the checked-in database scripts. No authenticated deployment/database integration was executed. The backend team must confirm that timetable-create allows multiple masters per academic scope, that publish never replaces/deletes earlier masters, and that server conflicts/occurrences respect disjoint effective ranges. Any real rejection is displayed, without fake date values or local success.

Periods and calendars are shared by academic year. Changes to shared configuration are refused when they would alter published history; existing shared configuration can be reused for a new validity period. Independent historical period/calendar snapshots need backend support. The real reopen operation calls sp_tt_reopen to change the existing record; it is not an immutable clone/version operation. Production therefore offers Create New Timetable Period and does not invoke destructive reopen. A proper clone/revision lifecycle requires backend work.

Generation and multi-section publishing use multiple real requests. There is no verified atomic batch contract; partial persisted work is refreshed after failures and the original failure remains visible. Server transactions/concurrency enforcement, selected-subject requirement semantics, and manual-entry preservation during regeneration require deployed-procedure verification. This ticket must not be described as fully production-ready versioning until those backend checks/gaps are resolved.

## Mock capability

Production has no browser-local timetable persistence and no fallback to mock data. The existing development adapter remains available only with both import.meta.env.DEV and explicit VITE_TIMETABLE_DRAFT_ADAPTER=true. It is visibly labeled Mock Mode and does not claim institution-wide publication. The original E2E exercises that development mode; the new production-adapter E2E explicitly disables it. Both browser tests intercept every API request and write no live college records.

## Verification

- Timetable unit/API/service/domain suite: 72 passed, 0 failed. Covers missing/valid/invalid semester dates, missing academic-year dates, independent/extended timetable dates, invalid formats, equal/reversed ranges, stale hierarchy, resource validity overlap, holidays, CRUD, version history, errors, generation, validation and publication.
- Original tests/timetable.e2e.mjs: passed. Covers academic cascade, multi-section generation, subject selection, manual move/edit/delete/add, Generate Missing, regeneration, validation/publication, faculty mapping/Week, responsive/mobile/dark behavior, legacy real entry CRUD, API failure and access restrictions.
- New tests/timetable-backend.e2e.mjs: passed with the production adapter. Missing semester dates, extended validity into 2027, equal-date rejection, master creation, generation, validate/publish, preserved prior published master, no local draft storage, and exact 500 API error.
- Targeted oxlint across timetable pages/services/utilities, API boundary/tests and browser scripts: passed.
- Repository-wide npm.cmd run lint: failed in existing unrelated code, including conditional hooks in FacultyManagement.jsx. Those files were not changed.
- Broader unit sweep: encountered existing failures in facultyService, facultyLeaveBalances and toast tests; the final timetable-specific suite is green.
- Typecheck: unavailable; no typecheck script or tsconfig is configured.
- npm.cmd run build: passed, 217 modules transformed. Existing large-chunk warning remains.
- git diff --check: passed.
- Search audit: removed the old selected-Semester date error and semesterPlanning overwrite path; no timetable creation blockers based solely on missing semester startDate/endDate remain.

Commands use npm.cmd/npx.cmd on Windows because the machine blocks PowerShell npm.ps1 scripts. Unit/build logs are in Frontend/test-results/timetable-date-unit-tests.log and timetable-date-build.log (ignored artifacts).
