using BTech.DTOs.Faculty;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/faculty-documents")]
    [Authorize]
    public class FacultyDocumentController : ControllerBase
    {
        private readonly IFacultyDocumentService _service;

        public FacultyDocumentController(
            IFacultyDocumentService service)
        {
            _service = service;
        }

        // GET: api/v1/faculty-documents/faculty/2
        [HttpGet("faculty/{facultyId:long}")]
        public async Task<IActionResult> GetDocuments(
            long facultyId)
        {
            try
            {
                var documents =
                    await _service.GetDocumentsAsync(facultyId);

                return Ok(new
                {
                    success = true,
                    message = "Faculty documents retrieved successfully.",
                    data = documents
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // POST: api/v1/faculty-documents/faculty/2
        [HttpPost("faculty/{facultyId:long}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            long facultyId,
            [FromForm] FacultyDocumentUploadDto request)
        {
            try
            {
                var createdBy =
                    User.FindFirst("userId")?.Value;

                var result =
                    await _service.UploadDocumentAsync(
                        facultyId,
                        request,
                        createdBy);

                return Ok(new
                {
                    success = true,
                    message = "Faculty document uploaded successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // DELETE: api/v1/faculty-documents/1
        [HttpDelete("{facultyDocumentId:long}")]
        public async Task<IActionResult> DeleteDocument(
            long facultyDocumentId)
        {
            try
            {
                var deletedBy =
                    User.FindFirst("userId")?.Value;

                await _service.DeleteDocumentAsync(
                    facultyDocumentId,
                    deletedBy);

                return Ok(new
                {
                    success = true,
                    message = "Faculty document deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}