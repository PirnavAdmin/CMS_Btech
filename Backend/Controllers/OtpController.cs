using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Services;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System.Security.Cryptography;
using System.Text;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/otp")]
    public class OtpController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;

        public OtpController(
            ApplicationDbContext context,
            IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }


        // =====================================================
        // GENERATE OTP
        // POST: /api/otp/generate
        // =====================================================

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateOtp(
            [FromBody] GenerateOtpRequestDto request)
        {
            // -------------------------------------------------
            // Validate request
            // -------------------------------------------------

            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }


            // -------------------------------------------------
            // Email / Mobile validation
            // -------------------------------------------------

            if (string.IsNullOrWhiteSpace(request.Email) &&
                string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Email or mobile number is required."
                });
            }


            // -------------------------------------------------
            // Do not allow both
            // -------------------------------------------------

            if (!string.IsNullOrWhiteSpace(request.Email) &&
                !string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Provide either email or mobile number, not both."
                });
            }


            // -------------------------------------------------
            // Determine identifier and delivery method
            // -------------------------------------------------

            string identifier;
            string deliveryMethod;

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                identifier = request.Email.Trim();
                deliveryMethod = "EMAIL";
            }
            else
            {
                identifier = request.Mobile!.Trim();
                deliveryMethod = "SMS";
            }


            // -------------------------------------------------
            // OTP purpose
            // -------------------------------------------------

            string otpType =
                NormalizePurpose(request.Purpose);


            // -------------------------------------------------
            // Find active user
            // -------------------------------------------------

            var user =
                await FindActiveUserAsync(identifier);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "No active user account matches the provided contact."
                });
            }


            // =================================================
            // GENERATE 6 DIGIT OTP
            // =================================================

            string otp =
                RandomNumberGenerator
                    .GetInt32(100000, 1000000)
                    .ToString();


            // =================================================
            // HASH OTP
            // =================================================

            string otpHash =
                HashOtp(otp);


            // =================================================
            // OTP EXPIRES IN 5 MINUTES
            // =================================================

            DateTime expiresAt =
                DateTime.UtcNow.AddMinutes(5);


            // =================================================
            // INVALIDATE PREVIOUS ACTIVE OTPs
            // =================================================

            var previousOtps =
                await _context.OtpVerifications
                    .Where(x =>
                        x.Identifier == identifier &&
                        x.OtpType == otpType &&
                        x.Status == 1 &&
                        x.VerifiedAt == null)
                    .ToListAsync();


            foreach (var previousOtp in previousOtps)
            {
                previousOtp.Status = 0;
            }


            // =================================================
            // CREATE OTP RECORD
            // =================================================

            var otpVerification =
                new OtpVerification
                {
                    UserId =
                        user.user_id,

                    Identifier =
                        identifier,

                    OtpHash =
                        otpHash,

                    OtpType =
                        otpType,

                    DeliveryMethod =
                        deliveryMethod,

                    ExpiresAt =
                        expiresAt,

                    VerifiedAt =
                        null,

                    Attempts =
                        0,

                    MaxAttempts =
                        5,

                    Status =
                        1,

                    CreatedAt =
                        DateTime.UtcNow
                };


            _context.OtpVerifications.Add(
                otpVerification);


            await _context.SaveChangesAsync();


            // =================================================
            // EMAIL OTP
            // =================================================

            if (deliveryMethod == "EMAIL")
            {
                try
                {
                    await _emailService.SendOtpEmailAsync(
                        identifier,
                        otp,
                        otpType);
                }
                catch (Exception ex)
                {
                    // Email failed
                    otpVerification.Status = 0;

                    await _context.SaveChangesAsync();

                    throw;
                }


                // -------------------------------------------------
                // EMAIL SUCCESS
                // -------------------------------------------------

                return Ok(new
                {
                    success = true,

                    message =
                        "OTP generated and sent successfully.",

                    deliveryMethod =
                        "EMAIL",

                    expiresIn =
                        300,

                    // TEMPORARY TESTING ONLY
                    // Remove this before production.
                    otp = otp
                });
            }


            // =================================================
            // SMS DEVELOPMENT MODE
            // =================================================

            if (deliveryMethod == "SMS")
            {
                // -------------------------------------------------
                // IMPORTANT:
                // No paid SMS provider is being used here.
                //
                // OTP is generated and stored in database.
                // OTP is returned in Swagger for development/testing.
                // -------------------------------------------------

                return Ok(new
                {
                    success = true,

                    message =
                        "OTP generated successfully. SMS is in development mode.",

                    deliveryMethod =
                        "SMS",

                    expiresIn =
                        300,

                    // DEVELOPMENT ONLY
                    otp = otp
                });
            }


            // =================================================
            // UNKNOWN DELIVERY METHOD
            // =================================================

            otpVerification.Status = 0;

            await _context.SaveChangesAsync();

            return BadRequest(new
            {
                success = false,
                message =
                    "Unsupported OTP delivery method."
            });
        }


        // =====================================================
        // VERIFY OTP
        // POST: /api/otp/verify
        // =====================================================

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyOtp(
            [FromBody] VerifyOtpRequestDto request)
        {
            // -------------------------------------------------
            // Validate request
            // -------------------------------------------------

            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Request body is required."
                });
            }


            // -------------------------------------------------
            // Email / Mobile validation
            // -------------------------------------------------

            if (string.IsNullOrWhiteSpace(request.Email) &&
                string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Email or mobile number is required."
                });
            }


            // -------------------------------------------------
            // Both not allowed
            // -------------------------------------------------

            if (!string.IsNullOrWhiteSpace(request.Email) &&
                !string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Provide either email or mobile number, not both."
                });
            }


            // -------------------------------------------------
            // OTP required
            // -------------------------------------------------

            if (string.IsNullOrWhiteSpace(
                request.OtpCode))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "OTP is required."
                });
            }


            // -------------------------------------------------
            // Identifier
            // -------------------------------------------------

            string identifier =
                !string.IsNullOrWhiteSpace(request.Email)
                    ? request.Email.Trim()
                    : request.Mobile!.Trim();


            // -------------------------------------------------
            // OTP purpose
            // -------------------------------------------------

            string otpType =
                NormalizePurpose(request.Purpose);


            // =================================================
            // GET LATEST ACTIVE OTP
            // =================================================

            var otpRecord =
                await _context.OtpVerifications
                    .Where(x =>
                        x.Identifier == identifier &&
                        x.OtpType == otpType &&
                        x.Status == 1 &&
                        x.VerifiedAt == null)
                    .OrderByDescending(
                        x => x.CreatedAt)
                    .FirstOrDefaultAsync();


            if (otpRecord == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "No active OTP found."
                });
            }


            // =================================================
            // CHECK MAXIMUM ATTEMPTS
            // =================================================

            if (otpRecord.Attempts >=
                otpRecord.MaxAttempts)
            {
                otpRecord.Status = 0;

                await _context.SaveChangesAsync();

                return BadRequest(new
                {
                    success = false,
                    message =
                        "Maximum OTP verification attempts exceeded."
                });
            }


            // =================================================
            // CHECK EXPIRY
            // =================================================

            if (DateTime.UtcNow >
                otpRecord.ExpiresAt)
            {
                otpRecord.Status = 0;

                await _context.SaveChangesAsync();

                return BadRequest(new
                {
                    success = false,
                    message =
                        "OTP has expired."
                });
            }


            // =================================================
            // VERIFY OTP
            // =================================================

            if (!VerifyOtpHash(
                    request.OtpCode.Trim(),
                    otpRecord.OtpHash))
            {
                otpRecord.Attempts++;


                if (otpRecord.Attempts >=
                    otpRecord.MaxAttempts)
                {
                    otpRecord.Status = 0;
                }


                await _context.SaveChangesAsync();


                return BadRequest(new
                {
                    success = false,

                    message =
                        "Invalid OTP.",

                    attemptsRemaining =
                        Math.Max(
                            0,
                            otpRecord.MaxAttempts -
                            otpRecord.Attempts)
                });
            }


            // =================================================
            // OTP VERIFIED
            // =================================================

            otpRecord.VerifiedAt =
                DateTime.UtcNow;

            otpRecord.Status =
                0;


            await _context.SaveChangesAsync();


            return Ok(new
            {
                success = true,

                message =
                    "OTP verified successfully."
            });
        }


        // =====================================================
        // RESEND OTP
        // POST: /api/otp/resend
        // =====================================================

        [HttpPost("resend")]
        public async Task<IActionResult> ResendOtp(
            [FromBody] ResendOtpRequestDto request)
        {
            // -------------------------------------------------
            // Validate request
            // -------------------------------------------------

            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Request body is required."
                });
            }


            if (string.IsNullOrWhiteSpace(request.Email) &&
                string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Email or mobile number is required."
                });
            }


            if (!string.IsNullOrWhiteSpace(request.Email) &&
                !string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Provide either email or mobile number, not both."
                });
            }


            // -------------------------------------------------
            // Identifier and delivery method
            // -------------------------------------------------

            string identifier;
            string deliveryMethod;


            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                identifier =
                    request.Email.Trim();

                deliveryMethod =
                    "EMAIL";
            }
            else
            {
                identifier =
                    request.Mobile!.Trim();

                deliveryMethod =
                    "SMS";
            }


            // -------------------------------------------------
            // Purpose
            // -------------------------------------------------

            string otpType =
                NormalizePurpose(request.Purpose);


            // -------------------------------------------------
            // Find user
            // -------------------------------------------------

            var user =
                await FindActiveUserAsync(
                    identifier);


            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "No active user account matches the provided contact."
                });
            }


            // =================================================
            // GENERATE NEW OTP
            // =================================================

            string otp =
                RandomNumberGenerator
                    .GetInt32(100000, 1000000)
                    .ToString();


            string otpHash =
                HashOtp(otp);


            DateTime expiresAt =
                DateTime.UtcNow.AddMinutes(5);


            // =================================================
            // INVALIDATE PREVIOUS OTPs
            // =================================================

            var previousOtps =
                await _context.OtpVerifications
                    .Where(x =>
                        x.Identifier == identifier &&
                        x.OtpType == otpType &&
                        x.Status == 1 &&
                        x.VerifiedAt == null)
                    .ToListAsync();


            foreach (var previousOtp in previousOtps)
            {
                previousOtp.Status = 0;
            }


            // =================================================
            // CREATE NEW OTP
            // =================================================

            var otpVerification =
                new OtpVerification
                {
                    UserId =
                        user.user_id,

                    Identifier =
                        identifier,

                    OtpHash =
                        otpHash,

                    OtpType =
                        otpType,

                    DeliveryMethod =
                        deliveryMethod,

                    ExpiresAt =
                        expiresAt,

                    VerifiedAt =
                        null,

                    Attempts =
                        0,

                    MaxAttempts =
                        5,

                    Status =
                        1,

                    CreatedAt =
                        DateTime.UtcNow
                };


            _context.OtpVerifications.Add(
                otpVerification);


            await _context.SaveChangesAsync();


            // =================================================
            // RESEND EMAIL
            // =================================================

            if (deliveryMethod == "EMAIL")
            {
                try
                {
                    await _emailService.SendOtpEmailAsync(
                        identifier,
                        otp,
                        otpType);
                }
                catch (Exception ex)
                {
                    otpVerification.Status = 0;

                    await _context.SaveChangesAsync();

                    throw;
                }


                return Ok(new
                {
                    success = true,

                    message =
                        "OTP resent and sent successfully.",

                    deliveryMethod =
                        "EMAIL",

                    expiresIn =
                        300,

                    // TEMPORARY TESTING ONLY
                    otp = otp
                });
            }


            // =================================================
            // RESEND SMS - DEVELOPMENT MODE
            // =================================================

            if (deliveryMethod == "SMS")
            {
                return Ok(new
                {
                    success = true,

                    message =
                        "OTP resent successfully. SMS is in development mode.",

                    deliveryMethod =
                        "SMS",

                    expiresIn =
                        300,

                    // DEVELOPMENT ONLY
                    otp = otp
                });
            }


            // =================================================
            // UNKNOWN DELIVERY METHOD
            // =================================================

            otpVerification.Status = 0;

            await _context.SaveChangesAsync();

            return BadRequest(new
            {
                success = false,

                message =
                    "Unsupported OTP delivery method."
            });
        }


        // =====================================================
        // RESET PASSWORD
        // POST: /api/otp/reset-password
        // =====================================================

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordDto request)
        {
            // -------------------------------------------------
            // Validate request
            // -------------------------------------------------

            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Request body is required."
                });
            }


            if (string.IsNullOrWhiteSpace(
                request.Contact))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Contact is required."
                });
            }


            if (string.IsNullOrWhiteSpace(
                request.Otp))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "OTP is required."
                });
            }


            if (string.IsNullOrWhiteSpace(
                request.Password))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Password is required."
                });
            }


            // -------------------------------------------------
            // Identifier
            // -------------------------------------------------

            string identifier =
                request.Contact.Trim();


            // -------------------------------------------------
            // Find user
            // -------------------------------------------------

            var user =
                await FindActiveUserAsync(
                    identifier);


            if (user == null)
            {
                return BadRequest(new
                {
                    success = false,

                    message =
                        "Unable to reset the password for this account."
                });
            }


            // =================================================
            // FIND VERIFIED OTP
            // =================================================

            var verifiedOtp =
                await _context.OtpVerifications
                    .Where(x =>
                        (
                            x.UserId ==
                                user.user_id ||

                            x.Identifier ==
                                identifier
                        ) &&

                        x.VerifiedAt != null &&

                        x.ExpiresAt >=
                            DateTime.UtcNow &&

                        (
                            x.OtpType ==
                                "LOGIN" ||

                            x.OtpType ==
                                "FORGOT_PASSWORD" ||

                            x.OtpType ==
                                "PASSWORD_RESET"
                        ))
                    .OrderByDescending(
                        x => x.VerifiedAt)
                    .FirstOrDefaultAsync();


            // =================================================
            // VERIFY OTP
            // =================================================

            if (verifiedOtp == null ||
                !VerifyOtpHash(
                    request.Otp.Trim(),
                    verifiedOtp.OtpHash))
            {
                return BadRequest(new
                {
                    success = false,

                    message =
                        "OTP verification is required before resetting the password."
                });
            }


            // =================================================
            // UPDATE PASSWORD
            // =================================================

            user.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(
                    request.Password);

            user.UpdatedAt =
                DateTime.UtcNow;

            user.UpdatedBy =
                user.user_id;


            // -------------------------------------------------
            // Consume OTP
            // -------------------------------------------------

            verifiedOtp.Status =
                0;

            verifiedOtp.ExpiresAt =
                DateTime.UtcNow.AddSeconds(-1);


            await _context.SaveChangesAsync();


            return Ok(new
            {
                success = true,

                message =
                    "Password has been reset successfully."
            });
        }


        // =====================================================
        // HASH OTP
        // =====================================================

        private static string HashOtp(
            string otp)
        {
            using var sha256 =
                SHA256.Create();


            byte[] bytes =
                Encoding.UTF8.GetBytes(otp);


            byte[] hash =
                sha256.ComputeHash(bytes);


            return Convert.ToHexString(hash);
        }


        // =====================================================
        // FIND ACTIVE USER
        // =====================================================

        private async Task<User?>
            FindActiveUserAsync(
                string identifier)
        {
            return await _context.Users
                .FirstOrDefaultAsync(user =>
                    user.Status == 1 &&

                    user.DeletedAt == null &&

                    (
                        user.EmployeeUserId ==
                            identifier ||

                        user.Email ==
                            identifier ||

                        user.Mobile ==
                            identifier
                    ));
        }


        // =====================================================
        // NORMALIZE PURPOSE
        // =====================================================

        private static string NormalizePurpose(
            string? purpose)
        {
            var value =
                purpose?
                    .Trim()
                    .ToUpperInvariant();


            return string.IsNullOrWhiteSpace(value)
                ? "FORGOT_PASSWORD"
                : value;
        }


        // =====================================================
        // VERIFY OTP HASH
        // =====================================================

        private static bool VerifyOtpHash(
            string otp,
            string storedHash)
        {
            // -------------------------------------------------
            // BCrypt support
            // -------------------------------------------------

            if (storedHash.StartsWith(
                    "$2",
                    StringComparison.Ordinal))
            {
                return BCrypt.Net.BCrypt.Verify(
                    otp,
                    storedHash);
            }


            // -------------------------------------------------
            // SHA-256 support
            // -------------------------------------------------

            return string.Equals(
                HashOtp(otp),
                storedHash,
                StringComparison.OrdinalIgnoreCase);
        }
    }
}