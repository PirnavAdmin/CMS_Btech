# Automatic semester setup R13 — verification

Build: `cms-backend-20261104-semester-auto-setup-r13`.

**42 checks passed.** Source build and Release publish succeeded with zero errors and four existing unrelated warnings. Tests used an isolated MySQL 8.0.46 import of the attached `dump 11-4.sql`, plus fake local QA users. Your running API/database were not changed and no email was sent.

## What the attached data shows

College 111, course 35, branch 33, starting academic year 63. The branch has `total_semesters=8`; the latest supplied dump contains no semester rows for branch 33. Its course also specifies eight semesters. No browser Network capture or live request/server trace was attached, so the exact original failing field cannot be proved from the uploads.

## Actual local failure reproduced against the attached R12 PublishedBackend

`POST /api/semester`, `Content-Type: application/json`, flat body:

```json
{
  "courseId": 35,
  "branchId": 33,
  "academicYearId": 63,
  "semesterNumber": 1,
  "semesterName": "Semester 1",
  "yearNumber": null,
  "startDate": null,
  "endDate": null,
  "status": 1
}
```

HTTP **400 Bad Request**. Model-binding response:

```json
{
  "success": false,
  "message": "Invalid semester request body. Send one flat JSON object.",
  "statusCode": 400,
  "route": "/api/semester",
  "correlationId": "r13-verification-1793772433936259618",
  "errors": {
    "dto": [
      "The dto field is required."
    ],
    "$.yearNumber": [
      "The JSON value could not be converted to System.Int32. Path: $.yearNumber | LineNumber: 0 | BytePositionInLine: 124."
    ]
  }
}
```

`yearNumber: null` cannot bind to R12's nonnullable int. JSON conversion aborts DTO construction, then MVC adds the secondary `dto` required error. The flat body shape itself is correct. This is a reproduced failing request using the supplied branch IDs, not a claim that the unseen original browser request contained this value. Other genuinely invalid values can also fail conversion; R13 records the received semester fields and exact validation path under the correlation ID.

## Implemented fix

- Retain `[FromBody] SemesterDto` semantics and accept a flat object without a wrapper. Use a nullable action parameter with an explicit missing-body check so conversion failures no longer add a misleading implicit `dto` required error.
- Field converters accept integer IDs/numbers and quoted integer values. Null/blank placeholders become zero for validation or safe derivation. Required branchId and semesterNumber still reject missing/nonpositive values. Fractional/malformed values remain invalid.
- Omitted/null/blank courseId derives from the saved branch. Omitted/null/blank yearNumber derives from semesterNumber using the existing two-semesters-per-year rule. Omitted/null/blank academicYearId uses a valid non-archived starting year in that branch's college, then the college's single active year. An explicitly supplied positive year must be valid in the same college; it is never silently replaced. Missing or ambiguous year data returns a descriptive HTTP 400.
- Optional dates retain ISO/null/blank support. Status accepts numeric/quoted 1/0, Active/Inactive, and booleans. Omitted/null/blank status uses the existing Active default.
- Successful POST returns the saved generated semesterId. Existing non-archived natural keys return the saved record without changing it. The existing unique key also protects simultaneous requests.
- `GET /api/semester?collegeId=111` applies the verified selection to both College Admin and Super Admin reads and returns saved non-archived semesters. College Admin without a selection uses its assigned scope. Super Admin without a selection retains global access. Existing response fields remain available; collegeId is also returned per row.
- Server diagnostics log route, content type, bounded semester fields, correlationId, and validation details. Unrelated JSON keys and credentials are excluded by the new semester diagnostic filter.

## Verification evidence

- All 8 automatic flat POST requests returned HTTP 200 and generated IDs: **247, 248, 249, 250, 251, 252, 253, 254**.
- Fresh GET returned all eight IDs for branch 33, college 111, academic year 63.
- All eight retries returned the original IDs; the active row count stayed **8**.
- Twelve simultaneous POSTs for one new semester returned one ID and left one active row.
- Archived rows remained out of GET results; a missing active slot could be recreated without changing archived history.
- Foreign college/year selections, missing branch, invalid status, fractional semester number, invalid dates, and a nested dto wrapper were rejected.
- After stopping and restarting the backend, a fresh directory GET returned the same eight IDs.

These checks verify backend persistence and the response used by a page refresh; no browser/frontend build was supplied for a visual UI test. The backend relies on the already-implemented frontend automatic POST sequence; no manual semester recovery action is introduced and GET remains read-only.

Example R13 validation response (no misleading dto required field):

```json
{
  "success": false,
  "message": "Invalid semester request: $.startDate: Use an ISO date (yyyy-MM-dd), ISO timestamp, null, or an empty string for an optional semester date.",
  "statusCode": 400,
  "route": "/api/semester",
  "correlationId": "r13-verification-1793772436986733614",
  "errors": {
    "$.startDate": [
      "Use an ISO date (yyyy-MM-dd), ISO timestamp, null, or an empty string for an optional semester date."
    ]
  }
}
```

Full request/response assertions: `R13_HTTP_SQL_Results.json`.
