# Progressive record completion

Completion is separate from lifecycle and workflow status. The shared schema engine scores saved, applicable fields by weight, rounds to the nearest whole percent, and reserves 100% for a fully complete record. Missing fields and pending sections use the same calculation as the directory score. Permissions and workflow gates still control access to edit actions.

| Area | Supported workflow and boundaries |
| --- | --- |
| College Configuration | The existing modal accepts a valid name and code, offers Skip on optional sections, and saves through the college API from Save & Continue Later. Resume uses the existing permission-checked editor. Skipping retains entered values, and any supplied fields must still pass validation. The existing browser-only unsaved draft stays separate from backend completion. |
| Department, Course, Branch | Completion and resume use the existing saved-record APIs and edit workflows. Existing creation forms already accept omitted optional profile information. Course duration and semesters, branch rules, and department scope remain required as before. Their form layouts were retained. |
| Faculty and non-teaching staff | Completion uses the common saved employee-directory fields. Administrative edit permissions still apply. Profile-only details and documents are outside the score because the roster does not return them. Account invitation and access rules were retained. |
| Student Admission | Completion uses fields from the saved admission response, independent of submission and approval. Parent/guardian Skip retains entered values in the wizard. The existing API draft and workflow validation remain in place. |
| Student Profile | Completion uses fields shared by the profile directory and preview endpoints. Rows supplied only by the approved-admission fallback show unavailable until a profile is retrieved. Local photo and profile fallbacks do not contribute. |
| Academic fee structures | Completion uses saved academic fee plans and conditionally checks full payment or installments. The existing API draft edit and publish gates still apply. Fee Types are read-only in the current API. Hostel and transport planning records do not supply equivalent backend completion data here. |

Campus planning screens that keep page-only drafts do not get a backend completion score. Additional campus and academic configuration workflows require their own verified saved-record projections and have not been migrated. Attendance, payments, payroll, marks, results, and approvals retain their workflow indicators.

College date fields that are only cached locally do not count. The current college update API treats omitted or null email, website, principal contact fields, and accreditation dates as unchanged. Completion follows the values the server returns. Clearing those fields requires explicit clearing support in the API. Clearing ordinary text fields that the API accepts as blank is reflected on refresh.
