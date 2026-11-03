# Stage 2 — Dynamic Sidebar

Date: 3 November 2026. Scope: frontend primary Sidebar only.

## Result

`Sidebar.jsx` now renders its links, section headings and exam/result disclosures from `MODULE_REGISTRY` and `NAVIGATION_SECTIONS`. The two hand-written link arrays and module-by-module JSX navigation tree were removed. A module with valid registry navigation metadata, an existing route and a supported permission key appears without editing the sidebar renderer.

The existing administrator order is preserved:
1. Dashboard
2. College & Academic Setup: Colleges, Academic Years, Departments, Courses, Branches, Semesters, Sections, Rooms & Classrooms
3. Finance: Fee Structure, Fee Management
4. Faculty Management: Faculty Directory, Faculty Attendance, Leave Management, Faculty Payroll
5. Student Management: Student Admissions, Student Profiles, Student Attendance, Student Promotions
6. Curriculum & Scheduling: Subject Management, Credits Management, Elective Management, Timetable Management
7. Examinations & Results: Exam Management (Examination Setup / Exam Timetable), Marks Management, Grades System and Results (Grade Management / Official Results)
8. Campus Services: Library, Meetings / Events, Placement
9. Settings & Access: User Access Management, Roles & Designations

All 31 existing administrator entries remain registered. Academic Levels remains absent because no standalone screen exists. Fee subpages remain internal tabs, not additional sidebar entries. Empty or unauthorized sections have no heading.

Existing main-sidebar Academics destinations for faculty/student users are represented as explicit registry variants: My Subjects, My Timetable and Record Attendance. Campus links retain their prior role eligibility. These links now also require their actual existing permission keys; a role label or null mapping is not a permission grant. No role-specific route was changed. The separate faculty/student PortalLayout and staff portal navigation systems remain unchanged.

## Rendering and active state

- Section/module/child ordering is declarative. Duplicate root IDs or destinations are suppressed.
- Static Lucide icons, existing theme styling and labels are retained.
- Longest matching path/alias determines active ownership. Fee Management no longer competes with Fee Structure, and Faculty Directory does not become active for a denied attendance screen.
- Existing aliases such as /rooms, /roles-permissions, /exam, /examination, /results, /fees/components and /fees/legacy select the intended module/submenu.
- Active parent groups expand on deep links and on subsequent navigation, including browser back after manually closing a group.
- Clicking a collapsed disclosure expands the sidebar and opens that submenu together.
- Link titles, aria-current, decorative icons and valid disclosure controls are preserved/improved. Submenus keep their prior CSS hooks.
- Existing mobile open/close callbacks, sidebar collapse persistence ownership, logo logic and session scroll restoration remain in place.

## Sidebar access and college scope

The existing `authAccessApi.get(collegeId)` adapter is reused. It calls the already-supported `/api/auth/me/access?collegeId=...` contract; no endpoint or DTO was added.

- Permissions are requested for the selected college after academic-context loading completes.
- Results belong to one token, college and retry generation. Changing college/token hides the previous matrix immediately, and late responses cannot overwrite the new context.
- An explicit response collegeId that differs from the requested college is rejected.
- Only confirmed `isSuperAdmin === true` or an explicit boolean view grant for the registered permission exposes an entry. Missing mappings remain denied even for the Super Admin display bypass.
- The previous sidebar fallback that showed all admin links while permissions were missing or failed has been removed. This is a sidebar visibility correction, not a route/authentication/action-permission rewrite.
- Loading, signed-out, error/retry and empty-access states are explicit.
- A missing college selection is shown as a setup hint. It does not by itself remove otherwise authorized modules or impose a mandatory setup chain.
- Prerequisite metadata does not hide modules or masquerade as a permission check.
- The builder supports explicit feature metadata if a real source is supplied. This project has no established centralized feature-availability response contract, so no API feature field was invented or assumed. Existing entries retain their availability metadata.

Backend authorization, App.jsx guards, global search permission behavior, authentication, login normalization and token-refresh behavior were not changed. Known wider permission/route inconsistencies from the Stage 1 audit remain for a separately authorized stage.

## Exact modified files in this stage

1. `Frontend/src/components/Sidebar.jsx` — replace the hand-written navigation tree with the registry renderer and scoped access hook; preserve sidebar shell/logo/scroll behavior.
2. `Frontend/src/components/Sidebar.css` — theme-compatible navigation loading/error/retry text and collapsed-state styling.
3. `Frontend/src/config/moduleRegistry.js` — declarative legacy role variants, sidebar roles, active exclusions, child ordering/aliases and existing disclosure CSS/DOM hooks.
4. `Frontend/src/config/navigationSections.js` — shared Academics section for the existing role-specific main-sidebar links.
5. `Frontend/src/config/moduleRegistry.test.js` — expand registry tests with sorting, permissions, scope, features, aliases, role variants and child inheritance.
6. `Frontend/src/config/navigation.vitest.test.jsx` — expand rendered sidebar regression tests.

## Exact created files

1. `Frontend/src/config/sidebarNavigation.js` — pure sidebar entry/filter/group/active-owner helpers; not route guards.
2. `Frontend/src/hooks/useSidebarAccess.js` — college/token-scoped access loading and retry lifecycle.
3. `Frontend/src/components/navigation/SidebarItem.jsx` — existing-URL navigation link and explicit active/accessible state.
4. `Frontend/src/components/navigation/SidebarGroup.jsx` — reusable disclosure behavior and active submenu rendering.
5. `Frontend/src/components/navigation/SidebarNavigation.jsx` — registry-driven section/item/group renderer.
6. `Frontend/docs/stage-2/README.md` — this report.

The Stage 1 inventory is retained as its historical audit snapshot. Existing unrelated frontend changes from before this request were preserved. No backend files, schemas, packages, API adapters or route definitions were changed in Stage 2.

## Verification results

- `npm run test:architecture`: 11 Node registry/sidebar checks and 17 rendered component tests passed (28 total).
- Existing regression command: `node --test src/auth/screenPermissions.test.js tests/feeManagement.test.js src/utils/academicYearCollege.test.js src/api/academicYearScope.test.js` — 39 passed.
- Combined relevant tests: **67 passed, 0 failed**.
- Targeted oxlint of the new/modified config, renderer, hook and test files: clean. Sidebar.jsx retains one pre-existing unused variable in the untouched logo lookup.
- Frontend production build: passed; the pre-existing large-chunk advisory remains.
- Component tests exercise light/dark theme attributes, consistent icon dimensions, mobile callbacks, expanded/collapsed states, selection, retries and history. They do not constitute pixel-level responsive verification or authenticated live-server/API testing.

## Stage boundary

Completed Dynamic Sidebar only. No Stage 3 route alignment/guard rewrite, global permission centralization, context redesign, screen/component migration, backend change or broader terminology rollout was performed.
