# Stage 4 — Reusable Components

Implemented the user's named stage, **Reusable Components**, only. The pasted master document numbers reusable components differently in its final stage list; this work follows the user's explicit stage title. No subsequent academic dependency or visual-standardization migration was started.

## Inspection and scope

Reviewed the master prompt, existing component directory, theme tokens, Department Management, route inventory, and the earlier stage reports. The project already had working `PageHeader`, `FilterPanel`, `TablePagination`, `StatusBadge`, `EmptyState`, `ViewDialog`, `EntityDetails` and `StatusConfirmDialog` components. Reused those rather than introducing parallel header, pagination, dialog or badge systems.

Migrated **Department Management's directory and add/edit form** inside the existing `AdminManagement.jsx` module. Other screens in that combined file were not migrated. Department details, live preview, exports, HOD assignment and activation/deactivation workflows retain their existing handlers and layouts.

## Components delivered

| Component | Contract and behavior |
| --- | --- |
| `DataTable` (new) | Configurable columns, optional value/render/sortValue functions, stable client sorting, controlled client pagination using existing `TablePagination`, row keys/actions, caption and sort accessibility, keyboard-focusable horizontal overflow, loading/error/retry/empty states. |
| `AsyncState` (new) | Loading, error, empty and unauthorized presentation. Reuses `EmptyState`. Only user-triggered retries; does not call APIs or infer permissions. |
| `FormLayout`, `FormGroup`, `FormField` (new) | Native form submission, grouped fields, required native controls, generated label IDs, linked hints/inline errors, form-level errors, busy state and caller-provided submit/cancel actions. Dependent field values/options remain caller-controlled. |
| `FilterPanel` (improved) | Explicit search/filter slots, applied filter labels and clear action even when collapsed. Accepts existing select/date controls and preserves legacy children-based callers. Added disclosure linkage. |
| `PageHeader` (improved) | Named primary/secondary action slots while retaining existing children, title, subtitle, breadcrumb and summary contracts. Department form uses the secondary-action slot. |
| `StatusBadge` (fixed/reused) | Boolean `false` now displays `Inactive` instead of disappearing. Existing labels, domain mappings and tone override remain intact. |
| `ViewDialog` + `EntityDetails` (reused, unchanged) | Existing responsive, scrollable, read-only details presentation and close/focus behavior verified. No duplicate `DetailsDialog` was created; Department's existing full-page details flow remains intact. |
| `StatusConfirmDialog` (reused, unchanged) | Existing confirmation and busy states retained for department status actions. |

`DataTable` accepts **complete filtered client rows**, not a page returned by a server. Filtering, API calls, permission checks, entity identifiers and mutations remain in the owning module. No sorting state or UI component writes to storage or changes a DTO. Other modules can adopt these components incrementally; this stage does not migrate all screens.

## Exact created files

All paths are relative to `Frontend/`.

1. `src/components/AsyncState.jsx`
2. `src/components/DataTable.jsx`
3. `src/components/FormLayout.jsx`
4. `src/components/ScreenComponents.css`
5. `src/components/ScreenComponents.vitest.test.jsx`
6. `src/pages/admin-management/DepartmentManagement.vitest.test.jsx`
7. `docs/stage-4/README.md`

## Exact modified files

1. `src/components/FilterPanel.jsx` — additive explicit slots, applied indicators, clear control and accessibility linkage.
2. `src/components/FilterPanel.css` — applied indicator styling and wrapping, using existing theme tokens.
3. `src/components/PageHeader.jsx` — additive primary/secondary action props.
4. `src/components/StatusBadge.jsx` — retain boolean false as a renderable status.
5. `src/pages/admin-management/AdminManagement.jsx` — shared component imports and Department Management list/form migration only; removed duplicate table, paging, async and form-shell markup.
6. `vite.config.js` — discover the new component and Department integration tests.

Earlier working-tree changes were preserved. No backend, endpoint adapter, DTO, schema, authentication, route URL, registry, navigation ordering, icon mapping, permission mapping or academic context changes were made in this stage. No dependencies installed and no commit created.

## Preserved integrations

Department list/search/detail/create/update/status still use the existing `getDepartments`, `searchDepartments`, `getDepartmentById`, `createDepartment`, `updateDepartment` and `updateDepartmentStatus` functions. Faculty/HOD lookup continues through the existing faculty service. Existing `payloadFor`, duplicate validation, college filtering, status dependency checks, export mapping and date persistence remain in place. Integration tests assert the existing create DTO, update ID, HOD user ID and numeric status action payloads.

## Verification results

- `npx --no-install vitest run src/components/ScreenComponents.vitest.test.jsx src/pages/admin-management/DepartmentManagement.vitest.test.jsx src/auth/rolesCollegeContext.vitest.test.jsx src/config/navigation.vitest.test.jsx`: **54 passed, 0 failed**. Includes 11 shared component checks, 9 Department integration checks and 34 prior-stage access/navigation checks.
- Department API/ownership and registry Node regression checks: **17 passed, 0 failed**.
- All plain Node tests under `src` and `tests`: **412 passed, 0 failed**. Selected with `rg --files src tests -g '*.test.js'`, excluding `.vitest.test.` files, and passed to `node --test`.
- Fee-plan suite (`vitest.fees.config.js`): **5 passed**. Invitation suite (`vitest.invitations.config.js`): **9 passed**.
- Full configured Vitest run: **67 passed, 3 failed** out of 70. These are the same failures recorded in Stage 3: one faculty attendance counter text assertion, and two semester generation tests blocked by generated schedule overlap. Their business modules were not changed. This is not an all-green project-wide test result.
- Targeted lint for new/modified component and integration-test files: **0 errors**; one existing unused `showClearWhenOpen` prop warning in `FilterPanel` remains. No suppressions added.
- Final frontend production build: **passed**, 2,387 modules transformed. Existing large-bundle advisory remains.
- Final re-run of the 20 new shared-component/Department tests: **20 passed, 0 failed**.
- Backend working tree clean; `git diff --check` passed after final edits.

Tests cover sorting across pages without mutating source rows, page clamping after filtering, action identity, safe async states and manual retry, native required validation, hints/errors, caller-owned dependent controls, legacy filters, select/date filter composition, clear/applied state, light/dark theme attributes, boolean/domain status labels, existing dialog close/Escape/focus restoration, college filtering and Department CRUD/HOD/status integration.

New styles use existing global theme variables, preserve existing ERP classes, provide horizontal table overflow and a two-column form grid that collapses to one column at 640px. Existing header/filter/dialog responsive rules remain in use. No authenticated live API session or pixel-level browser verification was performed; rendered tests and CSS inspection do not establish visual correctness at every viewport. No mock business data was added to production code; fixtures exist only in tests.
