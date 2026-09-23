using BTech.DTOs.Electives;
using BTech.Models;

using System.Security.Claims;
using BTech.DTOs.Electives;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/students")]
    [Authorize]
    public class StudentElectivesController : ControllerBase
    {
        private readonly IStudentElectiveSelectionService _service;

        public StudentElectivesController(
            IStudentElectiveSelectionService service)
        {
            _service = service;
        }

        // ============================================================
        // POST: api/v1/students/{studentId}/electives
        // Create student elective selection
        // ============================================================

        [HttpPost("{studentId:long}/electives")]
        public async Task<IActionResult> CreateSelection(
            long studentId,
            [FromBody] CreateStudentElectiveSelectionDto request)
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            var collegeIdValue =
                User.FindFirst("collegeId")?.Value;

            if (!long.TryParse(userIdValue, out var userId) ||
                userId <= 0)
            {
                return Unauthorized(
                    new
                    {
                        message = "User information not found in token."
                    });
            }

            if (!long.TryParse(collegeIdValue, out var collegeId) ||
                collegeId <= 0)
            {
                return Unauthorized(
                    new
                    {
                        message = "College information not found in token."
                    });
            }

            if (studentId <= 0)
            {
                return BadRequest(
                    new
                    {
                        message = "Invalid student ID."
                    });
            }

            if (request == null)
            {
                return BadRequest(
                    new
                    {
                        message = "Request body is required."
                    });
            }

            var selectionId =
                await _service.CreateAsync(
                    collegeId,
                    studentId,
                    request,
                    userId);

            return Ok(
                new
                {
                    message = "Elective subject selected successfully.",
                    selectionId
                });
        }


        // ============================================================
        // GET: api/v1/students/{studentId}/electives
        // Get student's elective selections
        // ============================================================

        [HttpGet("{studentId:long}/electives")]
        public async Task<IActionResult> GetSelections(
            long studentId)
        {
            var collegeIdValue =
                User.FindFirst("collegeId")?.Value;

            if (!long.TryParse(collegeIdValue, out var collegeId) ||
                collegeId <= 0)
            {
                return Unauthorized(
                    new
                    {
                        message = "College information not found in token."
                    });
            }

            if (studentId <= 0)
            {
                return BadRequest(
                    new
                    {
                        message = "Invalid student ID."
                    });
            }

            var selections =
                await _service.GetByStudentAsync(
                    collegeId,
                    studentId);

            return Ok(selections);
        }
    }
}
