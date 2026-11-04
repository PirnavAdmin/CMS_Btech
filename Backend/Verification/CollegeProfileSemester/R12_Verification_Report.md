# R12 backend verification — 4 November 2026

Build: `cms-backend-20261104-college-profile-semester-r12`.

Validated using the supplied source/published R11 backend and an isolated MySQL 8.0.46 copy of `dump 4-11(1).sql`. No changes were made to your running server or original database; no email was sent.

- Existing profile completion suite: **39 checks passed**.
- Backend build: successful, zero errors; four existing warnings in unrelated controllers/event code.
- 64 HTTP/SQL checks passed, including the R11 reproduction and repeatable R12 SQL patch.
- College Admin create, assigned/creator list/search/count/detail/update, foreign record rejection, and Super Admin cross-college access passed.
- Department resolution, personal address/bio persistence, partial PATCH preservation, atomic rejection of invalid organization targets, and profile/login completion consistency passed.
- The `account/profile` alias returns the same saved profile and completion value, including legacy field aliases.
- A new branch was created through `POST /api/v1/branches`; eight flat semester POST requests persisted eight generated IDs. Eight retries returned those same IDs.
- Twelve concurrent POST requests for one new semester returned one ID, with exactly one database row.

## Semester error evidence

Original browser/network capture was not supplied. The following is a real local HTTP reproduction against the supplied R11 PublishedBackend, not a claim about the unseen original browser payload.

Request: `POST /api/semester`, `Content-Type: application/json`.

```json
{
  "courseId": 10001,
  "branchId": 10001,
  "academicYearId": 10001,
  "semesterNumber": 1,
  "semesterName": "Semester 1",
  "yearNumber": 1,
  "startDate": "",
  "endDate": "",
  "status": 1
}
```

Status: **400 Bad Request**. Server model-binding details:

```json
{
  "dto": [
    "The dto field is required."
  ],
  "$.startDate": [
    "The JSON value could not be converted to System.Nullable`1[System.DateTime]. Path: $.startDate | LineNumber: 0 | BytePositionInLine: 147."
  ]
}
```

`dto` is the action parameter name. The flat JSON shape is already correct. A failed date conversion prevents DTO construction and adds the secondary required-parameter error. The same flat body with valid ISO dates returned HTTP 200 on R11.

R12 accepts omitted/null/empty optional dates and numeric/string 0/1 or Active/Inactive status. Truly invalid dates still return HTTP 400 with `errors["$.startDate"]`, route, statusCode, and correlationId; the server writes the validation keys/messages without logging the request body.

R12 invalid-date response:

```json
{
  "success": false,
  "message": "Invalid semester request body. Send one flat JSON object.",
  "statusCode": 400,
  "route": "/api/semester",
  "correlationId": "r12-verification-1793770764114893358",
  "errors": {
    "dto": [
      "The dto field is required."
    ],
    "$.startDate": [
      "Use an ISO date (yyyy-MM-dd), ISO timestamp, null, or an empty string for an optional semester date."
    ]
  }
}
```

Verified branch: `10002`. Saved semester IDs: `248, 249, 250, 251, 252, 253, 254, 255`. Database row count after all eight retries: **8**.

Raw assertions and responses: `R12_HTTP_SQL_Test_Results.json`. Validation log extracts: `R12_Server_Validation.txt`.

## Re-run the R12 workflow checks

Import the supplied dump into a fresh disposable MySQL 8 database ending `_r12_test`, apply the R12 patch, and run a separate R12 API instance connected to that database. Use local test configuration and disable SMTP. The runner uses only fake `example.invalid` accounts. Set `MYSQL_PWD` if the MySQL test user requires a password.

```bash
python Verification/CollegeProfileSemester/Run_R12_Regression.py --base-url http://localhost:5167 --database cms_r12_test --mysql-port 3307 --mysql-user root --confirm-disposable
```

The runner requires Python 3 and the MySQL command-line client. It checks the R12 workflows, while the R11 reproduction is recorded in the original delivery report. Use a fresh dump for each run; fixed QA IDs deliberately fail if already present.
