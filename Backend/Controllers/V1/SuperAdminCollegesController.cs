using BTech.DTOs.College;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/colleges")]
public sealed class SuperAdminCollegesController(ISuperAdminCollegeService onboarding) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SuperAdminCreateCollegeDto dto)
    {
        try
        {
            var result = await onboarding.CreateCollegeAsync(dto);
            var college = result.College;
            var emailsAccepted = result.AdminEmailStatus == "sent" && result.CollegeEmailStatus == "sent";

            return CreatedAtAction(nameof(CollegesController.GetById), "Colleges", new { id = college.CollegeId }, new
            {
                success = true,
                message = emailsAccepted
                    ? "College and administrator created. Both emails were accepted for delivery."
                    : "College and administrator created. Review the email statuses and retry any email that needs delivery.",
                data = college,
                onboarding = new
                {
                    result.AdminUserId,
                    result.AdminEmailStatus,
                    result.CollegeEmailStatus,
                    adminEmailRetryPath = $"/api/v1/admin/users/{result.AdminUserId}/resend-invitation",
                    collegeEmailRetryPath = $"/api/v1/colleges/{college.CollegeId}/resend-welcome-email"
                },
                correlationId = HttpContext.TraceIdentifier
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id:long}/resend-welcome-email")]
    public async Task<IActionResult> ResendWelcomeEmail(long id)
    {
        var status = await onboarding.RetryCollegeWelcomeEmailAsync(id);
        return status switch
        {
            null => NotFound(new { success = false, message = "Active college welcome email registration was not found." }),
            "sent" => Ok(new { success = true, collegeEmailStatus = status }),
            "sending" => Conflict(new { success = false, collegeEmailStatus = status, message = "An email attempt is in progress. Retry after 10 minutes." }),
            _ => StatusCode(StatusCodes.Status502BadGateway, new
            {
                success = false, collegeEmailStatus = status,
                message = "College welcome email delivery could not be confirmed. Use the correlation ID to check the server logs.",
                correlationId = HttpContext.TraceIdentifier
            })
        };
    }
}
