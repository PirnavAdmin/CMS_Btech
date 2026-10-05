# Timetable implementation report

Current integration status: see `Frontend/TIMETABLE_INTEGRATION_STATUS.md`. Mock mode now requires **both** development mode and explicit `VITE_TIMETABLE_DRAFT_ADAPTER=true`; the historical enablement description below is superseded.

The active `/timetable` route uses real academic records and section-specific faculty allocations. The former hardcoded demo page is disconnected. No database, schema or migration changes were made.

1. **Files:** Reworked `TimetableManagement`, `TimetableBuilder`, `PeriodSetupStep`, `TimetableWorkspace`, `TimetableGrid`, and `TimetableComponents`. Added `TimetableDashboard`, `SubjectCoverage`, `FacultyTimetable`, `TimetableWorkflow.css`; `services/timetable/timetableDomain.js`, `timetableDraftAdapter.js`, `timetableWorkflowService.js`, and domain tests. Updated period/planner/active-record utilities, timetable route/Sidebar permissions, profile faculty ID normalization, and `tests/timetable.e2e.mjs`. Existing layout, drawer, searchable select, auth, HTTP client and toast infrastructure are reused. Unused legacy demo helpers remain disconnected.

2. **API discovery:** Inspected the repository's `timetable-api-inspection.json`, backend controllers/DTOs and existing adapters. The Swagger is a saved snapshot, not a newly verified deployed-server contract. Actual controller/DTO evidence takes precedence over speculative frontend URL helpers.

3. **Real APIs integrated:** GET `/api/v1/academic-years`, `/departments`, `/courses`, `/branches`, `/sections`, `/subjects`, `/faculty`, `/faculty-subject-allocations`, `/profile`, `/timetable-entries`, and `/api/semester`. Subjects use the existing paginated reader. Existing timetable entries use real POST/PUT/DELETE with numeric backend timetable/slot IDs. Existing allocation PUT updates weekly periods without creating duplicate records. Shared authentication and error handling remain intact.

4. **Missing capabilities:** No timetable master/slot lifecycle, common daily configuration, generation, validation, publication, explicit block constraints, institutional holiday calendar, or room directory API was found in the inspected backend/Swagger. The existing frontend `/timetable-management` URL helper is not called. Real section/entry room references are used, preserving room IDs when supplied; unknown rooms are not invented. Entry active status is never interpreted as publication status.

5. **Temporary adapter:** `createDraftAdapter` stores timetable-only records under `pirnav-timetable-workflow-v2`, referencing real master IDs. Enabled in Vite development; production requires explicit `VITE_TIMETABLE_DRAFT_ADAPTER=true` opt-in. Storage is shared between admin/faculty logins in the same browser, NOT across devices. This is not a production publication database. Failed HTTP calls never trigger mock fallback. Corruption, quota failures and stale revisions are surfaced without resetting saved records.

6. **Hierarchy:** Academic year -> department -> course -> branch -> academic level -> semester, with ID-based filtering and cleared descendants. Supplied study-year fields take priority; otherwise level is `ceil(semesterNumber / 2)`. All valid active sections are selected by default, with checkboxes to narrow selection.

7. **Daily schedule:** Common start time, periods/day, duration, working days, optional break/lunch duration and placement. Live calculated periods/end time; no manual per-period time entry. The requested 09:00, seven 50-minute periods, 20-minute break after P2 and 50-minute lunch after P4 ends at 16:00. Editable effective dates respect academic bounds. Invalid periods, placements, overlaps and midnight overflow are rejected. No Holidays/Non-working Dates textarea is shown.

8. **Weekly requirements:** Uses real `PeriodsPerWeek` from `FacultySubjectAllocationResponse` and `UpdateFacultySubjectAllocationRequest`. Coverage saves the existing allocation while preserving its mapping fields. No credit inference or common hardcoded frequency. Missing/ambiguous demand remains unscheduled and blocks publication in the active workflow. Consecutive-session size defaults to one and changes only through explicit temporary timetable configuration.

9. **Faculty allocation:** Only active section-specific teaching allocations and active faculty are used. Subject-by-section coverage displays faculty names, weekly requirements and exact missing mappings. No random assignment or allocation creation. Optional semester subjects can be deselected.

10. **Generation:** Pure domain/planner helpers outside JSX coordinate selected sections and create a distinct DRAFT for each, using common timings. Deterministic placement prefers spreading each subject across working days, supports explicitly configured consecutive blocks, and reports unmet demand. This is a heuristic scheduler; unscheduled does not prove that no mathematical solution exists.

11. **Global conflicts:** All readable backend entries plus all browser-local draft/published entries participate, including other branches/departments. Checks resource IDs and actual interval overlaps; text room references are used only when IDs are unavailable. Earlier section results enter occupancy before later sections are placed. Fresh reads, local revisions and browser locks protect mutations; browser-local development records cannot offer cross-device concurrency guarantees.

12. **Editing:** Empty/occupied grid cells open the shared right drawer for add/edit/move/subject/faculty/room changes and confirmed removal. Empty cells prefill day, period and section. Local published templates are read-only until explicitly reopened. Draft settings can be saved without regeneration if they preserve existing classes. Existing backend entry CRUD uses the real API and rechecks both backend and local occupancy.

13. **Suggested slots:** Conflicting edits identify faculty, section, subject and time. Deterministic available alternatives respect working days, period/block configuration, rooms and global occupancy. Clicking an alternative fills the form. No AI dependency.

14. **Generate Missing / Regenerate:** Missing fills unmet requirements while retaining all saved rows, IDs, manual additions, edits and moves. Regenerate is under More Actions and requires confirmation; it replaces generated placement while preserving manual rows. Neither action publishes automatically.

15. **Validation:** Checks current academic relationships, allocations, periods, working dates/days, non-teaching intervals, rooms, weekly demand and global conflicts. Compact drawers show results. Located issues switch section and highlight/scroll to the exact class, including the mobile day view. Publication always revalidates fresh data and revisions.

16. **Publication/calendar:** Explicit confirmation shows academic context, selected sections, class count and conflicts. Selected local templates publish atomically. Weekly templates repeat without creating dated class rows. Configured holiday exceptions skip occurrences without mutating the weekly template. Calendar exceptions remain in isolated adapter configuration until a real calendar API exists; an empty list does not claim official holiday coverage.

17. **Faculty drawer:** Faculty names inside grids/coverage open an in-module Today/Week schedule with published subjects, sections, rooms and teaching-session totals. No automatic Faculty Directory navigation.

18. **My Timetable:** Uses real authenticated profile faculty ID, or a unique profile user ID -> faculty `userId` mapping. Missing/ambiguous mapping shows an error, never a hardcoded fallback. Aggregates published section schedules across academic contexts. Faculty cannot mutate timetables; students are denied the route. No Student Timetable is implemented. Backend records lacking explicit publication/effective-calendar data are not falsely claimed to be published dated classes.

19. **Mock replacement:** Replace the service composition in `timetableWorkflowService.js` and the `createDraftAdapter` boundary with verified backend lifecycle APIs. Keep UI/domain contracts, explicitly map real period/room/calendar/publication fields, and migrate development storage only through a separately designed migration. Never enable speculative endpoints or error-driven fallback.

20. **Build:** `npm.cmd run build` passes; existing large-bundle warning remains.

21. **Lint:** Focused timetable/component/domain lint passes without warnings/errors. Full-project lint is blocked by the pre-existing conditional `useState` in `src/pages/faculty/FacultyManagement.jsx:610` and reports other existing warnings. That unrelated module was not changed.

22. **Tests:** 37 timetable unit/service tests pass. Intercepted Playwright verifies hierarchy, dates/live periods, optional subjects, two-section generation, faculty drawer, manual move preservation, Generate Missing, regeneration confirmation, validation/publication, authenticated faculty mapping, tablet/mobile and light/dark rendering, persistence, API errors and student exclusion. The browser script also exercises actual backend entry POST/PUT/DELETE routes using intercepted fixtures. It makes no live college writes.

Run from `Frontend`:

```powershell
node --test src/services/timetable/timetableDomain.test.js src/utils/timetablePeriods.test.js src/utils/timetablePlanner.test.js src/utils/timetableUtils.test.js src/services/timetableService.test.js
node tests/timetable.e2e.mjs
npm.cmd run build
npm.cmd run lint
```

The browser script starts/stops its own Vite development server on port 5183 and uses installed Playwright/Edge. `TIMETABLE_TEST_URL` may point at a separately managed development server. Development publication can be tested across accounts in the same browser only; backend lifecycle APIs are still needed for institution-wide publication.
