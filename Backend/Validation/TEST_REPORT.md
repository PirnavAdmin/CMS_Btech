# V2 validation report

101 targeted checks passed; see README_START_HERE.md for environment and scope.

Ownership correction: faculty 16/user 21/department 29 agree on college 87. Faculty 11/user 17/CIVIL department agree on college 82. Existing user/faculty IDs and 87 unrelated tables were preserved. No live database was changed.

| Check | Result |
|---|---|
| Supplied dump imports on MySQL 8.0.46 | PASS |
| College 87 exists in the latest supplied snapshot | PASS |
| SQL patch applies to supplied dump | PASS |
| SQL patch preserves every original row in affected tables | PASS |
| SQL patch can be rerun without data changes | PASS |
| College patch preserves supplied timetable procedure definitions | PASS |
| Data correction refuses unexpected live identity | PASS |
| Rejected data correction leaves faculty and departments unchanged | PASS |
| Data correction rolls back on a late failure | PASS |
| Rollback includes users, faculty, new department and audit | PASS |
| Faculty 16 and user 21 align with college 87 and department 29 | PASS |
| Faculty 11 keeps college 82 with its own CIVIL department | PASS |
| No faculty/user/department college mismatches remain | PASS |
| Original department rows remain unchanged | PASS |
| Only one college-specific CIVIL department is created | PASS |
| Passwords, contacts, identities and faculty details are preserved | PASS |
| Other users and faculty rows remain byte-for-byte equivalent | PASS |
| All other database tables retain every original row | PASS |
| Data correction rerun is idempotent | PASS |
| Data correction audit has one entry per changed record | PASS |
| Original college-scoping patch remains compatible after data correction | PASS |
| Complete backend starts and Swagger loads | PASS |
| Corrected college 87 faculty list is retrievable | PASS |
| College 87 list includes existing faculty 16 | PASS |
| Corrected faculty 16 details are retrievable | PASS |
| Faculty detail includes correct college and department | PASS |
| College 82 faculty list is retrievable | PASS |
| College 82 retains faculty 11 with CIVIL department | PASS |
| Faculty search returns actual repository records | PASS |
| Faculty search finds corrected existing record | PASS |
| Missing faculty details returns 404 | PASS |
| Missing live college produces clear leave validation | PASS |
| Missing live college produces clear course validation | PASS |
| Leave CL creates in college 87 despite existing shared CL | PASS |
| Query collegeId is persisted for leave creation | PASS |
| Same college leave name/code duplicate is rejected | PASS |
| Leave name duplicate with different code is rejected | PASS |
| Leave code duplicate with different name is rejected | PASS |
| Leave code/name trim and case handling | PASS |
| Same leave name/code can be created in another college | PASS |
| Leave list accepts college filter | PASS |
| Leave list contains only selected college records | PASS |
| Leave self-update excludes current record | PASS |
| Leave cannot be updated through another college | PASS |
| Legacy shared leave cannot be silently reassigned | PASS |
| Leave query/body mismatch rejected | PASS |
| Leave invalid college rejected | PASS |
| Leave body-only college supported | PASS |
| Leave inactive status update | PASS |
| Inactive leave reserves name/code | PASS |
| Inactive leave can be reactivated | PASS |
| Null leave name returns validation rather than 500 | PASS |
| Overlength leave code is rejected before database | PASS |
| BTECH creates in college 87 despite existing college 1 code | PASS |
| Query collegeId is persisted for course creation | PASS |
| Same college course code duplicate rejected | PASS |
| Same BTECH code succeeds in college 88 | PASS |
| Existing BTECH in college 1 still rejected | PASS |
| Course case and whitespace duplicate rejected | PASS |
| Course query/body mismatch rejected | PASS |
| Course self-update excludes current row | PASS |
| Unique course in same college succeeds | PASS |
| Course update to another record code rejected | PASS |
| Course update cannot silently move colleges | PASS |
| Course inactive status update | PASS |
| Inactive course code reserved in same college | PASS |
| Deleted course code reserved consistently | PASS |
| Invalid course college rejected | PASS |
| Course department must belong to selected college | PASS |
| Existing active faculty user is still rejected | PASS |
| Development conflict identifies real user 9 and faculty 1 | PASS |
| Latest dump faculty 16 mapping is reported, not duplicated | PASS |
| Latest conflict identifies corrected user 21, faculty 16, college 87 | PASS |
| Global faculty mapping rule retained across colleges | PASS |
| Auto selection does not reuse a mobile-only match | PASS |
| Auto selection does not reuse an email-only match | PASS |
| Email and mobile from different users rejected | PASS |
| Faculty query/body mismatch rejected | PASS |
| Faculty rejects wrong-college department | PASS |
| New faculty and new user create successfully | PASS |
| New faculty mapped to its newly created user | PASS |
| Exact contacts of already-linked user still rejected | PASS |
| Inactive faculty still reserves user mapping | PASS |
| Deleted faculty still reserves user mapping | PASS |
| Invalid employee profile is rejected | PASS |
| Failed faculty linking rolls back newly created account | PASS |
| Wrong selected user identity rejected | PASS |
| Unlinked selected user creates faculty successfully | PASS |
| Concurrent leave duplicate yields one success and one 409 | PASS |
| Concurrent course duplicate yields one success and one 409 | PASS |
| Concurrent faculty create yields one success and one 409 | PASS |
| Database itself rejects duplicate leave name | PASS |
| Database itself rejects duplicate leave code | PASS |
| Database itself rejects duplicate course code within college | PASS |
| Legacy course-code procedure retained | PASS |
| New scoped stored procedure excludes the current record | PASS |
| Legacy leave requests still readable | PASS |
| Legacy leave policies still readable | PASS |
| Legacy leave balances still readable | PASS |
| Foreign-college leave type cannot be applied to faculty | PASS |
| Original faculty mapping data is not altered by the fix | PASS |
