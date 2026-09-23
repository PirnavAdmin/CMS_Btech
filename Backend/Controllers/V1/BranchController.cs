using BTech.DTOs.Branch;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/branches")]
    [Authorize]
    public class BranchController : ControllerBase
    {
        private readonly IBranchService _branchService;

        public BranchController(
            IBranchService branchService)
        {
            _branchService =
                branchService;
        }

        // =====================================================
        // CREATE BRANCH
        // POST /api/v1/branches
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateBranchDto dto)
        {
            try
            {
                var userId =
                    GetUserId();

                var result =
                    await _branchService
                        .AddAsync(
                            dto,
                            userId);

                return Ok(new
                {
                    success = true,
                    message =
                        "Branch created successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // GET ALL BRANCHES
        // GET /api/v1/branches
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> List()
        {
            try
            {
                var result =
                    await _branchService
                        .GetAllAsync();

                return Ok(new
                {
                    success = true,
                    message =
                        "Branches retrieved successfully.",
                    data = result
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // GET BRANCHES BY COURSE
        //
        // GET
        // /api/v1/branches/course/{courseId}
        //
        // STORED PROCEDURE
        // sp_get_branches_by_course
        // =====================================================

        [HttpGet("course/{courseId:long}")]
        public async Task<IActionResult>
            GetByCourseId(
                long courseId)
        {
            try
            {
                var result =
                    await _branchService
                        .GetByCourseIdAsync(
                            courseId);

                return Ok(new
                {
                    success = true,
                    message =
                        "Branches retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // GET BRANCH BY ID
        // GET /api/v1/branches/{id}
        // =====================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult>
            GetById(
                long id)
        {
            try
            {
                var result =
                    await _branchService
                        .GetByIdAsync(id);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "Branch not found.",
                        data =
                            (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Branch retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // UPDATE BRANCH
        // PUT /api/v1/branches/{id}
        // =====================================================

        [HttpPut("{id:long}")]
        public async Task<IActionResult>
            Update(
                long id,
                [FromBody] UpdateBranchDto dto)
        {
            try
            {
                var userId =
                    GetUserId();

                var result =
                    await _branchService
                        .UpdateAsync(
                            id,
                            dto,
                            userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "Branch not found.",
                        data =
                            (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Branch updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // DELETE BRANCH
        // DELETE /api/v1/branches/{id}
        // =====================================================

        [HttpDelete("{id:long}")]
        public async Task<IActionResult>
            Delete(
                long id)
        {
            try
            {
                var userId =
                    GetUserId();

                var deleted =
                    await _branchService
                        .DeleteAsync(
                            id,
                            userId);

                if (!deleted)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "Branch not found.",
                        data =
                            (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Branch deleted successfully.",
                    data =
                        (object?)null
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // =====================================================
        // GET USER ID FROM JWT
        // =====================================================

        private long? GetUserId()
        {
            var claim =
                User.FindFirst(
                    ClaimTypes.NameIdentifier);

            if (claim == null)
            {
                return null;
            }

            if (long.TryParse(
                claim.Value,
                out var userId))
            {
                return userId;
            }

            return null;
        }
    }
}