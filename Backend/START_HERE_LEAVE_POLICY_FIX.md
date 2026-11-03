# Faculty Leave Policy activation fix — 1 October 2026

Based on `CMS_BTech_Section_Allocation_Fixed_20261001.zip` and `DUMP 1-10.sql`.
All existing routes and the earlier section allocation, course, leave type and faculty fixes are retained.

## Install

1. Back up your existing database and stop backend instances during this schema upgrade.
2. Select the existing database in MySQL 8.0 and run `Database/LeavePolicyScope_20261001/01_Leave_Policy_Scope_Fix.sql` in full. Do not reimport the dump into your live database.
3. Build this backend with .NET 8 (`dotnet restore`, then `dotnet build -c Release`), retaining your deployment's existing connection, JWT and mail settings. Start the updated backend after the SQL completes.
4. Use `Database/LeavePolicyScope_20261001/02_Inspect_Active_Policy_Conflicts.sql` to inspect college 87; it is read-only.

The SQL is rerunnable. It adds policy college/department/branch fields, ownership foreign keys, a nonunique lookup index, normalization functions and the shared conflict-query procedure. No EF migration is required. No existing policy is deleted, deactivated or replaced. Schema DDL is not transactional; if ownership cannot be established, the script stops with an explanation and can be rerun after correcting that specific record. Keep the backend stopped until the complete script succeeds.

## Verified existing record

The supplied dump contains one active policy: `POL-2026`, **Faculty Leave Policy 2026-27**, academic year `2026-2027`, applicable to `Both`, effective **2026-06-01 through 2027-05-31**. Its two existing leave requests belong to faculty in **college 1**. The SQL uses that evidence to assign college 1 and records the inference in `faculty_leave_policy_scope_audit`. Existing scope defaults to all departments/branches within that college. It does not assume this policy belongs to college 87.

For other existing databases, ownership is inferred from request faculty and college-specific entitlement types. The creator's college is used only when no such evidence exists. Ambiguous or inconsistent ownership stops the upgrade instead of inventing records.

## Conflict rule

An active policy blocks activation only when **all** of these intersect:

- College ID is equal.
- Academic year is equal after normalization (`2026-27`, `2026 / 2027` and `2026-2027` are equivalent). Different academic years are separate scopes, even if their effective dates overlap.
- Employee types match, or either policy applies to `Both`.
- Effective date intervals intersect. Dates are inclusive, so a shared boundary day is a conflict.
- Department/branch scopes intersect. Null means all. A department policy covers branches of that department; separate branches can coexist, including branches within one department. A college-wide policy overlaps every department/branch in its college.

The backend validates branch and department ownership and their compatibility. A branch's department is inferred when omitted. Inactive and Draft policies do not block activation. The table has no soft-delete field; no new soft-delete behavior is invented.

A policy's existing college cannot be changed via update or activation. Query/body college mismatches return 400; requesting an existing policy through another college returns 404. Existing clients can omit college on activation because persisted policy ownership is authoritative. New creates should explicitly provide the selected college; the signed-in user's college is only a compatibility fallback.

Active edits run the same overlap check. A rejected edit leaves both metadata and entitlements unchanged. Activations and active edits lock the same college row inside a ReadCommitted transaction, so concurrent overlapping activations cannot both commit through these API endpoints. Direct database updates bypass API validation and should use the inspection script before being applied.

## API contract

Existing routes are unchanged:

- `GET /api/v1/faculty-leave/policies?collegeId=87&academicYear=2026-2027`
- `POST /api/v1/faculty-leave/policies?collegeId=87`
- `PUT /api/v1/faculty-leave/policies/{id}?collegeId=87`
- `POST /api/v1/faculty-leave/policies/{id}/activate?collegeId=87`

Policy create/update body (optional scope fields shown):

```json
{
  "collegeId": 87,
  "name": "College 87 Leave Policy 2026-27",
  "academicYear": "2026-2027",
  "applicableTo": "Both",
  "departmentId": null,
  "branchId": null,
  "fromDate": "2026-06-01",
  "toDate": "2027-05-31",
  "entitlements": [
    {"leaveTypeId": "casual-leave", "entitlement": 12, "maxDays": 3,
     "carryForward": false, "documentRequired": false}
  ]
}
```

Creates remain Draft until activated. A true conflict returns **HTTP 409**, `success: false`, `code: "ACTIVE_POLICY_CONFLICT"`, a readable `message` naming each conflicting policy and its dates, a `conflicts` array with IDs/names/college/year/type/scope/fromDate/toDate/status, and `requestedScope`. The frontend can display the message directly or use the fields to show what needs changing. `correlationId` connects the response to backend diagnostics.

Leave requests now require a matching faculty college, employee category, department/branch, entitlement and complete requested date range. Balances use the same scope. Faculty has a home department; branch membership uses active, non-deleted faculty subject allocations in the policy's academic year. Existing allocations without a year remain year-independent. The existing employee category derivation from `employment_type` is retained.

## Validation

See `Database/LeavePolicyScope_20261001/VALIDATION_REPORT.md` for the final tested cases and build limitations. Tests use an isolated copy of the supplied dump; no live database was modified. The packaged backend contains source code and the original project/package references, without test credentials or generated test records.
