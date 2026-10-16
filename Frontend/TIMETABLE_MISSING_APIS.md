# Timetable APIs: integrated and remaining gaps

Rechecked against live Swagger on 16 October 2026. The configured `/swagger/v1/swagger.json` now returns **HTTP 200**. The timetable portion of `timetable-current-openapi.json` was updated from that document. The earlier 404 discovery issue is resolved.

## Newly available APIs integrated

Base: `/api/v1/timetable-management`.

| Feature | Actual endpoint | Actual request contract | Frontend behavior |
| --- | --- | --- | --- |
| Versioned revision draft | POST `/timetables/{timetableId}/revisions` | `{expectedRevision, reason}`; reason may be null | Create Revision Draft opens confirmation/reason input, checks current published source/revision, creates the backend draft and opens it. The old official timetable is preserved. This replaces the normal workflow's Demo revision action. |
| Batch publication | POST `/publication-batches` | `{items: [{timetableId, expectedRevision}]}` | After local/global validation and review, selected drafts are sent in one batch request. No sequential per-table fallback occurs. Backend records are refreshed and every requested timetable must be Published before success is reported. |

Both contracts are taken directly from `CreateTimetableRevisionRequest`, `PublishTimetableBatchRequest`, and `PublishTimetableBatchItem`. IDs and revision values are numeric and validated before requests. Missing revision metadata produces an error instead of assuming zero. HTTP errors, including 409 stale-revision conflicts, remain errors. Duplicate requests in this application instance are blocked.

The already integrated period/calendar/classroom, master/entry CRUD, requirements, generation, local/global validation and published student/faculty views are retained. No backend or Examination Timetable files were changed.

## Remaining gaps

Proposed contracts below are suggestions only; they are never called as invented URLs.

| Feature | Existing API Checked | Missing Operation | Suggested API Contract | Current Demo Implementation | Priority |
|---|---|---|---|---|---|
| Conditional draft edits | Revision and batch APIs now accept expectedRevision; master/entry PUT DTOs remain unchanged | Server-enforced preconditions on ordinary setup/entry mutations | Add documented If-Match or expectedRevision to existing update/delete contracts; return 409/412 for stale changes | None. Fresh content/revision checks remain in place; cross-device edit atomicity needs backend support | High |
| Version-specific calendar/period changes | Year-scoped `/calendar`, `/periods`, sync-periods, and the new revision endpoint | Explicit version-specific timing/calendar contract that preserves published-year history | Expose immutable calendar/period version identity per timetable revision | No backend timing replacement is simulated. Existing occupied slots and shared published calendars remain protected | High |
| Faculty workload policy | Existing GET `/api/v1/faculty/{facultyId}/workload`, allocations and validate-global | A documented workload-limit DTO with units and effective dates; the workload GET response is untyped | Define maximum weekly teaching periods and effective scope in a policy response | No invented limit. Explicitly loaded maxPeriodsPerWeek is checked; absence is not guessed from credits | Medium |
| Response DTOs and persisted revision lineage | New revisions/batches and existing detail/views all still advertise untyped 200 responses | Typed new-draft ID, revision, sourceTimetableId, batch outcome, and view/profile mappings | Document timetable IDs, revision and source identity on master detail/list, and publication metadata on views | None. New draft identity is verified by a fresh backend list. The known source relation from a successful revision request is retained in memory for the session; sourceTimetableId must be supplied by backend detail/list to retain revision-aware editing after a reload | High |

## Revision-aware validation

An explicit sourceTimetableId identifies the published version being revised. Local draft checks do not treat that same source version as an unrelated competing class; other section/faculty/room conflicts still apply. Real backend local/global validators still have to positively pass. The client never reopens the published source in place.

No timetable records or publication state are stored locally by the normal backend workflow. The relation remembered after successful revision creation is navigation/validation provenance, not a saved timetable or an official status. If a create response does not expose an ID, a uniquely new matching backend draft must be found; ambiguous responses produce an explicit refresh error.

## Demo and verification limits

The existing full demo adapter is available only through explicit development opt-in and is not an API-error fallback. Its records remain browser-only, backend entries are read-only and allocation saves are disabled. Historical standalone revision-preview helpers remain disconnected from the normal revision button.

Live Swagger discovery is verified. Authenticated business operations are covered by API/transport tests and intercepted browser fixtures; this does not claim a live institution-wide publication was performed. Backend batch atomicity depends on its implementation; the client uses one request and verifies final statuses rather than claiming a transaction from HTTP success alone.
