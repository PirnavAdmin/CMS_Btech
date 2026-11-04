using BTech.UserAccess;
using BTech.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;

static void Check(bool value,string message){if(!value)throw new Exception(message);}
var method=typeof(UserAccessController).GetMethod(nameof(UserAccessController.Reset))!;
var urls=method.GetCustomAttributes<HttpPostAttribute>().Select(a=>a.Template).ToArray();
Check(urls.Contains("{userId}/reset-password"),"Frontend reset-password route is registered.");
Check(urls.Contains("{userId:long}/password-reset"),"Existing password-reset alias retained.");
var context=new DefaultHttpContext();context.TraceIdentifier="reset-route-unit-test";
context.User=new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim(ClaimTypes.NameIdentifier,"1")},"test"));
// A null service proves these invalid requests are rejected before any DB/mail call.
var controller=new UserAccessController(null!){ControllerContext=new ControllerContext{HttpContext=context}};
Check(await controller.Reset(12) is ForbidResult,"Unverified caller must be forbidden.");
context.Items[ModulePermissionMiddleware.SuperAdminItem]=true;
static void Bad(IActionResult result,string expected)
{
    var bad=result as BadRequestObjectResult??throw new Exception("Expected 400 before any lookup/send.");
    var body=JsonSerializer.SerializeToElement(bad.Value);
    Check(body.GetProperty("code").GetString()==expected,"Specific validation code.");
    Check(body.GetProperty("correlationId").GetString()=="reset-route-unit-test","Correlation retained.");
}
Bad(await controller.Reset(0),"INVALID_USER_ID_OR_COLLEGE_ID");
Bad(await controller.Reset(12,new PasswordSetupLinkRequest{UserId=13}),"USER_ID_MISMATCH");
Bad(await controller.Reset(12,new PasswordSetupLinkRequest{CollegeId=9},8),"COLLEGE_ID_MISMATCH");
Console.WriteLine("PASS: reset-password route/alias, authorization guard, invalid ID/scope validation before DB/mail, correlation IDs.");
