# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Navigation

The standalone Campus Operations Marks and Results pages have been removed.
Examination Marks Management and Grade System & Result Management remain available
through their existing routes and sidebar entries.

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
the dedicated Add-screen wizard; Hostel and Transport retain their existing
service-specific editors. The configuration header shows only the contextual
Create action; the Fee Component Master route remains available without a header
shortcut. New wizard structures use a single Total Fee instead of master selection.
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
is Academic Setup (including Total Fee), Payment Plan, and Review & Publish.
There is no Fee Components step or component-selection dialog. The single total
uses the existing component-backed financial storage so allocation, collections,
approval and assignment calculations remain unchanged. Existing detailed structures
retain their original charges and refund rules; their total is read-only in this
single-fee editor. The workflow has inline academic validation,
exact installment-allocation feedback, and a complete live preview derived
from the current form. The editor reuses Add College's card, natural-width scrolling
tabs, form controls, footer actions, and Live Preview header. Tabs sit inside the left
card above its fixed step header; only Back appears beside the page title, while
Save Draft remains a secondary footer action. Save & Next advances validated steps
without persisting; Save Draft and Submit for Approval retain their existing behavior.
On desktop, the form and preview stretch to identical heights within the available ERP
viewport. Their bodies scroll independently; card headers and the form action
footer remain visible. Preview sections cover academic applicability, total fee,
structure concessions, payment schedules, late-fee rules, totals, and
validation-derived readiness without changing the saved workflow status. Small
screens stack equal-height cards with internal scrolling and normal page access.
Save Draft returns to the structure list; Submit for Approval
preserves the existing separate approval and publication stages. Configurations
remain device-local and college-scoped.

Development-only financial previews are hidden from normal navigation. For
development diagnostics, append `?feeDebug=true` to a financial page URL when
running Vite in development mode. They are not included in production UI.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
