using System.Security.Claims;
using BTech.DTOs.Integration;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Authorize]
    public sealed class StudentIntegrationController : ControllerBase
    {
        private readonly IStudentIntegrationService _service;
        private readonly ILogger<StudentIntegrationController> _logger;

        public StudentIntegrationController(
            IStudentIntegrationService service,
            ILogger<StudentIntegrationController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpPost("~/api/v1/students/{studentId:long}/documents")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            long studentId,
            [FromForm] StudentDocumentUploadDto request)
        {
            var result = await _service.UploadDocumentAsync(studentId, request, GetUserId());
            _logger.LogInformation(
                "Student document uploaded. StudentId={StudentId}, DocumentId={DocumentId}, ActorUserId={ActorUserId}",
                studentId,
                result.DocumentId,
                GetUserId());
            return CreatedAtAction(
                nameof(GetDocument),
                new { studentId, documentId = result.DocumentId },
                new { success = true, message = "Student document uploaded successfully.", data = result });
        }

        [HttpGet("~/api/v1/students/{studentId:long}/documents/{documentId:long}")]
        public async Task<IActionResult> GetDocument(long studentId, long documentId)
        {
            var result = await _service.GetDocumentAsync(studentId, documentId);
            return result == null
                ? NotFound(new { success = false, message = "Student document not found." })
                : Ok(new { success = true, message = "Student document retrieved successfully.", data = result });
        }

        [HttpGet("~/api/v1/students/{studentId:long}/documents/{documentId:long}/download")]
        public async Task<IActionResult> DownloadDocument(long studentId, long documentId)
        {
            var result = await _service.DownloadDocumentAsync(studentId, documentId);
            if (result == null)
                return NotFound(new { success = false, message = "Student document file not found." });

            return File(result.Content, result.ContentType, result.FileName);
        }

        [HttpDelete("~/api/v1/students/{studentId:long}/documents/{documentId:long}")]
        public async Task<IActionResult> DeleteDocument(long studentId, long documentId)
        {
            var actor = GetUserId();
            var deleted = await _service.DeleteDocumentAsync(studentId, documentId, actor);
            if (!deleted)
                return NotFound(new { success = false, message = "Student document not found." });

            _logger.LogInformation(
                "Student document deleted. StudentId={StudentId}, DocumentId={DocumentId}, ActorUserId={ActorUserId}",
                studentId,
                documentId,
                actor);
            return Ok(new { success = true, message = "Student document deleted successfully." });
        }

        [HttpPost("~/api/v1/student-admissions/{admissionId:long}/submit")]
        public async Task<IActionResult> SubmitAdmission(long admissionId)
        {
            var result = await _service.SubmitAdmissionAsync(admissionId, GetUserId());
            return result == null
                ? NotFound(new { success = false, message = "Student admission not found." })
                : Ok(new { success = true, message = "Admission application submitted successfully.", data = result });
        }

        [HttpGet("~/api/v1/student-admissions/{admissionId:long}/fee-summary")]
        public async Task<IActionResult> GetFeeSummary(long admissionId)
        {
            var result = await _service.GetFeeSummaryAsync(admissionId);
            return result == null
                ? NotFound(new { success = false, message = "Student admission not found." })
                : Ok(new { success = true, message = "Admission fee summary retrieved successfully.", data = result });
        }

        [HttpGet("~/api/v1/student-admissions/{admissionId:long}/fee-structure")]
        public async Task<IActionResult> GetFeeStructure(long admissionId)
        {
            _logger.LogInformation("Admission fee structure GET requested. AdmissionId={AdmissionId}", admissionId);
            var result = await _service.GetFeeStructureAsync(admissionId);
            return result == null
                ? NotFound(new { success = false, message = "Student admission not found." })
                : Ok(new { success = true, message = "Admission fee structure retrieved successfully.", data = result });
        }

        [HttpPut("~/api/v1/student-admissions/{admissionId:long}/fee-structure")]
        public async Task<IActionResult> UpdateFeeStructure(
            long admissionId,
            [FromBody] AdmissionFeeStructureRequestDto request)
        {
            var result = await _service.UpdateFeeStructureAsync(admissionId, request, GetUserId());
            return result == null
                ? NotFound(new { success = false, message = "Student admission not found." })
                : Ok(new { success = true, message = "Admission fee structure updated successfully.", data = result });
        }

        [HttpGet("~/api/v1/student-admissions/{admissionId:long}/previous-education")]
        public async Task<IActionResult> GetPreviousEducation(long admissionId)
        {
            var result = await _service.GetPreviousEducationAsync(admissionId);
            return Ok(new { success = true, message = "Previous education retrieved successfully.", data = result });
        }

        [HttpPut("~/api/v1/student-admissions/{admissionId:long}/previous-education")]
        public async Task<IActionResult> UpdatePreviousEducation(
            long admissionId,
            [FromBody] PreviousEducationUpdateDto request)
        {
            var result = await _service.UpdatePreviousEducationAsync(admissionId, request, GetUserId());
            return Ok(new { success = true, message = "Previous education updated successfully.", data = result });
        }

        [HttpGet("~/api/v1/promotions/dashboard")]
        public async Task<IActionResult> GetPromotionDashboard(
            [FromQuery] long? collegeId = null,
            [FromQuery] long? academicYearId = null,
            [FromQuery] long? courseId = null,
            [FromQuery] long? branchId = null)
        {
            var result = await _service.GetPromotionDashboardAsync(
                ResolveCollegeId(collegeId), academicYearId, courseId, branchId);
            return Ok(new { success = true, message = "Promotion dashboard retrieved successfully.", data = result });
        }

        [HttpGet("~/api/v1/promotions/directory")]
        public async Task<IActionResult> GetPromotionDirectory(
            [FromQuery] long? collegeId = null,
            [FromQuery] string? search = null,
            [FromQuery] long? academicYearId = null,
            [FromQuery] long? courseId = null,
            [FromQuery] long? branchId = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetPromotionDirectoryAsync(
                ResolveCollegeId(collegeId), search, academicYearId, courseId, branchId, pageNumber, pageSize);
            return Ok(new { success = true, message = "Promotion directory retrieved successfully.", data = result });
        }

        [HttpGet("~/api/v1/promotions/history")]
        public async Task<IActionResult> GetPromotionHistory(
            [FromQuery] long? collegeId = null,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetPromotionHistoryAsync(
                ResolveCollegeId(collegeId), search, status, pageNumber, pageSize);
            return Ok(new { success = true, message = "Promotion history retrieved successfully.", data = result });
        }

        private long GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(value, out var userId) || userId <= 0)
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return userId;
        }

        private long? ResolveCollegeId(long? requestedCollegeId)
        {
            if (User.IsInRole("SUPER_ADMIN") && requestedCollegeId is > 0)
                return requestedCollegeId;

            var value = User.FindFirstValue("collegeId")
                ?? User.FindFirstValue("college_id");
            return long.TryParse(value, out var collegeId) && collegeId > 0
                ? collegeId
                : requestedCollegeId;
        }
    }
}
