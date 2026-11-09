using System.Security.Claims;
using BTech.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BTech.UserAccess;

[ApiController,Authorize,Route("api/v1/admin/users")]
public sealed class UserAccessController(UserAccessService service) : ControllerBase
{
    private bool Allowed=>HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is true;
    private long Actor=>long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")!);
    private string Trace=>HttpContext.TraceIdentifier;
    [HttpGet("invitations")]
    public async Task<IActionResult> Invitations(int pageNumber=1,int pageSize=1000,string responseFormat="paged")
    {
        if(!Allowed)return Forbid();
        if(responseFormat is not ("paged" or "array"))return BadRequest(new{success=false,message="responseFormat must be paged or array."});
        var result=await service.Invitations(Trace,pageNumber,pageSize);
        return Ok(new{success=true,data=responseFormat=="array"?result.Items:(object)result,correlationId=Trace});
    }
    [HttpPost("onboard-college")]
    public async Task<IActionResult> Onboard(OnboardCollegeRequest request)
    {if(!Allowed)return Forbid();return StatusCode(201,new{success=true,message="Account saved and setup email accepted for delivery.",data=await service.Onboard(request,Actor,Trace),correlationId=Trace});}
    [HttpPost("invite")]
    [HttpPost("")]
    public async Task<IActionResult> Invite(InviteUserRequest request)
    {if(!Allowed)return Forbid();return StatusCode(201,new{success=true,message="Account saved and setup email accepted for delivery.",data=await service.Invite(request,Actor,Trace),correlationId=Trace});}
    [HttpPut("{userId:long}")]
    public async Task<IActionResult> Update(long userId,UpdateAccessUserRequest request)
    {if(!Allowed)return Forbid();await service.Update(userId,request,Actor,Trace);return Ok(new{success=true,data=new{accountSaved=true},correlationId=Trace});}
    [HttpPatch("{userId:long}/status")]
    public async Task<IActionResult> Status(long userId,StatusRequest request)
    {if(!Allowed)return Forbid();await service.Status(userId,request.Status!.Value,Actor,Trace);return Ok(new{success=true});}
    [HttpGet("{userId:long}/access")]
    public async Task<IActionResult> Access(long userId)
    {if(!Allowed)return Forbid();return Ok(new{success=true,data=await service.GetAccess(userId)});}
    [HttpPut("{userId:long}/permissions")]
    public async Task<IActionResult> Modules(long userId,ModuleAccessRequest request)
    {if(!Allowed)return Forbid();await service.Modules(userId,request,Actor,Trace);return Ok(new{success=true});}
    [HttpPut("{userId:long}/academic-year-access")]
    public async Task<IActionResult> Years(long userId,YearAccessRequest request)
    {if(!Allowed)return Forbid();await service.Years(userId,request,Actor,Trace);return Ok(new{success=true});}
    [HttpPost("{userId:long}/resend-invitation")]
    public async Task<IActionResult> Resend(long userId)
    {if(!Allowed)return Forbid();return Ok(new{success=true,message="Setup email accepted for delivery.",data=await service.Resend(userId,Actor,Trace,false),correlationId=Trace});}
    [HttpPost("{userId}/reset-password")]
    [HttpPost("{userId:long}/password-reset")]
    public async Task<IActionResult> Reset([FromRoute] long userId,
        [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] PasswordSetupLinkRequest? request = null,
        [FromQuery] long? collegeId = null)
    {
        if (!Allowed) return Forbid();
        if (userId <= 0 || collegeId is <= 0 || request?.UserId is <= 0 || request?.CollegeId is <= 0)
            return BadRequest(new { success=false, code="INVALID_USER_ID_OR_COLLEGE_ID",
                message="Use a positive users.user_id from GET /api/v1/admin/users and an optional positive collegeId.", correlationId=Trace });
        if (request?.UserId is long bodyUserId && bodyUserId != userId)
            return BadRequest(new { success=false, code="USER_ID_MISMATCH",
                message="The body userId must match the route userId. Use the account's userId, not employeeProfileId or collegeId.", correlationId=Trace });
        if (collegeId.HasValue && request?.CollegeId is long bodyCollege && bodyCollege != collegeId)
            return BadRequest(new { success=false, code="COLLEGE_ID_MISMATCH",
                message="Body and query collegeId must match.", correlationId=Trace });
        var scope = collegeId ?? request?.CollegeId;
        return Ok(new { success=true,message="Password link email accepted for delivery.",
            data=await service.Resend(userId,Actor,Trace,true,scope), correlationId=Trace });
    }
    [HttpGet("{userId:long}/activity")]
    public async Task<IActionResult> Activity(long userId,int pageNumber=1,int pageSize=50)
    {if(!Allowed)return Forbid();return Ok(new{success=true,data=await service.Audits(userId,pageNumber,pageSize)});}
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {if(!Allowed)return Forbid();return File(await service.Export(Actor,Trace),"text/csv","users.csv");}
}

[ApiController,Authorize,Route("api/v1/account/profile")]
public sealed class AccountProfileController(BTech.Services.Interfaces.IProfileService profiles) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var profile = await profiles.GetProfileAsync(Actor);
        return profile == null ? NotFound(new { success = false, message = "Profile not found." })
            : Ok(new { success = true, data = profile });
    }
    [HttpPut]
    [HttpPatch]
    public async Task<IActionResult> Complete(CompleteProfileRequest request)
    {
        request.Designation ??= request.JobTitle;
        request.Address ??= request.AddressLine1;
        request.Pincode ??= request.PostalCode;
        var result = await profiles.UpdateProfileAsync(Actor, request, Actor);
        return !result.Success ? BadRequest(new { success = false, message = result.Message })
            : Ok(new { success = true, message = result.Message,
                profileCompleted = result.Data!.ProfileCompleted, data = result.Data });
    }
}

[ApiController,Authorize,Route("api/v1/admin/roles")]
public sealed class AdminRolePermissionsController(UserAccessService service) : ControllerBase
{
    private bool Allowed=>HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is true;
    [HttpGet("{roleId:long}/permissions")]
    public async Task<IActionResult> Get(long roleId,[FromQuery] long collegeId)
    {if(!Allowed)return Forbid();if(collegeId<=0)return BadRequest(new{message="collegeId is required."});return Ok(new{success=true,data=await service.RolePermissions(roleId,collegeId)});}
    [HttpPut("{roleId:long}/permissions")]
    public async Task<IActionResult> Put(long roleId,ModuleAccessRequest request)
    {if(!Allowed)return Forbid();var actor=long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")!);await service.SaveRolePermissions(roleId,request,actor,HttpContext.TraceIdentifier);return Ok(new{success=true});}
}
