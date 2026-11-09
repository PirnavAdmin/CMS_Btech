using System.ComponentModel.DataAnnotations;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController,Authorize,Route("api/v1/grades")]
public sealed class GradeManagementController(IConfiguration config) : ControllerBase
{
 private MySqlConnection Connection()=>new(config.GetConnectionString("DefaultConnection"));
 private const string SelectSql="SELECT grade_id AS id,grade_id AS gradeId,college_id AS collegeId,grade_code AS gradeCode,grade_name AS gradeName,min_percentage AS minPercentage,max_percentage AS maxPercentage,grade_point AS gradePoint,is_pass AS isPass,description,status FROM grades WHERE deleted_at IS NULL AND (@scope IS NULL OR college_id=@scope)";
 [HttpGet] public async Task<IActionResult> GetAll(CancellationToken ct)
 {var scope=CollegeDataScope.Resolve(HttpContext);await using var c=Connection();return Ok(new{success=true,data=await c.QueryAsync(new CommandDefinition(SelectSql+" ORDER BY min_percentage DESC,grade_id",new{scope},cancellationToken:ct))});}
 [HttpGet("{id:long}")] public async Task<IActionResult> GetById(long id,CancellationToken ct)
 {var scope=CollegeDataScope.Resolve(HttpContext);await using var c=Connection();var data=await c.QuerySingleOrDefaultAsync(new CommandDefinition(SelectSql+" AND grade_id=@id",new{scope,id},cancellationToken:ct));return data is null?NotFound(new{success=false,message="Grade not found."}):Ok(new{success=true,data});}
 [HttpPost] public Task<IActionResult> Create([FromBody] GradeRequest body,CancellationToken ct)=>Save(null,body,ct);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] GradeRequest body,CancellationToken ct)=>Save(id,body,ct);
 private async Task<IActionResult> Save(long? id,GradeRequest b,CancellationToken ct)
 {
  if(!new[]{"SUPER_ADMIN","COLLEGE_ADMIN","PRINCIPAL","HOD"}.Any(x=>CollegeDataScope.HasRole(HttpContext,x)))throw new ContractException(403,"GRADE_ADMIN_REQUIRED","An academic administrator must change official grade rules.");
  var scope=CollegeDataScope.Resolve(HttpContext,b.CollegeId,required:!id.HasValue);
  if(string.IsNullOrWhiteSpace(b.GradeCode)||string.IsNullOrWhiteSpace(b.GradeName)||b.GradeCode.Length>20||b.GradeName.Length>100||b.MinPercentage<0||b.MaxPercentage>100||b.MinPercentage>b.MaxPercentage||b.GradePoint is <0 or >10||b.Status is <0 or >1)
   return BadRequest(new{success=false,message="Provide a grade code/name, a valid 0–100 range, 0–10 grade points and status 0 or 1."});
  await using var c=Connection();await c.OpenAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
  if(id.HasValue){var owner=await c.ExecuteScalarAsync<long?>(new CommandDefinition("SELECT college_id FROM grades WHERE grade_id=@id AND deleted_at IS NULL AND (@scope IS NULL OR college_id=@scope) FOR UPDATE",new{id,scope},tx,cancellationToken:ct));if(owner is null)return NotFound(new{success=false,message="Grade not found."});if(scope.HasValue&&scope!=owner)throw new ContractException(409,"COLLEGE_IMMUTABLE","A grade cannot be transferred to another college.");scope=owner;}
  if(await c.ExecuteScalarAsync<long?>(new CommandDefinition("SELECT college_id FROM colleges WHERE college_id=@scope AND deleted_at IS NULL FOR UPDATE",new{scope},tx,cancellationToken:ct)) is null)return BadRequest(new{success=false,message="College not found."});
  var code=b.GradeCode.Trim().ToUpperInvariant();
  var duplicate=await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM grades WHERE college_id=@scope AND deleted_at IS NULL AND (@id IS NULL OR grade_id<>@id) AND (grade_code=@code OR (@status=1 AND status=1 AND min_percentage<=@max AND max_percentage>=@min))",new{scope,id,code,status=b.Status,min=b.MinPercentage,max=b.MaxPercentage},tx,cancellationToken:ct));
  if(duplicate>0)return Conflict(new{success=false,code="GRADE_RULE_CONFLICT",message="Grade code or active percentage range overlaps an existing grade."});
  var actor=CollegeDataScope.Actor(HttpContext);var args=new{scope,id,code,name=b.GradeName.Trim(),min=b.MinPercentage,max=b.MaxPercentage,point=b.GradePoint,pass=b.IsPass?1:0,b.Description,b.Status,actor};
  if(id.HasValue)await c.ExecuteAsync(new CommandDefinition("UPDATE grades SET grade_code=@code,grade_name=@name,min_percentage=@min,max_percentage=@max,grade_point=@point,is_pass=@pass,description=@Description,status=@Status,updated_by=@actor WHERE grade_id=@id",args,tx,cancellationToken:ct));
  else id=await c.ExecuteScalarAsync<long>(new CommandDefinition("INSERT INTO grades(college_id,grade_code,grade_name,min_percentage,max_percentage,grade_point,is_pass,description,status,created_by) VALUES(@scope,@code,@name,@min,@max,@point,@pass,@Description,@Status,@actor);SELECT LAST_INSERT_ID();",args,tx,cancellationToken:ct));
  await c.ExecuteAsync(new CommandDefinition("INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id) VALUES(@scope,'grades',@id,'SAVED',@actor,@trace)",new{scope,id,actor,trace=HttpContext.TraceIdentifier},tx,cancellationToken:ct));
  await tx.CommitAsync(ct);return StatusCode(args.id.HasValue?200:201,new{success=true,id,gradeId=id});
 }
}
public sealed class GradeRequest
{
 public long? CollegeId{get;set;}
 [Required] public string GradeCode{get;set;}="";
 [Required] public string GradeName{get;set;}="";
 public decimal MinPercentage{get;set;}
 public decimal MaxPercentage{get;set;}
 public decimal? GradePoint{get;set;}
 public bool IsPass{get;set;}=true;
 public string? Description{get;set;}
 public int Status{get;set;}=1;
}
