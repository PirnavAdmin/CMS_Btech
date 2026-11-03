# Leave Policy Scope Fix — Validation Report

Tested 1 October 2026 against an isolated MySQL 8.0.46 restore of `DUMP 1-10.sql`.
**115/115 checks passed. Full backend compilation: 0 errors, 9 existing warnings.**

The application started and served Swagger successfully with 322 paths. Compilation used .NET 8 SDK 8.0.425 and matching dependency DLLs already provided with the backend; the delivered `BTech.csproj` and package references are unchanged. Online NuGet restore was not exercised in this environment. Tests did not access or modify a live database.

## Findings and preservation

- The original active `POL-2026` belongs to college 1, based on both existing leave requests. Its original name, academic year, employee category, dates, status, and entitlements were preserved.
- SQL added explicit college, department and branch scope. Fingerprints of every original column/row across all 92 original tables matched before and after the upgrade and after rerunning it.
- Unknown legacy ownership fails clearly; it is never assigned to an arbitrary college.
- Only two existing source files changed: `FacultyLeaveController.cs` and `FacultyLeaveRequests.cs`. Original route attributes are unchanged. All other original ZIP file bytes, including section allocation changes, are retained. New SQL, documentation and results are added. Runtime test logs and synthetic test records are excluded.

## Behavior covered

College separation; canonical academic years and aliases; Teaching/Non-Teaching/Both; different departments; different branches in the same department; department-wide versus branch scope; college-wide versus scoped policies; disjoint/contained/inclusive dates; exact conflict name/date/ID details; Draft exclusion; idempotent activation; invalid and foreign scopes; active edit rollback and status preservation; concurrent overlapping and non-overlapping activation; college/year list filtering; college-specific balance selection; full leave request dates and college matching; SQL rerun and legacy ownership safeguards.

These checks validate the changed workflows. They are not a claim that every unrelated application feature was exhaustively tested. No live deployment has been performed.

## Individual checks

| # | Check | Result |
|---|---|---|
| 1 | Latest supplied dump imports on MySQL 8.0.46 | PASS |
| 2 | Original active policy is POL-2026 with college 1 request evidence | PASS |
| 3 | Scope SQL applies successfully | PASS |
| 4 | All original database rows/columns preserved | PASS |
| 5 | Legacy policy college inferred as 1 with audit evidence | PASS |
| 6 | SQL rerun is idempotent | PASS |
| 7 | Complete backend starts and Swagger loads | PASS |
| 8 | Existing active policy activation is idempotent | PASS |
| 9 | Create draft: College 87 Policy | PASS |
| 10 | College 87 activates despite college 1 active policy | PASS |
| 11 | Create draft: College 1 Overlap | PASS |
| 12 | Actual overlapping college 1 policy is blocked | PASS |
| 13 | Real conflict contains existing name and dates | PASS |
| 14 | Rejected activation remains Draft | PASS |
| 15 | Wrong-college activation is rejected | PASS |
| 16 | Missing policy returns 404 | PASS |
| 17 | Invalid college returns 400 | PASS |
| 18 | Create draft: Year Alias | PASS |
| 19 | Academic year short alias cannot bypass conflicts | PASS |
| 20 | Create draft: Year Slash Alias | PASS |
| 21 | Academic year slash alias cannot bypass conflicts | PASS |
| 22 | Create draft: Distinct academic year | PASS |
| 23 | Different academic year does not block activation | PASS |
| 24 | Create draft: Employee type A | PASS |
| 25 | Create draft: Employee type B | PASS |
| 26 | Employee type first activates | PASS |
| 27 | Employee type allows disjoint scope | PASS |
| 28 | Create draft: Both against Teaching and NonTeaching | PASS |
| 29 | Both conflicts with each employee category | PASS |
| 30 | Every actual conflicting policy is returned | PASS |
| 31 | Create draft: Both first A | PASS |
| 32 | Create draft: Both first B | PASS |
| 33 | Both first first activates | PASS |
| 34 | Both first rejects overlap | PASS |
| 35 | Both first returns specific conflicting policy | PASS |
| 36 | Create draft: Different departments A | PASS |
| 37 | Create draft: Different departments B | PASS |
| 38 | Different departments first activates | PASS |
| 39 | Different departments allows disjoint scope | PASS |
| 40 | Create draft: Different branches same department A | PASS |
| 41 | Create draft: Different branches same department B | PASS |
| 42 | Different branches same department first activates | PASS |
| 43 | Different branches same department allows disjoint scope | PASS |
| 44 | Create draft: Same branch A | PASS |
| 45 | Create draft: Same branch B | PASS |
| 46 | Same branch first activates | PASS |
| 47 | Same branch rejects overlap | PASS |
| 48 | Same branch returns specific conflicting policy | PASS |
| 49 | Create draft: Department and its branch A | PASS |
| 50 | Create draft: Department and its branch B | PASS |
| 51 | Department and its branch first activates | PASS |
| 52 | Department and its branch rejects overlap | PASS |
| 53 | Department and its branch returns specific conflicting policy | PASS |
| 54 | Create draft: Branch and another department A | PASS |
| 55 | Create draft: Branch and another department B | PASS |
| 56 | Branch and another department first activates | PASS |
| 57 | Branch and another department allows disjoint scope | PASS |
| 58 | Create draft: Collegewide and scoped A | PASS |
| 59 | Create draft: Collegewide and scoped B | PASS |
| 60 | Collegewide and scoped first activates | PASS |
| 61 | Collegewide and scoped rejects overlap | PASS |
| 62 | Collegewide and scoped returns specific conflicting policy | PASS |
| 63 | Create draft: Dates disjoint A | PASS |
| 64 | Create draft: Dates disjoint B | PASS |
| 65 | Dates disjoint first activates | PASS |
| 66 | Dates disjoint allows disjoint scope | PASS |
| 67 | Create draft: Inclusive shared endpoint A | PASS |
| 68 | Create draft: Inclusive shared endpoint B | PASS |
| 69 | Inclusive shared endpoint first activates | PASS |
| 70 | Inclusive shared endpoint rejects overlap | PASS |
| 71 | Inclusive shared endpoint returns specific conflicting policy | PASS |
| 72 | Create draft: Contained date range A | PASS |
| 73 | Create draft: Contained date range B | PASS |
| 74 | Contained date range first activates | PASS |
| 75 | Contained date range rejects overlap | PASS |
| 76 | Contained date range returns specific conflicting policy | PASS |
| 77 | Create draft: Active edits A | PASS |
| 78 | Create draft: Active edits B | PASS |
| 79 | Active edits first activates | PASS |
| 80 | Active edits allows disjoint scope | PASS |
| 81 | Active edit cannot introduce overlap | PASS |
| 82 | Rejected active edit rolls back policy and entitlements | PASS |
| 83 | Non-conflicting active edit succeeds | PASS |
| 84 | Active edit response retains Active status | PASS |
| 85 | Reject college query/body mismatch | PASS |
| 86 | Reject foreign department | PASS |
| 87 | Reject foreign branch | PASS |
| 88 | Reject mismatched branch department | PASS |
| 89 | Reject zero department | PASS |
| 90 | Reject unknown branch | PASS |
| 91 | Reject unknown employee type | PASS |
| 92 | Reject invalid year | PASS |
| 93 | Reject inverted dates | PASS |
| 94 | Reject empty entitlements | PASS |
| 95 | Create draft: Concurrent A | PASS |
| 96 | Create draft: Concurrent B | PASS |
| 97 | Concurrent overlapping activations produce one success and one real conflict | PASS |
| 98 | Only one overlapping policy commits Active | PASS |
| 99 | Create draft: Concurrent disjoint A | PASS |
| 100 | Create draft: Concurrent disjoint B | PASS |
| 101 | Concurrent disjoint policies both activate | PASS |
| 102 | Policies list accepts selected college | PASS |
| 103 | Policies list respects college and returns scope fields | PASS |
| 104 | Policies list accepts normalized academic year | PASS |
| 105 | Academic year filter selects correct active policy | PASS |
| 106 | Leave balances still load | PASS |
| 107 | College 1 faculty only receives college 1 policy balances | PASS |
| 108 | Leave request rejects another college policy | PASS |
| 109 | Leave request checks full end date | PASS |
| 110 | Leave request with valid college scope succeeds | PASS |
| 111 | College 87 faculty remains retrievable | PASS |
| 112 | Migration refuses ambiguous legacy ownership | PASS |
| 113 | Unknown policy is not silently assigned a college | PASS |
| 114 | SQL is rerunnable after ownership guard stops it | PASS |
| 115 | Original active policy stays active with original dates | PASS |
