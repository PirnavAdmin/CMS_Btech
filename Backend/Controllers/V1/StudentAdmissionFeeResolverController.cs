using System.Security.Claims;
using BTech.DTOs.Fees;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Authorize]
    public sealed class StudentAdmissionFeeResolverController : ControllerBase
    {
        private readonly IStudentAdmissionFeeResolverService _service;
        private readonly ILogger<StudentAdmissionFeeResolverController> _logger;

        public StudentAdmissionFeeResolverController(
            IStudentAdmissionFeeResolverService service,
            ILogger<StudentAdmissionFeeResolverController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// Resolves Course/Tuition + Admission fee automatically and adds Hostel/Transport
        /// only when those services are selected. The resolved amounts are saved into the
        /// existing student_admission_fee_structures table so the existing fee-summary and
        /// fee-structure GET APIs continue to work unchanged.
        /// </summary>
        [HttpPost("~/api/v1/student-admissions/{admissionId:long}/resolve-fees")]
        public async Task<IActionResult> ResolveFees(
            long admissionId,
            [FromBody] StudentAdmissionFeeResolveRequestDto request)
        {
            var actorUserId = GetUserId();
            _logger.LogInformation(
                "Resolve fees requested. AdmissionId={AdmissionId}, ActorUserId={ActorUserId}",
                admissionId,
                actorUserId);

            var result = await _service.ResolveAndSaveAsync(admissionId, request, actorUserId);
            return result == null
                ? NotFound(new { success = false, message = "Student admission not found." })
                : Ok(new
                {
                    success = true,
                    message = "Admission fees resolved and saved successfully.",
                    data = result
                });
        }

        private long GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(value, out var userId) || userId <= 0)
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return userId;
        }
    }
}
