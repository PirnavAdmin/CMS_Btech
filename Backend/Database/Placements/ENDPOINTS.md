# Placement workflow endpoints

All routes require a Bearer JWT. Add `?collegeId=1` for the sample college.

| Method | Route |
|---|---|
| GET | `/api/v1/placements/lookups` |
| GET | `/api/v1/placements/dashboard` |
| GET | `/api/v1/placements/drives` |
| GET | `/api/v1/placements/drives/{driveId:long}` |
| POST | `/api/v1/placements/drives` |
| PUT | `/api/v1/placements/drives/{driveId:long}` |
| PATCH | `/api/v1/placements/drives/{driveId:long}/status` |
| DELETE | `/api/v1/placements/drives/{driveId:long}` |
| GET | `/api/v1/placements/drives/{driveId:long}/eligibility-rules` |
| GET | `/api/v1/placements/drives/{driveId:long}/eligibility-rules/{ruleId:long}` |
| POST | `/api/v1/placements/drives/{driveId:long}/eligibility-rules` |
| PUT | `/api/v1/placements/drives/{driveId:long}/eligibility-rules/{ruleId:long}` |
| DELETE | `/api/v1/placements/drives/{driveId:long}/eligibility-rules/{ruleId:long}` |
| GET | `/api/v1/placements/drives/{driveId:long}/eligibility` |
| GET | `/api/v1/placements/drives/{driveId:long}/eligibility/{studentId:long}` |
| POST | `/api/v1/placements/drives/{driveId:long}/eligibility/evaluate` |
| GET | `/api/v1/placements/applications` |
| GET | `/api/v1/placements/applications/{applicationId:long}` |
| POST | `/api/v1/placements/drives/{driveId:long}/applications` |
| PUT | `/api/v1/placements/applications/{applicationId:long}` |
| PATCH | `/api/v1/placements/applications/{applicationId:long}/status` |
| GET | `/api/v1/placements/interviews` |
| GET | `/api/v1/placements/applications/{applicationId:long}/interviews` |
| GET | `/api/v1/placements/interviews/{interviewId:long}` |
| POST | `/api/v1/placements/applications/{applicationId:long}/interviews` |
| PUT | `/api/v1/placements/interviews/{interviewId:long}` |
| PATCH | `/api/v1/placements/interviews/{interviewId:long}/result` |
| PATCH | `/api/v1/placements/interviews/{interviewId:long}/status` |
| GET | `/api/v1/placements/selections` |
| GET | `/api/v1/placements/selections/{selectionId:long}` |
| GET | `/api/v1/placements/applications/{applicationId:long}/selection` |
| PUT | `/api/v1/placements/applications/{applicationId:long}/selection` |
| PATCH | `/api/v1/placements/selections/{selectionId:long}/offer` |
| PATCH | `/api/v1/placements/selections/{selectionId:long}/joined` |

Existing `/api/v1/placements/companies` GET/POST endpoints are unchanged.
