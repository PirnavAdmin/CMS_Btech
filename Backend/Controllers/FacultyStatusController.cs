using BTech.Task_FacultyStatusHistory.DTOs;
using BTech.Task_FacultyStatusHistory.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Task_FacultyStatusHistory.Controllers
{
    [ApiController]
    [Route("api/v1/faculty")]
    public class FacultyStatusController : ControllerBase
    {
        private readonly IFacultyStatusRepository _repository;

        public FacultyStatusController(
            IFacultyStatusRepository repository)
        {
            _repository = repository;
        }

        // PATCH: /api/v1/faculty/{facultyId}/status
        [HttpPatch("{facultyId:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long facultyId,
            [FromBody] UpdateFacultyStatusRequest request)
        {
            if (facultyId <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid faculty ID."
                });
            }

            if (request == null ||
                string.IsNullOrWhiteSpace(request.Status))
            {
                return BadRequest(new
                {
                    message = "Status is required."
                });
            }

            var changedBy = GetCurrentUserId();

            var updated = await _repository.UpdateStatusAsync(
                facultyId,
                request,
                changedBy);

            if (!updated)
            {
                return NotFound(new
                {
                    message = "Faculty not found."
                });
            }

            return Ok(new
            {
                message = "Faculty status updated successfully.",
                facultyId,
                status = request.Status
            });
        }

        // GET: /api/v1/faculty/{facultyId}/status-history
        [HttpGet("{facultyId:long}/status-history")]
        public async Task<IActionResult> GetStatusHistory(
            long facultyId)
        {
            if (facultyId <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid faculty ID."
                });
            }

            var history =
                await _repository.GetStatusHistoryAsync(facultyId);

            return Ok(new
            {
                facultyId,
                history
            });
        }

        private long? GetCurrentUserId()
        {
            var claim =
                User.FindFirst("user_id")?.Value
                ?? User.FindFirst("sub")?.Value;

            if (long.TryParse(claim, out var userId))
            {
                return userId;
            }

            return null;
        }
    }
}