using System.Security.Claims;
using BTech.Data;
using BTech.Middleware;
using BTech.DTOs.AcademicYear;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-years")]
    [Authorize]
    public class AcademicYearController : ControllerBase
    {
        private readonly IAcademicYearService _service;
        private readonly ILogger<AcademicYearController> _logger;
        private readonly ApplicationDbContext _context;

        public AcademicYearController(
            IAcademicYearService service,
            ILogger<AcademicYearController> logger,
            ApplicationDbContext context)
        {
            _service = service;
            _logger = logger;
            _context = context;
        }

        // POST: api/v1/academic-years?collegeId=1
        [HttpPost]
        public async Task<IActionResult> Add(
            [FromBody] CreateAcademicYearDto dto,
            [FromQuery] long? collegeId = null)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, dto.CollegeId);
            if (scopeError != null)
                return scopeError;

            _logger.LogInformation(
                "POST academic-years requested. CollegeId={CollegeId}, ActorUserId={ActorUserId}",
                scopedCollegeId, GetCurrentUserId());

            try
            {
                var result = await _service.AddAsync(
                    scopedCollegeId, dto, GetCurrentUserId());

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = result.AcademicYearId, collegeId = scopedCollegeId },
                    new
                    {
                        success = true,
                        message = result.IsActive
                            ? "Academic year added and activated successfully."
                            : "Academic year added successfully. Activate it before creating sections for this year.",
                        data = result
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsMySqlError(ex, 1062))
            {
                return Conflict(new
                {
                    success = false,
                    message = "An academic year with this name already exists for the selected college."
                });
            }
            catch (DbUpdateException ex) when (IsMySqlError(ex, 1452))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "The selected college does not exist."
                });
            }
            catch (MySqlException ex) when (ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = "An academic year with this name already exists for the selected college."
                });
            }
        }

        // GET: api/v1/academic-years?collegeId=1
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            _logger.LogInformation(
                "GET academic-years requested. CollegeId={CollegeId}, ActorUserId={ActorUserId}",
                scopedCollegeId, GetCurrentUserId());

            var result = await _service.GetAllAsync(scopedCollegeId);

            return Ok(new
            {
                success = true,
                message = "Academic years retrieved successfully.",
                data = result
            });
        }

        // GET: api/v1/academic-years/dashboard?collegeId=1&search=&filter=all
        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard(
            [FromQuery] string? search = null,
            [FromQuery] string filter = "all",
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            var result = await _service.GetDashboardAsync(
                scopedCollegeId, search, filter);

            return Ok(new
            {
                success = true,
                message = "Academic year dashboard retrieved successfully.",
                data = result
            });
        }

        // GET: api/v1/academic-years/{id}?collegeId=1
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(
            long id,
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            var result = await _service.GetByIdAsync(id, scopedCollegeId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Academic year with ID {id} was not found for the selected college."
                });
            }

            return Ok(new { success = true, data = result });
        }

        // PUT: api/v1/academic-years/{id}?collegeId=1
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Edit(
            long id,
            [FromBody] UpdateAcademicYearDto dto,
            [FromQuery] long? collegeId = null)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, dto.CollegeId);
            if (scopeError != null)
                return scopeError;

            try
            {
                var result = await _service.EditAsync(
                    id, scopedCollegeId, dto, GetCurrentUserId());

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Academic year with ID {id} was not found for the selected college."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Academic year updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsMySqlError(ex, 1062))
            {
                return Conflict(new
                {
                    success = false,
                    message = "An academic year with this name already exists for the selected college."
                });
            }
        }

        // POST: api/v1/academic-years/generate-next-year?collegeId=1
        [HttpPost("generate-next-year")]
        public async Task<IActionResult> GenerateNextYear(
            [FromBody] GenerateNextAcademicYearDto dto,
            [FromQuery] long? collegeId = null)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, dto.CollegeId);
            if (scopeError != null)
                return scopeError;

            try
            {
                var result = await _service.GenerateNextYearAsync(
                    scopedCollegeId, dto, GetCurrentUserId());

                return Ok(new
                {
                    success = true,
                    message = result.IsActive
                        ? "Next academic year generated and activated successfully."
                        : "Next academic year generated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsMySqlError(ex, 1062))
            {
                return Conflict(new
                {
                    success = false,
                    message = "The next academic year already exists for the selected college."
                });
            }
            catch (DbUpdateException ex) when (IsMySqlError(ex, 1452))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "The selected college does not exist."
                });
            }
        }

        // PATCH: api/v1/academic-years/{id}/activate?collegeId=1
        [HttpPatch("{id:long}/activate")]
        public async Task<IActionResult> Activate(
            long id,
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            var updated = await _service.ActivateAsync(
                id, scopedCollegeId, GetCurrentUserId());

            if (!updated)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Academic year with ID {id} was not found for the selected college."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Academic year activated successfully."
            });
        }

        // PATCH: api/v1/academic-years/{id}/deactivate?collegeId=1
        [HttpPatch("{id:long}/deactivate")]
        public async Task<IActionResult> Deactivate(
            long id,
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            var updated = await _service.DeactivateAsync(
                id, scopedCollegeId, GetCurrentUserId());

            if (!updated)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Academic year with ID {id} was not found for the selected college."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Academic year deactivated successfully."
            });
        }

        // PATCH: api/v1/academic-years/{id}/archive?collegeId=1
        [HttpPatch("{id:long}/archive")]
        public async Task<IActionResult> Archive(
            long id,
            [FromQuery] long? collegeId = null)
        {
            var (scopedCollegeId, scopeError) = await ResolveCollegeScopeAsync(
                collegeId, null);
            if (scopeError != null)
                return scopeError;

            try
            {
                var archived = await _service.ArchiveAsync(
                    id, scopedCollegeId, GetCurrentUserId());

                if (!archived)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Academic year with ID {id} was not found for the selected college."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Academic year archived successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
        }

        private async Task<(long CollegeId, IActionResult? Error)> ResolveCollegeScopeAsync(
            long? queryCollegeId,
            long? bodyCollegeId)
        {
            if (queryCollegeId.HasValue && queryCollegeId.Value <= 0)
            {
                return (0, BadRequest(new
                {
                    success = false,
                    message = "Query collegeId must be a positive integer."
                }));
            }

            if (bodyCollegeId.HasValue && bodyCollegeId.Value <= 0)
            {
                return (0, BadRequest(new
                {
                    success = false,
                    message = "Body collegeId must be a positive integer."
                }));
            }

            if (queryCollegeId.HasValue &&
                bodyCollegeId.HasValue &&
                queryCollegeId.Value != bodyCollegeId.Value)
            {
                return (0, BadRequest(new
                {
                    success = false,
                    message = "The query collegeId and body collegeId must match."
                }));
            }

            var requestedCollegeId = HttpContext.Items.TryGetValue(BTech.Services.AcademicYearScopeRequest.ItemKey, out var selection)
                ? selection as long? : queryCollegeId ?? bodyCollegeId;
            var userId = GetCurrentUserId();

            if (!userId.HasValue || userId.Value <= 0)
            {
                _logger.LogWarning(
                    "Academic-year request denied because the authenticated token has no valid user ID. TraceId={TraceId}",
                    HttpContext.TraceIdentifier);

                return (0, StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "The authenticated account could not be identified. Please sign in again."
                }));
            }

            // The permission middleware has verified the active user and current role
            // assignment. Never elevate an expired/stale Super Admin role claim.
            if (!HttpContext.Items.TryGetValue(ModulePermissionMiddleware.SuperAdminItem, out var superValue) || superValue is not bool isSuperAdmin)
                return (0, StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Authorization context is unavailable." }));

            long resolvedCollegeId;
            if (isSuperAdmin)
            {
                if (!requestedCollegeId.HasValue)
                {
                    return (0, BadRequest(new
                    {
                        success = false,
                        message = "SuperAdmin must provide the selected collegeId in the query string, or in the request body for create/generate requests."
                    }));
                }

                resolvedCollegeId = requestedCollegeId.Value;
            }
            else
            {
                var tokenCollegeId = HttpContext.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
                if (!tokenCollegeId.HasValue || tokenCollegeId.Value <= 0)
                {
                    _logger.LogWarning(
                        "Academic-year request denied because the authenticated user has no current college assignment. ActorUserId={ActorUserId}",
                        userId.Value);

                    return (0, StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = "Your account is not associated with a college."
                    }));
                }

                if (requestedCollegeId.HasValue &&
                    requestedCollegeId.Value != tokenCollegeId.Value)
                {
                    _logger.LogWarning(
                        "Cross-college academic-year request denied. AssignedCollegeId={TokenCollegeId}, RequestedCollegeId={RequestedCollegeId}, ActorUserId={ActorUserId}, RoleClaims={RoleClaims}",
                        tokenCollegeId.Value,
                        requestedCollegeId.Value,
                        userId.Value,
                        string.Join(",", GetRoleClaimValues()));

                    return (0, StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = "This account is not authorized to select another college. Sign in with a SuperAdmin account to manage academic years across colleges."
                    }));
                }

                resolvedCollegeId = tokenCollegeId.Value;
            }

            var collegeExists = await _context.Colleges
                .AsNoTracking()
                .AnyAsync(c =>
                    c.CollegeId == resolvedCollegeId &&
                    c.DeletedAt == null);

            if (!collegeExists)
            {
                _logger.LogWarning(
                    "Academic-year request rejected for unknown/deleted college. CollegeId={CollegeId}, ActorUserId={ActorUserId}",
                    resolvedCollegeId, userId.Value);

                return (0, BadRequest(new
                {
                    success = false,
                    message = $"CollegeId {resolvedCollegeId} does not identify an existing college."
                }));
            }

            _logger.LogDebug(
                "Academic-year college scope resolved. CollegeId={CollegeId}, ActorUserId={ActorUserId}, IsSuperAdmin={IsSuperAdmin}, TraceId={TraceId}",
                resolvedCollegeId, userId.Value, isSuperAdmin, HttpContext.TraceIdentifier);

            return (resolvedCollegeId, null);
        }

        private IEnumerable<string> GetRoleClaimValues()
        {
            return User.Claims
                .Where(c => IsRoleClaimType(c.Type))
                .Select(c => c.Value)
                .Where(value => !string.IsNullOrWhiteSpace(value));
        }

        private static bool IsRoleClaimType(string claimType)
        {
            return claimType == ClaimTypes.Role ||
                   string.Equals(claimType, "role", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(claimType, "roles", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(claimType, "role_code", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(claimType, "roleCode", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(claimType, "role_name", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(claimType, "roleName", StringComparison.OrdinalIgnoreCase) ||
                   claimType.EndsWith("/role", StringComparison.OrdinalIgnoreCase) ||
                   claimType.EndsWith("/roles", StringComparison.OrdinalIgnoreCase);
        }

        private long? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub");

            return long.TryParse(claim, out var userId) ? userId : null;
        }

        private static bool IsMySqlError(Exception exception, int number)
        {
            return exception.GetBaseException() is MySqlException mysqlException
                && mysqlException.Number == number;
        }
    }
}
