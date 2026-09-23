using BTech.DTOs.CourseSemesterMapping;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/course-semester-mappings")]
    [Authorize]
    public class CourseSemesterMappingController
        : ControllerBase
    {
        private readonly ICourseSemesterMappingService _service;

        public CourseSemesterMappingController(
            ICourseSemesterMappingService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            CreateCourseSemesterMappingDto dto)
        {
            var result = await _service.CreateAsync(dto);

            return Ok(new
            {
                success = true,
                message = "Course semester mapping created successfully.",
                data = result
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "Course semester mappings retrieved successfully.",
                data = result
            });
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Course semester mapping not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Course semester mapping retrieved successfully.",
                data = result
            });
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            UpdateCourseSemesterMappingDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            return Ok(new
            {
                success = true,
                message = "Course semester mapping updated successfully.",
                data = result
            });
        }

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long id,
            CourseSemesterMappingStatusDto dto)
        {
            var result = await _service.UpdateStatusAsync(id, dto);

            if (!result)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Course semester mapping not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Course semester mapping status updated successfully."
            });
        }
    }
}