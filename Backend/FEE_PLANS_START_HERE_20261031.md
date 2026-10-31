# Fee Management → Student Admission backend update

1. Run the separately supplied `CMS_Academic_Fee_Plans_SQL_20261031.sql` against your existing database in MySQL Workbench. The same script is included under `Database/Sql/Fees/AcademicFeePlans_20261031.sql`.
2. Open `BTech.csproj`, retain your environment's connection/JWT/CORS settings, build, and run the API.
3. Use `/api/v1/academic-fee-plans` for draft management, approval and publication. Use `/api/v1/student-admissions/fee-plans` for the college-scoped admission picker.
4. Send the picker-returned numeric feeStructureId in the admission POST/PUT. Do not send localStorage IDs such as FS-STANDARD.

Full API contracts, sample requests, role requirements, matching rules, deployment notes and compatibility details: `Docs/Fees/AcademicFeePlans_Admission_Integration.md`.

Backend tests: `Tests/AcademicFeePlans/README.md`.
Verification results: `Verification/AcademicFeePlans/TEST_RESULTS.md`.

This package contains backend changes only. Existing APIs remain in the source. Managed academic plans use the new workflow, and old fee-edit routes deliberately reject attempts to bypass it. Existing legacy fee structures retain their routes. Existing admissions are not automatically assigned a plan. SQL is a direct additive update; do not run EF migrations for this change.
