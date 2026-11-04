> Superseded for deployment by USER_ONBOARDING_R3.md. R3 REQUIRES the onboarding migration before starting the API.

# Super Admin User Access repair

## Confirmed in the supplied ZIP
- AuthAccessController contains the old cms-backend-20261030-admin-college-setup marker.
- ModulePermissionMiddleware rejects unmapped URLs before querying the active account and roles. This explains why an account can report SUPER_ADMIN from /api/auth/me/access yet receive the reported mapping rejection.
- Neither GET /api/v1/admin/users nor GET /api/v1/admin/users/lookups exists in this uploaded source. A bypass-only change would leave missing routes.
- The new dump has the users, roles, user_roles and colleges columns used by this change and includes SUPER_ADMIN role data. No database mutation or permission grant is required by this patch.

## Changes
1. ModulePermissionMiddleware: move only the unmapped-endpoint rejection after the live active-account/role check and Super Admin bypass. Preserve academic selection parsing and non-Super-Admin module, student, permission and college enforcement.
2. AuthAccessController: buildId = cms-backend-20261102-superadmin-user-access-r2.
3. AdminUsersController: authenticated, read-only Super Admin endpoints. Both require the middleware's database-verified SuperAdminItem flag, not token role claims alone. Other roles remain denied on these previously unmapped URLs.

## Response contract
GET /api/v1/admin/users?collegeId=82&search=name&pageNumber=1&pageSize=50
Optional collegeId/search; pageSize 1–200, default 50.
Response: {success:true,data:{items:[{userId,collegeId,employeeUserId,fullName,email,status,roleCodes}],totalCount,pageNumber,pageSize}}
Includes active and inactive users, excludes deleted users; password hashes and authentication secrets are excluded.

GET /api/v1/admin/users/lookups
Response: {success:true,data:{colleges:[{collegeId,collegeCode,collegeName}],roles:[{roleId,roleCode,roleName,collegeId}],statuses:[{value:1,label:"Active"},{value:0,label:"Inactive"}]}}
Only active, non-deleted colleges and roles are returned. Role lookup visibility does not grant assignment rights.

The frontend was not supplied. Verify it reads data.items for the user list and data.colleges/data.roles/data.statuses for lookups. User creation/edit/delete endpoints are not introduced by this read-endpoint fix.

## Deploy on the API host
1. Merge the three changed/new C# files into the actual deployment checkout. Preserve any newer unrelated changes on that host, including earlier college creation fixes. This package is based on the latest uploaded ZIP, not an assumed newer branch.
2. From Backend run: dotnet restore; then dotnet build BTech.csproj -c Release; then dotnet publish BTech.csproj -c Release -o ./publish-user-access. Run these as separate commands in your shell.
3. Stop the OLD API process/service and deploy the published output using your normal service configuration. Preserve environment variables, secrets, uploaded files and the correct DefaultConnection.
4. Restart the API/service. Confirm the ngrok tunnel points at this process's local port, not another stale API instance.
5. Using a valid Super Admin token, GET /api/auth/me/access. Check buildId equals cms-backend-20261102-superadmin-user-access-r2 and isSuperAdmin=true. Check buildModuleId to distinguish compiled assemblies.
6. Run Verification/SuperAdminUserAccess/smoke_test.py with CMS_BASE_URL, CMS_SUPERADMIN_TOKEN, CMS_COLLEGEADMIN_TOKEN and CMS_OTHER_ROLE_TOKEN set locally. Do not place tokens in source control. It checks both Super Admin GETs return 200, anonymous requests return 401, and ordinary roles return 403.
7. With existing College Admin and other-role accounts, also exercise an already-permitted mapped module in their assigned college, a module without permission, and a cross-college request. Confirm existing allow/deny behavior. In a disposable test environment revoke a Super Admin role and deactivate an account; old tokens must lose access. Restore test fixtures afterward.

## Validation status
Completed: schema inspection; static ordering and active-role predicate checks; both new endpoints require the verified flag; explicit user field projection; existing non-Super-Admin enforcement tail unchanged; ZIP integrity check.
Not completed here: dotnet build, SQL execution, live API 200 responses, frontend integration, live tenant regression. This environment has no .NET SDK/MySQL runtime, and no authenticated deployment access or tokens were provided. Do not interpret the updated marker as proof of deployment or success.

No authentication was disabled, no role was granted, no college was deleted, and no production database was changed.

## Revision 2: SQL boundary correction
The first package joined the users SELECT projection and FROM clause without whitespace (StatusFROM). Added an explicit newline. This is a confirmed source defect, not a verified diagnosis of the deployed instance. Added correlation ID and MySQL error number to generic database exception logging.
The uploaded source does not contain User_Access_Onboarding_Migration.sql or references to user_module_permissions, user_academic_year_access or user_access_audits. These two read endpoints do not require those tables. If the deployed backend uses them, obtain that newer source/migration before applying schema changes.
The lookups query has no matching SQL concatenation defect. Its reported runtime failure is unresolved without the response and exception log. Build and authenticated runtime verification remain pending.
