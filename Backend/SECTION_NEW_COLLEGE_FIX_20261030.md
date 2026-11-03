# New-college section creation fix — 30 October 2026

## Apply the update

1. Run `Database/Sections/CMS_Section_New_College_SQL_20261030.sql` in MySQL Workbench against your existing `cms_btech` database. The same script is supplied separately. This is an update script; do not import the old database dump again and do not run EF migrations.
2. Use this complete Backend folder. Keep the connection string and environment settings appropriate to your machine, then restart the API. With the .NET 8 SDK, run `dotnet restore BTech.csproj` and `dotnet run --project BTech.csproj` from the Backend folder.
3. Reload the frontend (Ctrl+F5), select XYZ college again, and select its active **2026–2027** academic year. Reopen the Add Section form to clear the previously cached academic-year selection.
4. Select Btech → COMPUTER SCIENCE AND ENGINEERING → Semester 1 and create the section. Department can be omitted or null.

## Cause confirmed in the supplied dump

XYZ college is college ID **95**. Its CSE semesters, including semester **188**, belong to year **45**, named **2026-2027**. That year was archived (`status=0`, `is_archived=1`), while future year **51** (2028–2029) was active. The original section procedure correctly refused the archived year. Selecting the future active year would also fail because it does not match the saved semesters.

The second screenshot's SRI college is ID **92**. Its current year **39**, named `sri`, was inactive; its Semester 2 is ID **171**.

## Database changes and boundaries

- XYZ year 45 is restored and activated, and future year 51 becomes Upcoming (`status=0`, `is_archived=0`). Both records remain in the database. The repair verifies the supplied college code, year IDs, dates and the current date before changing them.
- SRI year 39 is activated only if that college has no active year and the year is current and unarchived.
- An unexpected active XYZ year or sections already using year 51 stops the repair with an explanatory error. Do not ignore that error; review those newer records first.
- No business rows are deleted, no IDs or semester mappings are substituted, and older archived years are retained. The existing single-active-year-per-college constraint remains in place.
- `sp_section_create` now checks that the year belongs to the selected college and returns a clear activation instruction for inactive/archived years. The legacy `sp_section_update` has the same college-year ownership requirement. Existing course → branch → semester/year, capacity, optional-department and duplicate validation remains.
- No new tables, schema migrations, roles, permission grants or frontend changes are required.

## Backend changes for future new colleges

The first academic year created for a college is activated automatically when its dates include today's UTC date. The first-year Generate flow follows the same rule. Future first years and additional years remain Upcoming unless explicitly activated. Creation/generation/activation serialize on the selected college row and retain the database's unique active-year guard. The response reports whether activation occurred. Existing active years are not displaced by a normal Add request.

`isActive` now requires both active status and an unarchived year. Section creation logs include college, academic year and semester IDs.

## Example request for this dump

`POST /api/v1/sections` with your normal Bearer token:

```json
{
  "collegeId": 95,
  "academicYearId": 45,
  "departmentId": null,
  "courseId": 29,
  "branchId": 25,
  "semesterId": 188,
  "sectionCode": "CSE-S1-A",
  "sectionName": "Section A",
  "capacity": 60
}
```

Use the actual IDs if you have since changed or recreated these records. Reusing an existing section code for the same academic mapping is intentionally rejected.

## Verification performed

- Reproduced the original XYZ section rejection against the supplied data before the patch.
- Executed the update twice on an isolated MySQL **8.0.42** copy and passed **21 assertions**, including XYZ/SRI creation, null department, existing details update, legacy mapping update, duplicate rejection, archived/upcoming/missing/foreign-college year rejection, invalid academic mapping rejection, and preservation of unrelated year states and all semester mappings.
- Imported the supplied schema and relevant business rows for this isolated test. Unrelated API logs, login/session data, admission document blobs and admission rows were omitted from the offline fixture; the original supplied dump was not changed. Existing section/year/course/branch/semester/user/profile/assignment data used by the tests was retained.
- Compiled all **520** included C# sources against the restored .NET 8, ASP.NET Core and NuGet references with **zero errors**. Existing compiler warnings remain. The environment prevented the normal MSBuild entry point from reading process metadata, so compilation was performed directly with the SDK's C# compiler.
- Compared the package with the supplied ZIP: every original file is retained. Changes are limited to the academic-year bootstrap/status response, section logging, the two section procedure sources and the matching standalone legacy procedure source. New files contain the update script, this guide and verification evidence.
- No requests were made to your live API or database. HTTP login/role/permission behavior and the new EF transaction paths need validation when the backend is running on your machine. Existing endpoints and authorization logic are retained.

See `Verification/SectionNewCollege_20261030/Results.json` for the executed assertions. `Regression.sql` is intended only for a disposable restored test database.
