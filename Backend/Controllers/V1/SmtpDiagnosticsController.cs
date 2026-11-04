using BTech.Middleware;
using BTech.Services.Invitations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController, Authorize, Route("api/v1/admin/users/email-diagnostics")]
public sealed class SmtpDiagnosticsController(SmtpRuntimeDiagnostics diagnostics) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Check(CancellationToken cancellationToken)
    {
        if (HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is not true) return Forbid();
        var result = await diagnostics.CheckAsync(HttpContext.TraceIdentifier, cancellationToken);
        return Ok(new { success = result.AuthenticationConfirmed, data = result, correlationId = HttpContext.TraceIdentifier });
    }
}
