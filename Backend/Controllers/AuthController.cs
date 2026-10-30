using BTech.DTOs;
using BTech.DTOs.ForgotPassword;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IChangePasswordService _changePasswordService;
        private readonly IAccountSetupService _accountSetupService;

        public AuthController(
            IAuthService authService,
            IChangePasswordService changePasswordService,
            IAccountSetupService accountSetupService)
        {
            _authService = authService;
            _changePasswordService = changePasswordService;
            _accountSetupService = accountSetupService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Login identifier and password are required."
                });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _authService.LoginAsync(
                request,
                ipAddress,
                userAgent);

            if (!result.Success)
            {
                if (result.Message == "User account is inactive.")
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
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Refresh token is required."
                });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

            var result = await _authService.RefreshTokenAsync(
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

        // =========================================================
        // CHANGE PASSWORD
        // POST: api/v1/auth/change-password
        // =========================================================

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Current password, new password and confirm new password are required."
                });
            }

            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!long.TryParse(claim, out var userId))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid or missing user identity."
                });
            }

            var result = await _changePasswordService.ChangePasswordAsync(
                userId,
                request);

            if (!result.Success)
            {
                if (result.Message == "User account is inactive or not found.")
                {
                    return NotFound(new
                    {
                        success = false,
                        message = result.Message
                    });
                }

                return BadRequest(new
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
        // COMPLETE FIRST-TIME ACCOUNT SETUP
        // POST: api/v1/auth/complete-account-setup
        // This endpoint is intentionally anonymous: the single-use email token
        // is the proof of control of the registered email address.
        // =========================================================
        [AllowAnonymous]
        [HttpPost("complete-account-setup")]
        public async Task<IActionResult> CompleteAccountSetup(
            [FromBody] CompleteAccountSetupRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Login ID, valid setup token, and matching password fields are required. Password must be at least 12 characters."
                });
            }

            var result = await _accountSetupService.CompleteSetupAsync(
                request.LoginId,
                request.Token,
                request.NewPassword,
                request.ConfirmNewPassword);

            if (!result.Success)
            {
                return BadRequest(new
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

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Identifier (Email, Mobile, or Employee ID) is required."
                });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _authService.ForgotPasswordAsync(
                request,
                ipAddress,
                userAgent);

            if (!result.Success)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new
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