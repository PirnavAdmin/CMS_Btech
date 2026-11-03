using System.Diagnostics;
using System.Security.Claims;
using BTech.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.EventManagement;

[ApiController]
[Authorize]
[Route("api/v1/events")]
public sealed class EventsController : ControllerBase
{
    private readonly EventStore _store;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<EventsController> _logger;
    public EventsController(IConfiguration configuration,IWebHostEnvironment environment,ILogger<EventsController> logger)
    { _store=new EventStore(configuration,logger);_environment=environment;_logger=logger; }
    private EventActor Actor()
    {
        var claim=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id");
        if(!long.TryParse(claim,out var id)||id<=0) throw new EventApiException(401,"The token needs a valid user id.");
        var c=User.FindFirstValue("collegeId")??User.FindFirstValue("college_id");long? college=null;
        if(c is not null) { if(!long.TryParse(c,out var value)||value<=0) throw new EventApiException(401,"Invalid token college id.");college=value; }
        return new EventActor(id,college);
    }
    private async Task<IActionResult> Execute(string action,Func<EventActor,CancellationToken,Task<object>> operation,bool created=false)
    {
        var watch=Stopwatch.StartNew();long? userId=null;
        Response.Headers["Cache-Control"]="no-store";
        try
        {
            var actor=Actor();userId=actor.UserId;
            _logger.LogInformation("Event action started. Action={Action}, UserId={UserId}, TraceId={TraceId}",action,userId,HttpContext.TraceIdentifier);
            var data=await operation(actor,HttpContext.RequestAborted);
            _logger.LogInformation("Event action completed. Action={Action}, UserId={UserId}, DurationMs={DurationMs}, TraceId={TraceId}",action,userId,watch.ElapsedMilliseconds,HttpContext.TraceIdentifier);
            return data is IActionResult result ? result : StatusCode(created?201:200,new {success=true,message=action+" completed successfully.",data});
        }
        catch(EventApiException ex) { return Rejected(action,userId,ex.StatusCode,ex.Message); }
        catch(ArgumentException ex) { return Rejected(action,userId,400,ex.Message); }
        catch(MySqlException ex) when(ex.Number is 1062 or 1451 or 1452 or 3819 or 1406 or 1265 or 1213 or 1205)
        {
            _logger.LogWarning(ex,"Event database validation rejected. Action={Action}, UserId={UserId}, TraceId={TraceId}",action,userId,HttpContext.TraceIdentifier);
            string message=ex.Number switch {1062=>"Duplicate code, registration or certificate. Update the existing record instead.",1213 or 1205=>"A concurrent update occurred. Retry the request.",1452=>"A referenced record is missing.",_=>"Submitted values conflict with a database validation or referenced record."};
            return Rejected(action,userId,409,message);
        }
        catch(OperationCanceledException) when(HttpContext.RequestAborted.IsCancellationRequested) { return StatusCode(499); }
        catch(Exception ex)
        {
            _logger.LogError(ex,"Event action failed. Action={Action}, UserId={UserId}, TraceId={TraceId}",action,userId,HttpContext.TraceIdentifier);
            return StatusCode(500,new {success=false,message="Event operation failed. Check the server log using the correlationId.",correlationId=HttpContext.TraceIdentifier});
        }
    }
    private IActionResult Rejected(string action,long? userId,int code,string message)
    {
        _logger.LogWarning("Event action rejected. Action={Action}, UserId={UserId}, StatusCode={StatusCode}, Reason={Reason}, TraceId={TraceId}",action,userId,code,message,HttpContext.TraceIdentifier);
        return StatusCode(code,new {success=false,message,correlationId=HttpContext.TraceIdentifier});
    }

    [HttpGet]
    public Task<IActionResult> List([FromQuery] long? collegeId=null,[FromQuery] string? search=null,[FromQuery] string? status=null,[FromQuery] string? eventType=null,
        [FromQuery] DateTime? from=null,[FromQuery] DateTime? to=null,[FromQuery] int page=1,[FromQuery] int pageSize=20)
        => Execute("List events",async(a,ct)=>await _store.ListEvents(a,collegeId,search,status,eventType,from,to,page,pageSize,ct));
    [HttpGet("{eventId:long}")]
    public Task<IActionResult> Get(long eventId,[FromQuery] long? collegeId=null)
        => Execute("Get event",async(a,ct)=>await _store.GetEvent(a,collegeId,eventId,ct));
    [HttpPost]
    public Task<IActionResult> Create([FromBody] EventRequest request,[FromQuery] long? collegeId=null)
        => Execute("Create event",async(a,ct)=>await _store.SaveEvent(a,CollegeSelection.Resolve(collegeId,request.CollegeId),null,request,ct),true);
    [HttpPut("{eventId:long}")]
    public Task<IActionResult> Update(long eventId,[FromBody] EventRequest request,[FromQuery] long? collegeId=null)
        => Execute("Update event",async(a,ct)=>await _store.SaveEvent(a,CollegeSelection.Resolve(collegeId,request.CollegeId),eventId,request,ct));
    [HttpDelete("{eventId:long}")]
    public Task<IActionResult> Delete(long eventId,[FromQuery] long? collegeId=null)
        => Execute("Delete event",async(a,ct)=>await _store.DeleteEvent(a,collegeId,eventId,ct));

    [HttpGet("{eventId:long}/registrations")]
    public Task<IActionResult> Registrations(long eventId,[FromQuery] long? collegeId=null,[FromQuery] int page=1,[FromQuery] int pageSize=20)
        => Execute("List registrations",async(a,ct)=>await _store.ListChildren(a,collegeId,eventId,"registrations",page,pageSize,ct));
    [HttpGet("{eventId:long}/registrations/{registrationId:long}")]
    public Task<IActionResult> Registration(long eventId,long registrationId,[FromQuery] long? collegeId=null)
        => Execute("Get registration",async(a,ct)=>await _store.GetChild(a,collegeId,eventId,registrationId,"registrations",ct));
    [HttpPost("{eventId:long}/registrations")]
    public Task<IActionResult> Register(long eventId,[FromBody] RegistrationRequest request,[FromQuery] long? collegeId=null)
        => Execute("Register participant",async(a,ct)=>await _store.Register(a,collegeId,eventId,request,ct),true);
    [HttpPatch("{eventId:long}/registrations/{registrationId:long}/status")]
    public Task<IActionResult> RegistrationStatus(long eventId,long registrationId,[FromBody] EventStatusRequest request,[FromQuery] long? collegeId=null)
        => Execute("Update registration status",async(a,ct)=>await _store.RegistrationStatus(a,collegeId,eventId,registrationId,request.Status,ct));
    [HttpPatch("{eventId:long}/registrations/{registrationId:long}/attendance")]
    public Task<IActionResult> Attendance(long eventId,long registrationId,[FromBody] AttendanceRequest request,[FromQuery] long? collegeId=null)
        => Execute("Mark event attendance",async(a,ct)=>await _store.Attendance(a,collegeId,eventId,registrationId,request,ct));
    [HttpDelete("{eventId:long}/registrations/{registrationId:long}")]
    public Task<IActionResult> CancelRegistration(long eventId,long registrationId,[FromQuery] long? collegeId=null)
        => Execute("Cancel registration",async(a,ct)=>await _store.RegistrationStatus(a,collegeId,eventId,registrationId,"CANCELLED",ct));

    [HttpGet("{eventId:long}/schedules")]
    public Task<IActionResult> Schedules(long eventId,[FromQuery] long? collegeId=null,[FromQuery] int page=1,[FromQuery] int pageSize=20)
        => Execute("List schedules",async(a,ct)=>await _store.ListChildren(a,collegeId,eventId,"schedules",page,pageSize,ct));
    [HttpGet("{eventId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> Schedule(long eventId,long scheduleId,[FromQuery] long? collegeId=null)
        => Execute("Get schedule",async(a,ct)=>await _store.GetChild(a,collegeId,eventId,scheduleId,"schedules",ct));
    [HttpPost("{eventId:long}/schedules")]
    public Task<IActionResult> CreateSchedule(long eventId,[FromBody] ScheduleRequest request,[FromQuery] long? collegeId=null)
        => Execute("Create schedule",async(a,ct)=>await _store.SaveSchedule(a,collegeId,eventId,null,request,ct),true);
    [HttpPut("{eventId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> UpdateSchedule(long eventId,long scheduleId,[FromBody] ScheduleRequest request,[FromQuery] long? collegeId=null)
        => Execute("Update schedule",async(a,ct)=>await _store.SaveSchedule(a,collegeId,eventId,scheduleId,request,ct));
    [HttpDelete("{eventId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> DeleteSchedule(long eventId,long scheduleId,[FromQuery] long? collegeId=null)
        => Execute("Cancel schedule",async(a,ct)=>await _store.DeleteSchedule(a,collegeId,eventId,scheduleId,ct));

    [HttpGet("{eventId:long}/certificates")]
    public Task<IActionResult> Certificates(long eventId,[FromQuery] long? collegeId=null,[FromQuery] int page=1,[FromQuery] int pageSize=20)
        => Execute("List certificates",async(a,ct)=>await _store.ListCertificates(a,collegeId,eventId,page,pageSize,ct));
    [HttpGet("{eventId:long}/certificates/{certificateId:long}")]
    public Task<IActionResult> Certificate(long eventId,long certificateId,[FromQuery] long? collegeId=null)
        => Execute("Get certificate",async(a,ct)=>await _store.GetCertificate(a,collegeId,eventId,certificateId,ct));
    [HttpPost("{eventId:long}/certificates")]
    public Task<IActionResult> IssueCertificate(long eventId,[FromBody] CertificateRequest request,[FromQuery] long? collegeId=null)
        => Execute("Issue certificate",async(a,ct)=>await _store.IssueCertificate(a,collegeId,eventId,request,ct),true);
    [HttpPatch("{eventId:long}/certificates/{certificateId:long}/revoke")]
    public Task<IActionResult> RevokeCertificate(long eventId,long certificateId,[FromBody] RevokeCertificateRequest request,[FromQuery] long? collegeId=null)
        => Execute("Revoke certificate",async(a,ct)=>await _store.RevokeCertificate(a,collegeId,eventId,certificateId,request.Reason,ct));
    [HttpGet("certificates/verify/{token}")]
    public Task<IActionResult> VerifyCertificate(string token,[FromQuery] long? collegeId=null)
        => Execute("Verify certificate",async(a,ct)=>await _store.VerifyCertificate(a,collegeId,token,ct));
    [HttpGet("{eventId:long}/certificates/{certificateId:long}/download")]
    public Task<IActionResult> DownloadCertificate(long eventId,long certificateId,[FromQuery] long? collegeId=null)
        => Execute("Download certificate",async(a,ct)=>
        {
            var bytes=await _store.CertificatePdf(a,collegeId,eventId,certificateId,ct);
            Response.Headers["X-Content-Type-Options"]="nosniff";
            return File(bytes,"application/pdf",$"event-{eventId}-certificate-{certificateId}.pdf");
        });

    [HttpGet("{eventId:long}/gallery")]
    public Task<IActionResult> Gallery(long eventId,[FromQuery] long? collegeId=null,[FromQuery] int page=1,[FromQuery] int pageSize=20)
        => Execute("List gallery",async(a,ct)=>await _store.ListChildren(a,collegeId,eventId,"gallery",page,pageSize,ct));
    [HttpGet("{eventId:long}/gallery/{galleryId:long}")]
    public Task<IActionResult> GalleryItem(long eventId,long galleryId,[FromQuery] long? collegeId=null)
        => Execute("Get gallery item",async(a,ct)=>await _store.GetChild(a,collegeId,eventId,galleryId,"gallery",ct));
    [HttpPost("{eventId:long}/gallery")]
    public Task<IActionResult> CreateGallery(long eventId,[FromBody] GalleryRequest request,[FromQuery] long? collegeId=null)
        => Execute("Create gallery item",async(a,ct)=>await _store.SaveGallery(a,collegeId,eventId,null,request,ct),true);
    [HttpPut("{eventId:long}/gallery/{galleryId:long}")]
    public Task<IActionResult> UpdateGallery(long eventId,long galleryId,[FromBody] GalleryRequest request,[FromQuery] long? collegeId=null)
        => Execute("Update gallery item",async(a,ct)=>await _store.SaveGallery(a,collegeId,eventId,galleryId,request,ct));
    [HttpDelete("{eventId:long}/gallery/{galleryId:long}")]
    public Task<IActionResult> DeleteGallery(long eventId,long galleryId,[FromQuery] long? collegeId=null)
        => Execute("Delete gallery item",async(a,ct)=>await _store.DeleteGallery(a,collegeId,eventId,galleryId,ct));
    [HttpPost("{eventId:long}/gallery/{galleryId:long}/upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(EventFiles.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit=EventFiles.MaxRequestBytes)]
    public Task<IActionResult> UploadGallery(long eventId,long galleryId,[FromForm] GalleryUploadRequest request,[FromQuery] long? collegeId=null)
        => Execute("Upload gallery file",async(a,ct)=>
        {
            await _store.GetChild(a,collegeId,eventId,galleryId,"gallery",ct);
            var validated=await EventFiles.Read(request.File,ct);
            var name=Guid.NewGuid().ToString("N")+validated.Extension;
            var root=EventFiles.Root(_environment);Directory.CreateDirectory(root);var path=Path.Combine(root,name);
            try
            {
                await System.IO.File.WriteAllBytesAsync(path,validated.Bytes,ct);
                return await _store.SetGalleryFile(a,collegeId,eventId,galleryId,name,validated.MediaType,validated.Mime,validated.Bytes.LongLength,ct);
            }
            catch
            {
                try { System.IO.File.Delete(path); }
                catch(Exception cleanup) { _logger.LogWarning(cleanup,"Event upload cleanup failed. GalleryId={GalleryId}, TraceId={TraceId}",galleryId,HttpContext.TraceIdentifier); }
                throw;
            }
        });
    [HttpGet("{eventId:long}/gallery/{galleryId:long}/download")]
    public Task<IActionResult> DownloadGallery(long eventId,long galleryId,[FromQuery] long? collegeId=null)
        => Execute("Download gallery file",async(a,ct)=>
        {
            var file=await _store.GalleryFile(a,collegeId,eventId,galleryId,ct);
            var path=EventFiles.Resolve(_environment,file.Path);
            Response.Headers["X-Content-Type-Options"]="nosniff";
            return PhysicalFile(path,file.Mime,$"event-{eventId}-gallery-{galleryId}"+Path.GetExtension(path));
        });
}
