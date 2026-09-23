using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/roles")]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        // =========================================================
        // GET: api/roles
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles =
                await _roleService.GetAllAsync();

            return Ok(roles);
        }

        // =========================================================
        // GET: api/roles/{id}
        // =========================================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoleById(long id)
        {
            var role =
                await _roleService.GetByIdAsync(id);

            if (role == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Role not found."
                });
            }

            return Ok(role);
        }

        // =========================================================
        // POST: api/roles
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> CreateRole(
            [FromBody] RoleRequest request)
        {
            var result =
                await _roleService.CreateAsync(
                    request,
                    null);

            if (!result.Success)
            {
                return Conflict(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return CreatedAtAction(
                nameof(GetRoleById),
                new
                {
                    id = result.Data!.Role_id
                },
                result.Data);
        }

        // =========================================================
        // PUT: api/roles/{id}
        // =========================================================

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(
            long id,
            [FromBody] RoleRequest request)
        {
            var result =
                await _roleService.UpdateAsync(
                    id,
                    request,
                    null);

            if (!result.Success)
            {
                if (result.Message == "Role not found.")
                {
                    return NotFound(new
                    {
                        success = false,
                        message = result.Message
                    });
                }

                return Conflict(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }

        // =========================================================
        // DELETE: api/roles/{id}
        // =========================================================

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(long id)
        {
            var result =
                await _roleService.DeactivateAsync(
                    id,
                    null);

            if (!result.Success)
            {
                return NotFound(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                roleId = id
            });
        }
    }
}
