R15 tests use a fresh disposable import of the provided MySQL dump plus Database/FrontendContractAudit/CMS_R15_20261107.sql. The HTTP suite changes records and refuses database names without the _faculty_test suffix. Keep the real institution database separate.

Start a separate backend with that test connection and a random test JWT key, issuer and audience. Set CMS_TEST_JWT_KEY, CMS_TEST_JWT_ISSUER and CMS_TEST_JWT_AUDIENCE to match. Set MYSQL_PWD for the MySQL CLI if needed. The known BCrypt fixture password CmsQaTest2026! belongs only to newly created QA accounts.

Run from Backend:

    python Tests/FrontendContracts/run_isolated.py --base-url http://localhost:5199 --database cms_frontend_audit_faculty_test --mysql-port 3306 --confirm-disposable --output frontend-contract-regression.json

The launcher verifies a random seeded college through the HTTP backend before any HTTP mutation. run_regression.py is the assertion runner used in the R15 verification. The portable launcher setup was code-inspected; the recorded run used an equivalent isolated-server harness. Windows deployment was not tested.

Executable .NET suites can be run with dotnet run --project Tests/<suite>/<suite>.Tests.csproj -c Release. MySQL suites require CMS_FEE_TEST_CONNECTION, CMS_MARKS_TEST_CONNECTION, CMS_FACULTY_TEST_CONNECTION or CMS_INVITATION_TEST_CONNECTION; keep their disposable-name guards. InvitationMySql requires a separate clone ending _invitation_test. Mail/setup and some authentication are captured by test doubles in those component suites. The HTTP assertion runner uses actual JWT middleware and password login. Never substitute production connection strings or JWT keys.

Set CMS_AUDIT_BASE_URL and CMS_AUDIT_SUPER_TOKEN for the fee suite's two optional HTTP collection/repair checks, using an authenticated Super Admin in the same isolated server. The R15 recorded run included these checks. The current result JSON and suite logs are under Verification/FrontendContractAudit_R15.
