using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BTech.DTOs.Student;
using BTech.Services.Interfaces;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/students")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly ILogger<StudentsController> _logger;

        public StudentsController(
            IStudentService studentService,
            ILogger<StudentsController> logger)
        {
            _studentService = studentService;
            _logger = logger;
        }

        // GET: api/v1/students
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] StudentListFilterDto filter)
        {
            try
            {
                var result =
                    await _studentService.GetAllAsync(filter);

                return Ok(new
                {
                    success = true,
                    message =
                        "Students retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // GET: api/v1/students/search
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] StudentSearchFilterDto filter)
        {
            try
            {
                var result =
                    await _studentService.SearchAsync(filter);

                return Ok(new
                {
                    success = true,
                    message =
                        "Students retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // GET: api/v1/students/{studentId}
        // Student Profile + Documents
        [HttpGet("{studentId:long}")]
        public async Task<IActionResult> GetById(
            long studentId)
        {
            try
            {
                var student =
                    await _studentService.GetByIdAsync(
                        studentId);

                if (student == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Student retrieved successfully.",
                    data = student
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // GET: api/v1/students/{studentId}/documents
        // Documents Only
        [HttpGet("{studentId:long}/documents")]
        public async Task<IActionResult> GetDocuments(
            long studentId)
        {
            try
            {
                var documents =
                    await _studentService
                        .GetDocumentsAsync(studentId);

                return Ok(new
                {
                    success = true,
                    message =
                        "Student documents retrieved successfully.",
                    data = documents
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // POST: api/v1/students
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateStudentDto dto)
        {
            try
            {
                var userId = GetLoggedInUserId();

                if (!userId.HasValue)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user identity."
                    });
                }

                var student =
                    await _studentService.CreateAsync(
                        dto,
                        userId);

                _logger.LogInformation(
                    "Student created. StudentId={StudentId}, StudentCode={StudentCode}, CreatedBy={CreatedBy}",
                    student.StudentId,
                    student.StudentCode,
                    userId.Value);

                return Ok(new
                {
                    success = true,
                    message =
                        "Student created successfully.",
                    data = student
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // PUT: api/v1/students/{studentId}
        [HttpPut("{studentId:long}")]
        public async Task<IActionResult> Update(
            long studentId,
            [FromBody] UpdateStudentDto dto)
        {
            try
            {
                var userId = GetLoggedInUserId();

                if (!userId.HasValue)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user identity."
                    });
                }

                var student =
                    await _studentService.UpdateAsync(
                        studentId,
                        dto,
                        userId);

                if (student == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student not found."
                    });
                }

                _logger.LogInformation(
                    "Student updated. StudentId={StudentId}, UpdatedBy={UpdatedBy}",
                    studentId,
                    userId.Value);

                return Ok(new
                {
                    success = true,
                    message =
                        "Student updated successfully.",
                    data = student
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // PATCH:
        // api/v1/students/{studentId}/status
        [HttpPatch("{studentId:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long studentId,
            [FromBody] UpdateStudentStatusDto dto)
        {
            try
            {
                var userId = GetLoggedInUserId();

                if (!userId.HasValue)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user identity."
                    });
                }

                var student =
                    await _studentService.UpdateStatusAsync(
                        studentId,
                        dto.Status,
                        userId);

                if (student == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student not found."
                    });
                }

                _logger.LogInformation(
                    "Student status updated. StudentId={StudentId}, Status={Status}, UpdatedBy={UpdatedBy}",
                    studentId,
                    dto.Status,
                    userId.Value);

                return Ok(new
                {
                    success = true,
                    message =
                        "Student status updated successfully.",
                    data = student
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        private long? GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);

            return claim != null && long.TryParse(claim.Value, out var userId)
                ? userId
                : null;
        }
    }
}
