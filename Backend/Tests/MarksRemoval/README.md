# Marks removal tests

Run with .NET 8 against an isolated MySQL 8 database whose name includes `test`. Restore the supplied 1 November 2026 dump and apply `Database/Sql/Marks/Marks_Soft_Removal_20261101.sql` first.

```powershell
$env:CMS_MARKS_TEST_CONNECTION="Server=localhost;Port=3307;Database=cms_marks_test;User ID=root;Password=<test-password>;"
dotnet run --project Tests/MarksRemoval/MarksRemoval.Tests.csproj
Remove-Item Env:CMS_MARKS_TEST_CONNECTION
```

The suite uses real signed JWT HTTP calls, the production permission middleware/controller/service/repository, and MySQL transactions/unique constraints. It seeds new, uniquely named fixtures and leaves them in the disposable database for inspection. Never use production. See `MARKS_DELETE_AND_ADMISSION_FIX_20261101.md` for the contract and coverage.
