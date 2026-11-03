# Stage 5 — Module Migration + Testing

Completed the user's named Stage 5 only. Followed the master prompt's incremental migration rule: migrate one existing module at a time, reuse working components, preserve business logic and backend contracts. No next-stage work was started.

## Inspection and migration

Reviewed the master prompt, earlier stage reports, current working tree, shared components, existing Academic Year/Department/Rooms/Sections implementations, Academic Year API adapter, college ownership utilities, theme styles and relevant tests. Earlier uncommitted work was preserved.

Migrated **Academic Year Management's directory and add/edit dialog** in the existing combined `AdminManagement.jsx` file. This provides a second production consumer of the Stage 4 components without rewriting unrelated modules.

- Directory now uses `DataTable`, its existing five-row `TablePagination`, `AsyncState` and existing `StatusBadge`. Added sortable raw-date/title/status columns and numeric duration sorting; retained complete filtered export rows and original row action handlers.
- Search/status controls now use `FilterPanel`'s explicit slots, applied indicators and clear action. Existing status identifiers remain `UPCOMING`, `ACTIVE` and `ARCHIVED`.
- Add/edit dialog now uses `FormLayout`, `FormGroup` and `FormField`. Kept `noValidate` and existing explicit validation, field state, auto-activation flag, duplicate-title/overlap/date-order checks and submit handlers. Inline errors are associated with their controls.
- Existing page header, full-page details, export functionality, cycle-generation dialog, activation confirmation, student dependency checks and present/archived edit restrictions remain in place.
- Loading, empty, missing-college and load-failure states are distinct. Failed reads expose manual retry and do not enable cycle generation as though no years existed. Request generations prevent old-college successes, failures or finalizers from replacing the current list/loading state.

## Related regressions corrected

1. **Generated calendar dates:** the existing next-cycle function converted local midnight to UTC before formatting dates. In India time, a June 1 start became May 31 in the submitted payload. Reused local calendar formatting for first/next cycles; the date-only DTO fields and annual cycle logic remain unchanged. Tests assert exact dates. Previously saved records were not rewritten.
2. **Global refresh notifications:** ordinary list reads previously emitted `ACADEMIC_UPDATED`. The Stage 3 context/guard lifecycle can refresh and reopen a screen after that event, causing repeated read notifications. Reads are now silent; successful create/edit, generation and status changes still publish the existing event. Tests verify no event on initial read and exactly one event after creation.

## Exact modified files

Paths are relative to `Frontend/`.

1. `src/pages/admin-management/AdminManagement.jsx` — Academic Year module migration, scoped request lifecycle, calendar-date formatting and mutation-only notifications. Department and other embedded modules retain their earlier implementations.
2. `src/pages/admin-management/AdminManagement.css` — four Academic Year editor-scoped rules adapting the shared form body/actions to the existing responsive modal. Uses existing theme variables/classes.
3. `src/utils/academicYearCollege.test.js` — provide the new request counter and load-error setter to the existing source-extracted ownership regression test.
4. `vite.config.js` — discover the new Academic Year integration suite.

## Exact created files

1. `src/pages/admin-management/AcademicYearManagement.vitest.test.jsx` — 23 rendered integration checks using controlled API fixtures.
2. `docs/stage-5/README.md` — this report.

**Six files total in this stage.** No common component, package, environment, authentication, permission, navigation registry, route URL, backend, schema or API adapter changes. No dependencies installed and nothing committed.

## API and workflow compatibility

Still uses the existing `academicYearApi.getAll/getById/create/update/activate/deactivate` and `studentApi.getAll` calls. The existing API adapter remains responsible for selected-college request mapping and serialization. Tests assert create/update identifiers and payload fields, annual generation payloads, status action IDs and the existing student lookup parameter. No endpoint, permission, master data or DTO field was invented. Auto activation retains its existing preference flag; no new scheduler was added.

Routes remain `/academic-year-management` and its existing `/:id` route. No new deep-link behavior or route definitions were introduced. Previous module inventory, sidebar ordering, icons and permission mapping remain unchanged.

## Verification

- Final focused Vitest command:

  `npx --no-install vitest run src/pages/admin-management/AcademicYearManagement.vitest.test.jsx src/pages/admin-management/DepartmentManagement.vitest.test.jsx src/components/ScreenComponents.vitest.test.jsx src/auth/rolesCollegeContext.vitest.test.jsx src/config/navigation.vitest.test.jsx --maxWorkers=1`

  **77 passed, 0 failed**: 23 new Academic Year checks and 54 earlier component/module/access/navigation checks. Final run includes the notification correction.
- All plain Node tests: **412 passed, 0 failed**, rerun after final source changes. Selected `src`/`tests` files with `rg --files -g '*.test.js'`, excluding `.vitest.test.` files, and passed to `node --test`.
- Focused Academic Year API/ownership, college scope and registry Node run: **22 passed**.
- Full configured Vitest run with `--maxWorkers=1`: **90 passed, 3 failed** out of 93. The failures match Stages 3/4: faculty attendance counter text, and two semester-generation tests blocked by overlapping generated schedule dates. Their modules were not changed. Final notification behavior was subsequently verified by the focused 77-test run.
- Fee-plan suite with `vitest.fees.config.js`: **5 passed** on the sequential rerun.
- Invitation suite with `vitest.invitations.config.js`: **9 passed** on the sequential rerun.
- Initial concurrent broader runs also hit timing failures in otherwise passing section, fee and invitation tests. Lower-concurrency reruns were used to separate those timeouts from the three persistent failures. The project-wide suite is not fully green.
- Targeted lint: **0 errors**; 50 warnings in the large combined legacy module, including unused aliases and hook dependency patterns. The new integration test has no reported warnings. No lint suppressions added.
- Final production frontend build: **passed**, 2,387 modules transformed. Existing large-bundle advisory remains.
- Backend working tree clean. `git diff --check` passed after final edits.

Coverage includes college isolation, late responses/failures, loading/retry, five-row pagination and sorting, search/status filters, empty/missing context, required/inline validation, duplicate/overlapping/reversed dates, exact create payloads, pending-save duplicate clicks, failed-save retention, edit/cancel, read-only details, status confirmations and dependencies, cycle generation, 403 feedback and light/dark render states.

## Limits

No authenticated live-server or pixel-level browser session was used. Rendered tests and CSS inspection verify composition/state, not every viewport's appearance or production server permissions. Existing responsive table overflow, shared form breakpoints and modal scrolling remain in use.

The directory continues to exclude records whose college ownership cannot be established; it does not infer ownership or repair backend records. Existing saved calendar errors, if any, require a separate reviewed correction. Other modules remain available for later incremental migration, but no further module, global visual pass, academic dependency redesign or backend work was started here.
