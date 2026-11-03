# Subject Create API - Live Deployment Fix

## What was verified in this backend

- `POST /api/v1/subjects` exists in `Controllers/V1/FacultyManagement/SubjectsController.cs`.
- The POST route is explicitly declared with `[HttpPost("")]`.
- `SubjectManagementRepository` is registered in `Program.cs`.
- Create calls `sp_sm_subject_save` and returns HTTP `201 Created`.
- The supplied SQL migration contains `sp_sm_subject_save` and the subject-management schema updates.
- Existing GET/PUT/PATCH/DELETE subject routes and the `/api/v1/subject-management/subjects` alias are preserved.

## Why live Swagger can still show GET only

If live Swagger shows only GET on `/api/v1/subjects`, the running process is an older build or a different local port/project is connected to ngrok. Rebuilding this source and restarting the process/ngrok is required.

## Clean local deployment

From this backend folder:

```cmd
dotnet clean
rmdir /s /q bin 2>nul
rmdir /s /q obj 2>nul
dotnet restore
dotnet build
dotnet run --launch-profile http
```

The HTTP launch profile listens on `http://localhost:5084`.

Verify Swagger locally:

`http://localhost:5084/swagger`

Verify the OpenAPI document contains POST:

```powershell
powershell -ExecutionPolicy Bypass -File .\Verify_Subject_Post.ps1
```

Then start ngrok against the SAME local process:

```cmd
ngrok http 5084
```

Use the new ngrok HTTPS URL as the frontend API base URL only if the public URL changed.

## Database

Run once against `cms_btech`:

`Database/SubjectManagement/Subject_Management_Update_20260927.sql`

## Swagger create payload

Authorize Swagger first because the subject controller uses `[Authorize]`.

```json
{
  "subjectCode": "CS927A",
  "subjectName": "Subject API Create Test",
  "courseId": 1,
  "branchId": 1,
  "semesterId": 2,
  "academicYearId": 2,
  "credits": 3,
  "subjectType": "Theory",
  "description": "Live POST deployment verification",
  "electiveType": "Non-Elective",
  "status": "Active",
  "lectureHours": 3,
  "tutorialHours": 0,
  "practicalHours": 0,
  "internalMarks": 40,
  "externalMarks": 60
}
```

Change `subjectCode` when repeating the test because subject codes are unique.
