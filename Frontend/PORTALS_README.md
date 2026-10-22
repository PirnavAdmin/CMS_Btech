# Faculty, Student and User Access frontends

The existing React/Vite application now has three role experiences. Existing administrator URLs and components are retained. Faculty and Student logins go through the existing login service and `/dashboard` redirects to their portal. Non-admin roles cannot navigate into administrator screens through the frontend router. These checks are presentation rules, not production authorization.

## Open the screens

- Administrator: **Settings & Access → User Access Management**, `/user-access`.
- Faculty: `/faculty-portal/dashboard`.
- Student: `/student-portal/dashboard`.
- Former `/my-subjects` bookmarks redirect to the correct portal subject screen.

All new data operations use **mock mode** and visibly identify it. They never fall back to mocks on a real API failure. Existing admin service modules and API contracts are unchanged.

### Isolated development preview

To preview without backend credentials, put this in `.env.local` inside `Frontend`:

```dotenv
VITE_PORTAL_PREVIEW=true
```

Restart `npm run dev` and open `/portal-preview`. Choose Admin, Faculty or Student. These identities use the same sample college workspace so attendance/materials submitted as faculty are visible to the correct student. They do not create backend tokens or issue login credentials. The preview route is disabled in a production build, regardless of the environment flag. Switching preview identities replaces the current browser login; sign out and use the normal login to return to real authentication.

Normal authenticated colleges start with an **empty mock workspace**. Admin can explicitly load samples into an empty mock workspace; the sample banner remains visible. Mock data is stored under `cms-portal-mock:v1:<collegeId>` in this browser's localStorage, separately from live records. It is not shared across browsers/devices and is not suitable for real academic or personal data. Newly created mock users are account-management previews, not usable real credentials.

## Functionality

- Admin: searchable/filterable/paginated users, faculty/student account forms, role and section mapping, confirmed activation/deactivation, simulated reset requests, faculty/subject/section assignments. Administrator identities cannot be demoted or deactivated here. Assignments containing academic history cannot be removed.
- Faculty: dashboard, assigned students/subjects, attendance register with date and duplicate checks, marks with bounds and duplicate checks, weekly timetable, text study notes/import/download, leave requests and cancellations, notifications/read status, profile contact editing.
- Student: dashboard, profile, subjects, attendance progress/history, published results, timetable, notes downloads, read-only fees, notifications. Academic records have no student editing controls or service permissions.
- Marks saved by faculty remain drafts; the sample published result is visible to students. Publishing/approving marks and leave approval remain responsibilities of the existing administration/backend workflow, not simulated production actions.
- Study note import supports `.txt`/`.md` up to 200 KB. Arbitrary document uploads require the backend storage contract.
- Empty, loading, failure and confirmation states; light/dark themes; responsive drawer navigation; accessible native modal dialogs.

## Architecture and changed files

- `src/App.jsx`: lazy portal routes, dashboard role redirect, administrator route guards.
- `src/auth/portalPreview.js`: explicitly enabled development preview; `auth.js` clears the preview marker at sign-out.
- `src/pages/Pages.jsx`: login preserves the backend role when a separate roles array is absent.
- `src/components/Sidebar.jsx`: User Access Management navigation entry.
- `src/layouts/PortalLayout.jsx`, `src/styles/portals.css`: portal shell using existing admin theme variables/sidebar design.
- `src/components/portals/`: shared tables, dialogs, feedback, navigation and guards.
- `src/hooks/usePortalData.js`, `src/services/portals/downloadMaterial.js`: async workspace state and local note downloads.
- `src/pages/admin-management/UserAccessManagement.jsx`: account and assignment screen, reusing DashboardLayout for real admin sessions.
- `src/pages/portals/AcademicPortal.jsx`, `PortalPreview.jsx`: faculty/student screen components and preview selector.
- `src/services/portals/{adminService,facultyService,studentService}.js`: UI-facing service methods; existing admin faculty/student services are preserved.
- `src/services/portals/{serviceProvider,mockService}.js`, `src/mocks/portals.js`: adapter boundary, validations, isolated persistence and fixtures.
- `src/services/portals/mockService.test.js`, `tests/portals.e2e.mjs`: service and browser regression checks.
- `tests/portals-production.e2e.mjs`: production preview/role isolation check.
- `BACKEND_API_REQUIREMENTS.md`: proposed contracts, not implemented endpoints.

`getSnapshot()` returns the documented module snapshot. Replace `portalService()` in `serviceProvider.js` with an HTTP adapter implementing these methods after backend contracts are agreed. Identity and college must come from authenticated backend claims; never trust client-supplied roles/IDs as authorization. No URL for a proposed endpoint is called by this implementation.

## Checks

```powershell
node --test src/services/portals/mockService.test.js src/auth/auth.test.js
node tests/portals.e2e.mjs
npm.cmd run build
node tests/portals-production.e2e.mjs
```

The browser check uses existing local Playwright and Microsoft Edge, starts Vite on port 5192, enables preview for that server only, intercepts backend traffic, and verifies that mock portal interactions do not issue API requests. It covers all 19 academic screens plus access management, mutations, role guards, persistence, material download and mobile navigation. Screenshots are saved in the OS temporary directory as `cms-student-portal-{desktop,mobile}.png`.

Backend implementation, real password delivery, live academic data, document storage and server-side access controls are not integrated by this frontend work.
