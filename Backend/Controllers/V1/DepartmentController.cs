using BTech.Data;
using BTech.DTOs.Department;
using BTech.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/departments")]
    [Authorize]
    public class DepartmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DepartmentController(ApplicationDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // ADD DEPARTMENT
        // POST: api/v1/departments
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Add(
            [FromBody] AddDepartmentDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department details."
                });
            }

            var department = new Department
            {
                DepartmentName = request.DepartmentName.Trim(),
                DepartmentCode = request.DepartmentCode.Trim(),
                CollegeId = request.CollegeId,

                // ADDED - HOD
                HodUserId = request.HodUserId,

                // ADDED - Description
                Description = request.Description,

                Status = 1,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                await _context.Departments.AddAsync(department);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Department added successfully.",
                    data = await MapToResponseWithHod(department)
                });
            }
            catch (DbUpdateException ex)
            {
                var databaseException =
                    ex.InnerException as MySqlConnector.MySqlException;

                if (databaseException?.Number == 1062)
                {
                    return Conflict(new
                    {
                        success = false,
                        message =
                            "A department with the same code already exists for this college."
                    });
                }

                if (databaseException?.Number is 1048 or 1452 or 3819)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message =
                            "Department details reference invalid or missing data."
                    });
                }

                throw;
            }
        }

        // =====================================================
        // LIST DEPARTMENTS
        // GET: api/v1/departments
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var departments = await _context.Departments.Where(x => x.DeletedAt == null)
                .AsNoTracking()
                .OrderBy(x => x.DepartmentName)
                .ToListAsync();

            var result = new List<DepartmentResponseDto>();

            foreach (var department in departments)
            {
                result.Add(
                    await MapToResponseWithHod(department));
            }

            return Ok(new
            {
                success = true,
                message = "Departments retrieved successfully.",
                data = result
            });
        }

        // =====================================================
        // SEARCH DEPARTMENTS
        // GET: api/v1/departments/search?search=CSE
        // ADDED
        // =====================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search)
        {
            var query = _context.Departments.Where(x => x.DeletedAt == null)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(x =>
                    x.DepartmentName.Contains(search) ||
                    (x.DepartmentCode != null &&
                     x.DepartmentCode.Contains(search)));
            }

            var departments = await query
                .OrderBy(x => x.DepartmentName)
                .ToListAsync();

            var result = new List<DepartmentResponseDto>();

            foreach (var department in departments)
            {
                result.Add(
                    await MapToResponseWithHod(department));
            }

            return Ok(new
            {
                success = true,
                message = "Departments retrieved successfully.",
                data = result
            });
        }

        // =====================================================
        // PAGINATION
        // GET: api/v1/departments/paginated?page=1&pageSize=5
        // ADDED
        // =====================================================

        [HttpGet("paginated")]
        public async Task<IActionResult> Paginated(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)
        {
            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1)
            {
                pageSize = 5;
            }

            if (pageSize > 100)
            {
                pageSize = 100;
            }

            var query = _context.Departments.Where(x => x.DeletedAt == null)
                .AsNoTracking()
                .OrderBy(x => x.DepartmentName);

            var totalRecords =
                await query.CountAsync();

            var departments = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<DepartmentResponseDto>();

            foreach (var department in departments)
            {
                result.Add(
                    await MapToResponseWithHod(department));
            }

            var totalPages =
                (int)Math.Ceiling(
                    totalRecords / (double)pageSize);

            return Ok(new
            {
                success = true,
                message = "Departments retrieved successfully.",
                data = result,
                page = page,
                pageSize = pageSize,
                totalRecords = totalRecords,
                totalPages = totalPages
            });
        }

        // =====================================================
        // DETAILS
        // GET: api/v1/departments/{id}
        // =====================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> Details(long id)
        {
            var department = await _context.Departments.Where(x => x.DeletedAt == null)
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DepartmentId == id);

            if (department == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Department not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Department details retrieved successfully.",
                data = await MapToResponseWithHod(department)
            });
        }

        // =====================================================
        // EDIT DEPARTMENT
        // PUT: api/v1/departments/{id}
        // =====================================================

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Edit(
            long id,
            [FromBody] EditDepartmentDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department details."
                });
            }

            var department = await _context.Departments.Where(x => x.DeletedAt == null)
                .FirstOrDefaultAsync(x =>
                    x.DepartmentId == id);

            if (department == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Department not found."
                });
            }

            department.DepartmentName =
                request.DepartmentName.Trim();

            department.DepartmentCode =
                request.DepartmentCode.Trim();

            department.CollegeId =
                request.CollegeId;

            // ADDED - HOD
            department.HodUserId =
                request.HodUserId;

            // ADDED - Description
            department.Description =
                request.Description;

            department.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Department updated successfully.",
                data = await MapToResponseWithHod(department)
            });
        }

        // =====================================================
        // UPDATE STATUS
        // PATCH: api/v1/departments/{id}/status
        // =====================================================

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long id,
            [FromBody] DepartmentStatusDto request)
        {
            if (request.Status != 0 &&
                request.Status != 1)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Status must be 0 or 1."
                });
            }

            var department = await _context.Departments.Where(x => x.DeletedAt == null)
                .FirstOrDefaultAsync(x =>
                    x.DepartmentId == id);

            if (department == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Department not found."
                });
            }

            department.Status = request.Status;

            department.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = request.Status == 1
                    ? "Department activated successfully."
                    : "Department deactivated successfully."
            });
        }

        // =====================================================
        // DELETE DEPARTMENT
        // DELETE: api/v1/departments/{id}
        // ADDED
        // =====================================================

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var department = await _context.Departments.Where(x => x.DeletedAt == null)
                .FirstOrDefaultAsync(x =>
                    x.DepartmentId == id);

            if (department == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Department not found."
                });
            }

            // Soft delete
            department.Status = 0;
            department.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Department deleted successfully."
            });
        }

        // =====================================================
        // RESPONSE MAPPING
        // =====================================================

        private static DepartmentResponseDto MapToResponse(
    Department department)
        {
            return new DepartmentResponseDto
            {
                DepartmentId =
                    department.DepartmentId,

                DepartmentName =
                    department.DepartmentName,

                DepartmentCode =
                    department.DepartmentCode,

                CollegeId =
                    department.CollegeId,

                // ADDED - HOD
                HodUserId =
                    department.HodUserId,

                // ADDED - Description
                Description =
                    department.Description,

                Status =
                    department.Status,

                CreatedAt =
                    department.CreatedAt,

                UpdatedAt =
                    department.UpdatedAt
            };
        }
        // =====================================================
        // RESPONSE MAPPING WITH HOD NAME
        // ADDED - HOD
        // =====================================================

        private async Task<DepartmentResponseDto>
            MapToResponseWithHod(
                Department department)
        {
            var response =
                MapToResponse(department);

            response.CollegeName =
        await _context.Colleges
            .AsNoTracking()
            .Where(x =>
                x.CollegeId == department.CollegeId)
            .Select(x => x.CollegeName)
            .FirstOrDefaultAsync();


            if (department.HodUserId.HasValue)
            {
                response.HodName =
                    await _context.Users
                        .AsNoTracking()
                        .Where(x =>
                            x.user_id ==
                            department.HodUserId.Value)
                        .Select(x => x.FullName)
                        .FirstOrDefaultAsync();
            }

            return response;
        }
    }
}
