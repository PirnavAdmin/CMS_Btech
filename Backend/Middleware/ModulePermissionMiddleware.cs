using System.Security.Claims;
using Dapper;
using MySqlConnector;
using BTech.Services;

namespace BTech.Middleware;

/// <summary>
/// Enforces live role_permissions for mapped API modules. Permission values are
/// queried on each request so edits affect already-issued JWT sessions.
/// Bypass policy: only an active SUPER_ADMIN role bypasses module permissions.
/// COLLEGE_ADMIN and all other roles must have explicit permissions.
/// </summary>
public sealed class ModulePermissionMiddleware
{
    public const string CurrentCollegeItem = "AcademicYearAuthorization.CollegeId";
    public const string ActiveRolesItem = "Authorization.ActiveRoles";
    public const string AssignedCollegeItem = "Authorization.AssignedCollegeId";
    public const string SuperAdminItem = "AcademicYearAuthorization.IsSuperAdmin";

    private readonly RequestDelegate _next;
    private readonly string _connectionString;
    private readonly ILogger<ModulePermissionMiddleware> _logger;

    private static readonly HashSet<string> StudentModules = new(StringComparer.OrdinalIgnoreCase)
    {
        "dashboard", "my_profile", "notifications", "subjects", "student_attendance",
        "results", "timetable", "materials", "fees"
    };

    public ModulePermissionMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<ModulePermissionMiddleware> logger)
    {
        _next = next;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() != null)
        {
            await _next(context);
            return;
        }

        var path = (context.Request.Path.Value ?? string.Empty).TrimEnd('/');
        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) || IsAuthenticationOrInfrastructurePath(path))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await Deny(context, StatusCodes.Status401Unauthorized, "Authentication is required.");
            return;
        }

        var module = ResolveModule(path);
        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub");
        if (!long.TryParse(userIdValue, out var userId) || userId <= 0)
        {
            await Deny(context, StatusCodes.Status401Unauthorized, "A valid user identity is required.");
            return;
        }

        var academicYearsPath = path.Equals("/api/v1/academic-years", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/v1/academic-years/", StringComparison.OrdinalIgnoreCase);
        long? selectedAcademicCollege = null;
        if (module != null && AcademicSetupCollegeScope.Supports(module))
        {
            var selection = await AcademicYearScopeRequest.ReadAsync(context.Request, academicYearsPath);
            if (selection.Error != null)
            {
                await Deny(context, StatusCodes.Status400BadRequest, selection.Error);
                return;
            }
            selectedAcademicCollege = selection.CollegeId;
            context.Items[AcademicYearScopeRequest.ItemKey] = selectedAcademicCollege;
        }


        var action = ResolveAction(context.Request.Method, path);
        if (!await AuthorizeAsync(context, path, module, userId, selectedAcademicCollege, action))
            return;

        // Existing services read collegeId from the principal. Use the verified request
        // scope without changing the saved primary college or issuing elevated roles.
        if (context.Items[SuperAdminItem] is not true &&
            !path.Equals("/api/v1/account/profile", StringComparison.OrdinalIgnoreCase) &&
            context.Items[CurrentCollegeItem] is long effectiveCollege &&
            context.User.Identity is ClaimsIdentity identity)
        {
            foreach (var claim in identity.FindAll("collegeId").ToList()) identity.RemoveClaim(claim);
            identity.AddClaim(new Claim("collegeId", effectiveCollege.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }
        await _next(context);
    }

    private async Task<bool> AuthorizeAsync(HttpContext context, string path, string? module,
        long userId, long? selectedAcademicCollege, string action)
    {
        var dependency = "database-connection";
        try
        {
            await using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync(context.RequestAborted);
            dependency = "active-account/users";
            var collegeId = await connection.ExecuteScalarAsync<long?>(new CommandDefinition(
                "SELECT college_id FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL LIMIT 1;",
                new { userId }, cancellationToken: context.RequestAborted));
            var accountExists = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
                "SELECT COUNT(*) FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL;",
                new { userId }, cancellationToken: context.RequestAborted));
            if (accountExists != 1)
            {
                await Deny(context, StatusCodes.Status401Unauthorized, "The account is inactive or no longer exists.");
                return false;
            }

            const string rolesSql = """
                SELECT DISTINCT UPPER(TRIM(r.role_code))
                FROM user_roles ur
                INNER JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL;
                """;
            dependency = "active-roles/user_roles+roles";
            var rawRoleCodes = await connection.QueryAsync<string>(new CommandDefinition(rolesSql, new { userId }, cancellationToken: context.RequestAborted));
            var roleCodes = rawRoleCodes.Select(CanonicalRoleCode.Normalize).ToHashSet(StringComparer.OrdinalIgnoreCase);
            // Pass the same live, verified authorization snapshot to academic-year scope resolution.
            context.Items[CurrentCollegeItem] = collegeId;
            context.Items[AssignedCollegeItem] = collegeId;
            context.Items[ActiveRolesItem] = roleCodes;
            context.Items[SuperAdminItem] = roleCodes.Contains("SUPER_ADMIN");
            if (roleCodes.Contains("SUPER_ADMIN"))
            {
                return true;
            }

            if (path.Equals("/api/v1/account/profile", StringComparison.OrdinalIgnoreCase) ||
                path.Equals("/api/v1/profile/photo", StringComparison.OrdinalIgnoreCase) ||
                (path.Equals("/api/v1/profile", StringComparison.OrdinalIgnoreCase) &&
                 (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method))))
            {
                return true;
            }

            if (module == null)
            {
                // Fail closed for unclassified API endpoints. Explicit exemptions above
                // are limited to authentication and infrastructure endpoints.
                await Deny(context, StatusCodes.Status403Forbidden, "No permission mapping exists for this API endpoint.");
                return false;
            }

            // A student assignment always restricts the account to the student portal,
            // even when another non-super-admin role contains administrative grants.
            if (roleCodes.Contains("STUDENT") && !StudentModules.Contains(module))
            {
                await Deny(context, StatusCodes.Status403Forbidden, "Student accounts may only access student-portal modules.");
                return false;
            }

            // Resolve academic setup records and explicit college selections against live ownership.
            // Mapped College Admin access still requires the selected college permission matrix.
            dependency = "academic-record-ownership";
            var referenceScope = await AcademicSetupCollegeScope.ResolveAsync(connection, context, module);
            if (referenceScope.Error != null)
            {
                await Deny(context, StatusCodes.Status403Forbidden, referenceScope.Error);
                return false;
            }
            if (selectedAcademicCollege.HasValue && referenceScope.CollegeId.HasValue &&
                selectedAcademicCollege != referenceScope.CollegeId)
            {
                await Deny(context, StatusCodes.Status403Forbidden, "The selected records do not belong to the selected college.");
                return false;
            }
            selectedAcademicCollege ??= referenceScope.CollegeId;
            if (AcademicSetupCollegeScope.Supports(module) && roleCodes.Contains("COLLEGE_ADMIN"))
            {
                var selected = selectedAcademicCollege;
                if (selected is > 0 && selected != collegeId)
                {
                    const string mappingSql = """
                        SELECT COUNT(*) FROM college_user_mappings m
                        INNER JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
                        INNER JOIN colleges c ON c.college_id=cs.college_id
                        WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL
                          AND cs.status=1 AND c.status=1 AND c.deleted_at IS NULL
                          AND cs.college_id=@selected;
                        """;
                    dependency = "college-mapping/college_user_mappings+college_settings+colleges";
                    var mapped = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
                        mappingSql, new { userId, selected }, cancellationToken: context.RequestAborted));
                    if (mapped > 0) collegeId = selected;
                    else _logger.LogWarning("Academic-year mapping denied. UserId={UserId}, AssignedCollegeId={AssignedCollegeId}, RequestedCollegeId={RequestedCollegeId}, RoleCodes={RoleCodes}, TraceId={TraceId}", userId, collegeId, selected, string.Join(",", roleCodes), context.TraceIdentifier);
                }
                context.Items[CurrentCollegeItem] = collegeId;
            }

            if (selectedAcademicCollege.HasValue && selectedAcademicCollege != collegeId)
            {
                await Deny(context, StatusCodes.Status403Forbidden, "Cross-college access is not permitted. An active college assignment is required.");
                return false;
            }

            // A primary assignment or verified mapping is required.
            if (collegeId == null && !roleCodes.Contains("SUPER_ADMIN"))
            {
                await Deny(context, StatusCodes.Status403Forbidden, "A college-scoped account is required.");
                return false;
            }

            var column = action switch
            {
                "view" => "can_view",
                "create" => "can_create",
                "edit" => "can_edit",
                "delete" => "can_delete",
                "export" => "can_export",
                _ => "can_view"
            };
            // A college-scoped row overrides the global row for the same role/module.
            // This allows College Admin to grant/revoke only within their own college.
            var permissionSql = $"""
                SELECT COALESCE(MAX(CASE
                    WHEN scoped.role_permission_id IS NOT NULL THEN scoped.{column}
                    ELSE COALESCE(global_permission.{column},0)
                END),0)
                FROM user_roles ur
                INNER JOIN roles r ON r.role_id=ur.role_id
                INNER JOIN permission_modules pm ON pm.module_key=@module AND pm.status=1
                LEFT JOIN role_permissions scoped
                  ON scoped.role_id=r.role_id AND LOWER(scoped.module_key)=LOWER(@module)
                 AND scoped.college_id=@collegeId
                LEFT JOIN role_permissions global_permission
                  ON global_permission.role_id=r.role_id AND LOWER(global_permission.module_key)=LOWER(@module)
                 AND global_permission.college_id IS NULL
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL
                  AND (r.college_id IS NULL OR r.college_id=@collegeId);
                """;
            dependency = "role-permissions/permission_modules+role_permissions";
            var granted = await connection.ExecuteScalarAsync<int>(new CommandDefinition(permissionSql, new { userId, module, collegeId }, cancellationToken: context.RequestAborted));
            dependency = "user-permissions/user_module_permissions";
            var userOverride = await connection.ExecuteScalarAsync<int?>(new CommandDefinition(
                $"SELECT {column} FROM user_module_permissions WHERE user_id=@userId AND college_id=@collegeId AND module_key=@module",
                new { userId, collegeId, module }, cancellationToken: context.RequestAborted));
            // User settings can narrow the live role ceiling, never elevate it.
            if (userOverride.HasValue && userOverride != 1) granted = 0;
            if (granted != 1)
            {
                _logger.LogWarning("Module permission denied. UserId={UserId}, Module={Module}, Action={Action}, Path={Path}", userId, module, action, path);
                await Deny(context, StatusCodes.Status403Forbidden, "You do not have permission to perform this action.");
                return false;
            }

            // For college-scoped accounts, reject explicit attempts to select a different
            // college through a query parameter. Row-level ownership must additionally be
            // enforced by the endpoint/service when resolving individual records.
            if (!roleCodes.Contains("SUPER_ADMIN") && collegeId.HasValue &&
                context.Request.Query.TryGetValue("collegeId", out var requestedCollege) &&
                long.TryParse(requestedCollege.ToString(), out var requestedId) && requestedId != collegeId.Value)
            {
                _logger.LogWarning("Cross-college query denied. UserId={UserId}, AuthorizedCollegeId={AuthorizedCollegeId}, RequestedCollegeId={RequestedCollegeId}, RoleCodes={RoleCodes}, TraceId={TraceId}", userId, collegeId, requestedId, string.Join(",", roleCodes), context.TraceIdentifier);
                await Deny(context, StatusCodes.Status403Forbidden, "Cross-college access is not permitted.");
                return false;
            }

            if (!roleCodes.Contains("SUPER_ADMIN") && collegeId.HasValue &&
                await HasCrossCollegeBodyAsync(context, collegeId.Value))
            {
                _logger.LogWarning("Cross-college body denied. UserId={UserId}, AuthorizedCollegeId={AuthorizedCollegeId}, RoleCodes={RoleCodes}, TraceId={TraceId}", userId, collegeId, string.Join(",", roleCodes), context.TraceIdentifier);
                await Deny(context, StatusCodes.Status403Forbidden, "Cross-college access is not permitted.");
                return false;
            }
            return true;
        }
        catch (MySqlException ex)
        {
            throw new AuthorizationDependencyException(ex, dependency, _connectionString);
        }
    }

    private static bool IsAuthenticationOrInfrastructurePath(string path) =>
        path.Equals("/api/auth/me/access", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/v1/auth/", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/v1/auth", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api/swagger", StringComparison.OrdinalIgnoreCase);

    private static string? ResolveModule(string path)
    {
        var p = path.ToLowerInvariant();
        // Classify the collection, so nested "students", "subjects", "rooms"
        // and "faculty" segments cannot change the permission being enforced.
        var parts=p.Split('/',StringSplitOptions.RemoveEmptyEntries);
        var index=parts.Length>1&&parts[1]=="v1"?2:1;
        var resource=parts.Length>index?parts[index]:"";
        var mapped=resource switch
        {
            "results" or "grades" or "grade-policies" => "results",
            "marks" => "marks",
            "exams" or "exam-types" or "exam-schedules" => "examinations",
            "electives" or "elective-approvals" or "elective-allocations" or "student-electives" => "electives",
            "credits" or "credit-configurations" or "credit-registrations" => "credits",
            "timetables" or "timetable-entries" or "timetable-management" => "timetable",
            "library" => "library",
            "placements" => "placement",
            "meetings" or "events" => "meetings_events",
            "faculty-attendance" => "faculty_attendance",
            "faculty-leave" => "faculty_leaves",
            "faculty-payroll" => "faculty_payroll",
            "faculty" or "faculty-profile" or "faculty-documents" or "faculty-subject-allocations" => "faculty_directory",
            "student-attendance" => "student_attendance",
            "student-admissions" or "admissions" => "student_admissions",
            "promotions" => "student_promotions",
            "academic-fee-plans" or "fee-students" or "fee-structures" or "fee-categories" or "fee-components" or "fee-assignments" or "fee-collection" or "hostel-fees" or "transport-fees" => "fees",
            _ => null
        };
        if(mapped!=null)return mapped;
        if (p.StartsWith("/api/v1/academic-fee-plans", StringComparison.Ordinal)) return "fees";
        if (p.Contains("access-governance") || p.StartsWith("/api/roles") || p.Contains("role-permission") || p.Contains("screen-exports/role")) return "roles_permissions";
        if (p.Contains("academic-year")) return "academic_years";
        if (p.Contains("dashboard")) return "dashboard";
        if (p.Contains("notification")) return "notifications";
        if (p.Contains("my-profile") || p.Contains("/profile/me") || p.Contains("/myprofile")) return "my_profile";
        if (p.Contains("academic-level") || p.Contains("academic-setting") || p.Contains("college-setting")) return "academic_settings";
        if (p.Contains("access-request") || p.Contains("activity-log")) return "roles_permissions";
        if (p.Contains("credential")) return "roles_permissions";
        if (p.Contains("demo-request")) return "colleges";
        if (p.Contains("college-user") || p.Contains("college-user-mapping")) return "colleges";
        if (p.Contains("college")) return "colleges";
        if (p.Contains("department")) return "departments";
        if (p.Contains("course-semester") || p.Contains("course-semester-mapping")) return "courses";
        if (p.Contains("course-structure")) return "courses";
        if (p.Contains("course")) return "courses";
        if (p.Contains("branch")) return "branches";
        if (p.Contains("semester")) return "semesters";
        if (p.Contains("section")) return "sections";
        if (p.Contains("room")) return "rooms";
        if (p.Contains("subject")) return "subjects";
        if (p.Contains("timetable")) return "timetable";
        if (p.Contains("credit")) return "credits";
        if (p.Contains("elective")) return "electives";
        if (p.Contains("material")) return "materials";
        if (p.Contains("faculty-attendance") || p.Contains("facultyattendance") || (p.Contains("faculty") && p.Contains("attendance"))) return "faculty_attendance";
        if (p.Contains("faculty-leave") || p.Contains("leave-request") || (p.Contains("faculty") && p.Contains("leave"))) return "faculty_leaves";
        if (p.Contains("payroll")) return "faculty_payroll";
        if (p.Contains("faculty")) return "faculty_directory";
        if (p.Contains("admission")) return "student_admissions";
        if (p.Contains("student-attendance") || p.Contains("studentattendance")) return "student_attendance";
        if (p.Contains("attendance")) return "student_attendance";
        if (p.Contains("promotion")) return "student_promotions";
        if (p.StartsWith("/api/v1/fee-", StringComparison.Ordinal)) return "fees";
        if (p.Contains("student-profile") || p.Contains("studentprofiles") || p.Contains("student-academic") || p.Contains("student-parent") || p.Contains("/students")) return "student_profiles";
        if (p.Contains("student")) return "student_profiles";
        if (p.Contains("examination") || p.Contains("/exams") || p.Contains("exam-schedule") || p.Contains("exam-type") || p.Contains("grade-policy")) return "examinations";
        if (p.Contains("mark")) return "marks";
        if (p.StartsWith("/api/v1/grades", StringComparison.Ordinal)) return "results";
        if (p.Contains("result")) return "results";
        if (p.Contains("fee") || p.Contains("hostel-fee") || p.Contains("transport-fee")) return "fees";
        if (p.Contains("library")) return "library";
        if (p.Contains("meeting") || p.Contains("event")) return "meetings_events";
        if (p.Contains("placement")) return "placement";
        if (p.Contains("profile")) return "my_profile";
        if (p.Contains("academic-setting")) return "academic_settings";
        if (p.Contains("export") || p.Contains("screen-exports")) return InferExportModule(p);
        return null;
    }

    private static string? InferExportModule(string path)
    {
        if (path.Contains("student")) return "student_profiles";
        if (path.Contains("faculty")) return "faculty_directory";
        if (path.Contains("subject")) return "subjects";
        if (path.Contains("attendance")) return "student_attendance";
        if (path.Contains("fee")) return "fees";
        if (path.Contains("result") || path.Contains("mark")) return "results";
        return null;
    }

    private static string ResolveAction(string method, string path)
    {
        if (path.Contains("export", StringComparison.OrdinalIgnoreCase) || path.Contains("download", StringComparison.OrdinalIgnoreCase)) return "export";
        var p = path.ToLowerInvariant();
        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && p.StartsWith("/api/v1/academic-fee-plans/", StringComparison.Ordinal)) return "edit";
        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && p.StartsWith("/api/v1/student-admissions/", StringComparison.Ordinal) && p.EndsWith("/fee-ledger",StringComparison.Ordinal)) return "edit";
        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && p.StartsWith("/api/v1/faculty-leave/policies/", StringComparison.Ordinal) &&
            (p.EndsWith("/activate", StringComparison.Ordinal) || p.EndsWith("/deactivate", StringComparison.Ordinal))) return "edit";
        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && p.StartsWith("/api/v1/faculty-payroll/", StringComparison.Ordinal) &&
            (p.EndsWith("/process", StringComparison.Ordinal) || p.EndsWith("/confirm-payment", StringComparison.Ordinal))) return "edit";
        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) &&
            (p.Contains("/search") || p.Contains("/filter") || p.Contains("/summary") || p.Contains("/query") || p.Contains("/list") || p.Contains("/preview") || p.Contains("/validate")))
            return "view";
        return method.ToUpperInvariant() switch
        {
            "GET" or "HEAD" => "view",
            "POST" => "create",
            "PUT" or "PATCH" => "edit",
            "DELETE" => "delete",
            _ => "view"
        };
    }

    private static async Task<bool> HasCrossCollegeBodyAsync(HttpContext context, long collegeId)
    {
        var request = context.Request;
        if (request.ContentLength is 0 ||
            request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) != true ||
            request.Method is "GET" or "HEAD") return false;
        if (request.ContentLength is > 4_194_304)
            throw new BadHttpRequestException("JSON request exceeds the college-scope validation limit.", StatusCodes.Status413PayloadTooLarge);

        request.EnableBuffering();
        try
        {
            using var document = await System.Text.Json.JsonDocument.ParseAsync(request.Body, cancellationToken: context.RequestAborted);
            request.Body.Position = 0;
            return ContainsDifferentCollege(document.RootElement, collegeId, 0);
        }
        catch (System.Text.Json.JsonException)
        {
            request.Body.Position = 0;
            return false; // Let model binding return the appropriate malformed-body response.
        }
        finally
        {
            if (request.Body.CanSeek) request.Body.Position = 0;
        }
    }

    // Inspect every college reference, including nested rows in bulk requests. A
    // malformed identifier must not silently turn into an unscoped write.
    private static bool ContainsDifferentCollege(System.Text.Json.JsonElement element, long collegeId, int depth)
    {
        if (depth > 32) return true;
        if (element.ValueKind == System.Text.Json.JsonValueKind.Array)
            return element.EnumerateArray().Any(item => ContainsDifferentCollege(item, collegeId, depth + 1));
        if (element.ValueKind != System.Text.Json.JsonValueKind.Object) return false;
        foreach (var property in element.EnumerateObject())
        {
            if (property.Name.Equals("collegeId", StringComparison.OrdinalIgnoreCase) ||
                property.Name.Equals("college_id", StringComparison.OrdinalIgnoreCase))
            {
                if (property.Value.ValueKind == System.Text.Json.JsonValueKind.Null) continue;
                if (!long.TryParse(property.Value.ToString(), out var supplied) || supplied != collegeId)
                    return true;
            }
            else if (ContainsDifferentCollege(property.Value, collegeId, depth + 1)) return true;
        }
        return false;
    }

    private static async Task Deny(HttpContext context, int status, string message)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = context.TraceIdentifier;
        await context.Response.WriteAsJsonAsync(new { success = false, message, statusCode = status, correlationId = context.TraceIdentifier });
    }
}
