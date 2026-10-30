# Placement APIs: setup and Swagger test guide

This is the full supplied backend with 34 additive placement workflow endpoints. All original files are included. Existing controllers, models, repositories, appsettings and routes are unchanged. Program.cs has only two additive dependency registrations.

## Run

1. Extract the ZIP using Windows Extract All.
2. Open `CMS_BTech/BTech.csproj` in Visual Studio. This targets .NET 8.
3. Keep your existing connection/JWT/CORS settings. Verify `DefaultConnection` points to the database containing your supplied `Dump2026oct9th1.sql`.
4. No schema changes or stored procedures are required for this dump. Optionally run `Database/Placements/01_Verify_Placement_Tables.sql` for read-only checks.
5. From the CMS_BTech project directory run `dotnet restore`, `dotnet build`, then `dotnet run`.
6. Open `https://localhost:7174/swagger` or the URL printed by your backend. Authorize using your current login endpoint and token.

All new routes begin `/api/v1/placements`. GET and mutation requests require active database roles: SUPER_ADMIN, COLLEGE_ADMIN, PRINCIPAL, HOD, PLACEMENT_OFFICER or PLACEMENT_COORDINATOR. These are staff-operated workflows. The supplied role table already has the first four roles. No student self-service or role creation is added.

Use `?collegeId=1` throughout the sample tests. The user's active database college membership is checked; another college ID alone does not grant access. A Super Admin can choose any active college. A user's own database college is used when collegeId is omitted. Student academic metrics are verified inputs from placement staff; this task does not infer CGPA or graduation year from unrelated attendance/admission data.

Dates and times are UTC, with `Z` in request JSON. CTC fields are annual currency amounts (600000 means INR 6,00,000), not lakhs. Amounts and percentages allow at most two fractional digits. List endpoints use page=1 and pageSize=50, maximum pageSize=200. Results use `{success,message,data}`; errors include correlationId.

## Test existing sample records first

The supplied dump has two drives, two rules, four eligibility records, three applications, three interviews and three selections. These are fictional demo records.

- GET `/api/v1/placements/lookups?collegeId=1`: companies, academic years and students for dropdowns.
- GET `/api/v1/placements/dashboard?collegeId=1`: summary counts.
- GET `/api/v1/placements/drives?collegeId=1`
- GET `/api/v1/placements/drives/1?collegeId=1`
- GET `/api/v1/placements/drives/1/eligibility-rules?collegeId=1`
- GET `/api/v1/placements/drives/1/eligibility/2?collegeId=1`
- GET `/api/v1/placements/applications?collegeId=1&driveId=1`
- GET `/api/v1/placements/applications/1?collegeId=1`
- GET `/api/v1/placements/applications/1/interviews?collegeId=1`
- GET `/api/v1/placements/interviews/1?collegeId=1`
- GET `/api/v1/placements/selections?collegeId=1`
- GET `/api/v1/placements/selections/1?collegeId=1`
- GET `/api/v1/placements/applications/1/selection?collegeId=1`

Drive 1 is COMPLETED, application 1 is SELECTED, and selection 1 has an ACCEPTED offer. New applications or interview/selection changes on this completed drive correctly return 409. Create a new drive for mutation testing instead of editing those existing sample records.

## Create a new test workflow

Replace path IDs with the IDs returned by each successful response. The following dates are examples; adjust them to a current/future window when testing. Use a new unique driveCode for each new test.

1. POST `/api/v1/placements/drives?collegeId=1`

```json
{
  "companyId": 1,
  "academicYearId": 2,
  "driveCode": "API-DRIVE-20261009-01",
  "driveName": "Software Placement API Test",
  "jobTitle": "Software Developer",
  "employmentType": "FULL_TIME",
  "driveType": "ON_CAMPUS",
  "jobLocation": "Hyderabad",
  "ctcMin": 400000,
  "ctcMax": 600000,
  "currencyCode": "INR",
  "vacancies": 5,
  "driveStartAt": "2026-10-09T00:00:00Z",
  "driveEndAt": "2026-11-30T18:00:00Z",
  "applicationOpenAt": "2026-10-01T00:00:00Z",
  "applicationCloseAt": "2026-11-29T18:00:00Z",
  "venue": "Placement Lab 1"
}
```

2. POST `/api/v1/placements/drives/{driveId}/eligibility-rules?collegeId=1`

```json
{
  "ruleName": "CSE Test Eligibility",
  "courseId": 1,
  "branchId": 1,
  "minCgpa": 6.5,
  "maxActiveBacklogs": 0,
  "allowAlreadyPlaced": false,
  "status": true
}
```

3. PATCH `/api/v1/placements/drives/{driveId}/status?collegeId=1` with `{"status":"PUBLISHED"}`, then with `{"status":"REGISTRATION_OPEN"}`.

4. POST `/api/v1/placements/drives/{driveId}/eligibility/evaluate?collegeId=1`

```json
{
  "studentId": 3,
  "studentCgpa": 8.2,
  "activeBacklogs": 0
}
```

These academic values are synthetic test inputs, not claims about the real student. Student 3 is a college 1 CSE student in the supplied dump. Student 2 already has a selected/accepted demo placement and will fail an allowAlreadyPlaced=false rule.

5. POST `/api/v1/placements/drives/{driveId}/applications?collegeId=1`

```json
{
  "studentId": 3,
  "coverLetter": "Demonstration placement application",
  "remarks": "API test only"
}
```

6. PATCH `/api/v1/placements/applications/{applicationId}/status?collegeId=1` with `{"status":"UNDER_REVIEW"}`, then `{"status":"SHORTLISTED"}`.

7. POST `/api/v1/placements/applications/{applicationId}/interviews?collegeId=1`

```json
{
  "roundNumber": 1,
  "roundName": "Technical Interview",
  "roundType": "TECHNICAL",
  "interviewMode": "OFFLINE",
  "scheduledAt": "2026-10-09T12:00:00Z",
  "interviewerName": "Test Panel",
  "venue": "Placement Lab 1"
}
```

Set scheduledAt to a future UTC time within the drive window. If testing the full workflow immediately, use a time a few minutes ahead; record the result only after that time has elapsed. The API rejects future completion timestamps.

8. Once the interview has actually completed, PATCH `/api/v1/placements/interviews/{interviewId}/result?collegeId=1`:

```json
{
  "interviewResult": "PASSED",
  "completedAt": "2026-10-09T12:30:00Z",
  "score": 85,
  "maxScore": 100,
  "feedback": "Demonstration result only"
}
```

Adjust completedAt to a past/current UTC time at or after scheduledAt. Additional rounds must follow consecutively after the previous rounds have passed. Use PUT `/interviews/{interviewId}` to reschedule while it is still SCHEDULED.

9. PUT `/api/v1/placements/applications/{applicationId}/selection?collegeId=1`

```json
{
  "selectionStatus": "SELECTED",
  "offeredJobTitle": "Software Developer",
  "offeredCtc": 500000,
  "currencyCode": "INR",
  "jobLocation": "Hyderabad",
  "expectedJoiningDate": "2026-12-01",
  "remarks": "Demonstration decision only"
}
```

This creates a selection, or resolves an existing ON_HOLD decision. SELECTED and REJECTED decisions are final. Application status is synchronized in the same transaction. All interview rounds must have completed and passed before SELECTED. A REJECTED or ON_HOLD decision may be made without fabricating a passed interview.

10. PATCH `/api/v1/placements/selections/{selectionId}/offer?collegeId=1`:

```json
{
  "offerStatus": "ISSUED",
  "offerExpiresAt": "2026-11-30T18:00:00Z",
  "expectedJoiningDate": "2026-12-01"
}
```

Then send `{"offerStatus":"ACCEPTED"}` to record the student's response through an authorized staff user. Expiry must be in the future when issuing. Only an issued, unexpired offer can be accepted/declined. Use PATCH `/selections/{selectionId}/joined` after the student joins.

For drive closure, PATCH status to REGISTRATION_CLOSED, then ONGOING, then COMPLETED. Resolve every application before completing the drive. Offer response and joining remain available after drive completion.

## Validation checks

| Test | Expected |
|---|---|
| No JWT | 401 |
| Student/faculty role without placement privileges | 403 |
| Unauthorized college | 403 |
| Missing required CGPA/backlog metric during evaluation | PENDING eligibility |
| CGPA below minimum or wrong branch | NOT_ELIGIBLE |
| Duplicate driveCode in same college | 409 |
| Second application for same drive/student | 409 |
| Apply before opening/after closing registration | 409 |
| Edit drive or criteria after an eligibility evaluation | 409 |
| Skip APPLIED directly to SELECTED via generic status | 400 (SELECTED is not accepted by that endpoint) |
| Select before interviews pass | 409 |
| Duplicate interview round for same application | 409 |
| Score greater than maxScore | 400 |
| Accept an offer before issuing it | 409 |
| Exceed drive vacancies | 409 |
| Delete a drive with evaluations/applications | 409 |

## Logs and project layout

Each new API logs start, success, rejection or failure, with action, actor, college, duration and correlation ID. The existing logging configuration writes to console and the configured Logs folder. Request bodies, academic snapshots and resume/offer paths are not explicitly logged by the new workflow logger. Your existing API traffic logging configuration remains unchanged.

New files:
- Controllers/V1/PlacementWorkflowController.cs
- DTOs/Placements/PlacementDtos.cs and PlacementRequests.cs
- Repositories/Interfaces/IPlacementRepository.cs
- Repositories/Implementations/PlacementRepository.cs
- Services/Interfaces/IPlacementService.cs
- Services/Implementations/PlacementService.cs and PlacementWorkflowRules.cs
- Database/Placements/ENDPOINTS.md, 01_Verify_Placement_Tables.sql and Validation_Report.json

The new APIs store resumePath/offerLetterPath references only. They do not upload/download files, send invitations or deliver offers. Use the project's existing document workflow where needed.

IMPORTANT EXISTING LIMITATION: your unchanged PlacementCompaniesController expects contact_person and string status, whereas your current dump has contact_person_name, company_code, college_id and numeric status. This pre-existing company API/schema mismatch is not changed under your instruction. For these new workflow tests, use companyId 1 or 2 from the dump, or the new GET /placements/lookups endpoint. The existing company GET/POST may still need a separately authorized compatibility fix.

## Verification completed here

All original files remain included and unchanged except additive Program.cs registrations. 34 unique routes were added. SQL column references and 36 repository SELECT queries were checked against dump fixtures using SQLite with MySQL syntax adapted for fixture checks. This is not a live MySQL or HTTP test.

This environment does not have a .NET SDK or running MySQL instance, so compilation, HTTP requests and the C# workflow tests have not been run here. The sibling Tests project contains 25 dependency-free checks for the actual C# eligibility and status rules. From the extracted package root run:

```
dotnet run --project Tests/PlacementWorkflow.Tests.csproj
```

Run `dotnet build` in CMS_BTech, then perform the Swagger tests above to verify against your actual MySQL server. See Validation_Report.json for the precise checks and limitations.
