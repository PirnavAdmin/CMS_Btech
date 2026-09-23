# Compact timetable workspace

Implemented at `/timetable`, using the existing Timetable Management sidebar item and protected dashboard route. No separate Edit tab: generation, manual add/edit/move/remove and regeneration live in **Create & Manage Timetable**. Old `?view=edit` and `?view=publish` links resolve to this screen. Publication is a confirmation in the workspace, not a separate view.

## Files

- `TimetableManagement.jsx`: five views, academic cascade with a selectable year (current year by default), dashboard, date views, exports and service actions. Faculty and classroom views filter by resource and year without inheriting hidden branch/section filters.
- `TimetableWorkspace.jsx`: viewport-sized context, generation toolbar, status, issues, subjects, validation and publication confirmation.
- `AcademicContextBar.jsx`: six cascading desktop selectors and a mobile filter drawer.
- `WorkspaceDrawer.jsx`: shared right drawer/compact modal with focus trapping, Escape, focus restoration and internal scrolling.
- `TimetableComponents.jsx`: compact grid with sticky day/time headings, internally scrolling mobile day tabs and a Details/Edit/Move/Add drawer. Saves and moves report actual faculty/section/subject conflict references.
- `TimetablePlanner.jsx`: controlled calendar, periods, rooms and requirement settings, rendered only inside the planning drawer. Settings stay in workspace state when the drawer closes; unsaved changes block Validate/Publish until saved or generated.
- `TimetableManagement.css`: existing theme variables, responsive grid and dark-mode support.
- `../../utils/timetablePlanner.js`: calendar exceptions, requirements, deterministic generation, period validation and future date/attendance lookup.
- `../../utils/timetableUtils.js`: shared faculty/section/room overlap engine and backend payload adapter.
- `../../services/timetableService.js`: real API reads/writes where supported and a separate, explicit local draft/publication adapter.
- Planner, conflict and service unit tests, plus `../../../tests/timetable.e2e.mjs`.

## Verified API capabilities

The existing Swagger snapshot is `Frontend/timetable-api-inspection.json`. It was inspected for this redesign. A fresh read of the configured backend Swagger returned HTTP 502 on 2026-09-23, so no new capability is assumed.

Reused APIs: academic years, courses, branches, semesters, sections, subjects, faculty, faculty subject allocations, student profiles/admissions and `/api/v1/timetable-entries`.

Swagger exposes GET/POST `/api/v1/timetable-entries` and PUT/DELETE `/api/v1/timetable-entries/{timetableEntryId}`. Entry writes require existing numeric timetable and slot IDs; the existing `timetableService.save/remove` adapter retains these real contracts. The UI reads these records and checks them for conflicts. It does not send locally generated UUIDs to these APIs.

No timetable-header creation, slot master/setup, timetable draft/publication, holiday/working-calendar, room master/room type, or scheduling-specific faculty availability API was found. Entry `status` is active/inactive, not proof of publication. Backend entries without confirmed publication/calendar data are excluded from published/date-specific views.

Subject Management currently contains local sample subjects (`SUB-*`). These are not backend IDs. The timetable uses real `/api/v1/subjects` records used by faculty allocation APIs; it does not fabricate or duplicate subjects, faculty or sections. Subject Management itself is unchanged.

## Persistence and scheduling

Temporary plans are explicitly saved in account-scoped browser storage (`pirnav-timetables-v1:<user>`). This is not an API-error fallback. Every generation/save/publication fetches fresh real masters and all backend entries; a failed read blocks the operation. Browser Web Locks and revision checks protect concurrent edits in the same browser. This is not a replacement for server-side multi-user conflict enforcement. Different accounts/devices do not share these drafts or local publications.

Generation uses a weekly template, never one database row per calendar date. It takes the intersection of available academic-year/semester dates. An administrator explicitly selects working weekdays, enters approved holidays/non-working dates and confirms calendar review. Missing dates must be entered; no institutional calendar is invented. Date lookup and Today's Schedule exclude holidays, weekends/non-working weekdays, unreviewed calendars and out-of-range dates. A two-year calendar enumeration limit protects browser responsiveness.

Existing real period IDs/times are suggested from entries. Where no setup API exists, administrators configure clearly local periods. Rooms are references already present in sections or timetable entries, with real room/classroom IDs preferred when available; the current API supplies text room references. No room master is created.

Weekly demand comes from a consistent positive `periodsPerWeek` value on matching active faculty allocations, or an explicit local planning setting. Missing/ambiguous demand is reported; credits and subject names are not used to invent frequency. Explicit consecutive periods per session support labs; blocks must be adjacent without crossing breaks. Room type compatibility is checked when real type metadata is available. Lab suitability cannot be verified from today's text-only room source.

The generator deterministically attempts constrained subjects first (fewer faculty, larger blocks), balances weekdays, and tests every candidate against retained draft entries and existing backend/local schedules. This is a heuristic, not an optimizer or a proof that no feasible solution exists. Unplaced demand remains visible as scheduling issues and prevents publication.

## Validation and safe editing

The shared conflict rule is `newStart < existingEnd && newEnd > existingStart`. It independently compares faculty ID, section ID and room/classroom ID, falling back to normalized room text only when IDs are unavailable. Adjacent classes are allowed; editing excludes the current record. Missing times on a potentially conflicting existing record block validation rather than assuming availability. Weekly conflicts are conservative across existing schedules when their effective calendar is unavailable.

Manual adds, edits and moves additionally validate configured periods, working dates, room selection, real subject/section mappings and active faculty allocations. Publication revalidates all references, conflicts, calendar bounds and unscheduled/excess demand. Changed masters, stale revisions, storage errors or new backend conflicts cannot be reported as successful saves.

Generate Missing runs directly and retains existing IDs/manual adjustments. Validate fetches current masters/backend entries, checks the saved revision and full publication requirements, and performs no storage write. Full regeneration has a separate explicit replacement confirmation. Computation/validation completes before the draft is atomically replaced. A partial valid generated result remains a draft with visible issues; it is not publishable until resolved.

Faculty, student and classroom views derive from the same published records. Students resolve through their real current year/course/branch/semester/section mapping. Classroom cells report published bookings, not guaranteed institutional availability. CSV and print/PDF reuse the existing export component. `classesOnDate()` and the stable `timetableEntryId` alias on local entries provide future attendance integration points; Attendance is not implemented or changed here.

## Validation

- `npm.cmd run build`
- `npm.cmd run lint` (repository-wide warnings are pre-existing; timetable files pass targeted lint)
- `node --test src/utils/timetableUtils.test.js src/utils/timetablePlanner.test.js src/services/timetableService.test.js`
- Start Vite on port 5178, then `node tests/timetable.e2e.mjs` (isolated API fixtures, no live writes).

Browser coverage includes generation, cascade, allocation restrictions, conflicts, same-screen edit/move/remove/add, safe missing/full generation, incomplete-draft publication rejection, successful publication, calendar exceptions, same-record faculty/student/room views, CSV/print, persistence, dark/mobile layout and API failure/retry.

Implementation verification: build passed (existing large-bundle advisory); all 21 timetable unit/service tests passed. The repository suite ran 131 tests: 130 passed, and the unchanged `src/auth/collegeLogoApi.test.js` failed because its VM fixture omits `getAccessToken`. Repository lint exited successfully with 243 existing warnings outside this module; targeted timetable lint reported no warnings or errors. Browser coverage uses intercepted fixtures without live writes, including desktop/tablet/mobile dark mode, internal grid scrolling, context drawers, CSE/course ID collisions, same-screen editing and publication. Screenshots and logs are in `Frontend/test-results/`.

No DB, schema, migrations, Attendance, Subject Management, faculty/payroll, admissions/profiles, CBCS, results or global theme changes were made for this task. Existing sidebar/header design and route integration are preserved.
