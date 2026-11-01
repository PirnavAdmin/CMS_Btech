# Academic fee plan backend tests

The executable test suite references the real backend services/repositories. It uses assertions with a nonzero process exit on failure and needs only the backend's existing NuGet dependencies.

Rule tests (no database):

```powershell
dotnet run --project Tests/AcademicFeePlans/AcademicFeePlans.Tests.csproj
```

Database integration tests:

1. Create an isolated MySQL 8 test database, with `test` in its database name.
2. Restore the supplied database dump into that test database.
3. Apply `Database/Sql/Fees/AcademicFeePlans_20261031.sql` to it.
4. Run from Backend:

```powershell
$env:CMS_FEE_TEST_CONNECTION = "Server=localhost;Port=3307;Database=cms_fee_test;User ID=root;Password=<your-test-password>;"
dotnet run --project Tests/AcademicFeePlans/AcademicFeePlans.Tests.csproj
Remove-Item Env:CMS_FEE_TEST_CONNECTION
```

The suite creates uniquely named colleges, academic mappings, users, scoped roles, permissions, fee plans and admissions in the test database. It retains fixtures for inspection. Never point it at the production database. It rejects a database name without `test` and does not drop databases or remove existing data.

Coverage includes exact decimal sums/precision, component and installment errors, every workflow edge, scope matching, local-ID rejection, database-backed college isolation, role approval restrictions, stale role claims, picker filtering, snapshot assignment, client-total tampering, transactional rollback, academic update rollback, version replacement, immutable admission fees, revision conflicts and live permission revocation.
