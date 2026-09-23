# Changes in this package

1. Retained all 195 original API operations; added 49 operations for export catalog/download aliases, dependency previews, status aliases and activity logs.
2. Added 20 authenticated CSV/JSON datasets with filters, complete matching rows, download headers, college scoping and safe CSV quoting.
3. Added database-backed deactivation and parent-selection rules across department/course/branch/semester/section/student relationships. Historical records remain intact.
4. Added API activity recording, status history, correlation IDs, and useful conflict/validation responses.
5. Fixed admission field aliases, nested form/address preservation, course filtering and complete academic-selection persistence.
6. Fixed branch specialization persistence and retained semester course resolution from the selected branch.
7. Integrated employee/student house and permanent address fields into models, requests, responses, repositories and profile history.
8. Preserved nested full-profile data and corrected SUPER_ADMIN profile lookup when no college claim is present.
9. Added the requested Aadhaar cleanup and rerunnable uniqueness migration with clear duplicate API responses.
10. Merged password-strength validation and the connection setting from the latest supplied ZIP.
11. Corrected stored-procedure collation conflicts found against the supplied MySQL dump, including promotion.
12. Added an executed test suite, API inventory/Postman collection, runtime application and the combined SQL patch. No frontend source changes.

Read START_HERE.md for setup and frontend integration boundaries. Verification/source-changes.json lists the exact file changes.
