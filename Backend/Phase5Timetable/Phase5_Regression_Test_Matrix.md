# Phase 5 Regression / Acceptance Test Matrix

Use Swagger or `Phase5_Timetable_API_Test.http` after applying the migration.

| # | Requirement | Test | Expected |
|---|---|---|---|
| 1 | Automatic period generation | Generate 09:00–16:00, 60 min, break after P2, lunch after P4 | CLASS/BREAK/LUNCH rows ordered without overlap |
| 2 | Manual period overlap | Create/update a period whose time overlaps another active period | HTTP 400 |
| 3 | Break/lunch exclusion | Sync slots after period setup | only `CLASS` periods become `timetable_slots` |
| 4 | Faculty conflict | Add/move same faculty to overlapping slot in another active timetable | HTTP 409 with `FACULTY_CONFLICT` |
| 5 | Room conflict | Add/move same classroom to overlapping slot | HTTP 409 with `ROOM_CONFLICT` |
| 6 | Section conflict | Add/move second class for same section/overlap | HTTP 409 with `SECTION_CONFLICT` |
| 7 | Overlapping times | Use different slot IDs whose start/end intervals overlap | conflict rejected by interval rule |
| 8 | Adjacent periods | P1 09:00–10:00 and P2 10:00–11:00 | allowed (`newStart < existingEnd && newEnd > existingStart` is false) |
| 9 | Edit self-conflict | Edit an entry without moving it into another entry | current entry excluded from conflict query |
| 10 | Auto generation | Configure frequency + faculty allocation + room | draft rows generated without conflicts |
| 11 | Unscheduled subject | Leave faculty allocation/frequency/room unavailable | structured reason code returned, subject not silently dropped |
| 12 | Generate Missing | Keep at least one manual row, call generate-missing | manual row preserved; only unmet requirements attempted |
| 13 | Holiday behavior | Publish weekly class then mark that concrete date HOLIDAY | date view/occurrence excludes class; weekly entry remains |
| 14 | Draft validation | Validate incomplete draft | `valid=false` with conflicts/warnings/unscheduled details |
| 15 | Publish blocked | Try publish while validation is blocking | HTTP 409, status remains DRAFT |
| 16 | Publish success | Resolve all blocking validation issues and publish | status becomes PUBLISHED/is_published=1 |
| 17 | Faculty view | query faculty published schedule | rows include day/period/subject/section/course/branch/room |
| 18 | Student view | query an active student | resolves current section and returns published section timetable |
| 19 | Classroom view | query room ID | room occupancy returned from same published entries |
| 20 | Authorization | non-admin attempts create/generate/publish | HTTP 403 |
| 21 | College isolation | college user requests another college timetable | HTTP 401/403-equivalent unauthorized response |
| 22 | Concurrent write | send two conflicting Phase-5 writes simultaneously in same academic year | academic-year lock serializes; losing request is revalidated/rejected |
| 23 | Multi-period lab | requirement blockSize=2 + LAB room | consecutive slots created with same `schedule_group_key` |
| 24 | Non-working weekday | manual add on weekday not configured as working | HTTP 400 |
| 25 | Invalid relationship | section/course/branch/semester IDs that do not belong together | HTTP 400 |

## Backward compatibility

Also rerun the existing timetable endpoints after Phase 5 changes. They must still be discoverable and callable because no old controller/route is removed or renamed.
