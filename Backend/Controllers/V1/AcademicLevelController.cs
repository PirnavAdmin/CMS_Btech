using BTech.DTOs;
using BTech.Services;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/academic-levels")]
    public class AcademicLevelController : ControllerBase
    {
        private readonly IAcademicLevelService _service;

        public AcademicLevelController(IAcademicLevelService service)
        {
            _service = service;
        }

        // POST: api/academic-levels
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] AcademicLevelDto dto)
        {
            var result = await _service.CreateAsync(dto);

            return Ok(new
            {
                message = "Academic level created successfully",
                data = result
            });
        }

        // GET: api/academic-levels
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(result);
        }

        // GET: api/academic-levels/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
                return NotFound("Academic level not found");

            return Ok(result);
        }

        // PUT: api/academic-levels/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] AcademicLevelDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            if (!result)
                return NotFound("Academic level not found");

            return Ok(new
            {
                message = "Academic level updated successfully"
            });
        }

        // DELETE: api/academic-levels/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound("Academic level not found");

            return Ok(new
            {
                message = "Academic level deleted successfully"
            });
        }
    }
}