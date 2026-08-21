using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Login identifier and password are required."
                });
            }

            var ipAddress =
                HttpContext.Connection.RemoteIpAddress?
                    .ToString();

            var userAgent =
                Request.Headers.UserAgent.ToString();

            var result =
                await _authService.LoginAsync(
                    request,
                    ipAddress,
                    userAgent);

            if (!result.Success)
            {
                if (result.Message ==
                    "User account is inactive.")
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        new
                        {
                            success = false,
                            message = result.Message
                        });
                }

                return Unauthorized(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(
    [FromBody] RefreshTokenRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Refresh token is required."
                });
            }

            var ipAddress =
                HttpContext.Connection
                    .RemoteIpAddress?
                    .ToString();

            var result =
                await _authService.RefreshTokenAsync(
                    request.RefreshToken,
                    ipAddress);

            if (!result.Success)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }
    }
}