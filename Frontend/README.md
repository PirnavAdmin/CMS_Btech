# React + Vite

## Consolidated frontend source

Sidebar modules remain separate under `src/pages`. Each module folder contains
exactly two source files: one `.jsx` containing all its pages and page components,
and one `.css` containing its styles. Parent folders only organize these modules.
For example:

- `pages/faculty/faculty.jsx` and `faculty.css`: faculty pages.
- `pages/fees/fees.jsx` and `fees.css`: fee management pages.
- `pages/timetable/timetable.jsx` and `timetable.css`: timetable pages.
- Examination and student-management child modules each retain their own pair.

Common source is maintained separately:

- `components/components.jsx` and `components.css`: shared components, sidebar,
  layout, contexts, hooks, and shared presentation helpers.
- `global/global.jsx`: application routes and bootstrap only, importing the module pages.
- `global/global.css`: module stylesheet imports and application-wide theme overrides.
  Shared/base styles are maintained here too; there is no separate shared folder.
  Vite preserves the original cross-module CSS order using the `Source cascade`
  and `Source styles` comments; retain these markers when editing styles.
  New style sections without a cascade entry are appended after existing ones.
  Previously unimported styles remain inside `@media not all`.
- `API/apiendpoints.jsx`: endpoint definitions, HTTP requests, authentication,
  API services, and their shared dependencies. Pages do not call `fetch` directly.

Each section has its own scope to preserve existing names without collisions.
Public-declaration comments and import metadata record the original module
boundaries. Sections that were
not previously imported remain uninitialized functions rather than introducing
new startup side effects.

Static images are in `public/assets`; timetable documentation is in `docs`.
The frontend test folder and test command have been removed. Historical test
results in `docs` describe checks performed before that removal.

Run `npm run dev`, `npm run build`, and `npm run lint` from the
frontend directory. Module `.jsx` files may contain JSX, handled natively by Vite.
Changes to application JS files trigger a full browser reload instead of
component-level Fast Refresh, avoiding duplicate application roots and stale
cross-section state. Stylesheet changes still update in place.
The normal HTML root uses `data-cms-app` to mount the app.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Navigation

The standalone Campus Operations Marks and Results pages have been removed.
Examination Marks Management and Grade System & Result Management remain available
through their existing routes and sidebar entries.
The latest examination UI includes the Grades System and Results sidebar group,
Grade Management with its CGPA Calculator, and Official Results under `/results`.
Previous `/grade-result-management` result URLs redirect to their matching
result pages. The existing Marks Approval URL remains available.
Marks Management screens use Appalanaidu's `ce48615` snapshot, and Exam Timetable
screens use Suresh's `73b00f2` snapshot. The restored Marks screens retain their
original browser-local entry/upload and approval workflow; they do not replace
or remove backend marks APIs. Grades/Results and Fee Management remain on their
separately recovered UI versions.

Exam Timetable and Examination Management open their existing local
design screens directly during Vite development. A persistent notice identifies
local records, approvals, and publication as unofficial. Close preview returns
to the integration notice, where the design can be reopened. Production builds
continue to show the integration-required screen until institutional APIs exist.
The Results workspace uses its existing optional results integration setting and
explicitly labelled local previews when that integration is unavailable.

## Fee Management UI

Fee Management uses the existing expandable Finance sidebar module with Overview,
Fee Plans, Student Fees, Payments, and Reports (five children).
Fee Plans keeps Academic Fee, Hostel Fee, and Transport Fee tabs within one
bordered workspace. Manage Charges is a contextual action, not a primary tab.
Tabs, the compact search/filter row, the table, and pagination share the same
surface. Student Fees, Payments, Reports, and student-detail lists use the same
connected workspace and visible row separators.
Fee routes automatically open the module
and nested screens highlight their owning section. Content-level primary and
Student Fees secondary navigation stays contextual. Breadcrumbs follow Home / Finance /
Fee Management / Section / Operation when applicable. Existing URLs and role-based visibility remain unchanged.
Each subsection has its own heading and compact filters.
Institutional reads follow the authenticated account's college permissions.
The header college selector scopes saved planning data, not super-admin financial
queries; it must not be treated as an institutional authorization boundary.
Saved Planning Accounts uses a compact desktop filter row with search, academic
mapping, status, and a tertiary clear action; smaller screens use balanced columns.
Institutional accounts use the supported academic filters and student search.
Assignment starts with a
published structure and displays only eligible students; concession lists preserve
the existing Draft, Submitted, Approved, and Rejected workflow. Approval dates are
shown as effective dates because no separate effective-date field is supported.
Institutional dues show outstanding fees, overdue totals, days overdue, assessed
penalties, and the server's total due (which already includes penalties). Student ID
is retained because the pending-fees API does not return roll numbers. Batch filters
remain available on device-local accounts and assignments; server dues use the
existing supported semester filter.

Manage Charges stays contextual to Fee Plans; collection, receipt, and refund
workflows remain accessible through Payments.

`/fees/structures` opens Fee Plans directly, with Academic Fee,
Hostel Fee, and Transport Fee tabs. `/fees/legacy` redirects there for
existing bookmarks; no legacy terminology or intermediate generic list is shown.
The primary action creates the selected structure type. Academic creation opens
the dedicated Add-screen wizard; Hostel and Transport use the same page-based
Add-screen layout and live-preview styling with their existing service-specific
fields. The configuration header shows the contextual Create action.
Manage Charges uses the existing `/fees/components` URL. Academic creation selects
only user-configured, active academic fee heads. New plans have no seeded heads,
amounts or due dates, and saving never creates master records automatically.
No backend component-management API exists.
Search and type-specific filters occupy a compact row directly below the tabs.
Academic filters include year, course, branch, batch, and status; Clear is tertiary.
The Academic list presents existing academic plans and wizard-created
structures together without migrating either storage format or altering financial
rules. Each record retains its own edit/details workflow and status vocabulary.
Wizard-created structures retain status-appropriate row overflow actions;
approval, submission, publication, and return-to-draft remain in structure details.
Delete requires confirmation and is available only for unassigned drafts that are
not referenced by revisions. The deletion guard is rechecked before saving through
the existing college-scoped workspace persistence.

Overview shows four compact backend KPIs, real 7/30-day and academic-year date-window
trends, attention items, matching dues, and the latest five confirmed payments.
It has no report builder or export toolbar. The current dashboard procedure mixes
scoped fee balances with permission-wide fines, and `totalOverdue` describes
assessed fines, not all overdue fees. The UI labels these limitations and does
not infer a collection percentage or fabricate a mutually exclusive status chart.
Academic-year trend windows use configured start/end dates; payment trends include
all fee years within that date window.

Reports is a separate analytics workspace with an explicit Apply/Reset workflow,
report-specific filters, monthly/category/payment-mode analysis, searchable and
sortable results, CSV export, and Print/Save as PDF. Outstanding and overdue
reports are server-paginated; their table search, sort, and export cover the current
page only. Student-ledger, concession, and refund reports are explicitly
saved planning records and are never merged with confirmed financial records.
Monthly/daily/mode reports expose payment dates only; category totals are all-date.
Unsupported course/branch collection groupings have been removed rather than
aggregating an incomplete page of unpaid installments.

Existing financial APIs do not provide Batch filtering, program/branch grouped
totals, verification/reversal statuses, or a complete student-status distribution.
Unsupported controls and actions are omitted. The existing dashboard returns
institution-wide trends, payment-mode totals, and student counts; category totals
span all dates. The UI labels those scopes instead of presenting them as filtered
academic-year results. Payment date ranges apply to collections, while
receivables/outstanding remain current balances.

Fee structure details have Overview, Components, Payment Schedule, Assignment,
and Revision History sections. Student profiles have Account Summary, Ledger,
Installments, Concessions and Receipts. Student Accounts defaults to institutional
unpaid installments; saved planning accounts are a clearly labelled separate tab.
`/fees/accounts/:studentId` reads all pages of real pending installments and payment
history. The connected service does not provide settled installments or a complete
charge/reversal ledger, so no institutional running balance is inferred.
Concession amounts on pending rows belong to assignments and may repeat; they
are not summed as individual approvals. Saved planning ledger running balances
use immutable payment/adjustment allocations and paise arithmetic.
The UI redesign does not change financial APIs or business workflows.

Creating a fee plan opens `/fees/structures/create` inside the existing ERP
layout, not a modal. The visual layout preserves existing routes and save actions.
Academic, Hostel, and Transport create forms use a roughly 65/35 form/Live Preview
split with equal-height bordered panels on desktop. Both bodies scroll internally;
the action footer belongs only to the left form, never the sidebar or preview.
Validation alerts stay inside the form panel without pushing its footer off screen.
Academic sections remain "Who should pay this fee?", "What should they pay?",
and "When should they pay?". Live Preview reads the current form state, including
charges, totals and schedules. Facility previews show configured service details,
rates, billing frequency and effective dates; they do not invent a payment schedule.
Preview values include the defaults currently displayed by service selectors.
On narrow screens the panels stack with independently accessible scroll areas.
The density target is 16px/20px page spacing after the ERP topbar, 12px major
gaps, 36px controls, 38px table headers, and compact separated rows.
Advanced grace/penalty rules start collapsed. Student-specific concessions are not
entered in the structure form; existing structure reductions are preserved.
The footer is contained within the form panel and retains its existing save actions.
Courses and dependent branches use Academic Management data. Amounts, mandatory
and refundable flags use the existing component-backed storage and validation.
Batch suggestions use matching academic year/course/branch records where available;
semester options remain scoped to the selected academic mapping.
Existing detailed structures and previously saved single-total charges remain
intact; replacing a charge requires explicitly removing it. Hostel/Transport
components are excluded from academic selection and submission. The workflow has inline academic validation,
exact installment-allocation feedback, and a complete live preview derived
from the current form. The editor reuses Add College's cards, form controls, footer actions and live
summary styling. Only Back appears beside the page title; Save Draft remains
a secondary footer action. Equal splits allocate exact paise without inventing
due dates; installment dates must be entered explicitly.
On desktop, the form and preview stretch to identical heights within the available ERP
viewport. Their bodies scroll independently; card headers and the form action
footer remain visible. Preview sections cover academic applicability, fee components, total fee,
structure concessions, payment schedules, late-fee rules, totals, and
validation-derived readiness without changing the saved workflow status. Small
screens stack the panels with internal scrolling and normal page access.
Save Draft returns to the structure list; Submit for Approval
preserves the existing separate approval and publication stages. Configurations
remain device-local and college-scoped.

Hostel and Transport creation opens `/fees/structures/hostel/create` and
`/fees/structures/transport/create`; editing uses
`/fees/structures/:type/:facilityId/edit`. These are dedicated ERP screens,
not modal overlays. Both reuse the Academic wizard's left configuration card,
right Live Preview, controls, tabs, scrolling bodies and footer styling.
Each uses a single configuration screen. Existing Draft / Active saving and college-scoped
storage formats remain unchanged. Cancel, Back and successful saves return
to the corresponding Hostel or Transport list tab. Direct edit URLs reload
the saved record; missing records show an explicit error.

### Fee domain support and backend dependencies

There is one configuration landing screen with four contextual tabs. Academic
filters are Academic Year, Course, Branch, Batch and Status. Hostel filters
are Academic Year, Hostel, Room Type and Status. Transport filters are Academic
Year, Route, Boarding Stop and Status. Facility filter options derive only from
saved plans, not invented master data. Manual facility fields retain existing
records and offer previously configured values; they are explicitly not verified
master selections or student allocations.

All structure, component, approval and assignment workspace data is **device-local**.
Saving/publishing it does not populate backend fee masters or post institutional
student charges. The UI states this limitation. Facility plans still store one fee
and charge-description text: they do not support component allocations, installment
schedules, or approval/publication. No fake fields, actions or allocations are added.

Existing backend support is limited to collection/receipt/dues/report APIs and
`POST /api/v1/student-admissions/:admissionId/resolve-fees`. The latter uses configured
SQL academic/hostel/transport fee masters, adds hostel only with `hostelRequired`
and room type, and transport only with `transportationRequired` and route identity.
Admission preferences are not authoritative facility allocations. Export endpoints
for fee masters do not provide master listing/editing contracts.

Production integration still requires:

- College-scoped structure/component read/create/update APIs, domain classification,
  academic batch mapping, effective periods, approval/versioning and assignment counts.
- Hostel/room/occupancy master APIs with stable IDs, hostel allocation records and
  eligibility validation; the current resolver exposes hostel type/room type only.
- Route/boarding-stop/fee-slab master APIs with stable IDs, route-stop relationships,
  student opt-in/allocation records and validation; the current resolver exposes
  route identity but no stop-level contract.
- Facility component and payment-schedule persistence and status-transition APIs.
- Transactional multi-source student-account assignments combining academic,
  allocated hostel and opted-in transport charges, with duplicate protection,
  concessions and ledger reconciliation. Local academic matching must never stand
  in for hostel/transport eligibility.

The existing academic preview assignment checks year, course, branch, batch,
semester/category where applicable, and rejects facility domains. Facility plans
remain outside academic assignments until these backend dependencies are supplied.

Development-tools and duplicate financial-preview panels have been removed.
Existing saved planning histories remain available, with prominent warnings
that they do not post institutional charges, approvals or refunds.
Local refund drafts require an eligible original payment and are limited to its
remaining refundable balance. Concessions cannot exceed unpaid fees.
Historical academic/service plans are revised instead of overwritten; only drafts
can be deleted. Actual payment success requires matching backend payment/receipt
identifiers and exact amounts. Ambiguous failures close the payment dialog and
direct the operator to check Receipts before attempting another collection.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Remaining-module integration status

See [REMAINING_MODULES_AUDIT.md](REMAINING_MODULES_AUDIT.md) for the module-by-module audit, implemented repairs, missing backend dependencies and validation limits.

Marks Entry/Edit, XLSX upload, Approval/history and Student/Subject reports now use the existing `/api/v1/marks` endpoints. Existing numeric backend examination IDs are required until an examination catalog API is provided. UI access remains under the existing administrator routes; assigned-faculty authorization is not claimed complete.

Production examination setup/timetable and official result screens explicitly identify unavailable integrations. Their previous local designs remain opt-in development previews, not official schedules or results. Cashier access is restricted to the currently provisioned administrative roles on both frontend and backend. Student document access is college-administrator scoped; faculty document actions permit same-college administrators and owning faculty. Student self-service document access requires a reliable user/student mapping.

No Library, Meetings/Events or Placement success flows are fabricated. These modules still require their domain APIs, policies and authenticated integration fixtures. Browser visual verification and full database end-to-end validation remain outstanding.
