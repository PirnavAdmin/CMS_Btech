# Merged Admin + Timetable backend with Subject Management

This is the full .NET 8 backend merged from the two uploaded packages. No frontend files were changed. All API routes from both backend packages are retained. New behavior is restricted to Subject Management; timetable code comes from the supplied Timetable package and the Admin role/room fixes come from the supplied Admin package.

## Run in order

1. Use your database imported from `dump 27 mine.sql`. Do not re-import the dump over a populated database just to install this update.
2. In MySQL Workbench run `Database/SubjectManagement/Subject_Management_Update_20260927.sql`. It selects `cms_btech`; change that single `USE` line if your database name differs. This is an additive, repeatable update, not a replacement dump. No EF migration is needed. It preserves subject records and adds the missing fields, views and Subject stored procedures.
3. Review `ConnectionStrings:DefaultConnection` in `appsettings.json` for your local MySQL login. The merged package retains the Admin package configuration. The Timetable package's machine-specific Development credentials do not override it.
4. Open `BTech.slnx` / `BTech.csproj` in Visual Studio, or run `dotnet restore` then `dotnet run --project BTech.csproj`. Existing launch settings are retained.
5. Open Swagger using the URL printed by the backend, sign in using your existing login API, and authorize with its bearer token.
6. Test `GET /api/v1/subject-management/subjects/lookups`, then create/edit a subject using real IDs from those lookups. See `Docs/SubjectManagement/Frontend_Contract.md` and `SubjectManagement_API_Tests.http`.

The supplied dump already contains all 38 stored procedures used by the imported Timetable repository, with the same bodies as the Timetable SQL file. Do not run the older bundled Admin/Phase5 installation scripts again for this update.

## Frontend integration handoff

The uploaded Subject screen currently reads/writes browser localStorage through `subjectService.js`; those CRUD methods do not send HTTP requests. Backend-only changes cannot switch the browser to the database. Point those four service methods at `/api/v1/subject-management/subjects` and unwrap the `data` property, as documented in the contract. No frontend patch is included.

The uploaded `SubjectManagement.jsx` also contains `if (open)` where its editor state is named `editorOpen`. The frontend owner should review that condition; this backend package does not modify it. These existing frontend issues prevent claiming end-to-end screen integration without a frontend change.

## Merge choices

- Retained Admin access governance, roles, designations, rooms and duplicate-role fixes.
- Imported the Timetable service/repository, its controllers and additive model/DTO fields. Replaced overlapping timetable controller implementations once, preserving all their routes and adding the Timetable package's entry routes.
- Identical timetable request DTOs appeared under different folder paths in the two packages; each type is compiled once at the original Admin path.
- Kept both packages' unique uploaded files, including college logos.
- No unrelated controller/service/repository was refactored. Build output, machine caches and historical logs are not shipped.
- Subject creation/update writes `subjects`, `subject_course_branches`, `subject_semesters` and `subject_semester_assignments` in one transaction. Existing secondary mappings are retained. Related records block unsafe remapping, deletion and deactivation with a 409 response.
- Subject deletion is soft deletion; it removes the subject from the Subject API directory while retaining its ID and audit fields. Codes remain reserved after deletion.

See `Docs/SubjectManagement/Validation_Report.md` for the actual checks performed and their limits.
