# Stage 1 — Audit, Registry and Icons

Date: 3 November 2026. Scope: frontend only.

## Delivered

- Audited App routes, nested fee routes, pathname-dispatched faculty/attendance screens, faculty/student/staff portal definitions, the administrator sidebar, global search, authentication/permission utilities, academic context, API configuration, theme tokens and shared components.
- Added a declarative, deeply frozen registry for **41 existing modules/route families**. **31** are current administrator-sidebar modules; the remaining entries describe account, role-workspace and system routes. No standalone Academic Levels screen exists, so no navigation entry was fabricated.
- Generated **192 route/configuration entries across 188 distinct route patterns**, plus a ledger of **47 existing page JSX source files**. Entries deliberately retain redirect aliases, router containers, wildcard patterns and duplicate source declarations. A source inventory is not a runtime reachability guarantee or a claim that every API is deployed.
- Added **43 statically imported icons**, verified against installed `lucide-react` **1.65.0**. All 31 major administrator modules have distinct glyphs matching the requested mapping. The Academic Levels glyph is available, but no nonexistent screen was added.
- Wired the existing administrator sidebar to the registry's icon identities. Existing labels, groups, links, permission filtering, active-route functions, disclosure controls, collapse/mobile callbacks, logo loading and scroll restoration are preserved.
- Added a reusable ModuleIcon with 20px sizing, 1.8 stroke width, currentColor, decorative defaults and an optional accessible label. A scoped CSS override removes legacy neon icon colors/glows from this sidebar and inherits its already-readable link colors. Role-portal icon systems and their styling are unchanged.

## Inventory and reproducibility

- `module-inventory.md`: IDs, current labels, existing paths, sections, icon identities, actual permission keys, observed route-role eligibility and scope.
- `screen-inventory.md`: readable screen/route ledger including component file, source line, permission, guard, scope, dependencies and UI pattern.
- `screen-inventory.json`: machine-readable source ledger and duplicate declarations.
- `page-files.json`: all page JSX source files; private panels/dialogs are not falsely represented as separate route URLs.
- Run `npm run audit:navigation` from Frontend to regenerate all four inventory artifacts.

The scanner resolves literal JSX Route paths, nested hostel/transport fee routes, the configured faculty dashboard expression, existing portal configuration and explicitly audited pathname dispatchers. UI patterns are inferred from the source component/route purpose; dependencies summarize record configuration rather than asserting a universal setup chain. Undiscovered or role-only permission mappings remain null and are explicitly annotated. Unknown future dynamic route expressions require extending the scanner, not guessing their meaning.

## Architecture findings

### Navigation and routing

Navigation metadata currently exists in:
- `src/components/Sidebar.jsx`: administrator links, exam/result disclosures and legacy role links.
- `src/layouts/DashboardLayout.jsx`: global-search links, page names and breadcrumbs.
- `src/utils/feeNavigation.js`: two finance navigation owners, internal tabs and breadcrumbs.
- `src/components/portals/portalNavigation.js`: teaching/student portal definitions and portal home rules.
- `src/features/faculty/routeConfig.js`: concrete faculty workspace routes.
- `src/pages/staff-portal/StaffPortalLayout.jsx`: staff navigation.
- `src/auth/screenPermissions.js`: existing route-prefix permission mappings and additional shared screens.

`App.jsx` remains the route entry point. Fees has its own nested Routes, while administrator faculty screens dispatch through pathname matching. Faculty, student and staff shells use parameterized portal URLs. Existing lazy loading and route guards remain unchanged.

The registry is the new shared metadata foundation; only its icon identities are consumed by the sidebar in this stage. Converting links/group rendering and other metadata consumers to the registry belongs to the next stage. Existing navigation arrays remain intentionally in place until that controlled migration.

### Duplicates, aliases and terminology

- `/roles-designations` is declared twice in App.jsx (lines 312 and 330 at audit time). Left unchanged; route cleanup is outside this stage.
- `/roles-permissions` and `/rooms` are existing aliases; multiple exam-timetable and result URLs are compatibility routes/redirects. They are inventoried, not removed.
- Dashboard/Colleges previously shared FiHome. Departments/Rooms shared FiGrid. Academic Years/Timetable/Leave/Meetings shared FiCalendar. Fee Management/Payroll shared FiCreditCard. Student/Faculty Attendance shared FiCheckSquare. Icons are now distinct for those major modules.
- Finance uses Fee Structure/Fee Management in navigation but Fee Plan wording in several headers/breadcrumbs. Credits/Credits Management, Grade Management/Official Results and the combined Grades System and Results labels vary between consumers. Terminology changes are recorded for later migration, not applied across screens in this stage.
- No standalone Academic Levels route/component is registered in App.jsx. CourseStructure remains available at `/courses/structure` under Courses.

### Roles and permissions

The actual permission keys were cross-checked against the existing frontend mappings and, read-only, the backend AccessGovernanceService ModuleKeys list. No backend file was modified.

Key shared mappings:
- Fee Structure and Fee Management both use `fees`.
- User Access Management and Roles & Designations both use `roles_permissions`.
- Academic Years uses `academic_years`; faculty directory/attendance/leaves/payroll have separate existing keys.
- Complete per-module mappings are in module-inventory.md.

Roles in the registry describe current frontend guards, not invented backend roles or blanket grants. Existing auth normalization collapses Super Admin/College Admin to `admin`; Principal/HOD and other non-teaching roles normalize to `staff`. These rules were not changed.

Existing limitations retained for a later permissions stage:
- Sidebar.canView falls back to normalized admin access while the matrix is unavailable, and canViewScreen returns true for `admin`. The registry introduces no equivalent fallback and does not authorize anything.
- Nested admin route guards mean some apparently faculty/student-eligible inner routes are effectively administrator-only. Examples: `/timetable` and `/exam/student-schedule` despite their wider inner allowedRoles arrays. The inventory records the effective intersection.
- Main-sidebar campus links are rendered for multiple role names, but App.jsx places the corresponding administrator screens under admin-only guards.
- `/user-access` has a role route guard and sidebar permission check, while its generic canViewScreen prefix mapping is absent. Do not infer new permissions from that absence.
- Some faculty routes such as exams/electives/documents appear in configuration but have no portalModules permission mapping and are not personal-workspace exceptions. Presence in the registry/configuration does not grant access.
- Null permissions mean no backend key was established for that route family or it is an existing public/role-alias route. They must never become implicit permission grants in a future renderer.

### College/academic context and feature availability

AcademicContext already owns colleges, years, departments, courses, branches, semesters and sections. It persists validated context, scopes academic years, cancels stale hierarchy requests by request identity and listens for updates. Existing academicService and collegeScope utilities should be reused in later stages.

Registry prerequisites are descriptive record-configuration metadata, not visibility checks. Academic fee plans and hostel/transport fee plans have different applicability requirements; the screen inventory distinguishes the facility scope. Faculty creation is not made dependent on fees, and rooms are not made dependent on an artificial linear chain.

No centralized backend-enabled-feature contract was found in the sidebar/access response consumers. availability.featureKey remains null, with an explicit unknown-contract source. No feature name or backend permission was invented.

### APIs and shared UI

API configuration stays in `src/api/apiEndpoints.js`, `src/auth/authApi.js`, `src/auth/collegeApi.js`, service modules, Frontend/.env and the Vite proxy. Stage 1 does not change URLs, request bodies, authentication, token refresh, response adapters or college headers.

Existing reusable components include PageHeader, FilterPanel, SearchableSelect/ProjectSelect, TablePagination, TableActionButton, StatusBadge, ViewDialog, EntityDetails, EmptyState/DirectoryEmptyState, StatusConfirmDialog, ExportMenu, ContextGuard and AcademicContextSelect. Repeated table/form/filter wrappers remain candidates for later incremental standardization. No new DataTable/FormLayout/context/auth layer was introduced.

Existing ModuleAvailability development previews and portal-local preview labels are not evidence of live institutional integrations. They were not changed, extended or replaced with new mock data.

### Themes and responsiveness

`src/styles/erp-theme.css` defines light/dark surfaces, borders, brand/text colors, radii and sidebar background. DashboardLayout applies the existing data-theme and persisted theme selection. Older CSS contains overlapping sidebar overrides and forced icon tones/glows. The Stage 1 icon override is scoped to `.sidebar--module-icons`, uses inherited currentColor and preserves existing active/hover backgrounds and text contrast.

Component tests cover both theme attributes, icon attributes, existing collapsed/open states and mobile close/collapse callbacks. Pixel-level responsive layout and authenticated live-browser/API behavior were not verified by these tests.

## Current sidebar structure (unchanged)

1. Dashboard.
2. College & Academic Setup: Colleges, Academic Years, Departments, Courses, Branches, Semesters, Sections, Rooms & Classrooms.
3. Finance: Fee Structure; Fee Management (internal finance tabs remain internal).
4. Faculty Management: Faculty Directory, Faculty Attendance, Leave Management, Faculty Payroll.
5. Student Management: Student Admissions, Student Profiles, Student Attendance, Student Promotions.
6. Curriculum & Scheduling: Subject Management, Credits Management, Elective Management, Timetable Management.
7. Examinations & Results: Exam Management → Examination Setup / Exam Timetable; Marks Management; Grades System and Results → Grade Management / Official Results.
8. Existing role-conditioned Academics links remain as written.
9. Campus Services: Library, Meetings / Events, Placement.
10. Settings & Access: User Access Management, Roles & Designations.

## Exact Stage 1 file changes

Created:
- `src/config/moduleRegistry.js`
- `src/config/navigationSections.js`
- `src/config/iconRegistry.js`
- `src/config/ModuleIcon.jsx`
- `src/config/moduleRegistry.test.js`
- `src/config/navigation.vitest.test.jsx`
- `scripts/audit-navigation.mjs`
- `docs/stage-1/README.md`
- `docs/stage-1/module-inventory.md`
- `docs/stage-1/screen-inventory.md`
- `docs/stage-1/screen-inventory.json`
- `docs/stage-1/page-files.json`

Modified:
- `src/components/Sidebar.jsx`: static registry icons and scoped style marker; existing control/filter/link behavior retained.
- `src/components/Sidebar.css`: restrained, consistent icon styling scoped to the main sidebar.
- `package.json`: audit:navigation and test:architecture scripts only; no dependencies added.
- `vite.config.js`: include architecture component tests in the existing Vitest configuration. The previously changed API proxy base URL is retained.

All paths above are relative to Frontend. Existing fee, onboarding and base-URL edits present before this request were preserved. Backend working tree remains clean.

## Validation

- `npm run audit:navigation`: 41 modules, 192 entries, 188 distinct patterns; no unclassified entries; one duplicate App route (`/roles-designations`).
- `npm run test:architecture`: 4 Node registry/inventory checks plus 6 component tests passed.
- `node --test src/auth/screenPermissions.test.js tests/feeManagement.test.js src/utils/academicYearCollege.test.js src/api/academicYearScope.test.js`: 39 existing regression tests passed.
- New config/audit files pass targeted oxlint with no warnings. The existing Sidebar retains its pre-existing unused logo variable and state-in-effect warnings; no unrelated cleanup was applied.
- Production build: passed; Vite retains its large-chunk advisory.
- No real authentication, API mutations or backend/database changes were performed.

## Stage boundary

Stage 1 is complete as Audit + Registry + Icons requested for this turn. No dynamic sidebar migration, route/permission rewrite, context changes, terminology rollout, generic screen migration or later stage was undertaken. Inventory findings above provide the evidence for a separately authorized next stage.
