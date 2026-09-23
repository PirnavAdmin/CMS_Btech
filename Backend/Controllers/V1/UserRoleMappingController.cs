using Microsoft.AspNetCore.Mvc;
using UserRoleManagement.API.DTOs;
using UserRoleManagement.API.Services;

namespace UserRoleManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserRoleMappingController : ControllerBase
    {
        private readonly IUserRoleMappingService _service;

        public UserRoleMappingController(
            IUserRoleMappingService service)
        {
            _service = service;
        }

        // CREATE
        // POST: api/UserRoleMapping

        [HttpPost]
        public async Task<IActionResult> CreateUserRoleMapping(
            [FromBody] UserRoleMappingDto dto)
        {
            try
            {
                await _service.CreateUserRoleMappingAsync(dto);

                return Ok(new
                {
                    message = "User role mapping created successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // GET ALL
        // GET: api/UserRoleMapping

        [HttpGet]
        public async Task<IActionResult> GetUserRoleMappings()
        {
            try
            {
                var result =
                    await _service.GetUserRoleMappingsAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // GET BY ID
        // GET: api/UserRoleMapping/{id}

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserRoleMappingById(long id)
        {
            try
            {
                var result =
                    await _service.GetUserRoleMappingByIdAsync(id);

                if (result == null)
                {
                    return NotFound(new
                    {
                        message = "User role mapping not found"
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // UPDATE
        // PUT: api/UserRoleMapping/{id}

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUserRoleMapping(
            long id,
            [FromBody] UserRoleMappingDto dto)
        {
            try
            {
                await _service.UpdateUserRoleMappingAsync(id, dto);

                return Ok(new
                {
                    message = "User role mapping updated successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // DELETE
        // DELETE: api/UserRoleMapping/{id}

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUserRoleMapping(long id)
        {
            try
            {
                await _service.DeleteUserRoleMappingAsync(id);

                return Ok(new
                {
                    message = "User role mapping removed successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}