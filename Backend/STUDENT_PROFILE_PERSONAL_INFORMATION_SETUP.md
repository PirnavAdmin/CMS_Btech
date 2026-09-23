# Student Profile Personal Information and Exam Results Integration

No existing module or file was removed. This package adds a focused student-profile API and a stable UI contract for a future Examination/Results module.

## 1. Run the database script

Open MySQL Workbench, select the `cms_btech` database, and execute:

`Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql`

It creates or replaces only these procedures:

- `sp_student_profile_personal_get`
- `sp_student_profile_personal_update`

The update procedure changes `students` and `student_profiles` in one transaction and inserts immutable history into `student_profile_updates`.

## 2. Configure and run the backend

Update `ConnectionStrings:DefaultConnection` in `appsettings.json` if required, then run:

```bash
dotnet restore
dotnet build
dotnet run
```

Open Swagger and authorize using a JWT bearer token.

## 3. Test the APIs

### View personal information

`GET /api/v1/students/1/profile/personal-information`

### Update personal information

`PATCH /api/v1/students/1/profile/personal-information`

```json
{
  "alternateEmail": "student.personal@example.com",
  "alternateMobile": "9000000099",
  "city": "Hyderabad",
  "district": "Hyderabad",
  "state": "Telangana",
  "country": "India",
  "pincode": "500001",
  "changeReason": "Student updated personal contact details"
}
```

Only non-null properties are updated. A row is written to `student_profile_updates` only when at least one value actually changes.

### Future exam results integration point

`GET /api/v1/students/1/profile/exam-results`

Until the Examination/Results module is connected, the endpoint intentionally returns HTTP 200 with:

```json
{
  "success": true,
  "message": "Exam results integration is ready; the Examination/Results module is not available yet.",
  "data": {
    "studentId": 1,
    "isModuleAvailable": false,
    "integrationStatus": "Awaiting Examination/Results module",
    "contractVersion": "1.0",
    "results": []
  }
}
```

This keeps the profile UI functional before the future module exists.

## 4. Connect the frontend

Copy `FrontendIntegration/studentProfileApi.ts` into the frontend services folder. Set:

```env
VITE_API_BASE_URL=https://localhost:7174
```

Call:

- `getStudentPersonalInformation(studentId)` when the profile page opens.
- `updateStudentPersonalInformation(studentId, formValues)` when Save is clicked.
- `getStudentExamResults(studentId)` when the Results tab opens.

Show an empty-state message when `isModuleAvailable` is `false`. When the future module is connected, the UI can render the same `results` array without changing the endpoint.

## 5. Future Examination/Results module handoff

Implement `IStudentExamResultsProvider` in the Examination module and change the dependency registration in `Program.cs` from `PendingStudentExamResultsProvider` to the new implementation. Do not change the controller route or DTO contract; that is the prepared integration point.
