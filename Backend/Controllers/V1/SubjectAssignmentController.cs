using BTech.DTOs.SubjectAssignment;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/subject-assignments")]
    [Authorize]
    public class SubjectAssignmentController : ControllerBase
    {
        private readonly ISubjectAssignmentService _service;

        public SubjectAssignmentController(
            ISubjectAssignmentService service)
        {
            _service = service;
        }

        // POST: api/v1/subject-assignments
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateSubjectAssignmentDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);

                return Ok(new
                {
                    success = true,
                    message = "Subject assigned to semester successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // GET: api/v1/subject-assignments
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "Subject assignments retrieved successfully.",
                data = result
            });
        }

        // GET: api/v1/subject-assignments/{id}
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Subject assignment not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Subject assignment details retrieved successfully.",
                data = result
            });
        }

        // PUT: api/v1/subject-assignments/{id}
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] UpdateSubjectAssignmentDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(id, dto);

                return Ok(new
                {
                    success = true,
                    message = "Subject assignment updated successfully.",
                    data = result
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // PATCH: api/v1/subject-assignments/{id}/status
        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long id,
            [FromBody] byte status)
        {
            var result = await _service.UpdateStatusAsync(id, status);

            if (!result)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Subject assignment not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Subject assignment status updated successfully."
            });
        }
    }
}