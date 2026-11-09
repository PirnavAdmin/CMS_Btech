using System.Text.Json;
using BTech.Services;
using BTech.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController,Authorize,Route("api/v1/results")]
public sealed class ResultsAdditionalController(IConfiguration config,IResultService service) : ControllerBase
{
 [HttpGet]
 public async Task<IActionResult> GetAll([FromQuery] long? academicYearId,[FromQuery] int page=1,[FromQuery] int pageSize=100,CancellationToken ct=default)
 {
  if(page<1||pageSize<1||pageSize>100)return BadRequest(new{success=false,message="Use page >= 1 and pageSize between 1 and 100."});
  var scope=CollegeDataScope.Resolve(HttpContext);var own=CollegeDataScope.HasRole(HttpContext,"STUDENT")?CollegeDataScope.Actor(HttpContext):(long?)null;
  await using var c=new MySqlConnection(config.GetConnectionString("DefaultConnection"));
  var groups=(await c.QueryAsync(new CommandDefinition("""
   SELECT er.student_id AS studentId,es.exam_id AS examId,e.college_id AS collegeId,e.academic_year_id AS academicYearId,
    e.exam_name AS examName,s.full_name AS studentName,s.student_code AS rollNumber,MAX(er.published_at) AS publishedAt
   FROM exam_results er JOIN exam_schedules es ON es.exam_schedule_id=er.exam_schedule_id
   JOIN exams e ON e.exam_id=es.exam_id JOIN students s ON s.student_id=er.student_id AND s.college_id=e.college_id
   WHERE er.deleted_at IS NULL AND es.deleted_at IS NULL AND e.deleted_at IS NULL AND s.deleted_at IS NULL
    AND (@scope IS NULL OR e.college_id=@scope) AND (@academicYearId IS NULL OR e.academic_year_id=@academicYearId)
    AND (@own IS NULL OR s.user_id=@own)
    AND er.attempt_number=(SELECT MAX(latest.attempt_number) FROM exam_results latest WHERE latest.student_id=er.student_id AND latest.exam_schedule_id=er.exam_schedule_id AND latest.deleted_at IS NULL)
   GROUP BY er.student_id,es.exam_id,e.college_id,e.academic_year_id,e.exam_name,s.full_name,s.student_code
   HAVING SUM(er.published_at IS NULL)=0 AND SUM(er.result_status IN ('PENDING','WITHHELD'))=0
   ORDER BY es.exam_id DESC,er.student_id
   """,new{scope,own,academicYearId},cancellationToken:ct))).AsList();
  var rows=new List<object>();
  foreach(var group in groups.Skip((int)Math.Min((long)(page-1)*pageSize,groups.Count)).Take(pageSize))
  {
   long studentId=group.studentId,examId=group.examId;
   var result=await service.GetAsync(studentId,examId);
   rows.Add(new{id=$"{studentId}:{examId}",studentId,examId,collegeId=(long)group.collegeId,academicYearId=(long)group.academicYearId,
    examName=(string)group.examName,status="Published",publishedAt=group.publishedAt,result.Sgpa,result.Cgpa,result.Percentage,result.OverallGrade,
    records=result.Subjects.Select(subject=>new{studentId,studentName=(string)group.studentName,rollNumber=(string)group.rollNumber,subject.SubjectId,subject.SubjectCode,subject.SubjectName,
     totalMarks=subject.MarksObtained,subject.MaximumMarks,subject.Percentage,subject.Grade,subject.GradePoint,subject.Credits,status=subject.ResultStatus})});
  }
  return Ok(new{success=true,data=rows,page,pageSize,totalCount=groups.Count,totalPages=(int)Math.Ceiling((double)groups.Count/pageSize)});
 }
 [HttpGet("students/{studentId:long}/transcript")]
 public Task<IActionResult> Transcript(long studentId)=>throw CollegeDataScope.NotImplemented("Official transcript generation");
 [HttpPost("publish")] public Task<IActionResult> Publish([FromBody] JsonElement body)=>throw CollegeDataScope.NotImplemented("Institutional result publication");
 [HttpPost] public Task<IActionResult> Import([FromBody] JsonElement body)=>throw CollegeDataScope.NotImplemented("Result sheet import; use the examination result entry workflow");
 [HttpGet("publication-history")] public Task<IActionResult> PublicationHistory()=>throw CollegeDataScope.NotImplemented("Result publication history");
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>throw CollegeDataScope.NotImplemented("Supplemental official-result details; use the student/exam result endpoint");
 [HttpPost("{id:long}/approve")] public Task<IActionResult> Approve(long id)=>throw CollegeDataScope.NotImplemented("Institutional result approval");
 [HttpPost("{id:long}/revoke-publication")] public Task<IActionResult> Revoke(long id)=>throw CollegeDataScope.NotImplemented("Result publication revocation");
}
