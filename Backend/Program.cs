using BTech.Data;
using BTech.Middleware;
using BTech.Logging;
using BTech.Filters;
using BTech.Repositories;
using BTech.Repositories.Implementations;
using BTech.Repositories.Interfaces;
using BTech.Services;
using BTech.Services.Implementations;
using BTech.Services.Interfaces;

using BTech.Models;
using UserRoleManagement.API.Data;
using BTech.Task_FacultyStatusHistory.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using System.Text;

var builder = WebApplication.CreateBuilder(args);


// ============================================================
// CONTROLLERS
// ============================================================

builder.Services.AddControllers(options =>
{
    options.Filters.AddService<ApiErrorSanitizationFilter>();
    options.Filters.AddService<ForeignRecordScopeFilter>();
});

builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    var fallback = options.InvalidModelStateResponseFactory;
    options.InvalidModelStateResponseFactory = context =>
    {
        if (!context.HttpContext.Request.Path.StartsWithSegments("/api/semester")) return fallback(context);
        var errors = context.ModelState.Where(x => x.Value?.Errors.Count > 0).ToDictionary(
            x => x.Key, x => x.Value!.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage)
                ? "Invalid JSON value." : e.ErrorMessage).ToArray());
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<BTech.Controllers.SemesterController>>();
        logger.LogWarning("Semester model binding rejected. Method={Method}, Path={Path}, StatusCode=400, CorrelationId={CorrelationId}, ValidationErrors={ValidationErrors}",
            context.HttpContext.Request.Method, context.HttpContext.Request.Path,
            context.HttpContext.TraceIdentifier, System.Text.Json.JsonSerializer.Serialize(errors));
        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
        {
            success = false, message = "Invalid semester request: " + string.Join("; ", errors.SelectMany(e => e.Value.Select(v => e.Key + ": " + v))),
            statusCode = 400, route = context.HttpContext.Request.Path.Value,
            correlationId = context.HttpContext.TraceIdentifier, errors
        });
    };
});

builder.Services.AddScoped<SemesterRequestDiagnosticsFilter>();
builder.Services.AddScoped<ApiErrorSanitizationFilter>();
builder.Services.AddScoped<ForeignRecordScopeFilter>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IFacultyDocumentService, FacultyDocumentService>();
builder.Services.AddScoped<IFacultyService, FacultyService>();





// ============================================================
// APPLICATION LOGGING
// ============================================================

var fileLoggingSection =
    builder.Configuration.GetSection("Logging:File");

if (fileLoggingSection.GetValue("Enabled", true))
{
    var configuredLevel =
        fileLoggingSection["MinimumLevel"];

    var minimumLevel =
        Enum.TryParse<LogLevel>(
            configuredLevel,
            ignoreCase: true,
            out var parsedLevel)
                ? parsedLevel
                : LogLevel.Information;

    var configuredPath =
        fileLoggingSection["Path"];

    var logDirectory = !string.IsNullOrWhiteSpace(configuredPath) &&
        Path.IsPathRooted(configuredPath)
        ? configuredPath
        : Path.Combine(
            builder.Environment.ContentRootPath,
            string.IsNullOrWhiteSpace(configuredPath)
                ? "Logs"
                : configuredPath);

    builder.Logging.AddProvider(
        new DailyFileLoggerProvider(
            logDirectory,
            minimumLevel));
}


// ============================================================
// CORS
// ============================================================

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray()
    ?? Array.Empty<string>();

if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "At least one Cors:AllowedOrigins entry is required.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders(
                "Content-Disposition",
                "X-Correlation-ID",
                "X-Total-Count",
                "X-CMS-Build");
    });
});


// ============================================================
// MYSQL DATABASE
// ============================================================

var connectionString =
    builder.Configuration.GetConnectionString(
        "DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection is missing from appsettings.json.");
}

builder.Services.AddDbContext<ApplicationDbContext>(
    options =>
    {
        options.UseMySql(
            connectionString,
            ServerVersion.AutoDetect(connectionString));
    });


// ============================================================
// USER / ADMISSION DB CONTEXT
// ============================================================

builder.Services.AddDbContext<AppDbContext>(
    options =>
    {
        options.UseMySql(
            connectionString,
            ServerVersion.AutoDetect(connectionString));
    });


// ============================================================
// JWT CONFIGURATION
// ============================================================

var jwtKey =
    builder.Configuration["Jwt:Key"];

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"];

var jwtAudience =
    builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT Key is missing.");
}

if (Encoding.UTF8.GetBytes(jwtKey).Length < 32)
{
    throw new InvalidOperationException(
        "JWT Key must be at least 32 bytes long.");
}

if (string.IsNullOrWhiteSpace(jwtIssuer))
{
    throw new InvalidOperationException(
        "JWT Issuer is missing.");
}

if (string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new InvalidOperationException(
        "JWT Audience is missing.");
}


// ============================================================
// JWT AUTHENTICATION
// ============================================================

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = true;
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                NameClaimType = System.Security.Claims.ClaimTypes.Name,
                ValidateIssuerSigningKey = true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)),

                ValidateIssuer = true,

                ValidIssuer =
                    jwtIssuer,

                ValidateAudience = true,

                ValidAudience =
                    jwtAudience,

                ValidateLifetime = true,

                ClockSkew =
                    TimeSpan.Zero
            };
    });


// ============================================================
// AUTHORIZATION
// ============================================================

builder.Services.AddAuthorization();


// ============================================================
// REPOSITORIES
// ============================================================

// ------------------------------------------------------------
// FACULTY STATUS HISTORY
// ------------------------------------------------------------

builder.Services.AddScoped<
    IFacultyStatusRepository,
    FacultyStatusRepository>();
// ------------------------------------------------------------
// USER / AUTHENTICATION
// ------------------------------------------------------------

builder.Services.AddScoped<
    IUserRepository,
    UserRepository>();

builder.Services.AddScoped<
    IUserRoleRepository,
    UserRoleRepository>();

builder.Services.AddScoped<
    ILoginAuditRepository,
    LoginAuditRepository>();

builder.Services.AddScoped<
    IRefreshTokenRepository,
    RefreshTokenRepository>();


// ------------------------------------------------------------
// COLLEGE
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICollegeRepository,
    CollegeRepository>();


// ------------------------------------------------------------
// OTP
// ------------------------------------------------------------

builder.Services.AddScoped<
    IOtpVerificationRepository,
    OtpVerificationRepository>();


// ------------------------------------------------------------
// ACADEMIC YEAR
// ------------------------------------------------------------

builder.Services.AddScoped<
    IAcademicYearRepository,
    AcademicYearRepository>();


// ------------------------------------------------------------
// EMPLOYEE
// ------------------------------------------------------------

builder.Services.AddScoped<
    IEmployeeProfileRepository,
    EmployeeProfileRepository>();

builder.Services.AddScoped<
    IProfileChangeAuditRepository,
    ProfileChangeAuditRepository>();


// ------------------------------------------------------------
// COLLEGE SETTINGS
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICollegeSettingsRepository,
    CollegeSettingsRepository>();


// ------------------------------------------------------------
// ROLE
// ------------------------------------------------------------

builder.Services.AddScoped<
    IRoleRepository,
    RoleRepository>();


// ------------------------------------------------------------
// BRANCH
// ------------------------------------------------------------

builder.Services.AddScoped<
    IBranchRepository,
    BranchRepository>();


// ------------------------------------------------------------
// COURSE STRUCTURE
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICourseRepository,
    CourseRepository>();

builder.Services.AddScoped<
    ICourseStructureRepository,
    CourseStructureRepository>();


// ------------------------------------------------------------
// EXTENDED MODULE REPOSITORIES
// ------------------------------------------------------------

builder.Services.AddScoped<
    ISectionRepository,
    SectionRepository>();

builder.Services.AddScoped<
    ISectionAssignmentRepository,
    SectionAssignmentRepository>();

builder.Services.AddScoped<
    IDepartmentRepository,
    DepartmentRepository>();

builder.Services.AddScoped<
    ICourseSemesterMappingRepository,
    CourseSemesterMappingRepository>();

builder.Services.AddScoped<
    ISubjectAssignmentRepository,
    SubjectAssignmentRepository>();


// ============================================================
// FACULTY REPOSITORY
// ============================================================

builder.Services.AddScoped<
    IFacultyRepository,
    FacultyRepository>();

builder.Services.AddScoped<IFacultyProfileService, FacultyProfileService>();

// ------------------------------------------------------------
// STUDENT MODULES
// ------------------------------------------------------------

builder.Services.AddScoped<
    IStudentAdmissionRepository,
    StudentAdmissionRepository>();

builder.Services.AddScoped<
    IStudentAcademicDetailsRepository,
    StudentAcademicDetailsRepository>();

builder.Services.AddScoped<
    IStudentAcademicInformationRepository,
    StudentAcademicInformationRepository>();

builder.Services.AddScoped<
    IStudentRepository,
    StudentRepository>();

builder.Services.AddScoped<
    IStudentPersonalInformationRepository,
    StudentPersonalInformationRepository>();

builder.Services.AddScoped<
    IStudentProfileMainRepository,
    StudentProfileMainRepository>();

// Student elective selection
builder.Services.AddScoped<
    IStudentElectiveSelectionRepository,
    StudentElectiveSelectionRepository>();

builder.Services.AddScoped<
    IFeeCollectionRepository,
    FeeCollectionRepository>();

builder.Services.AddScoped<
    IFeeCollectionService,
    FeeCollectionService>();




// ============================================================
// SERVICES
// ============================================================


// ------------------------------------------------------------
// ADMISSION
// ------------------------------------------------------------

builder.Services.AddScoped<
    IAdmissionService,
    AdmissionService>();

builder.Services.AddScoped<
    IProfileService,
    BTech.Services.ProfileService>();

builder.Services.AddScoped<
    IProfileChangeAuditService,
    ProfileChangeAuditService>();

builder.Services.AddScoped<
    IStudentProfileService,
    BTech.Services.Implementations.StudentProfileService>();


builder.Services.AddScoped<
    IStudentPromotionRepository,
    StudentPromotionRepository>();

builder.Services.AddScoped<
    IStudentPromotionService,
    StudentPromotionService>();


// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------

builder.Services.AddScoped<
    IAuthService,
    AuthService>();

builder.Services.AddScoped<
    IJwtService,
    JwtService>();


// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------


// ------------------------------------------------------------
// COLLEGE
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICollegeService,
    CollegeService>();


// ------------------------------------------------------------
// ACADEMIC YEAR
// ------------------------------------------------------------

builder.Services.AddScoped<
    IAcademicYearService,
    AcademicYearService>();


// ------------------------------------------------------------
// COLLEGE SETTINGS
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICollegeSettingsService,
    CollegeSettingsService>();


// ------------------------------------------------------------
// ROLE
// ------------------------------------------------------------

builder.Services.AddScoped<
    IRoleService,
    RoleService>();

builder.Services.AddScoped<
    ICollegeUserMappingService,
    CollegeUserMappingService>();

builder.Services.AddScoped<
    UserRoleManagement.API.Services.IUserRoleMappingService,
    UserRoleManagement.API.Services.UserRoleMappingService>();

builder.Services.AddScoped<
    UserRoleManagement.API.Services.ICollegeService,
    UserRoleManagement.API.Services.CollegeService>();

builder.Services.AddScoped<
    IStudentProfileMainService,
    StudentProfileMainService>();


// ------------------------------------------------------------
// BRANCH
// ------------------------------------------------------------

builder.Services.AddScoped<
    IBranchService,
    BranchService>();


// ------------------------------------------------------------
// COURSE STRUCTURE
// ------------------------------------------------------------

builder.Services.AddScoped<
    ICourseService,
    CourseService>();

builder.Services.AddScoped<
    ICourseStructureService,
    CourseStructureService>();


// ------------------------------------------------------------
// EXTENDED MODULE SERVICES
// ------------------------------------------------------------

builder.Services.AddScoped<
    IChangePasswordService,
    ChangePasswordService>();

builder.Services.AddScoped<
    IAcademicLevelService,
    AcademicLevelService>();

builder.Services.AddScoped<
    ISectionService,
    SectionService>();

builder.Services.AddScoped<
    ISectionAssignmentService,
    SectionAssignmentService>();

builder.Services.AddScoped<
    IDepartmentService,
    DepartmentService>();

builder.Services.AddScoped<
    ICourseSemesterMappingService,
    CourseSemesterMappingService>();

builder.Services.AddScoped<
    ISubjectAssignmentService,
    SubjectAssignmentService>();

builder.Services.AddScoped<
    ISemesterService,
    SemesterService>();
builder.Services.AddScoped<SemesterLookupRepository>();

builder.Services.AddScoped<
    IMeetingEventValidationRepository,
    MeetingEventValidationRepository>();

builder.Services.AddScoped<
    IMeetingEventValidationService,
    MeetingEventValidationService>();
// ============================================================
// FACULTY SERVICE
// ============================================================

builder.Services.AddScoped<
    IFacultyService,
    FacultyService>();


// ------------------------------------------------------------
// STUDENT MODULES
// ------------------------------------------------------------

builder.Services.AddScoped<
    IStudentAdmissionService,
    StudentAdmissionService>();

builder.Services.AddScoped<
    IStudentAcademicDetailsService,
    StudentAcademicDetailsService>();

builder.Services.AddScoped<
    IStudentAcademicInformationService,
    StudentAcademicInformationService>();

builder.Services.AddScoped<
    IStudentService,
    StudentService>();

builder.Services.AddScoped<
    IStudentPersonalInformationService,
    StudentPersonalInformationService>();

builder.Services.AddScoped<
    IStudentExamResultsProvider,
    PendingStudentExamResultsProvider>();

builder.Services.AddScoped<
    IStudentIntegrationService,
    StudentIntegrationService>();

// Student elective selection
builder.Services.AddScoped<
    IStudentElectiveSelectionService,
    StudentElectiveSelectionService>();

builder.Services.AddScoped<
    IStudentAdmissionFeeResolverRepository,
    StudentAdmissionFeeResolverRepository>();

builder.Services.AddScoped<
    IStudentAdmissionFeeResolverService,
    StudentAdmissionFeeResolverService>();



// ============================================================
// PHASE 5 - ADVANCED TIMETABLE MANAGEMENT
// Additive registration; existing timetable APIs remain unchanged.
// ============================================================


// ============================================================
// Subject Management uses the dedicated stored-procedure repository.
builder.Services.AddScoped<SubjectManagementRepository>();

// ============================================================
// TICKETS 172 & 173 - EXAM MANAGEMENT
// Additive registration; existing APIs and registrations remain unchanged.
// ============================================================
builder.Services.AddScoped<ExamManagementRepository>();

// Merged timetable package registrations.
builder.Services.AddScoped<ITimetableService, TimetableService>();
builder.Services.AddScoped<ITimetableRepository, TimetableRepository>();

builder.Services.AddScoped<IMarksRepository, MarksRepository>();
builder.Services.AddScoped<IMarksService, MarksService>();
builder.Services.AddScoped<IResultRepository, ResultRepository>();
builder.Services.AddScoped<IResultService, ResultService>();

// Meeting management APIs (ticket: meeting CRUD, participants, attendance, minutes, documents).
builder.Services.AddScoped<IMeetingManagementRepository, MeetingManagementRepository>();
builder.Services.AddScoped<IMeetingManagementService, MeetingManagementService>();

// EMAIL / GMAIL SMTP
// ============================================================

// Read SMTP settings from appsettings.json
builder.Services.Configure<SmtpSettings>(
    builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddSingleton<BTech.Services.Invitations.SmtpRuntimeDiagnostics>();

// Register email service
builder.Services.AddScoped<
    IEmailService,
    EmailService>();

builder.Services.AddScoped<IAccountSetupService, AccountSetupService>();
builder.Services.AddScoped<FacultyAccountResolver>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
builder.Services.AddScoped<BTech.Services.Invitations.IAccountInvitationStore, BTech.Services.Invitations.MySqlAccountInvitationStore>();
builder.Services.AddScoped<BTech.Services.Invitations.AccountInvitationService>();


// ============================================================
// SWAGGER
// ============================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    // --------------------------------------------------------
    // JWT SECURITY DEFINITION
    // --------------------------------------------------------

    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",

            Type =
                SecuritySchemeType.Http,

            Scheme =
                "bearer",

            BearerFormat =
                "JWT",

            In =
                ParameterLocation.Header,

            Description =
                "Enter JWT token as: Bearer {token}"
        });


    // --------------------------------------------------------
    // JWT SECURITY REQUIREMENT
    // --------------------------------------------------------

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference =
                        new OpenApiReference
                        {
                            Type =
                                ReferenceType.SecurityScheme,

                            Id =
                                "Bearer"
                        }
                },

                Array.Empty<string>()
            }
        });
});

builder.Services.AddScoped<
    IShortageNotificationService,
    ShortageNotificationService>();
// ============================================================
// ELECTIVE MODULE - REPOSITORIES
// ============================================================

builder.Services.AddScoped<
    IStudentElectiveSelectionRepository,
    StudentElectiveSelectionRepository>();

builder.Services.AddScoped<
    IElectiveGroupRepository,
    ElectiveGroupRepository>();

builder.Services.AddScoped<
    IElectiveApprovalRepository,
    ElectiveApprovalRepository>();

builder.Services.AddScoped<
    IElectiveAllocationRepository,
    ElectiveAllocationRepository>();


// ============================================================
// ELECTIVE MODULE - SERVICES
// ============================================================

builder.Services.AddScoped<
    IStudentElectiveSelectionService,
    StudentElectiveSelectionService>();

builder.Services.AddScoped<
    IElectiveGroupService,
    ElectiveGroupService>();

builder.Services.AddScoped<
    IElectiveApprovalService,
    ElectiveApprovalService>();

builder.Services.AddScoped<
    IElectiveAllocationService,
    ElectiveAllocationService>();

// ============================================================
// ADMIN MANAGEMENT - ROLES / DESIGNATIONS / ROOMS
// Additive registrations. Existing APIs remain unchanged.
// ============================================================
builder.Services.AddScoped<
    IAccessGovernanceRepository,
    AccessGovernanceRepository>();

builder.Services.AddScoped<
    IRoomManagementRepository,
    RoomManagementRepository>();

builder.Services.AddScoped<
    IAccessGovernanceService,
    AccessGovernanceService>();

builder.Services.AddScoped<
    IRoomManagementService,
    RoomManagementService>();

// ============================================================
// BUILD APPLICATION
// ============================================================

// Placement drive, eligibility, application, interview and selection workflow.
builder.Services.AddScoped<IPlacementRepository, PlacementRepository>();
builder.Services.AddScoped<IPlacementService, PlacementService>();

builder.Services.AddScoped<BTech.Services.Fees.FeePlanAccess>();
builder.Services.AddScoped<BTech.Services.Fees.AcademicFeePlanService>();
builder.Services.AddScoped<BTech.Services.Fees.AdmissionFeePlanCoordinator>();

builder.Services.AddScoped<BTech.UserAccess.UserAccessService>();

var app = builder.Build();

// Report the actual runtime database and prerequisite state without exposing secrets.
var runtimeDb = new MySqlConnector.MySqlConnectionStringBuilder(connectionString);
app.Logger.LogInformation("CMS runtime. Build={Build}, Environment={Environment}, Server={Server}, Port={Port}, Database={Database}, SmtpHostConfigured={SmtpHostConfigured}, SmtpCredentialsConfigured={SmtpCredentialsConfigured}",
    BackendBuild.Id, app.Environment.EnvironmentName, runtimeDb.Server, runtimeDb.Port, runtimeDb.Database,
    !string.IsNullOrWhiteSpace(app.Configuration["SmtpSettings:Host"]),
    !string.IsNullOrWhiteSpace(app.Configuration["SmtpSettings:Username"]) && !string.IsNullOrWhiteSpace(app.Configuration["SmtpSettings:Password"]));
try
{
    await using var schemaConnection = new MySqlConnector.MySqlConnection(connectionString);
    await schemaConnection.OpenAsync();
    await BTech.Services.Invitations.UserAccessSchema.RequireAsync(schemaConnection,app.Logger,"startup");
    app.Logger.LogInformation("User access schema verified. Database={Database}, Build={Build}",schemaConnection.Database,BackendBuild.Id);
}
catch(Exception ex) when(ex is MySqlConnector.MySqlException or BTech.Services.Invitations.UserAccessSchemaException)
{
    app.Logger.LogError("User access prerequisites unavailable. Database={Database}, Category={Category}, MySqlCode={MySqlCode}. Apply {Migration} before onboarding.",
        runtimeDb.Database,ex.GetType().Name,(ex as MySqlConnector.MySqlException)?.Number,BTech.Services.Invitations.UserAccessSchema.Migration);
}



// ============================================================
// DEVELOPMENT / SWAGGER
// ============================================================

// Swagger is enabled in every environment so every existing
// controller is discoverable when the API is run locally,
// through IIS, or through ngrok.

app.UseSwagger();

app.UseSwaggerUI();

// Expose only the photo directories used by profile image URLs. Private student
// and faculty documents continue through their authenticated download endpoints.
foreach (var photoDirectory in new[] { "profile-photos", "faculty-profile-photos" })
{
    var directory = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads", photoDirectory);
    Directory.CreateDirectory(directory);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(directory),
        RequestPath = "/uploads/" + photoDirectory
    });
}


// ============================================================
// HTTPS
// ============================================================

app.UseHttpsRedirection();


// ============================================================
// EXCEPTION MIDDLEWARE
// ============================================================

app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["X-CMS-Build"] = BackendBuild.Id;
        return Task.CompletedTask;
    });
    await next();
});
app.UseMiddleware<RequestLoggingMiddleware>();

// Logs request/response data for every API call to the command prompt.
// Existing routes and controller contracts are not changed.
app.UseMiddleware<ApiConsoleLoggingMiddleware>();

app.UseMiddleware<ExceptionMiddleware>();


// ============================================================
// CORS
// ============================================================

app.UseCors("AllowFrontend");


// ============================================================
// AUTHENTICATION
// ============================================================

app.UseAuthentication();

// Accounts issued a temporary password may only change it or refresh their
// token until the password has been changed. Existing APIs are otherwise untouched.
app.Use(async (context, next) =>
{
    var mustChangePassword = context.User.FindFirst("mustChangePassword")?.Value;
    var path = context.Request.Path.Value ?? string.Empty;
    var allowedWhileChangingPassword =
        path.Equals("/api/v1/auth/change-password", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/v1/auth/refresh", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/v1/auth/logout", StringComparison.OrdinalIgnoreCase);

    if (context.User.Identity?.IsAuthenticated == true &&
        string.Equals(mustChangePassword, "true", StringComparison.OrdinalIgnoreCase) &&
        !allowedWhileChangingPassword)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "You must change your temporary password before accessing other APIs.",
            code = "PASSWORD_CHANGE_REQUIRED"
        });
        return;
    }

    await next();
});


// ============================================================
// AUTHORIZATION
// ============================================================

app.UseAuthorization();
app.UseMiddleware<BTech.UserAccess.AccountReadinessMiddleware>();

// Live database-backed module/action authorization. Evaluated on every request,
// so role-permission updates affect existing JWT sessions without re-login.
app.UseMiddleware<BTech.Middleware.ModulePermissionMiddleware>();
app.UseMiddleware<BTech.UserAccess.UserYearScopeMiddleware>();

// ============================================================
// CONTROLLERS
// ============================================================

app.MapControllers();


// ============================================================
// RUN APPLICATION
// ============================================================

app.Run();
