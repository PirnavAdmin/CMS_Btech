using System.Diagnostics;
using System.Security.Claims;
using BTech.DTOs.Placements;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/placements")]
public sealed class PlacementWorkflowController : ControllerBase
{
    private readonly IPlacementService _service;
    private readonly ILogger<PlacementWorkflowController> _logger;
    public PlacementWorkflowController(IPlacementService service,ILogger<PlacementWorkflowController> logger){_service=service;_logger=logger;}
    private async Task<IActionResult> Execute<T>(string action,long? collegeId,Func<long,Task<T>> operation,int successStatus=200)
    {
        var watch=Stopwatch.StartNew();long? userId=null;
        try
        {
            var id=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id")??User.FindFirstValue("userId");
            if(!long.TryParse(id,out var actor)||actor<=0)throw new PlacementApiException(401,"A valid user identifier is required in the token.");
            userId=actor;if(collegeId is <=0)throw new PlacementApiException(400,"collegeId must be positive.");
            using var scope=_logger.BeginScope(new Dictionary<string,object?>{{"CorrelationId",HttpContext.TraceIdentifier},{"PlacementAction",action},{"ActorId",actor},{"CollegeId",collegeId}});
            _logger.LogInformation("Placement request started. Action={Action}, ActorId={ActorId}, CollegeId={CollegeId}, TraceId={TraceId}",action,actor,collegeId,HttpContext.TraceIdentifier);
            Response.Headers["Cache-Control"]="no-store";
            var data=await operation(actor);
            _logger.LogInformation("Placement request completed. Action={Action}, ActorId={ActorId}, CollegeId={CollegeId}, DurationMs={DurationMs}, TraceId={TraceId}",action,actor,collegeId,watch.ElapsedMilliseconds,HttpContext.TraceIdentifier);
            return StatusCode(successStatus,new{success=true,message=action+" completed successfully.",data});
        }
        catch(PlacementApiException ex){return Reject(action,userId,ex.StatusCode,ex.Message);}
        catch(MySqlException ex) when(ex.Number==1062){return Reject(action,userId,409,"A drive code, rule name, application, interview round or selection already exists.");}
        catch(MySqlException ex) when(ex.Number is 1048 or 1452 or 3819 or 4025 or 1406 or 1264){return Reject(action,userId,400,"Submitted data violates a database relationship, length or value constraint.");}
        catch(MySqlException ex) when(ex.Number is 1205 or 1213){return Reject(action,userId,409,"A concurrent placement update occurred. Retry this request.");}
        catch(OperationCanceledException) when(HttpContext.RequestAborted.IsCancellationRequested){_logger.LogInformation("Placement request cancelled. Action={Action}, TraceId={TraceId}",action,HttpContext.TraceIdentifier);return StatusCode(499);}
        catch(Exception ex){_logger.LogError(ex,"Placement request failed. Action={Action}, ActorId={ActorId}, TraceId={TraceId}",action,userId,HttpContext.TraceIdentifier);return StatusCode(500,new{success=false,message="Placement operation failed. Check the server log and placement database setup.",correlationId=HttpContext.TraceIdentifier});}
    }
    private IActionResult Reject(string action,long? userId,int code,string message)
    {
        _logger.LogWarning("Placement request rejected. Action={Action}, ActorId={ActorId}, Code={Code}, Reason={Reason}, TraceId={TraceId}",action,userId,code,message,HttpContext.TraceIdentifier);
        return StatusCode(code,new{success=false,message,correlationId=HttpContext.TraceIdentifier});
    }
    private CancellationToken Ct=>HttpContext.RequestAborted;

    [HttpGet("lookups")]
    public Task<IActionResult> Lookups([FromQuery] long? collegeId=null)=>Execute("Placement lookups",collegeId,u=>_service.Lookups(u,collegeId,Ct));
    [HttpGet("dashboard")]
    public Task<IActionResult> Dashboard([FromQuery] long? collegeId=null)=>Execute("Placement dashboard",collegeId,u=>_service.Dashboard(u,collegeId,Ct));

    [HttpGet("drives")]
    public Task<IActionResult> Drives([FromQuery] long? collegeId=null,[FromQuery] long? companyId=null,[FromQuery] long? academicYearId=null,[FromQuery] string? status=null,[FromQuery] string? search=null,[FromQuery] int page=1,[FromQuery] int pageSize=50)
        =>Execute("List drives",collegeId,u=>_service.Drives(u,collegeId,companyId,academicYearId,status,search,page,pageSize,Ct));
    [HttpGet("drives/{driveId:long}")]
    public Task<IActionResult> Drive(long driveId,[FromQuery] long? collegeId=null)=>Execute("Get drive",collegeId,u=>_service.Drive(u,collegeId,driveId,Ct));
    [HttpPost("drives")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public Task<IActionResult> CreateDrive([FromBody] SavePlacementDriveRequest request,[FromQuery] long? collegeId=null)=>Execute("Create drive",collegeId,u=>_service.CreateDrive(u,collegeId,request,Ct),201);
    [HttpPut("drives/{driveId:long}")]
    public Task<IActionResult> UpdateDrive(long driveId,[FromBody] SavePlacementDriveRequest request,[FromQuery] long? collegeId=null)=>Execute("Update drive",collegeId,u=>_service.UpdateDrive(u,collegeId,driveId,request,Ct));
    [HttpPatch("drives/{driveId:long}/status")]
    public Task<IActionResult> DriveStatus(long driveId,[FromBody] PlacementStatusRequest request,[FromQuery] long? collegeId=null)=>Execute("Update drive status",collegeId,u=>_service.SetDriveStatus(u,collegeId,driveId,request,Ct));
    [HttpDelete("drives/{driveId:long}")]
    public Task<IActionResult> DeleteDrive(long driveId,[FromQuery] long? collegeId=null)=>Execute("Delete draft drive",collegeId,u=>_service.DeleteDrive(u,collegeId,driveId,Ct));

    [HttpGet("drives/{driveId:long}/eligibility-rules")]
    public Task<IActionResult> Rules(long driveId,[FromQuery] long? collegeId=null)=>Execute("List eligibility rules",collegeId,u=>_service.Rules(u,collegeId,driveId,Ct));
    [HttpGet("drives/{driveId:long}/eligibility-rules/{ruleId:long}")]
    public Task<IActionResult> Rule(long driveId,long ruleId,[FromQuery] long? collegeId=null)=>Execute("Get eligibility rule",collegeId,u=>_service.Rule(u,collegeId,driveId,ruleId,Ct));
    [HttpPost("drives/{driveId:long}/eligibility-rules")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public Task<IActionResult> CreateRule(long driveId,[FromBody] SavePlacementRuleRequest request,[FromQuery] long? collegeId=null)=>Execute("Create eligibility rule",collegeId,u=>_service.CreateRule(u,collegeId,driveId,request,Ct),201);
    [HttpPut("drives/{driveId:long}/eligibility-rules/{ruleId:long}")]
    public Task<IActionResult> UpdateRule(long driveId,long ruleId,[FromBody] SavePlacementRuleRequest request,[FromQuery] long? collegeId=null)=>Execute("Update eligibility rule",collegeId,u=>_service.UpdateRule(u,collegeId,driveId,ruleId,request,Ct));
    [HttpDelete("drives/{driveId:long}/eligibility-rules/{ruleId:long}")]
    public Task<IActionResult> DeleteRule(long driveId,long ruleId,[FromQuery] long? collegeId=null)=>Execute("Delete eligibility rule",collegeId,u=>_service.DeleteRule(u,collegeId,driveId,ruleId,Ct));
    [HttpGet("drives/{driveId:long}/eligibility")]
    public Task<IActionResult> Eligibilities(long driveId,[FromQuery] long? collegeId=null,[FromQuery] string? status=null,[FromQuery] int page=1,[FromQuery] int pageSize=50)=>Execute("List eligibility",collegeId,u=>_service.Eligibilities(u,collegeId,driveId,status,page,pageSize,Ct));
    [HttpGet("drives/{driveId:long}/eligibility/{studentId:long}")]
    public Task<IActionResult> Eligibility(long driveId,long studentId,[FromQuery] long? collegeId=null)=>Execute("Get student eligibility",collegeId,u=>_service.Eligibility(u,collegeId,driveId,studentId,Ct));
    [HttpPost("drives/{driveId:long}/eligibility/evaluate")]
    public Task<IActionResult> Evaluate(long driveId,[FromBody] EvaluatePlacementEligibilityRequest request,[FromQuery] long? collegeId=null)=>Execute("Evaluate eligibility",collegeId,u=>_service.Evaluate(u,collegeId,driveId,request,Ct));
    [HttpPost("drives/{driveId:long}/eligibility/evaluate-bulk")]
    public Task<IActionResult> EvaluateBulk(long driveId,[FromBody] BulkEvaluatePlacementEligibilityRequest request,[FromQuery] long? collegeId=null)=>Execute("Bulk evaluate eligibility",collegeId,u=>_service.EvaluateBulk(u,collegeId,driveId,request,Ct));

    [HttpGet("applications")]
    public Task<IActionResult> Applications([FromQuery] long? collegeId=null,[FromQuery] long? driveId=null,[FromQuery] long? studentId=null,[FromQuery] string? status=null,[FromQuery] int page=1,[FromQuery] int pageSize=50)=>Execute("List applications",collegeId,u=>_service.Applications(u,collegeId,driveId,studentId,status,page,pageSize,Ct));
    [HttpGet("applications/{applicationId:long}")]
    public Task<IActionResult> Application(long applicationId,[FromQuery] long? collegeId=null)=>Execute("Get application",collegeId,u=>_service.Application(u,collegeId,applicationId,Ct));
    [HttpPost("drives/{driveId:long}/applications")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public Task<IActionResult> Apply(long driveId,[FromBody] CreatePlacementApplicationRequest request,[FromQuery] long? collegeId=null)=>Execute("Submit application",collegeId,u=>_service.Apply(u,collegeId,driveId,request,Ct),201);
    [HttpPut("applications/{applicationId:long}")]
    public Task<IActionResult> UpdateApplication(long applicationId,[FromBody] UpdatePlacementApplicationRequest request,[FromQuery] long? collegeId=null)=>Execute("Update application",collegeId,u=>_service.UpdateApplication(u,collegeId,applicationId,request,Ct));
    [HttpPatch("applications/{applicationId:long}/status")]
    public Task<IActionResult> ApplicationStatus(long applicationId,[FromBody] PlacementStatusRequest request,[FromQuery] long? collegeId=null)=>Execute("Update application status",collegeId,u=>_service.SetApplicationStatus(u,collegeId,applicationId,request,Ct));

    [HttpGet("interviews")]
    public Task<IActionResult> InterviewList([FromQuery] long? collegeId=null,[FromQuery] long? driveId=null,[FromQuery] string? status=null,[FromQuery] DateTime? from=null,[FromQuery] DateTime? to=null,[FromQuery] int page=1,[FromQuery] int pageSize=50)=>Execute("List interviews",collegeId,u=>_service.InterviewList(u,collegeId,driveId,status,from,to,page,pageSize,Ct));
    [HttpGet("applications/{applicationId:long}/interviews")]
    public Task<IActionResult> Interviews(long applicationId,[FromQuery] long? collegeId=null)=>Execute("List application interviews",collegeId,u=>_service.Interviews(u,collegeId,applicationId,Ct));
    [HttpGet("interviews/{interviewId:long}")]
    public Task<IActionResult> Interview(long interviewId,[FromQuery] long? collegeId=null)=>Execute("Get interview",collegeId,u=>_service.Interview(u,collegeId,interviewId,Ct));
    [HttpPost("applications/{applicationId:long}/interviews")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public Task<IActionResult> CreateInterview(long applicationId,[FromBody] SavePlacementInterviewRequest request,[FromQuery] long? collegeId=null)=>Execute("Schedule interview",collegeId,u=>_service.CreateInterview(u,collegeId,applicationId,request,Ct),201);
    [HttpPut("interviews/{interviewId:long}")]
    public Task<IActionResult> UpdateInterview(long interviewId,[FromBody] SavePlacementInterviewRequest request,[FromQuery] long? collegeId=null)=>Execute("Update interview",collegeId,u=>_service.UpdateInterview(u,collegeId,interviewId,request,Ct));
    [HttpPatch("interviews/{interviewId:long}/result")]
    public Task<IActionResult> InterviewResult(long interviewId,[FromBody] PlacementInterviewResultRequest request,[FromQuery] long? collegeId=null)=>Execute("Record interview result",collegeId,u=>_service.InterviewResult(u,collegeId,interviewId,request,Ct));
    [HttpPatch("interviews/{interviewId:long}/status")]
    public Task<IActionResult> InterviewStatus(long interviewId,[FromBody] PlacementStatusRequest request,[FromQuery] long? collegeId=null)=>Execute("Update interview status",collegeId,u=>_service.SetInterviewStatus(u,collegeId,interviewId,request,Ct));

    [HttpGet("selections")]
    public Task<IActionResult> Selections([FromQuery] long? collegeId=null,[FromQuery] long? driveId=null,[FromQuery] long? studentId=null,[FromQuery] string? status=null,[FromQuery] int page=1,[FromQuery] int pageSize=50)=>Execute("List selections",collegeId,u=>_service.Selections(u,collegeId,driveId,studentId,status,page,pageSize,Ct));
    [HttpGet("selections/{selectionId:long}")]
    public Task<IActionResult> Selection(long selectionId,[FromQuery] long? collegeId=null)=>Execute("Get selection",collegeId,u=>_service.Selection(u,collegeId,selectionId,Ct));
    [HttpGet("applications/{applicationId:long}/selection")]
    public Task<IActionResult> ApplicationSelection(long applicationId,[FromQuery] long? collegeId=null)=>Execute("Get application selection",collegeId,u=>_service.ApplicationSelection(u,collegeId,applicationId,Ct));
    [HttpPut("applications/{applicationId:long}/selection")]
    public Task<IActionResult> SaveSelection(long applicationId,[FromBody] SavePlacementSelectionRequest request,[FromQuery] long? collegeId=null)=>Execute("Save selection decision",collegeId,u=>_service.SaveSelection(u,collegeId,applicationId,request,Ct));
    [HttpPatch("selections/{selectionId:long}/offer")]
    public Task<IActionResult> Offer(long selectionId,[FromBody] PlacementOfferRequest request,[FromQuery] long? collegeId=null)=>Execute("Update selection offer",collegeId,u=>_service.Offer(u,collegeId,selectionId,request,Ct));
    [HttpPatch("selections/{selectionId:long}/joined")]
    public Task<IActionResult> Join(long selectionId,[FromQuery] long? collegeId=null)=>Execute("Record student joining",collegeId,u=>_service.Join(u,collegeId,selectionId,Ct));
}
