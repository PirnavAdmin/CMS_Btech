# Re-running the API integration tests

`run_integration_tests.py` is the Python suite used for the delivered verification. It uses the standard library and the MySQL command-line client. It performs real HTTP requests and SQL assertions, creates QA records, tests state changes, and writes results to `Tests/Results/`.

Use a **disposable MySQL server** containing a fresh import of the supplied `cms_btech` dump plus `Database/CMS_BTech_SQL_Changes_20260908.sql`. Run a separate backend instance connected to that server. The dump's user 1 and college 1 are used as test context. Do not point this suite at the working college database.

Configure that isolated backend with a test-only `Jwt:Key` of at least 32 characters, and set the same value as `CMS_TEST_JWT_KEY` in the test terminal. Pass its configured JWT issuer and audience below. If the MySQL test account needs a password, set `MYSQL_PWD` for the client. Keep SMTP disabled/unavailable in the isolated backend; the suite does not require outgoing email.

```bash
python Tests/run_integration_tests.py --base-url http://localhost:5187 --mysql-port 33307 --mysql-user root --jwt-issuer <isolated-issuer> --jwt-audience <isolated-audience> --confirm-disposable
```

Use `--mysql-client` if `mysql` is not on PATH, and `--mysql-host` for the disposable database host. Run the command from `BTech/`. `CMS_TEST_JWT_KEY` is read from the environment and is not written into results.

The suite checks each Swagger operation: GET routes use sample IDs/required parameters, and other routes test missing/invalid input (with the existing bodyless academic-year-generation action exercised normally). Successful workflows then cover hierarchy CRUD, assignments, promotion, document upload/download/delete, authentication/refresh, profile/address updates, Aadhaar uniqueness, filtered downloads, every CSV/JSON dataset, role scoping, logs, and original-route preservation.

A valid 400/404/409 response is expected for an invalid-input or missing-record test. This does not mean every route's complete business workflow has been exhausted. Every result includes its case and status. Any failed assertion makes the script exit with code 1.

`test-password-hash.txt` is a fixed BCrypt fixture for a newly created QA-only user; its test password is `CmsQaTest2026!`. It is not an application administrator credential. The suite creates `.invalid` email addresses and does not rely on production accounts' passwords.

For manual checks, import `Verification/CMS_BTech.postman_collection.json` into Postman, set `baseUrl` and `accessToken`, and replace the example IDs/body fields with records from your test database. The collection is an API inventory, not a sequential CRUD fixture runner.
