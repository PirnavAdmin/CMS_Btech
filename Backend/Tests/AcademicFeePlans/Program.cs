using System.Security.Claims;
using System.Text.Json;
using BTech.Data;
using BTech.DTOs.Fees;
using BTech.DTOs.StudentAdmission;
using BTech.DTOs.StudentAcademicDetails;
using BTech.Middleware;
using BTech.Repositories.Implementations;
using BTech.Services.Fees;
using BTech.Services.Implementations;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

// Run only on a disposable database restored from the supplied dump, with the fee SQL applied.
// No existing rows are edited. Test fixtures are retained for inspection in this disposable DB.
var passed = 0;
void Check(bool value, string name) { if (!value) throw new Exception("FAIL: " + name); passed++; Console.WriteLine("PASS: " + name); }
void Reject(Action action, int code, string name)
{
    try { action(); } catch (FeePlanException e) when (e.StatusCode == code) { Check(true, name); return; }
    throw new Exception("FAIL: expected rejection " + name);
}
async Task RejectAsync(Func<Task> action, int code, string name)
{
    try { await action(); } catch (FeePlanException e) when (e.StatusCode == code) { Check(true, name); return; }
    throw new Exception("FAIL: expected rejection " + name);
}
AcademicFeePlanRequest Valid() => new() { CollegeId=1, AcademicYearId=1, CourseId=1, BranchId=1, SemesterId=1,
    FeeCategoryId=1, Code="BTECH", Name="BTech semester fee", Batch="2026-2030", Quota="Management", StudentCategory="General",
    EffectiveFrom=DateTime.UtcNow.Date.AddDays(-10), EffectiveTo=DateTime.UtcNow.Date.AddDays(300),
    DueDate=DateTime.UtcNow.Date.AddDays(10), TotalAmount=0.30m,
    Components=new() { new() { Code="TUITION_FEE", Name="Tuition", Amount=0.10m }, new() { Code="ADMISSION_FEE", Name="Admission", Amount=0.20m } } };
var valid=Valid(); FeePlanRules.Validate(valid); Check(valid.Installments.Single().Amount==0.30m,"Decimal 0.10 + 0.20 equals 0.30 and full payment schedule is generated");
var invalid=Valid(); invalid.TotalAmount=0.31m; Reject(()=>FeePlanRules.Validate(invalid),400,"Component total mismatch rejected");
invalid=Valid(); invalid.Components[0].Amount=0.101m; Reject(()=>FeePlanRules.Validate(invalid),400,"Fractional paisa rejected");
invalid=Valid(); invalid.Components[0].Amount=-1; Reject(()=>FeePlanRules.Validate(invalid),400,"Negative fee rejected");
invalid=Valid(); invalid.Components[1].Code="tuition_fee"; Reject(()=>FeePlanRules.Validate(invalid),400,"Duplicate component codes rejected case insensitively");
invalid=Valid(); invalid.PaymentMode="INSTALLMENTS"; invalid.Installments=new() {new(){Number=1,Amount=0.10m,DueDate=invalid.DueDate!.Value},new(){Number=2,Amount=0.19m,DueDate=invalid.DueDate.Value}}; Reject(()=>FeePlanRules.Validate(invalid),400,"Installment total mismatch rejected");
invalid=Valid(); invalid.PaymentMode="INSTALLMENTS"; invalid.DueDate=null; invalid.Installments=new() {new(){Number=1,Amount=0.10m,DueDate=DateTime.UtcNow.Date.AddDays(5)},new(){Number=2,Amount=0.20m,DueDate=DateTime.UtcNow.Date.AddDays(10)}}; FeePlanRules.Validate(invalid); Check(invalid.DueDate==invalid.Installments[1].DueDate,"Exact decimal installment totals accepted");
invalid=Valid(); invalid.DueDate=invalid.EffectiveTo.AddDays(1); Reject(()=>FeePlanRules.Validate(invalid),400,"Due date outside effective period rejected");
invalid=Valid(); invalid.Components=null!; Reject(()=>FeePlanRules.Validate(invalid),400,"Null component array returns validation error");
invalid=Valid(); invalid.PaymentMode="INSTALLMENTS"; invalid.Installments=new(){null!,null!}; Reject(()=>FeePlanRules.Validate(invalid),400,"Null installment returns validation error");
Reject(()=>AdmissionFeePlanCoordinator.ReadSelectedId(new(){FormData=JsonSerializer.SerializeToElement(new{fees=new{feeStructureId="FS-STANDARD"}})}),400,"Browser local fee ID rejected");
Reject(()=>AdmissionFeePlanCoordinator.ReadSelectedId(new(){FeeStructureId=4,FormData=JsonSerializer.SerializeToElement(new{fees=new{structureId=5}})}),400,"Conflicting admission fee IDs rejected");
Check(AdmissionFeePlanCoordinator.ReadSelectedId(new(){FeeStructureId=4,FormData=JsonSerializer.SerializeToElement(new{fees=new{structureId="4"}})})==4,"Numeric server ID string alias accepted consistently");
var allowed=new HashSet<(string,string)>{("DRAFT","SUBMITTED"),("SUBMITTED","APPROVED"),("SUBMITTED","DRAFT"),("APPROVED","DRAFT"),("APPROVED","PUBLISHED"),("PUBLISHED","ARCHIVED"),("DRAFT","ARCHIVED"),("APPROVED","ARCHIVED")};
foreach(var a in FeePlanRules.States) foreach(var b in FeePlanRules.States)
{
    if(allowed.Contains((a,b))){FeePlanRules.Transition(a,b); Check(true,$"Transition {a} to {b} allowed");}
    else Reject(()=>FeePlanRules.Transition(a,b),409,$"Transition {a} to {b} rejected");
}
var q=FeePlanRules.Scope(Valid()); Check(FeePlanRules.Matches(Valid(),q),"Exact scope matches");
foreach(var field in new[]{"CollegeId","AcademicYearId","CourseId","BranchId","SemesterId"})
{
    var changed=FeePlanRules.Scope(Valid()); typeof(AdmissionFeePlanQuery).GetProperty(field)!.SetValue(changed,2L);
    Check(!FeePlanRules.Matches(Valid(),changed),field+" mismatch excluded");
}
q.Batch="2027-2031";Check(!FeePlanRules.Matches(Valid(),q),"Batch mismatch excluded");
q=FeePlanRules.Scope(Valid());q.Quota=null;Check(!FeePlanRules.Matches(Valid(),q),"Missing quota does not match quota-specific plan");
q=FeePlanRules.Scope(Valid());q.StudentCategory="Reserved";Check(!FeePlanRules.Matches(Valid(),q),"Category mismatch excluded");
var wildcard=Valid();wildcard.Quota=null;wildcard.StudentCategory=null;Check(FeePlanRules.Matches(wildcard,q),"Explicit unrestricted quota/category plan matches");

var cs=Environment.GetEnvironmentVariable("CMS_FEE_TEST_CONNECTION");
if(string.IsNullOrWhiteSpace(cs))
{
    Console.WriteLine($"{passed} rule tests passed. MySQL integration tests SKIPPED: set CMS_FEE_TEST_CONNECTION to a disposable dump clone.");
    return;
}
var builder=new MySqlConnectionStringBuilder(cs);
if(!builder.Database.Contains("test",StringComparison.OrdinalIgnoreCase))throw new Exception("Test safety check: database name must contain 'test'.");
await using var c=new MySqlConnection(cs);await c.OpenAsync();
var prefix="AFPTEST"+Guid.NewGuid().ToString("N")[..8];
async Task<long> Insert(string sql,object? args=null)=>await c.ExecuteScalarAsync<long>(sql+"; SELECT LAST_INSERT_ID();",args);
async Task<(long college,long year,long course,long branch,long semester,long semester2)> Setup(string suffix)
{
    var college=await Insert("INSERT INTO colleges(college_code,college_name) VALUES(@code,@name)",new{code=prefix+suffix,name="Fee integration test "+suffix});
    var year=await Insert("INSERT INTO academicyears(college_id,academic_year_name,start_date,end_date) VALUES(@college,'Fee test year',@start,@end)",new{college,start=DateTime.UtcNow.Date.AddDays(-30),end=DateTime.UtcNow.Date.AddDays(365)});
    var course=await Insert("INSERT INTO courses(college_id,course_code,course_name,duration_years,total_semesters) VALUES(@college,@code,'BTech',4,8)",new{college,code=prefix+suffix});
    var branch=await Insert("INSERT INTO branches(course_id,branch_code,branch_name) VALUES(@course,@code,'CSE')",new{course,code=prefix+suffix});
    async Task<long> Semester(int number)=>await Insert("INSERT INTO semesters(course_id,branch_id,semester_number,year_number,semester_name,academic_year_id) VALUES(@course,@branch,@number,1,@name,@year)",new{course,branch,number,name="Semester "+number,year});
    return(college,year,course,branch,await Semester(1),await Semester(2));
}
var aScope=await Setup("A");var bScope=await Setup("B");
var category=await Insert("INSERT INTO fee_categories(category_code,category_name) VALUES(@code,'Academic test')",new{code=prefix});
await c.ExecuteAsync("INSERT IGNORE INTO permission_modules(module_key,status) VALUES('fees',1),('student_admissions',1)");
async Task<(long user,long role)> User(long college,string roleCode,string suffix)
{
    var user=await Insert("INSERT INTO users(college_id,employee_user_id,full_name,password_hash) VALUES(@college,@id,'Fee test account','not-a-login-hash')",new{college,id=prefix+suffix});
    var role=await Insert("INSERT INTO roles(college_id,role_name,role_code) VALUES(@college,@name,@roleCode)",new{college,name=prefix+suffix,roleCode});
    await c.ExecuteAsync("INSERT INTO user_roles(user_id,role_id) VALUES(@user,@role); INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit) VALUES(@role,@college,'fees',1,1,1),(@role,@college,'student_admissions',1,1,1)",new{user,role,college});
    return(user,role);
}
var admin=await User(aScope.college,"COLLEGE_ADMIN","ADMIN");var editor=await User(aScope.college,"STAFF","STAFF");var adminB=await User(bScope.college,"COLLEGE_ADMIN","ADMINB");
var contextAccessor=new HttpContextAccessor();
void Login(long user,long college)
{
    var context=new DefaultHttpContext();
    // Deliberately stale elevated claim: live database roles must still control approval.
    context.User=new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim(ClaimTypes.NameIdentifier,user.ToString()),new Claim(ClaimTypes.Role,"SUPER_ADMIN")},"IntegrationTests"));
    context.Items[ModulePermissionMiddleware.CurrentCollegeItem]=college;contextAccessor.HttpContext=context;
}
Login(admin.user,aScope.college);
var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:DefaultConnection",cs}}).Build();
var access=new FeePlanAccess(contextAccessor);var service=new AcademicFeePlanService(config,access,NullLogger<AcademicFeePlanService>.Instance);
AcademicFeePlanRequest Scoped(string code)
{
    var p=Valid();p.CollegeId=aScope.college;p.AcademicYearId=aScope.year;p.CourseId=aScope.course;p.BranchId=aScope.branch;p.SemesterId=aScope.semester;p.FeeCategoryId=category;p.Code=prefix+code;return p;
}
var request=Scoped("PLAN");var plan=await service.SaveAsync(request);
Check(plan.FeeStructureId>0&&plan.Status=="DRAFT"&&plan.Revision==1,"Draft persisted with server fee_structure_id");
var picker=FeePlanRules.Scope(plan);
Check((await service.PickerAsync(picker)).Count==0,"Draft hidden from admission picker");
await RejectAsync(()=>service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"PUBLISHED",new(){ExpectedRevision=1}),409,"Draft publication bypass rejected in service");
plan=await service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"SUBMITTED",new(){ExpectedRevision=1});
Check((await service.PickerAsync(picker)).Count==0,"Submitted hidden from admission picker");
Login(editor.user,aScope.college);
await RejectAsync(()=>service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"APPROVED",new(){ExpectedRevision=plan.Revision}),403,"Staff with stale Super Admin JWT claim cannot approve");
Login(admin.user,aScope.college);
plan=await service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"APPROVED",new(){ExpectedRevision=plan.Revision});
await RejectAsync(()=>service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"DRAFT",new(){ExpectedRevision=plan.Revision}),400,"Return to draft requires reason");
Check((await service.PickerAsync(picker)).Count==0,"Approved unpublished plan hidden from picker");
plan=await service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"PUBLISHED",new(){ExpectedRevision=plan.Revision});
var choices=await service.PickerAsync(picker);Check(choices.Count==1&&choices[0].Components.Count==2&&choices[0].Installments.Count==1,"Picker returns published component breakdown and schedule");
var mismatch=FeePlanRules.Scope(plan);mismatch.Batch="different";Check((await service.PickerAsync(mismatch)).Count==0,"Database picker excludes mismatched batch");
mismatch=FeePlanRules.Scope(plan);mismatch.Quota="different";Check((await service.PickerAsync(mismatch)).Count==0,"Database picker excludes mismatched quota");
mismatch=FeePlanRules.Scope(plan);mismatch.StudentCategory="different";Check((await service.PickerAsync(mismatch)).Count==0,"Database picker excludes mismatched category");
await RejectAsync(()=>service.GetAsync(plan.FeeStructureId,bScope.college),403,"Cross-college plan query forbidden");
await RejectAsync(()=>service.PickerAsync(new(){CollegeId=bScope.college,AcademicYearId=bScope.year,CourseId=bScope.course,BranchId=bScope.branch,SemesterId=bScope.semester,Batch=plan.Batch}),403,"Cross-college picker forbidden");
Login(adminB.user,bScope.college);await RejectAsync(()=>service.GetAsync(plan.FeeStructureId,bScope.college),404,"Owned-college lookup cannot return another college's record");
Login(admin.user,aScope.college);
request.ExpectedRevision=plan.Revision;await RejectAsync(()=>service.SaveAsync(request,plan.FeeStructureId),409,"Published plan cannot be edited");
await RejectAsync(()=>FeePlanLegacyGuard.EnsureLegacyStructureAsync(c,plan.FeeStructureId),409,"Legacy fee-structure routes cannot edit managed plans");
var options=new DbContextOptionsBuilder<ApplicationDbContext>().UseMySql(cs,new MySqlServerVersion(new Version(8,0,46))).Options;
await using var db=new ApplicationDbContext(options);
var coordinator=new AdmissionFeePlanCoordinator(db,access);
var admissions=new StudentAdmissionService(new StudentAdmissionRepository(db),new StudentAcademicDetailsRepository(db),db,coordinator);
CreateStudentAdmissionDto Admission(string suffix)=>new(){RegistrationNo=prefix+suffix,FirstName="Fee",LastName="Test",Gender="Other",DateOfBirth=new DateTime(2005,1,1),CollegeId=aScope.college,AcademicYearId=aScope.year,CourseId=aScope.course,BranchId=aScope.branch,SemesterId=aScope.semester,Batch=plan.Batch,AdmissionQuota=plan.Quota,StudentCategory=plan.StudentCategory,FeeStructureId=plan.FeeStructureId,FeePlanVersion=1};
var before=await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM studentadmissions");
var bad=Admission("BAD");bad.Batch="wrong";
await RejectAsync(()=>admissions.CreateAsync(bad,admin.user),400,"Mismatching selected plan rejects admission save");
Check(before==await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM studentadmissions"),"Rejected fee assignment rolls back admission row");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM student_admission_form_data f LEFT JOIN studentadmissions a ON a.AdmissionId=f.admission_id WHERE a.AdmissionId IS NULL")==0,"Rejected save leaves no orphan form data");
var dto=Admission("OK");dto.FormData=JsonSerializer.SerializeToElement(new{fees=new{feeStructureId=plan.FeeStructureId,totalFee=9999,components=new[]{new{code="FAKE",amount=9999}}}});
var saved=await admissions.CreateAsync(dto,admin.user);
Check(saved.FeeStructureId==plan.FeeStructureId&&saved.AcademicFeePlan!.Plan.TotalAmount==0.30m,"Admission atomically stores selected server ID and authoritative decimal snapshot");
Check(saved.FormData!.Value.GetProperty("fees").GetProperty("totalFee").GetDecimal()==0.30m,"Client fee totals overwritten with server snapshot");
await RejectAsync(()=>FeePlanLegacyGuard.EnsureNoSnapshotAsync(c,saved.AdmissionId),409,"Manual fee resolver cannot overwrite snapshot-backed admission");
var academicService=new StudentAcademicDetailsService(new StudentAcademicDetailsRepository(db),db,coordinator);
await RejectAsync(()=>academicService.UpdateAsync(saved.AdmissionId,new UpdateStudentAcademicDetailsDto{Batch="changed"},admin.user),409,"Separate academic endpoint cannot invalidate assigned snapshot");
Check(await c.ExecuteScalarAsync<string>("SELECT Batch FROM studentadmissions WHERE AdmissionId=@id",new{id=saved.AdmissionId})==plan.Batch,"Conflicting academic update rolls back");
var next=Scoped("PLAN");next.PreviousFeeStructureId=plan.FeeStructureId;next.TotalAmount=0.40m;next.Components[1].Amount=0.30m;
var version2=await service.SaveAsync(next);Check(version2.Version==2&&version2.FeeStructureId!=plan.FeeStructureId,"New version gets distinct server ID");
version2=await service.TransitionAsync(version2.FeeStructureId,version2.CollegeId,"SUBMITTED",new(){ExpectedRevision=version2.Revision});
version2=await service.TransitionAsync(version2.FeeStructureId,version2.CollegeId,"APPROVED",new(){ExpectedRevision=version2.Revision});
await RejectAsync(()=>service.TransitionAsync(version2.FeeStructureId,version2.CollegeId,"PUBLISHED",new(){ExpectedRevision=version2.Revision}),409,"Overlapping publication of same plan lineage rejected");
plan=await service.TransitionAsync(plan.FeeStructureId,plan.CollegeId,"ARCHIVED",new(){ExpectedRevision=plan.Revision});
version2=await service.TransitionAsync(version2.FeeStructureId,version2.CollegeId,"PUBLISHED",new(){ExpectedRevision=version2.Revision});
Check((await coordinator.GetAuthorizedAsync(saved.AdmissionId))!.Plan.TotalAmount==0.30m,"Existing admission snapshot unchanged after new plan version publication");
var update=new UpdateStudentAdmissionDto{FirstName="Fee updated",Gender="Other",DateOfBirth=new DateTime(2005,1,1)};
var updated=await admissions.UpdateAsync(saved.AdmissionId,update,admin.user);
Check(updated!.AcademicFeePlan!.Plan.TotalAmount==0.30m&&updated.FeeStructureId==plan.FeeStructureId,"Repeated admission save preserves original archived-source snapshot");
var replace=new UpdateStudentAdmissionDto{FirstName="Fee updated",Gender="Other",DateOfBirth=new DateTime(2005,1,1),FeeStructureId=version2.FeeStructureId};
await RejectAsync(()=>admissions.UpdateAsync(saved.AdmissionId,replace,admin.user),400,"Plan replacement requires explicit reason");
replace.FeePlanChangeReason="Applicant changed fee option";
var replaced=await admissions.UpdateAsync(saved.AdmissionId,replace,admin.user);
Check(replaced!.AcademicFeePlan!.Plan.TotalAmount==0.40m&&replaced.FeeStructureId==version2.FeeStructureId,"Explicit draft reassignment creates fresh snapshot");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admission_fee_plan_audit WHERE admission_id=@id",new{id=saved.AdmissionId})==2,"Assignment and reassignment history persisted");
Login(adminB.user,bScope.college);await RejectAsync(()=>coordinator.GetAuthorizedAsync(saved.AdmissionId),403,"Admission snapshot inaccessible from another college");Login(admin.user,aScope.college);
var draftRequest=Scoped("EDIT");var editable=await service.SaveAsync(draftRequest);draftRequest.ExpectedRevision=editable.Revision;draftRequest.Name="Edited plan";
editable=await service.SaveAsync(draftRequest,editable.FeeStructureId);
await RejectAsync(()=>service.SaveAsync(draftRequest,editable.FeeStructureId),409,"Stale draft revision rejected");
Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM academic_fee_plan_audit WHERE fee_structure_id=@id",new{id=editable.FeeStructureId})==2,"Draft edit audit persisted atomically");
await c.ExecuteAsync("UPDATE role_permissions SET can_edit=0 WHERE role_id=@role AND module_key='fees' AND college_id=@college",new{role=admin.role,college=aScope.college});
await RejectAsync(()=>service.TransitionAsync(editable.FeeStructureId,editable.CollegeId,"SUBMITTED",new(){ExpectedRevision=editable.Revision}),403,"Live permission revocation blocks existing session");
await c.ExecuteAsync("UPDATE role_permissions SET can_edit=1 WHERE role_id=@role AND module_key='fees' AND college_id=@college",new{role=admin.role,college=aScope.college});
Console.WriteLine($"SUCCESS: {passed} tests passed, including real MySQL service/repository admission transactions.");
