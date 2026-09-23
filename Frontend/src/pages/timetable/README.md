# Timetable Management

Phase 5 uses `/api/v1/timetable-management` on `VITE_API_BASE_URL`, through the shared authenticated request client and the Vite `/api` proxy in development. The live Swagger contract was inspected on 2026-09-23.

## Integration

- `backendTimetableService.js` maps backend timetable headers, slots, requirements, entries, year calendars and classrooms into the existing three-step interface.
- Setup saves real period configurations, ordering and the academic-year calendar, creates/updates the timetable header, synchronizes slots and saves subject requirements. Periods and calendars are shared across the academic year; the UI loads existing settings before editing.
- Auto Generate and Generate Missing call the backend generation endpoints. Replacement uses `replaceGenerated`, retaining manual classes according to the backend contract.
- Room selections are retained for the current page session and sent with generation. The API has no field to persist a room shortlist on the timetable; reloading offers the current room directory.
- Manual add/edit/remove use nested timetable entry endpoints and numeric classroom/slot IDs. Temporary preview IDs are never sent as foreign keys.
- Validate, Publish and Move to Draft use backend endpoints. Server conflicts and unscheduled reasons remain visible; validation returning HTTP 200 does not mean `valid: true`.
- Faculty, Student and Classroom views call their dedicated view endpoints with the actual record ID, academic year and optional date. Empty selections do not request ID zero. Faculty references from existing backend entries remain available for viewing even if the faculty master omits those records; assignment still requires an active allocation.
- Period/calendar GET requests always include a positive `academicYearId`. All requests use the shared bearer-token, refresh and ngrok-header handling. HTTP failures are not converted to successful empty results.
- Create endpoints legitimately return HTTP 201; reads/updates/validation generally return HTTP 200. Errors retain the real server status.

The management page no longer writes or reads browser-local timetables. Existing account-local drafts are left untouched and are not automatically uploaded. The legacy local service remains isolated for compatibility and its existing unit tests.

Setup spans multiple backend requests; the API has no atomic bulk setup operation or revision precondition parameter. Partial failures remain errors and the screen reloads current server state. Server-side conflict checks remain authoritative for concurrent users.

## Verification

`node --test src/api/timetableManagementApi.test.js src/services/backendTimetableService.test.js src/services/timetableService.test.js src/utils/timetablePlanner.test.js src/utils/timetablePeriods.test.js src/utils/timetableUtils.test.js`

`node tests/timetable.e2e.mjs` uses an intercepted backend and no live writes. Start Vite on port 5181 or set `TIMETABLE_TEST_URL` to the full timetable URL. It covers setup, generation, manual add/remove, validation, publication, three views, reload persistence and API-error recovery.

Live authenticated checks cover list/details, year-scoped periods/calendar, classroom master, validation and supported faculty/classroom views. Live validation can return scheduling issues on an incomplete draft. No live timetable records are created, published or modified by these verification checks.
