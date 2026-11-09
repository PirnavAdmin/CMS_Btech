using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using System.Net.Http.Json;
using System.Data;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using BTech.Controllers.V1;
using BTech.DTOs.MarksManagement;
using BTech.Middleware;
using BTech.Repositories.Implementations;
using BTech.Repositories.Interfaces;
using BTech.Services.Implementations;
using BTech.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

var cs=Environment.GetEnvironmentVariable("CMS_MARKS_TEST_CONNECTION");
if(string.IsNullOrWhiteSpace(cs)) throw new Exception("Set CMS_MARKS_TEST_CONNECTION to an isolated restored MySQL 8 dump with Marks_Soft_Removal_20261101.sql applied.");
if(!new MySqlConnectionStringBuilder(cs).Database.Contains("test",StringComparison.OrdinalIgnoreCase)) throw new Exception("Safety check: database name must contain test.");
await using var c=new MySqlConnection(cs);await c.OpenAsync();
int passed=0;
void Check(bool condition,string message){if(!condition)throw new Exception("FAIL: "+message);passed++;Console.WriteLine("PASS: "+message);}
async Task<long> Insert(string sql,object? args=null)=>await c.ExecuteScalarAsync<long>(sql+"; SELECT LAST_INSERT_ID();",args);
var prefix="MR"+Guid.NewGuid().ToString("N")[..10];
var college=await Insert("INSERT INTO colleges(college_code,college_name) VALUES(@prefix,'Marks removal test')",new{prefix});
var otherCollege=await Insert("INSERT INTO colleges(college_code,college_name) VALUES(@code,'Other marks test')",new{code=prefix+"B"});
var year=await Insert("INSERT INTO academicyears(college_id,academic_year_name,start_date,end_date) VALUES(@college,@prefix,'2026-01-01','2027-12-31')",new{college,prefix});
var department=await Insert("INSERT INTO departments(college_id,department_code,department_name) VALUES(@college,@prefix,'Marks test department')",new{college,prefix});
var course=await Insert("INSERT INTO courses(college_id,course_code,course_name,duration_years,total_semesters) VALUES(@college,@prefix,'Marks test course',4,8)",new{college,prefix});
var branch=await Insert("INSERT INTO branches(course_id,department_id,branch_code,branch_name) VALUES(@course,@department,@prefix,'Marks test branch')",new{course,department,prefix});
var semester=await Insert("INSERT INTO semesters(course_id,branch_id,semester_number,year_number,semester_name,academic_year_id) VALUES(@course,@branch,1,1,'Marks test semester',@year)",new{course,branch,year});
var subject=await Insert("INSERT INTO subjects(subject_code,subject_name) VALUES(@prefix,'Marks test subject')",new{prefix});
await c.ExecuteAsync("INSERT INTO subject_course_branches(subject_id,course_id,branch_id) VALUES(@subject,@course,@branch); INSERT INTO subject_semester_assignments(subject_id,semester_id) VALUES(@subject,@semester)",new{subject,course,branch,semester});
var examType=await c.ExecuteScalarAsync<long>("SELECT exam_type_id FROM exam_types LIMIT 1");
var exam=await Insert("INSERT INTO exams(college_id,academic_year_id,course_id,branch_id,semester_id,exam_type_id,exam_code,exam_name,start_date,end_date) VALUES(@college,@year,@course,@branch,@semester,@examType,@prefix,@prefix,'2026-01-01','2027-12-31')",new{college,year,course,branch,semester,examType,prefix});
var student=await Insert("INSERT INTO students(college_id,student_code,full_name,academic_year_id,course_id,branch_id) VALUES(@college,@prefix,'Marks test student',@year,@course,@branch)",new{college,prefix,year,course,branch});
await c.ExecuteAsync("INSERT IGNORE INTO permission_modules(module_key,status) VALUES('marks',1)");
async Task<(long id,long role)> Account(string suffix,string roleCode,long scope)
{
 var id=await Insert("INSERT INTO users(college_id,employee_user_id,full_name,password_hash) VALUES(@scope,@code,'Marks test account','not-a-login-hash')",new{scope,code=prefix+suffix});
 var role=await c.ExecuteScalarAsync<long?>("SELECT role_id FROM roles WHERE college_id=@scope AND role_code=@roleCode",new{scope,roleCode})
     ?? await Insert("INSERT INTO roles(college_id,role_name,role_code) VALUES(@scope,@code,@roleCode)",new{scope,code=prefix+suffix,roleCode});
 await c.ExecuteAsync("INSERT INTO user_roles(user_id,role_id) VALUES(@id,@role); INSERT IGNORE INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export) VALUES(@role,@scope,'marks',1,1,1,1,1)",new{id,role,scope});
 return(id,role);
}
var admin=await Account("ADMIN","COLLEGE_ADMIN",college);
var faculty=await Account("FAC","FACULTY",college);
var wrongOwner=await Account("OTHER","FACULTY",college);
var outsider=await Account("OUT","COLLEGE_ADMIN",otherCollege);
var staff=await Account("STAFF","STAFF",college);
var super=await Account("SUPER","SUPER_ADMIN",college);
var ep=await Insert("INSERT INTO employee_profiles(user_id,department_id) VALUES(@id,@department)",new{id=faculty.id,department});
var facultyId=await Insert("INSERT INTO faculty(user_id,employee_profile_id,college_id,department_id,faculty_code,faculty_name) VALUES(@id,@ep,@college,@department,@prefix,'Marks test faculty')",new{id=faculty.id,ep,college,department,prefix});
var allocation=await Insert("INSERT INTO faculty_subject_allocations(faculty_id,course_id,branch_id,semester_id,subject_id,academic_year_id) VALUES(@facultyId,@course,@branch,@semester,@subject,@year)",new{facultyId,course,branch,semester,subject,year});
var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:DefaultConnection",cs}}).Build();
var repo=new MarksRepository(config,NullLogger<MarksRepository>.Instance);
var service=new MarksService(repo);
MarkEntryRequest Entry()=>new(){ExamId=exam,StudentId=student,SubjectId=subject,MaxMarks=100,MarksObtained=73};
var mark=await service.AddAsync(Entry(),faculty.id,college,false);
var original=mark.MarkId;

// Use the production controller, service, repository, JWT authorization and live permission middleware.
var key=new SymmetricSecurityKey(Encoding.UTF8.GetBytes("MarksRemovalTestsOnly_Secret_Key_12345678901234567890"));
var builder=WebApplication.CreateBuilder(new WebApplicationOptions{ApplicationName=typeof(MarksController).Assembly.FullName});
builder.Logging.ClearProviders();builder.Configuration.AddConfiguration(config);
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddControllers().AddApplicationPart(typeof(MarksController).Assembly);
builder.Services.AddSingleton<IMarksRepository>(repo);builder.Services.AddSingleton<IMarksService>(service);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>o.TokenValidationParameters=new(){ValidateIssuer=false,ValidateAudience=false,ValidateIssuerSigningKey=true,IssuerSigningKey=key,ValidateLifetime=true});
builder.Services.AddAuthorization();
await using var app=builder.Build();app.UseRouting();app.UseAuthentication();app.UseMiddleware<ModulePermissionMiddleware>();app.UseAuthorization();app.MapControllers();await app.StartAsync();
var address=app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
using var client=new HttpClient{BaseAddress=new Uri(address)};
string Token(long id,long scope,string role)=>new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(claims:new[]{new Claim(ClaimTypes.NameIdentifier,id.ToString()),new Claim("collegeId",scope.ToString()),new Claim(ClaimTypes.Role,role)},expires:DateTime.UtcNow.AddMinutes(10),signingCredentials:new(key,SecurityAlgorithms.HmacSha256)));
async Task<(int status,JsonElement body)> Request(HttpMethod method,string path,long? actor=null,long? scope=null,string role="FACULTY",object? body=null)
{
 using var request=new HttpRequestMessage(method,path);
 if(actor.HasValue)request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",Token(actor.Value,scope??college,role));
 if(body!=null)request.Content=JsonContent.Create(body);
 using var response=await client.SendAsync(request);var text=await response.Content.ReadAsStringAsync();
 return((int)response.StatusCode,string.IsNullOrWhiteSpace(text)?default:JsonSerializer.Deserialize<JsonElement>(text));
}
async Task ExpectDelete(int status,long id,long? actor,long? scope=null,string role="FACULTY")
{
 var result=await Request(HttpMethod.Delete,$"/api/v1/marks/{id}",actor,scope,role);
 Check(result.status==status,$"DELETE expects {status}, received {result.status}: "+(result.status==status?"authorized/status check":result.body.ToString()));
}
await ExpectDelete(401,original,null);
await ExpectDelete(403,original,staff.id,college,"STAFF");
await ExpectDelete(403,original,wrongOwner.id);
await ExpectDelete(404,original,outsider.id,otherCollege,"COLLEGE_ADMIN");
await ExpectDelete(404,long.MaxValue,faculty.id);
await ExpectDelete(400,0,faculty.id);
await c.ExecuteAsync("UPDATE role_permissions SET can_delete=0 WHERE role_id=@role",new{role=faculty.role});
await ExpectDelete(403,original,faculty.id);
await c.ExecuteAsync("UPDATE role_permissions SET can_delete=1 WHERE role_id=@role; UPDATE user_roles SET status=0 WHERE user_id=@id",new{role=faculty.role,id=faculty.id});
await ExpectDelete(403,original,faculty.id);
await c.ExecuteAsync("UPDATE user_roles SET status=1 WHERE user_id=@id; UPDATE roles SET status=0 WHERE role_id=@role",new{id=faculty.id,role=faculty.role});
await ExpectDelete(403,original,faculty.id);
await c.ExecuteAsync("UPDATE roles SET status=1 WHERE role_id=@role; UPDATE faculty_subject_allocations SET status=0 WHERE allocation_id=@allocation",new{role=faculty.role,allocation});
await ExpectDelete(403,original,faculty.id);
await c.ExecuteAsync("UPDATE faculty_subject_allocations SET status=1,academic_year_id=NULL WHERE allocation_id=@allocation",new{allocation});
await ExpectDelete(403,original,faculty.id);
await c.ExecuteAsync("UPDATE faculty_subject_allocations SET academic_year_id=@year WHERE allocation_id=@allocation",new{year,allocation});
Check(await c.ExecuteScalarAsync<int>("SELECT status FROM student_marks WHERE mark_id=@original",new{original})==1,"Denied removals leave the mark active");
foreach(var status in new[]{"SUBMITTED","APPROVED"})
{
 await c.ExecuteAsync("UPDATE student_marks SET workflow_status=@status WHERE mark_id=@original",new{status,original});
 var denied=await Request(HttpMethod.Delete,$"/api/v1/marks/{original}",admin.id,college,"COLLEGE_ADMIN");
 Check(denied.status==409&&denied.body.GetProperty("code").GetString()=="MARK_DELETE_CONFLICT",status+" removal returns clear 409 conflict");
}
await c.ExecuteAsync("UPDATE student_marks SET workflow_status='DRAFT' WHERE mark_id=@original",new{original});
var removed=await Request(HttpMethod.Delete,$"/api/v1/marks/{original}",faculty.id);
Check(removed.status==200&&removed.body.GetProperty("success").GetBoolean(),"Allocated owner removes a draft through the authenticated API");
var data=removed.body.GetProperty("data");
Check(data.GetProperty("markId").GetInt64()==original&&data.GetProperty("removed").GetBoolean()&&data.GetProperty("removedBy").GetInt64()==faculty.id&&data.GetProperty("removedAt").GetString()!.EndsWith('Z'),"Removal response exposes ID, actor and UTC timestamp");
await ExpectDelete(404,original,faculty.id);
Check((await Request(HttpMethod.Get,$"/api/v1/marks/{original}",faculty.id)).status==404,"Removed detail returns 404");
Check((await service.ListAsync(new(){ExamId=exam},college,false)).Count==0,"Removed marks are absent from list");
foreach(var format in new[]{"csv","json","xlsx"})
{
 using var req=new HttpRequestMessage(HttpMethod.Get,$"/api/v1/marks/download?examId={exam}&format={format}");req.Headers.Authorization=new("Bearer",Token(faculty.id,college,"FACULTY"));
 using var response=await client.SendAsync(req);Check(response.IsSuccessStatusCode,"Removed mark export succeeds: "+format);
 if(format=="json")Check(JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync()).GetArrayLength()==0,"JSON export excludes removed mark");
 if(format=="csv")Check((await response.Content.ReadAsStringAsync()).Split('\n',StringSplitOptions.RemoveEmptyEntries).Length==1,"CSV export contains header only after removal");
 if(format=="xlsx")
 {
  using var ms=new MemoryStream(await response.Content.ReadAsByteArrayAsync());using var wb=new ClosedXML.Excel.XLWorkbook(ms);
  Check(wb.Worksheets.First().LastRowUsed()!.RowNumber()==1,"Excel export contains header only after removal");
 }
}
var filter=new MarksReportFilter{ExamId=exam,StudentId=student};
Check((await service.GetSummaryReportAsync(filter,college,false)).EnteredEntries==0,"Summary excludes removed marks");
Check((await service.GetSubjectReportAsync(filter,college,false)).Count==0,"Subject report excludes removed marks");
Check((await service.GetStudentReportAsync(filter,college,false)).Subjects.Count==0,"Student report excludes removed marks");
Check((await service.PendingApprovalsAsync(exam,null,null,college,false,admin.id)).Count==0,"Removed marks are absent from approval queue");
var history=await service.ApprovalHistoryAsync(original,college,false,faculty.id);
Check(history.Single().ToStatus=="REMOVED"&&history.Single().FromStatus=="DRAFT"&&history.Single().ActionBy==faculty.id,"Draft removal retains an attributed history event");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM marks_approvals WHERE mark_id=@original",new{original})==1,"Approval row retained after removal");
var previewRequest=new BulkUploadPreviewRequest{ExamId=exam,Rows=new(){new(){StudentCode=prefix,SubjectCode=prefix,MarksObtained=72,MaxMarks=100}}};
var preview=await service.BulkPreviewAsync(previewRequest,college,false);
Check(preview.ValidRows==1&&preview.RejectedRows==0&&preview.Errors.Count==0,"Bulk preview ignores removed duplicates");
var reentry=await service.AddAsync(Entry(),faculty.id,college,false);
Check(reentry.MarkId!=original,"Same student/subject/exam re-entry receives a new active mark ID");
var duplicate=await Request(HttpMethod.Post,"/api/v1/marks",faculty.id,college,"FACULTY",Entry());
Check(duplicate.status==409,"Duplicate active single entry returns conflict");
try{await c.ExecuteAsync("INSERT INTO student_marks(college_id,student_id,subject_id,exam_id,exam_name,max_marks,marks_obtained) VALUES(@college,@student,@subject,@exam,@prefix,100,50)",new{college,student,subject,exam,prefix});throw new Exception("Duplicate database insert accepted");}
catch(MySqlException e)when(e.Number==1062){Check(true,"Database unique keys prohibit duplicate active marks independently of API checks");}
await c.ExecuteAsync("UPDATE student_marks SET workflow_status='REJECTED' WHERE mark_id=@id; UPDATE marks_approvals SET approval_status='REJECTED',remarks='Prior review' WHERE mark_id=@id; INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,remarks) VALUES(@id,'SUBMITTED','REJECTED',@actor,'Prior review')",new{id=reentry.MarkId,actor=admin.id});
await ExpectDelete(200,reentry.MarkId,admin.id,college,"COLLEGE_ADMIN");
Check((await service.ApprovalHistoryAsync(reentry.MarkId,college,false,admin.id)).Count==2,"Rejected mark keeps prior review and appends removal history");
Check(await c.ExecuteScalarAsync<string>("SELECT remarks FROM marks_approvals WHERE mark_id=@id",new{id=reentry.MarkId})=="Prior review","Removal preserves approval remarks");
var upload=await service.BulkUploadAsync(new(){ExamId=exam,Rows=previewRequest.Rows},faculty.id,college,false);
Check(upload.InsertedRows==1&&upload.RejectedRows==0,"Bulk upload permits fresh entry after two removals");
var active=(await service.ListAsync(new(){ExamId=exam},college,false)).Single();
await ExpectDelete(200,active.MarkId,super.id,otherCollege,"SUPER_ADMIN");
var upsert=await service.BulkUploadAsync(new(){ExamId=exam,Rows=previewRequest.Rows,UpsertDrafts=true},faculty.id,college,false);
Check(upsert.InsertedRows==1&&upsert.UpdatedRows==0,"Bulk upsert creates a fresh mark without resurrecting removed marks");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM student_marks WHERE exam_id=@exam AND status=0",new{exam})==3,"All three tombstones remain intact");
active=(await service.ListAsync(new(){ExamId=exam},college,false)).Single();
var results=await Task.WhenAll(Request(HttpMethod.Delete,$"/api/v1/marks/{active.MarkId}",faculty.id),Request(HttpMethod.Delete,$"/api/v1/marks/{active.MarkId}",faculty.id));
Check(results.Select(x=>x.status).Order().SequenceEqual(new[]{200,404}),"Concurrent deletions produce one success and one not-found");
var attempts=await Task.WhenAll(Request(HttpMethod.Post,"/api/v1/marks",faculty.id,college,"FACULTY",Entry()),Request(HttpMethod.Post,"/api/v1/marks",faculty.id,college,"FACULTY",Entry()));
Check(attempts.Select(x=>x.status).Order().SequenceEqual(new[]{201,409}),"Concurrent re-entry creates exactly one active mark");
active=(await service.ListAsync(new(){ExamId=exam},college,false)).Single();
var race=await Task.WhenAll(Request(HttpMethod.Delete,$"/api/v1/marks/{active.MarkId}",faculty.id),Request(HttpMethod.Post,"/api/v1/marks/workflow/submit",faculty.id,college,"FACULTY",new{examId=exam,markIds=new[]{active.MarkId}}));
Check((race[0].status==200&&race[1].status==404)||(race[0].status==409&&race[1].status==200),"Submit/delete race preserves one valid terminal result");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM student_marks WHERE exam_id=@exam AND status=1",new{exam})<=1,"At most one active mark survives all concurrent writes");
await app.StopAsync();
Console.WriteLine($"{passed} marks removal tests passed.");
