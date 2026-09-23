using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/college-settings")]
    public class CollegeSettingsController : ControllerBase
    {
        private readonly ICollegeSettingsService _service;

        public CollegeSettingsController(
            ICollegeSettingsService service)
        {
            _service = service;
        }

        // =========================================================
        // GET ALL COLLEGE SETTINGS
        // GET: api/college-settings
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "College settings retrieved successfully.",
                data = result
            });
        }

        // =========================================================
        // GET SETTINGS BY ID
        // GET: api/college-settings/{id}
        // =========================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "College settings not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "College settings retrieved successfully.",
                data = result
            });
        }

        // =========================================================
        // GET SETTINGS BY COLLEGE ID
        // GET: api/college-settings/college/{collegeId}
        // =========================================================

        [HttpGet("college/{collegeId:long}")]
        public async Task<IActionResult> GetByCollegeId(long collegeId)
        {
            var result =
                await _service.GetByCollegeIdAsync(collegeId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "College settings not found for this college."
                });
            }

            return Ok(new
            {
                success = true,
                message =
                    "College settings retrieved successfully.",
                data = result
            });
        }

        // =========================================================
        // CREATE COLLEGE SETTINGS
        // POST: api/college-settings
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CollegeSettingRequestDto request)
        {
            try
            {
                var result =
                    await _service.CreateAsync(request);

                return CreatedAtAction(
                    nameof(GetById),
                    new
                    {
                        id = result.Id
                    },
                    new
                    {
                        success = true,
                        message =
                            "College settings created successfully.",
                        data = result
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

        // =========================================================
        // UPDATE COLLEGE SETTINGS
        // PUT: api/college-settings/{id}
        // =========================================================

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] CollegeSettingRequestDto request)
        {
            try
            {
                var result =
                    await _service.UpdateAsync(
                        id,
                        request);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "College settings not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "College settings updated successfully.",
                    data = result
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
    }
}