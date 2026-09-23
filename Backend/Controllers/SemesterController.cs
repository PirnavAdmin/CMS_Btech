using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/semester")]
    public class SemesterController : ControllerBase
    {
        private readonly ISemesterService _service;

        public SemesterController(ISemesterService service)
        {
            _service = service;
        }


        // =====================================================
        // POST - ADD SEMESTER
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Add(
            [FromBody] SemesterDto dto)
        {
            var result = await _service.AddAsync(dto);

            return Ok(new
            {
                success = true,
                message = "Semester added successfully",
                data = result
            });
        }


        // =====================================================
        // GET - LIST ALL SEMESTERS
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "Semesters retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEARCH / FILTER SEMESTERS
        // =====================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] long? branchId,
            [FromQuery] long? academicYearId,
            [FromQuery] byte? status)
        {
            var result = await _service.SearchAsync(
                search,
                branchId,
                academicYearId,
                status);

            return Ok(new
            {
                success = true,
                message = "Semester search completed successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEMESTER DETAILS
        // =====================================================

        [HttpGet("{semesterId:long}")]
        public async Task<IActionResult> GetById(
            long semesterId)
        {
            var result = await _service.GetByIdAsync(
                semesterId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Semester not found"
                });
            }

            return Ok(new
            {
                success = true,
                message = "Semester details retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // GET - SEMESTER SUMMARY
        // =====================================================

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var result = await _service.GetSummaryAsync();

            return Ok(new
            {
                success = true,
                message = "Semester summary retrieved successfully",
                data = result
            });
        }


        // =====================================================
        // PUT - UPDATE SEMESTER
        // =====================================================

        [HttpPut("{semesterId:long}")]
        public async Task<IActionResult> Update(
            long semesterId,
            [FromBody] SemesterDto dto)
        {
            var result = await _service.UpdateAsync(
                semesterId,
                dto);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Semester not found"
                });
            }

            return Ok(new
            {
                success = true,
                message = "Semester updated successfully",
                data = result
            });
        }
    }
}