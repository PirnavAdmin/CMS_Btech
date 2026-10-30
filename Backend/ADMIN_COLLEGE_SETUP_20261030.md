# College Admin setup access fix — 30 October 2026

## Install

1. Stop the current backend. Keep your normal backup of `cms_btech`.
2. In MySQL Workbench, select `cms_btech` and run the complete `CMS_Admin_College_Setup_SQL_20261030.sql` file. The same script is included in `Database/Sql/AdminCollegeSetup/`.
3. Extract this package and use its `Backend` folder. Keep the connection string, JWT and SMTP settings appropriate for your machine. Existing configuration was preserved.
4. Run `dotnet restore`, then `dotnet build`, then start the API using your existing launch profile. Restart the API used by your frontend proxy.
5. Sign out of the frontend and sign in again as ADM002. Select the college you created, including college 92, and add/generate its academic years, courses and other records.

No frontend changes or EF migrations are required. No existing API route was removed. Do not import the full database dump over your working database.

## What changed

ADM002 is an active College Admin whose primary `users.college_id` is 1. College 92 and several other colleges were created by ADM002 but had no `college_settings` / active `college_user_mappings` relationship. The old authorization code recognized mapped colleges only for academic years, so other selected-college operations were also blocked.

- The SQL repair adds missing settings and creator mappings only for active colleges whose recorded creator is the active ADM002 account. It does not change ADM002 to Super Admin, change primary college, reset a password, or reactivate previously revoked mappings/settings.
- Future college creation saves the college, its settings, its creator mapping, and initial scoped permission ceiling in one transaction. A provisioning failure rolls the college insert back.
- Active College Admin mappings apply to all classified college operations. Every action still requires the selected college's explicit permission matrix. Existing service/controller college checks receive the same verified request scope.
- Governance actor resolution uses that verified college. Existing restrictions on Super Admin / College Admin privileges, global role definitions, and delegation beyond the caller's effective permissions remain enforced.
- Missing target-college permission rows are initialized from the creator's effective primary-college role permissions. Existing rows are left untouched, including explicit denies. Creating a college cannot evade a restriction on the creator's permission ceiling.
- Academic record and parent IDs are checked against their actual college, including requests that omit `collegeId`. Course, branch, department and semester lists honor the resolved college.
- The academic-year dashboard now checks the academic_years permission instead of the general dashboard permission.
- First-year generation accepts `startDate` when the selected college has no years. Subsequent generation follows the latest saved year's end date and preserves its calendar. In the supplied dump, college 92 already has the academic year named `sri`; generation therefore continues after that saved year.

## API examples

Create the first annual cycle in a new college:

`POST /api/v1/academic-years/generate-next-year?collegeId=<selectedCollegeId>`

```json
{
  "startDate": "2026-06-01",
  "activateImmediately": true
}
```

Generate a subsequent year using the existing cycle:

```json
{
  "activateImmediately": false
}
```

Manual creation:

`POST /api/v1/academic-years?collegeId=<selectedCollegeId>`

```json
{
  "academicYearName": "2026-27",
  "startDate": "2026-06-01",
  "endDate": "2027-05-31"
}
```

Both query and body college IDs remain supported and must agree. The login response continues to show the saved primary college. `GET /api/auth/me/access?collegeId=<selectedCollegeId>` shows the selected college's current permissions and `academicSetupCollegeIds`; access is checked live rather than trusting a cached token's college or roles.

## Verification

The .NET 8 backend compiled successfully. Four existing warnings remain in OTP, Faculty and EventStore code.

Validated against MySQL 8.0.46 using a disposable import of the supplied `Dump DB 30 oct.sql`; no working database or remote API server was modified. The verification used the real ADM002 account and its existing BCrypt hash, without changing the password.

The detailed passed checks are in `Tests/Results/admin-college-setup-validation-20261030.json`. They cover login, reproducing the original 403 before the repair, an idempotent SQL rerun, preserved passwords/primary college/revoked mappings, live selected-college permissions, academic-year creation and generation, new-college access provisioning, department/course/branch/semester/section creation, scoped governance, unrelated-college denial, permission revocation, mapping revocation, copied permission ceilings, atomic rollback, and preservation of all original controller route attributes.

Modules outside those listed workflows were not exhaustively exercised. Existing APIs and module-specific business validations are preserved.

## Operational notes

Run the SQL before starting the new backend: college creation now requires `sp_College_ProvisionCreatorAccess`. MySQL routine DDL commits independently; the ADM002 data repair itself runs in a transaction. A college-setting code collision or other database constraint aborts the data repair rather than overwriting existing settings. The final SELECTs show the resulting mappings and permissions for review.

Access to colleges not created by ADM002 still requires an existing authorized assignment. An inactive/removed mapping or inactive settings row is deliberately preserved and must be reviewed through the normal privileged administration flow.
