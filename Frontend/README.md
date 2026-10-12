# React + Vite

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
Fee Structures, Student Accounts, Collections, and Reports (five children).
Student Accounts provides compact Account Operations shortcuts to Fee Assignment,
Scholarships & Concessions, and Dues & Penalties, plus an Assign Fees header action.
These operations keep their existing routes, highlight Student Accounts in the
sidebar, and provide a contextual back link instead of tabs or a tools dropdown.
Fee routes automatically open the module
and nested screens highlight their owning section. Content-level primary and
Student Accounts secondary tabs are removed. Breadcrumbs follow Home / Finance /
Fee Management / Section / Operation when applicable. Existing URLs and role-based visibility remain unchanged.
Each subsection has its own heading and compact filters.
Student Accounts uses a single compact desktop filter row with search, academic
mapping, status, and a tertiary clear action; smaller screens use balanced columns.
Assignment starts with a
published structure and displays only eligible students; concession lists preserve
the existing Draft, Submitted, Approved, and Rejected workflow. Approval dates are
shown as effective dates because no separate effective-date field is supported.
Institutional dues show outstanding fees, overdue totals, days overdue, assessed
penalties, and the server's total due (which already includes penalties). Student ID
is retained because the pending-fees API does not return roll numbers. Batch filters
remain available on device-local accounts and assignments; server dues use the
existing supported semester filter.

Fee Components stays contextual to Fee Structures; collection, receipt, and refund
workflows remain accessible through Collections.

`/fees/structures` opens Fee Structure Configuration directly, with Academic,
Hostel, and Transport Fee Structures tabs. `/fees/legacy` redirects there for
existing bookmarks; no legacy terminology or intermediate generic list is shown.
The primary action creates the selected structure type. Academic creation opens
the dedicated Add-screen wizard; Hostel and Transport use the same page-based
Add-screen layout and live-preview styling with their existing service-specific
fields. The configuration header shows only the contextual
Create action; the Fee Component Master route remains available without a header
shortcut. The Academic wizard selects charges from the existing device-local
component master; no backend component-management API exists.
Search and Export stay in each list header, and Filter reveals type-specific
controls. The Academic list presents existing academic plans and wizard-created
structures together without migrating either storage format or altering financial
rules. Each record retains its own edit/details workflow and status vocabulary.
Wizard-created structures retain status-appropriate row overflow actions;
approval, submission, publication, and return-to-draft remain in structure details.
Delete requires confirmation and is available only for unassigned drafts that are
not referenced by revisions. The deletion guard is rechecked before saving through
the existing college-scoped workspace persistence.

Overview is an operational command center: academic-year headline balances,
collection progress, a 7/30-day daily trend, attention items, upcoming/overdue
dues, and the latest five payments. It has no report builder or export toolbar.

Reports is a separate analytics workspace with an explicit Apply/Reset workflow,
report-specific filters, monthly/category/payment-mode analysis, searchable and
sortable results, CSV export, and Print/Save as PDF. Outstanding and overdue
reports are server-paginated; their table search, sort, and export cover the current
page only. Student-ledger, concession, and refund reports are explicitly
device-local and are never merged with posted financial records.

Existing financial APIs do not provide Batch filtering, program/branch grouped
totals, verification/reversal statuses, or a complete student-status distribution.
Unsupported controls and actions are omitted. The existing dashboard returns
institution-wide trends, payment-mode totals, and student counts; category totals
span all dates. The UI labels those scopes instead of presenting them as filtered
academic-year results. Payment date ranges apply to collections, while
receivables/outstanding remain current balances.

Fee structure details have Overview, Components, Payment Schedule, Assignment,
and Revision History sections. Student profiles have Ledger, Installments,
Payments, Concessions, and Refunds sections. Device-local ledger running balances
use the existing immutable payment/adjustment allocations and paise arithmetic.
The UI redesign does not change financial APIs or business workflows.

Creating a fee structure opens `/fees/structures/create` inside the existing ERP
layout, not a modal. Unassigned drafts use `/fees/structures/:structureId/edit`;
duplicates and revisions use the same page-based editor. Its three-step workflow
is Fee Applicability, Fee Details, and Payment Schedule. The persistent Live Preview
replaces a separate review page. Payment Schedule has the fixed Previous,
Save Draft and Submit for Approval footer; complete validation still runs on submission
and returns the user to the relevant step on errors. Internal component models
and approval statuses are unchanged.
Courses and dependent branches use Academic Management data. Amounts, mandatory
and refundable flags use the existing component-backed storage and validation.
Batch suggestions use matching academic year/course/branch records where available;
semester options remain scoped to the selected academic mapping.
Existing detailed structures and previously saved single-total charges remain
intact; replacing a charge requires explicitly removing it. Hostel/Transport
components are excluded from academic selection and submission. The workflow has inline academic validation,
exact installment-allocation feedback, and a complete live preview derived
from the current form. The editor reuses Add College's card, natural-width scrolling
tabs, form controls, footer actions, and Live Preview header. Tabs sit inside the left
card above its fixed step header; only Back appears beside the page title, while
Save Draft remains a secondary footer action. Save & Next advances validated steps
without persisting; Save Draft and Submit for Approval retain their existing behavior.
On desktop, the form and preview stretch to identical heights within the available ERP
viewport. Their bodies scroll independently; card headers and the form action
footer remain visible. Preview sections cover academic applicability, fee components, total fee,
structure concessions, payment schedules, late-fee rules, totals, and
validation-derived readiness without changing the saved workflow status. Small
screens stack equal-height cards with internal scrolling and normal page access.
Save Draft returns to the structure list; Submit for Approval
preserves the existing separate approval and publication stages. Configurations
remain device-local and college-scoped.

Hostel and Transport creation opens `/fees/structures/hostel/create` and
`/fees/structures/transport/create`; editing uses
`/fees/structures/:type/:facilityId/edit`. These are dedicated ERP screens,
not modal overlays. Both reuse the Academic wizard's left configuration card,
right Live Preview, controls, tabs, scrolling bodies and footer styling.
Their steps remain Hostel Setup / Transport Setup, Accommodation & Fee / Route & Fee,
and Review & Activate. Existing Draft / Active saving and college-scoped
storage formats remain unchanged. Cancel, Back and successful saves return
to the corresponding Hostel or Transport list tab. Direct edit URLs reload
the saved record; missing records show an explicit error.

### Fee domain support and backend dependencies

There is one configuration landing screen with three domain tabs. Academic
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

Development-only financial previews are hidden from normal navigation. For
development diagnostics, append `?feeDebug=true` to a financial page URL when
running Vite in development mode. They are not included in production UI.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Remaining-module integration status

See [REMAINING_MODULES_AUDIT.md](REMAINING_MODULES_AUDIT.md) for the module-by-module audit, implemented repairs, missing backend dependencies and validation limits.

Marks Entry/Edit, XLSX upload, Approval/history and Student/Subject reports now use the existing `/api/v1/marks` endpoints. Existing numeric backend examination IDs are required until an examination catalog API is provided. UI access remains under the existing administrator routes; assigned-faculty authorization is not claimed complete.

Production examination setup/timetable and official result screens explicitly identify unavailable integrations. Their previous local designs remain opt-in development previews, not official schedules or results. Cashier access is restricted to the currently provisioned administrative roles on both frontend and backend. Student document access is college-administrator scoped; faculty document actions permit same-college administrators and owning faculty. Student self-service document access requires a reliable user/student mapping.

No Library, Meetings/Events or Placement success flows are fabricated. These modules still require their domain APIs, policies and authenticated integration fixtures. Browser visual verification and full database end-to-end validation remain outstanding.
