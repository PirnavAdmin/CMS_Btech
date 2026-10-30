# Validation report — 27 September 2026

- `dotnet build`: succeeded using .NET SDK 8.0.425, targeting .NET 8. Zero errors; four pre-existing warnings (duplicate using in StudentElectives and unused exception variables in Otp/Faculty). Unrelated files were left unchanged.
- Restored the supplied SQL dump into an isolated MySQL 8.0.46 database. The user's live database was not accessed or modified.
- Subject SQL update executed successfully twice. Existing subject counts were preserved. The patch does not replace other modules' routines or tables.
- 40 live validation checks passed. `Validation_Checks.csv` lists every executed check. Calls used a temporary locally signed test token against the isolated API, not a production login account.
- Both screen and legacy Subject routes were exercised, including field round trips, numeric strings/blanks, status compatibility, filters, pagination, summary, CSV/XLSX, invalid IDs/relationships, duplicate codes, soft deletion and dependency rejection.
- Read-only smoke calls passed for roles, rooms, timetable classrooms, timetables and timetable entries. These checks do not constitute exhaustive behavioral testing of every unrelated API.
- Source route comparison: all 409 routes found in Admin and all 389 found in Timetable are retained; merged inventory has 436 route/method combinations and no duplicates. Swagger generated successfully at runtime. See `Merged_API_Routes.csv`.
- Every imported Timetable source file is byte-for-byte identical to the supplied Timetable package. Admin governance/roles/rooms implementations remain unchanged. Only merge registrations and Subject Management code were newly changed.
- Frontend files are unchanged. The supplied Subject service is still localStorage-backed, so end-to-end screen/database integration requires its frontend owner to wire the documented API calls. The existing `if (open)` versus `editorOpen` condition also needs frontend review. This was not represented as a completed browser integration test.

The test database, test tokens, SDK/database binaries, generated logs and temporary test records are not included in the delivery.
