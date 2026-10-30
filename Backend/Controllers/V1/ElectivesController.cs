using BTech.DTOs.Electives;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/electives")]
    [Authorize]
    public class ElectivesController : ControllerBase
    {
        private readonly IElectiveGroupService _electiveGroupService;

        public ElectivesController(
            IElectiveGroupService electiveGroupService)
        {
            _electiveGroupService = electiveGroupService;
        }

        // ============================================================
        // GET: api/v1/electives/groups
        // ============================================================
        [HttpGet("groups")]
        public async Task<IActionResult> GetGroups(
            [FromQuery] ElectiveGroupListRequestDto request)
        {
            var collegeId = GetCollegeIdFromToken();

            var result = await _electiveGroupService.GetAllAsync(
                collegeId,
                request);

            return Ok(result);
        }

        // ============================================================
        // POST: api/v1/electives/groups
        // ============================================================
        [HttpPost("groups")]
        public async Task<IActionResult> CreateGroup(
            [FromBody] CreateElectiveGroupDto request)
        {
            var collegeId = GetCollegeIdFromToken();
            var userId = GetUserIdFromToken();

            var groupId = await _electiveGroupService.CreateAsync(
                collegeId,
                request,
                userId);

            return Created(
                $"api/v1/electives/groups/{groupId}",
                new
                {
                    message = "Elective group created successfully.",
                    electiveGroupId = groupId
                });
        }

        // ============================================================
        // GET: api/v1/electives/groups/{groupId}/subjects
        // ============================================================
        [HttpGet("groups/{groupId:long}/subjects")]
        public async Task<IActionResult> GetGroupSubjects(
            long groupId)
        {
            var collegeId = GetCollegeIdFromToken();

            var result = await _electiveGroupService.GetSubjectsAsync(
                collegeId,
                groupId);

            return Ok(result);
        }

        // ============================================================
        // POST: api/v1/electives/groups/{groupId}/subjects
        // ============================================================
        [HttpPost("groups/{groupId:long}/subjects")]
        public async Task<IActionResult> AddGroupSubjects(
            long groupId,
            [FromBody] AddElectiveGroupSubjectsDto request)
        {
            var collegeId = GetCollegeIdFromToken();
            var userId = GetUserIdFromToken();

            await _electiveGroupService.AddSubjectsAsync(
                collegeId,
                groupId,
                request.SubjectIds,
                userId);

            return Ok(new
            {
                message = "Subjects added to elective group successfully."
            });
        }

        // ============================================================
        // JWT CLAIM HELPERS
        // ============================================================

        private long GetUserIdFromToken()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!long.TryParse(userIdValue, out var userId) ||
                userId <= 0)
            {
                throw new UnauthorizedAccessException(
                    "User information not found in token.");
            }

            return userId;
        }

        private long GetCollegeIdFromToken()
        {
            var collegeIdValue =
                User.FindFirst("collegeId")?.Value;

            if (!long.TryParse(collegeIdValue, out var collegeId) ||
                collegeId <= 0)
            {
                throw new UnauthorizedAccessException(
                    "College information not found in token.");
            }

            return collegeId;
        }
    }
}