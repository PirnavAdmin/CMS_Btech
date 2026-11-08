using System.Collections;
using BTech.Middleware;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Mvc.Filters;
using MySqlConnector;
using System.Text.Json;

namespace BTech.Filters;

/// <summary>Checks tenant references after model binding and before legacy actions execute.</summary>
public sealed class ForeignRecordScopeFilter(IConfiguration config) : IAsyncActionFilter
{
    private static readonly Dictionary<string, (string Table, string Key)> Entities = new(StringComparer.OrdinalIgnoreCase)
    {
        ["courseId"]=("courses","course_id"), ["branchId"]=("branches","branch_id"),
        ["semesterId"]=("semesters","semester_id"), ["sectionId"]=("sections","section_id"),
        ["academicYearId"]=("academicyears","academic_year_id"), ["departmentId"]=("departments","department_id"),
        ["studentId"]=("students","student_id"), ["facultyId"]=("faculty","faculty_id"),
        ["examId"]=("exams","exam_id"), ["admissionId"]=("studentadmissions","admission_id")
    };
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http=context.HttpContext;
        if (http.User.Identity?.IsAuthenticated != true || !http.Items.ContainsKey(ModulePermissionMiddleware.ActiveRolesItem))
        { await next(); return; }
        var scope=CollegeDataScope.Resolve(http);
        await CheckEmployeeRecord(context,scope);
        if(scope.HasValue)
        {
            // Legacy list actions often make collegeId optional. Supply the verified
            // tenant when omitted rather than allowing an unscoped repository query.
            foreach(var name in context.ActionArguments.Keys.ToList())
            {
                if(name.Equals("collegeId",StringComparison.OrdinalIgnoreCase)&&context.ActionArguments[name] is null)
                    context.ActionArguments[name]=scope.Value;
                var value=context.ActionArguments[name];
                var property=value?.GetType().GetProperty("CollegeId");
                if(property?.CanWrite==true&&property.PropertyType==typeof(long?)&&property.GetValue(value) is null)
                    property.SetValue(value,scope);
            }
        }
        var references=new HashSet<(string Name,long Id,bool Route)>();
        if(context.ActionArguments.TryGetValue("id",out var genericId))
        {
            var parts=(http.Request.Path.Value??"").Split('/',StringSplitOptions.RemoveEmptyEntries);
            var root=parts.Length>1&&parts[1].Equals("v1",StringComparison.OrdinalIgnoreCase)?2:1;
            var resource=parts.Length>root?parts[root].ToLowerInvariant():"";
            var key=resource switch { "courses" or "course"=>"courseId", "branches" or "branch"=>"branchId",
                "semester" or "semesters"=>"semesterId", "sections" or "section"=>"sectionId",
                "students" or "student"=>"studentId", "departments" or "department"=>"departmentId",
                "academic-years" or "academic-year"=>"academicYearId", _=>null };
            if(key!=null)Add(key,genericId,true);
        }
        foreach(var entry in context.ActionArguments)
        {
            Add(entry.Key,entry.Value,http.Request.RouteValues.ContainsKey(entry.Key));
            if(entry.Value is JsonElement json && json.ValueKind==JsonValueKind.Object)
                foreach(var prop in json.EnumerateObject())Add(prop.Name,prop.Value.ToString(),false);
            if(entry.Value is not null && entry.Value is not string && !entry.Value.GetType().IsPrimitive)
                foreach(var prop in entry.Value.GetType().GetProperties().Where(x=>x.CanRead&&x.GetIndexParameters().Length==0&&Entities.ContainsKey(x.Name)))
                    Add(prop.Name,prop.GetValue(entry.Value),false);
        }
        void Add(string name,object? value,bool route)
        {
            if(Entities.ContainsKey(name)&&long.TryParse(value?.ToString(),out var id)&&id>0)references.Add((name,id,route));
        }
        if(references.Count>0 && (scope.HasValue||CollegeDataScope.HasRole(http,"STUDENT")))
        {
            await using var sql=new MySqlConnection(config.GetConnectionString("DefaultConnection"));
            await sql.OpenAsync(http.RequestAborted);
            foreach(var item in references)
            {
                var (table,key)=Entities[item.Name];
                var ownerSql=table switch
                {
                    "semesters" => "SELECT c.college_id FROM semesters s JOIN courses c ON c.course_id=s.course_id WHERE s.semester_id=@id",
                    "branches" => "SELECT c.college_id FROM branches b JOIN courses c ON c.course_id=b.course_id WHERE b.branch_id=@id",
                    "studentadmissions" => "SELECT AcademicCollegeId FROM studentadmissions WHERE AdmissionId=@id",
                    _ => $"SELECT college_id FROM `{table}` WHERE `{key}`=@id"
                };
                var owner=await sql.ExecuteScalarAsync<long?>(new CommandDefinition(ownerSql,new{id=item.Id},cancellationToken:http.RequestAborted));
                if(!owner.HasValue || scope.HasValue&&owner!=scope)
                    throw new ContractException(item.Route?404:400,"RECORD_OUTSIDE_SCOPE",item.Route?"Record not found.":$"{item.Name} must identify a record in the authorized college.");
                if(item.Name.Equals("studentId",StringComparison.OrdinalIgnoreCase)&&CollegeDataScope.HasRole(http,"STUDENT"))
                {
                    var owns=await sql.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM students WHERE student_id=@id AND user_id=@actor AND deleted_at IS NULL",new{id=item.Id,actor=CollegeDataScope.Actor(http)},cancellationToken:http.RequestAborted));
                    if(owns!=1)throw new ContractException(404,"RECORD_NOT_FOUND","Record not found.");
                }
            }
        }
        await next();
    }

    private async Task CheckEmployeeRecord(ActionExecutingContext context,long? scope)
    {
        var http=context.HttpContext;var path=(http.Request.Path.Value??"").ToLowerInvariant();
        if(!path.StartsWith("/api/v1/faculty-attendance")&&!path.StartsWith("/api/v1/faculty-payroll")&&!path.StartsWith("/api/v1/faculty-leave"))return;
        var manage=new[]{"SUPER_ADMIN","COLLEGE_ADMIN","PRINCIPAL","HOD"}.Any(x=>CollegeDataScope.HasRole(http,x));
        if(!manage&&!HttpMethods.IsGet(http.Request.Method)&&
            (path.Contains("/policies")||path.Contains("/types")||path.EndsWith("/approve")||path.EndsWith("/reject")||path.Contains("payroll")))
            throw new ContractException(403,"EMPLOYEE_ADMIN_REQUIRED","An authorized employee administrator must perform this action.");
        string? query=null;object? id=null;bool employee=true;
        if(context.ActionArguments.TryGetValue("attendanceId",out id))
            query="SELECT f.college_id,f.user_id FROM faculty_attendance a JOIN faculty f ON f.faculty_id=a.faculty_id WHERE a.attendance_id=@id";
        else if(context.ActionArguments.TryGetValue("payrollId",out id))
            query="SELECT f.college_id,f.user_id FROM faculty_payroll p JOIN faculty f ON f.faculty_id=p.faculty_id WHERE p.payroll_id=@id";
        else if(path.StartsWith("/api/v1/faculty-leave")&&context.ActionArguments.TryGetValue("id",out id))
        {
            if(path.Contains("/requests/"))query="SELECT f.college_id,f.user_id FROM faculty_leave_requests r JOIN faculty f ON f.faculty_id=r.faculty_id WHERE r.leave_request_id=@id";
            else if(path.Contains("/policies/")){query="SELECT college_id,NULL user_id FROM faculty_leave_policies WHERE policy_id=@id";employee=false;}
            else if(path.Contains("/types/")){query="SELECT college_id,NULL user_id FROM faculty_leave_types WHERE leave_type_id=@id";employee=false;}
        }
        await using var c=new MySqlConnection(config.GetConnectionString("DefaultConnection"));
        if(query is not null)
        {
            var row=await c.QuerySingleOrDefaultAsync(new CommandDefinition(query,new{id},cancellationToken:http.RequestAborted));
            if(row is null || scope.HasValue && (long?)row.college_id!=scope || employee&&!manage&&(long?)row.user_id!=CollegeDataScope.Actor(http))
                throw new ContractException(404,"RECORD_NOT_FOUND","Record not found.");
        }
        if(!manage)
        {
            foreach(var value in context.ActionArguments.Values)
            {
                var faculty=value?.GetType().GetProperty("FacultyId")?.GetValue(value);
                if(faculty is not null&&long.TryParse(faculty.ToString(),out var facultyId)&&facultyId>0)
                {
                    var own=await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM faculty WHERE faculty_id=@facultyId AND user_id=@actor AND deleted_at IS NULL",new{facultyId,actor=CollegeDataScope.Actor(http)},cancellationToken:http.RequestAborted));
                    if(own!=1)throw new ContractException(403,"FACULTY_OWNERSHIP_REQUIRED","Use your own faculty record.");
                }
            }
        }
    }
}
