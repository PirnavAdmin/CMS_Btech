using System.Data;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1;

public sealed class AcademicStatusRequest
{
    [Required]
    [JsonConverter(typeof(FlexibleBooleanJsonConverter))]
    public bool? Status { get; set; }
}

public sealed class FlexibleBooleanJsonConverter : JsonConverter<bool?>
{
    public override bool? Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        if (reader.TokenType == System.Text.Json.JsonTokenType.True) return true;
        if (reader.TokenType == System.Text.Json.JsonTokenType.False) return false;
        if (reader.TokenType == System.Text.Json.JsonTokenType.Number && reader.TryGetInt32(out var n) && (n == 0 || n == 1)) return n == 1;
        if (reader.TokenType == System.Text.Json.JsonTokenType.String)
        {
            var s = reader.GetString();
            if (bool.TryParse(s, out var b)) return b;
            if (s == "0" || s == "1") return s == "1";
        }
        throw new System.Text.Json.JsonException("status must be true/false or 0/1.");
    }
    public override void Write(System.Text.Json.Utf8JsonWriter writer, bool? value, System.Text.Json.JsonSerializerOptions options)
    { if (value.HasValue) writer.WriteBooleanValue(value.Value); else writer.WriteNullValue(); }
}

[ApiController]
[Authorize]
public sealed class AcademicDependenciesController(IConfiguration configuration) : ControllerBase
{
    [HttpGet("api/v1/{entity:regex(^(college|colleges|academic-year|academic-years|department|departments|course|courses|branch|branches|semester|semesters|section|sections|student|students)$)}/{id:long}/dependencies")]
    [HttpGet("api/v1/{entity:regex(^(college|colleges|academic-year|academic-years|department|departments|course|courses|branch|branches|semester|semesters|section|sections|student|students)$)}/{id:long}/deactivation-impact")]
    public async Task<IActionResult> Dependencies(string entity,long id)
    {
        if(id<=0)return BadRequest(new{success=false,message="A positive record ID is required."});
        var normalized = NormalizeEntity(entity);
        await using var db=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        var result=await db.QuerySingleOrDefaultAsync("sp_cms_dependency_impact",new{p_entity=normalized,p_id=id},commandType:CommandType.StoredProcedure);
        return result==null?NotFound(new{success=false,message="Record not found."}):Ok(new{success=true,message="Dependency impact retrieved successfully.",data=result});
    }

    [Authorize(Roles="SUPER_ADMIN,COLLEGE_ADMIN")]
    [HttpPatch("api/v1/branches/{id:long}/status")]
    public Task<IActionResult> BranchStatus(long id,[FromBody] AcademicStatusRequest request)=>SetStatus("branch",id,request);

    [Authorize(Roles="SUPER_ADMIN,COLLEGE_ADMIN")]
    [HttpPatch("api/semester/{id:long}/status")]
    [HttpPatch("api/v1/semesters/{id:long}/status")]
    public Task<IActionResult> SemesterStatus(long id,[FromBody] AcademicStatusRequest request)=>SetStatus("semester",id,request);

    private async Task<IActionResult> SetStatus(string entity,long id,AcademicStatusRequest request)
    {
        if(id<=0)return BadRequest(new{success=false,message="A positive record ID is required."});
        if(!request.Status.HasValue)return BadRequest(new{success=false,message="status is required."});
        await using var db=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        try
        {
            var affected=await db.QuerySingleAsync<int>("sp_cms_status_update",new{p_entity=entity,p_id=id,p_status=request.Status.Value?1:0,p_actor=long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier),out var actor)?(long?)actor:null},commandType:CommandType.StoredProcedure);
            return affected==0?NotFound(new{success=false,message="Record not found."}):Ok(new{success=true,message="Status updated successfully.",data=new{id,status=request.Status.Value}});
        }
        catch(MySqlException ex) when(ex.SqlState=="45000")
        {
            return Conflict(new{success=false,message=ex.Message,data=new{id,status=request.Status.Value}});
        }
    }

    private static string NormalizeEntity(string entity) => entity.Trim().ToLowerInvariant() switch
    {
        "college" or "colleges" => "colleges",
        "academic-year" or "academic-years" => "academic-years",
        "department" or "departments" => "departments",
        "course" or "courses" => "courses",
        "branch" or "branches" => "branches",
        "semester" or "semesters" => "semesters",
        "section" or "sections" => "sections",
        "student" or "students" => "students",
        _ => entity
    };
}

[ApiController]
[Authorize(Roles="SUPER_ADMIN")]
[Route("api/v1/activity-logs")]
public sealed class ActivityLogsController(IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? screen=null,[FromQuery] string? correlationId=null,[FromQuery] int limit=100)
    {
        if(limit<1||limit>1000)return BadRequest(new{success=false,message="Limit must be between 1 and 1000."});
        await using var db=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        var data=await db.QueryAsync("sp_cms_activity_list",new{p_screen=screen,p_correlation=correlationId,p_limit=limit},commandType:CommandType.StoredProcedure);
        return Ok(new{success=true,data});
    }
    [HttpGet("status-history/{entity}/{id:long}")]
    public async Task<IActionResult> StatusHistory(string entity,long id)
    {
        await using var db=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        var data=await db.QueryAsync("sp_cms_status_history",new{p_entity=entity,p_id=id},commandType:CommandType.StoredProcedure);
        return Ok(new{success=true,data});
    }
}
