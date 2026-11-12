using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using BTech.Filters;
using BTech.Repositories.Implementations;

namespace BTech.Controllers
{
    [Authorize]
    [ServiceFilter(typeof(SemesterRequestDiagnosticsFilter))]
    [ApiController]
    [Route("api/semester")]
    public class SemesterController : ControllerBase
    {
        private readonly ISemesterService _service;
        private readonly SemesterLookupRepository _lookup;

        public SemesterController(ISemesterService service, SemesterLookupRepository lookup)
        {
            _service = service;
            _lookup = lookup;
        }


        // =====================================================
        // POST - ADD SEMESTER
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Add(
            [FromBody] SemesterDto? dto)
        {
            if (dto == null) return BadRequest(new
            {
                success = false, statusCode = 400, route = Request.Path.Value,
                message = "Send one flat semester JSON object in the request body.",
                correlationId = HttpContext.TraceIdentifier,
                errors = new Dictionary<string, string[]> { ["body"] = ["A semester JSON object is required."] }
            });
            dto.CreatedBy = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _service.AddAsync(dto);

            return Ok(new
            {
                success = true,
                message = "Semester saved successfully",
                data = new
                {
                    result.SemesterId, result.CourseId, result.BranchId, result.AcademicYearId,
                    result.SemesterNumber, result.SemesterName, result.YearNumber,
                    result.StartDate, result.EndDate, result.Status, result.CreatedAt, result.CreatedBy
                }
            });
        }


        // =====================================================
        // GET - LIST ALL SEMESTERS
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] long? collegeId,
            [FromQuery] long? courseId, [FromQuery] long? branchId, [FromQuery] long? academicYearId,
            [FromQuery] byte? status)
        {
            if (collegeId is <= 0 || courseId is <= 0 || branchId is <= 0 || academicYearId is <= 0 || status is > 1)
                return BadRequest(new { success = false, message = "Use positive identifiers and status 0 or 1." });
            // The service applies the authenticated college scope for non-super-admin users.
            // Apply the requested collegeId as an additional filter, especially for Super Admin
            // users who can switch between colleges.
            if (HttpContext.Items[BTech.Middleware.ModulePermissionMiddleware.SuperAdminItem] is not bool isSuperAdmin)
                return Forbid();

            var authenticatedCollegeId =
                BTech.Services.CollegeRequestScope.GetCollegeId(HttpContext) ??
                HttpContext.Items[BTech.Services.AcademicYearScopeRequest.ItemKey] as long?;

            if (!isSuperAdmin && !authenticatedCollegeId.HasValue)
                return Forbid();

            if (!isSuperAdmin && collegeId.HasValue &&
                collegeId.Value != authenticatedCollegeId!.Value)
                return Forbid();

            var effectiveCollegeId = collegeId ?? authenticatedCollegeId;

            // The procedure checks all academic links and the live year before
            // returning a row. Filtering in SQL also keeps large lists scoped.
            // Exact academic mapping requests feed active-semester dropdowns;
            // an unfiltered management list retains legacy active/inactive rows.
            if (courseId.HasValue && branchId.HasValue && academicYearId.HasValue)
                status ??= 1;
            var result = await _lookup.ListAsync(effectiveCollegeId, courseId, branchId,
                academicYearId, status, HttpContext.RequestAborted);

            return Ok(new
            {
                success = true,
                message = "Semesters retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEARCH / FILTER SEMESTERS
        // =====================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] long? branchId,
            [FromQuery] long? academicYearId,
            [FromQuery] byte? status)
        {
            var result = await _service.SearchAsync(
                search,
                branchId,
                academicYearId,
                status);

            return Ok(new
            {
                success = true,
                message = "Semester search completed successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEMESTER DETAILS
        // =====================================================

        [HttpGet("{semesterId:long}")]
        public async Task<IActionResult> GetById(
            long semesterId)
        {
            var result = await _service.GetByIdAsync(
                semesterId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Semester not found"
                });
            }

            return Ok(new
            {
                success = true,
                message = "Semester details retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEMESTER SUMMARY
        // =====================================================

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var result = await _service.GetSummaryAsync();

            return Ok(new
            {
                success = true,
                message = "Semester summary retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // PUT - UPDATE SEMESTER
        // =====================================================

        [HttpPut("{semesterId:long}")]
        public async Task<IActionResult> Update(
            long semesterId,
            [FromBody] SemesterDto? dto)
        {
            if (dto == null) return BadRequest(new { success = false, message = "A semester JSON object is required." });
            var result = await _service.UpdateAsync(
                semesterId,
                dto);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Semester not found"
                });
            }

            return Ok(new
            {
                success = true,
                message = "Semester updated successfully",
                data = result
            });
        }
    }
}
