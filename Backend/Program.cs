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
});

builder.Services.AddScoped<ApiErrorSanitizationFilter>();

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
                "X-Total-Count");
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
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
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

builder.Services.AddScoped<
    IElectiveGroupRepository,
    ElectiveGroupRepository>();

builder.Services.AddScoped<
    IStudentElectiveSelectionRepository,
    StudentElectiveSelectionRepository>();

builder.Services.AddScoped<
    IElectiveApprovalRepository,
    ElectiveApprovalRepository>();

builder.Services.AddScoped<
    IElectiveAllocationRepository,
    ElectiveAllocationRepository>();

builder.Services.AddScoped<
    IElectiveGroupService,
    ElectiveGroupService>();

builder.Services.AddScoped<
    IStudentElectiveSelectionService,
    StudentElectiveSelectionService>();

builder.Services.AddScoped<
    IElectiveApprovalService,
    ElectiveApprovalService>();

builder.Services.AddScoped<
    IElectiveAllocationService,
    ElectiveAllocationService>();





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

builder.Services.AddScoped<
    IStudentAdmissionFeeResolverRepository,
    StudentAdmissionFeeResolverRepository>();

builder.Services.AddScoped<
    IStudentAdmissionFeeResolverService,
    StudentAdmissionFeeResolverService>();


// ============================================================
// EMAIL / GMAIL SMTP
// ============================================================

// Read SMTP settings from appsettings.json
builder.Services.Configure<SmtpSettings>(
    builder.Configuration.GetSection("SmtpSettings"));

// Register email service
builder.Services.AddScoped<
    IEmailService,
    EmailService>();


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


// ============================================================
// BUILD APPLICATION
// ============================================================

var app = builder.Build();


// ============================================================
// DEVELOPMENT / SWAGGER
// ============================================================

// Swagger is enabled in every environment so every existing
// controller is discoverable when the API is run locally,
// through IIS, or through ngrok.

app.UseSwagger();

app.UseSwaggerUI();


// ============================================================
// HTTPS
// ============================================================

app.UseHttpsRedirection();


// ============================================================
// EXCEPTION MIDDLEWARE
// ============================================================

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


// ============================================================
// AUTHORIZATION
// ============================================================

app.UseAuthorization();


// ============================================================
// CONTROLLERS
// ============================================================

app.MapControllers();


// ============================================================
// RUN APPLICATION
// ============================================================

app.Run();