using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/authorization-test")]
    [Authorize]
    public class AuthorizationTestController : ControllerBase
    {
        [HttpGet("authenticated")]
        public IActionResult Authenticated()
        {
            return Ok(new
            {
                success = true,
                message = "You are authenticated.",
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
                name = User.Identity?.Name,
                roles = User.FindAll(ClaimTypes.Role)
                           .Select(x => x.Value)
                           .ToList()
            });
        }

        [HttpGet("admin")]
        [Authorize(Roles = "COLLEGE_ADMIN")]
        public IActionResult AdminOnly()
        {
            return Ok(new
            {
                success = true,
                message = "Admin authorization successful."
            });
        }

        [HttpGet("faculty")]
        [Authorize(Roles = "FACULTY")]
        public IActionResult FacultyOnly()
        {
            return Ok(new
            {
                success = true,
                message = "Faculty authorization successful."
            });
        }

        [HttpGet("student")]
        [Authorize(Roles = "STUDENT")]
        public IActionResult StudentOnly()
        {
            return Ok(new
            {
                success = true,
                message = "Student authorization successful."
            });
        }

        [HttpGet("admin-faculty")]
        [Authorize(Roles = "COLLEGE_ADMIN,FACULTY")]
        public IActionResult AdminOrFaculty()
        {
            return Ok(new
            {
                success = true,
                message = "Admin or Faculty authorization successful."
            });
        }
    }
}