using BTech.Data;
using BTech.Repositories;
using BTech.Repositories.Interfaces;
using BTech.Services;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ----------------------------------------------------
// Controllers
// ----------------------------------------------------

builder.Services.AddControllers();


// ----------------------------------------------------
// MySQL Database
// ----------------------------------------------------

var connectionString =
    builder.Configuration.GetConnectionString(
        "DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection is missing.");
}

if (builder.Environment.IsDevelopment())
{
    var localConnection = new MySqlConnector.MySqlConnectionStringBuilder(connectionString)
    {
        SslMode = MySqlConnector.MySqlSslMode.None,
        AllowPublicKeyRetrieval = true
    };
    connectionString = localConnection.ConnectionString;
}

builder.Services.AddDbContext<ApplicationDbContext>(
    options =>
    {
        options.UseMySql(
            connectionString,
            ServerVersion.AutoDetect(connectionString));
    });




// ----------------------------------------------------
// JWT Authentication
// ----------------------------------------------------

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

                ValidIssuer = jwtIssuer,

                ValidateAudience = true,

                ValidAudience = jwtAudience,

                ValidateLifetime = true,

                ClockSkew = TimeSpan.Zero
            };
    });

// ----------------------------------------------------
// Authorization
// ----------------------------------------------------

builder.Services.AddAuthorization();


// ----------------------------------------------------
// Repositories
// ----------------------------------------------------

builder.Services.AddScoped<IUserRepository,
    UserRepository>();

builder.Services.AddScoped<IUserRoleRepository,
    UserRoleRepository>();

builder.Services.AddScoped<ILoginAuditRepository,
    LoginAuditRepository>();

builder.Services.AddScoped<IRefreshTokenRepository,
    RefreshTokenRepository>();



// ----------------------------------------------------
// Services
// ----------------------------------------------------

builder.Services.AddScoped<IAuthService,
    AuthService>();

builder.Services.AddScoped<IJwtService,
    JwtService>();

builder.Services.AddScoped<IProfileService,
    ProfileService>();


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

builder.Services.AddEndpointsApiExplorer();

//builder.Services.AddSwaggerGen();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description =
                "Enter JWT token as: Bearer {token}"
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type =
                            ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
});


var app = builder.Build();


// ----------------------------------------------------
// HTTP Pipeline
// ----------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
