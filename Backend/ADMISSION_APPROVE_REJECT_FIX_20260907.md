# Admission Approve / Reject Fix - 2026-09-07

## Fixed endpoints
- PUT /api/Admissions/{id}/approve
- PUT /api/Admissions/{id}/reject
- GET /api/v1/student-admissions/{id}/status
- POST /api/v1/student-admissions/{id}/status

## Root cause found
`AdmissionStatusHistory.UpdatedAt` is a non-nullable DateTime mapped to a MySQL `timestamp NOT NULL` column.
The approve/reject service created a history row without setting `UpdatedAt`.
With the `AppDbContext` mapping used by `AdmissionService`, EF can send DateTime.MinValue (0001-01-01), which MySQL cannot store in this timestamp column. This can cause the approval/rejection SaveChanges call to fail with HTTP 500.

## Changes
1. Approve/reject history now always sets UpdatedAt and UpdatedBy.
2. AppDbContext now configures history timestamps with database defaults.
3. `Application Submitted` is explicitly supported as a source status for direct approve/reject.
4. Approval generates AdmissionNo when it is missing: `ADM{yyyy}{AdmissionId:D3}`.
5. Approval sets AdmissionDate when it is missing.
6. Status rules recognize the actual DB workflow labels and common frontend aliases.
7. Invalid business transitions return HTTP 400 instead of being reported as a generic HTTP 500.
8. Database exceptions are logged with AdmissionId and correlation ID.
9. Approval response now includes AdmissionNo and AdmissionDate.

## No database schema migration required
The supplied dump already contains the required columns and history table.

## Test
For an admission currently in `Application Submitted`:

PUT /api/Admissions/19/approve
{
  "remarks": "Approved"
}

Expected: HTTP 200, status Approved, AdmissionNo generated, AdmissionDate set.

Reject test:
PUT /api/Admissions/{id}/reject
{
  "remarks": "Rejected during admission review",
  "rejectionReason": "Documents not valid"
}

Expected: HTTP 200 and status Rejected.
