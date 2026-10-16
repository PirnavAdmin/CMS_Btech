# Class timetable Draft -> Validate -> Review -> Publish

## Implemented behavior

The existing timetable module, grid, drawer, builder, dashboard, routes, toast handling and authenticated API client are reused. No backend or Examination Timetable files were modified.

- **Save Draft** persists an empty or incomplete timetable without generation or publication. Drafts can be reopened from the dashboard. Entry editing uses existing draft-only APIs; last-saved backend timestamps are shown when supplied and their absence is stated explicitly.
- Dashboard filters distinguish Draft and Published. Saved backend statuses remain authoritative; intermediate validation/review states are frontend state and are never submitted as invented API status values.
- Validation combines fresh local academic/period/resource checks, real per-table validation and real global validation. Missing weekly frequency blocks publication even for manually entered classes. Missing faculty/subject mappings, rooms, working days, period boundaries, resource overlaps, continuous labs and explicitly configured workload limits are checked.
- Issues distinguish **Blocking Conflicts**, **Warnings**, and **Missing Required Data**. Entry issues preserve section, day, time, slot, faculty and room metadata. Issues link back to the existing weekly grid. Browsing Conflicts/Unscheduled never replaces the validation decision.
- The review drawer shows academic year, branch, semester, section, subjects, assigned faculty, required/allocated counts, total periods, conflict categories and a weekly grid. Validation and explicit Confirm Review are both required before Publish.
- Publication confirms that the timetable becomes official, rechecks fresh backend content and validation, prevents duplicate requests in this application instance, and refreshes actual backend records after success or partial failure. Backend errors never switch to demo data.
- Published schedules are read-only. Student access uses an explicit authenticated profile student mapping and the documented student-view endpoint. Faculty Today/Week views use the documented faculty-view endpoint. Both exclude unconfirmed/draft records; absent student identity or publication metadata produces an explicit error.
- **Create Revision Draft** now uses the real POST `/timetables/{id}/revisions` API with `{expectedRevision, reason}`. It opens the new backend draft and preserves the published source. The normal workflow no longer substitutes a Demo revision. Historical isolated preview helpers remain disconnected from this action.
- The pre-existing development-only full demo adapter remains explicitly opt-in. In this mode real backend entries are read-only and allocation updates are disabled. No API failure activates it automatically.

## API integration and limitations

Live Swagger returned HTTP 200 on 16 October 2026. Newly available revision and publication-batch routes and DTOs were integrated, and the timetable snapshot was refreshed. Browser tests intercept responses: they exercise the real frontend adapter, not a real deployment. No authenticated live publication is claimed.

Existing draft master, period/calendar/room, requirements, entry, generation, local/global validation, publish, student-view and faculty-view APIs are connected. Shared bearer authentication and error handling are preserved. Timetable requests do not automatically inject undocumented collegeId fields; the classroom directory retains its documented college query.

[TIMETABLE_MISSING_APIS.md](TIMETABLE_MISSING_APIS.md) lists actual versioned revision, mutation-precondition, batch publication, workload-policy and response-contract gaps, with proposed contracts clearly separated from called URLs.

Client freshness checks do not replace server-side concurrency preconditions. Publication now sends a single `/publication-batches` request with an expected revision for every selected draft. Final backend statuses are checked before reporting success; there is no sequential fallback. Server atomicity is not claimed from an untyped response contract alone. Shared academic-year calendar/period changes are refused when they would alter published history. Workload limits are checked only if explicitly loaded, never inferred from credits.

## Frontend files

- `src/pages/timetable/TimetableBuilder.jsx`: independent draft save.
- `TimetableWorkspace.jsx`: validation/review gating, issue details, confirmation and read-only behavior.
- `TimetableReview.jsx`: reusable review drawer and weekly preview.
- `TimetableRevisionPreview.jsx`: historical isolated preview helper; normal revisions now use the real API.
- `TimetableDashboard.jsx`: status filtering.
- `TimetableManagement.jsx`: workflow composition and demo mutation isolation.
- `FacultyTimetable.jsx`, `StudentTimetable.jsx`: official views and loading/error handling.
- `SubjectCoverage.jsx`, `TimetableComponents.jsx`, `TimetableWorkflow.css`: demo-safe controls, read-only details and review styling.
- `src/services/timetable/timetableBackendWorkflow.js`: save, local/global validation, freshness and duplicate-publish guards.
- `timetableDomain.js`: required-data classification, strict requirements and workload checks.
- `timetableDraftAdapter.js`, `timetableRevisionDemo.js`, `timetableWorkflowService.js`: isolated preview persistence and demo safeguards.
- `src/services/backendTimetableService.js`: preserve structured server validation issues.
- `src/api/apiEndpoints.js`: explicit student profile mapping and contract-safe timetable transport. `timetableLifecycleApi.js` maps both newly documented operations.
- `src/App.jsx`, `src/components/Sidebar.jsx`: reuse the existing My Timetable route for students.
- Existing timetable API/domain/workflow tests and two Playwright workflow scripts were updated.

## Verification

- Final production build passed (existing large-bundle warning remains).
- Full lint passed with existing repository warnings when run with one worker. An initial parallel run exhausted host memory; serial test execution avoids that resource issue.
- **92 unit/API tests passed**, covering endpoint contracts, auth/error propagation, empty drafts, missing weekly requirements, exact conflicts, persistence, stale changes without revision numbers, duplicate publication, published-history protection and demo isolation.
- Real-adapter browser fixtures cover save/reopen, generation, validation/review confirmation, publish, retained history and official student/faculty views. They also verify that an API failure remains an error, and real revision creation preserves its published source and validates the copied draft against the proper version lineage.
- Demo browser fixtures cover coordinated section drafts, manual edits, revalidation, review, preview publication, read-only backend entries, no backend mutations, faculty mapping and responsive layouts.

Both browser workflow scripts passed. A compact record is saved in `timetable-workflow-verification.json`.

Run the focused unit suite with `node --test --test-concurrency=1` and the timetable test files. Browser workflows: `node tests/timetable-backend.e2e.mjs` and `node tests/timetable.e2e.mjs`. Build: `npm.cmd run build`. Lint: `node_modules/.bin/oxlint.cmd --threads 1`.
