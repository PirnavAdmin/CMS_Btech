using System.Data;
using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

public sealed class ScreenExportQuery
{
    public string Format { get; set; } = "csv";
    public string? Search { get; set; }
    public string? Status { get; set; }
    public long? CollegeId { get; set; }
    public long? DepartmentId { get; set; }
    public long? CourseId { get; set; }
    public long? BranchId { get; set; }
    public long? SemesterId { get; set; }
    public long? AcademicYearId { get; set; }
}

[ApiController]
[Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
[Route("api/v1/exports")]
public sealed class ScreenExportsController(IConfiguration configuration, ILogger<ScreenExportsController> logger) : ControllerBase
{
    private static readonly Dictionary<string, string[]> Catalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["colleges"] = new[] { "CollegeId","CollegeCode","CollegeName","CollegeType","UniversityName","Email","Mobile","Phone","Principal","PrincipalEmail","PrincipalContact","AlternateContactNumber","AccreditationStatus","AccreditationBody","AccreditationGrade","AccreditationNumber","ValidFrom","ValidUntil","AddressLine1","AddressLine2","City","Area","District","State","Country","Pincode","Website","AcademicYearId","Timezone","CurrencyCode","LogoPath","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy" },
        ["college-settings"] = new[] { "CollegeSettingId","CollegeId","CollegeName","CollegeCode","CollegeEmail","PhoneNumber","Website","AddressLine1","AddressLine2","City","State","Pincode","AcademicYear","Semester","InstitutionType","DateFormat","TimeZone","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy" },
        ["academic-years"] = new[] { "AcademicYearId","AcademicYearName","StartDate","EndDate","Status","IsArchived","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","ActiveGuard" },
        ["academic-levels"] = new[] { "AcademicLevelId","AcademicYearId","LevelType","LevelName","LevelNumber","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy" },
        ["departments"] = new[] { "DepartmentId","CollegeId","DepartmentCode","DepartmentName","Description","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","HodUserId","CollegeName" },
        ["courses"] = new[] { "CourseId","CollegeId","DepartmentId","CourseCode","CourseName","CourseShortName","CourseType","DurationYears","TotalSemesters","Eligibility","Description","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","DepartmentName" },
        ["branches"] = new[] { "BranchId","CourseId","BranchCode","BranchName","ShortName","Specialization","DepartmentId","BranchType","Duration","TotalSemesters","IntakeCapacity","StartingAcademicYearId","Description","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","CollegeId","CourseName","DepartmentName" },
        ["semesters"] = new[] { "SemesterId","CourseId","BranchId","SemesterNumber","YearNumber","SemesterName","Status","IsArchived","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","AcademicYearId","StartDate","EndDate","CollegeId","CourseName","DepartmentId","BranchName" },
        ["sections"] = new[] { "SectionId","CollegeId","AcademicYearId","DepartmentId","CourseId","BranchId","Semester","SemesterId","SectionCode","SectionName","Capacity","ClassTeacherEmployeeProfileId","Room","Shift","SectionType","Status","IsArchived","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy" },
        ["course-structures"] = new[] { "StructureId","CourseId","BranchId","YearNumber","SemesterNumber","SemesterName","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","CollegeId","CourseName" },
        ["students"] = new[] { "StudentId","AdmissionId","CollegeId","StudentCode","FullName","Gender","DateOfBirth","Email","Mobile","BloodGroup","Address","CourseId","BranchId","AcademicYearId","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","CourseName","DepartmentId","BranchName" },
        ["student-profiles"] = new[] { "PermanentCountry","PermanentState","PermanentDistrict","PermanentCity","PermanentPincode","PermanentAddress","PermanentHouseNumber","HouseNumber","StudentProfileId","StudentId","AlternateEmail","AlternateMobile","BloodGroup","Nationality","Religion","Category","Address","City","District","State","Country","Pincode","ProfileStatus","IsProfileCompleted","IsVerified","VerifiedBy","VerifiedAt","ProfileCompletionPercentage","Remarks","IsActive","IsDeleted","CreatedBy","CreatedAt","UpdatedBy","UpdatedAt","DeletedBy","DeletedAt","CollegeId","FullName","CourseId","BranchId","AcademicYearId" },
        ["student-admissions"] = new[] { "AdmissionId","RegistrationNo","AdmissionNo","FirstName","LastName","Gender","DateOfBirth","StudentEmail","MobileNumber","AdmissionType","EntryType","Regulation","Batch","Status","AcademicYearId","AcademicYearName","CollegeId","CollegeName","DepartmentId","DepartmentName","CourseId","CourseName","BranchId","BranchName","SemesterId","SemesterName","SectionId","SectionName","IsActive","CreatedAt","UpdatedAt" },
        ["promotions"] = new[] { "PromotionId","StudentId","FromAcademicYearId","ToAcademicYearId","FromCourseId","ToCourseId","FromBranchId","ToBranchId","FromSemester","ToSemester","PromotionStatus","Decision","DecisionDate","DecisionBy","Remarks","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","CollegeId","FromSectionId","ToSectionId","AttendancePercentage","TotalMarks","ObtainedMarks","MarksPercentage","PassedSubjects","FailedSubjects","BacklogCount","PromotionEligibility","EligibilityRemarks","PromotionType","PromotionDate","EffectiveDate","PromotionReason","RejectionReason","ApprovedAt","IsFinal","PromotionOrder","IsActive","StudentName" },
        ["users"] = new[] { "UserId","CollegeId","EmployeeUserId","FullName","Email","Mobile","Status","CreatedAt","UpdatedAt" },
        ["roles"] = new[] { "RoleId","RoleName","RoleCode","Description","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy" },
        ["faculty"] = new[] { "EmployeeProfileId","UserId","DepartmentId","Designation","Status","CreatedAt","UpdatedAt","CollegeId","FullName","EmployeeUserId" },
        ["fee-structures"] = new[] { "FeeMasterId","AcademicYearId","DepartmentId","CourseId","BranchId","SemesterId","AdmissionType","Quota","StudentCategory","TuitionFee","AdmissionFee","EffectiveFrom","EffectiveTo","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","CollegeId" },
        ["hostel-fees"] = new[] { "HostelFeeMasterId","AcademicYearId","HostelType","RoomType","Amount","EffectiveFrom","EffectiveTo","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy" },
        ["transport-fees"] = new[] { "TransportFeeMasterId","AcademicYearId","RouteId","RouteCode","RouteName","Amount","EffectiveFrom","EffectiveTo","Status","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy" },
    };

    [HttpGet]
    public IActionResult GetCatalog() => Ok(new { success = true, data = Catalog.Select(x => new {
        screen = x.Key, url = $"/api/v1/exports/{x.Key}", formats = new[] { "xlsx", "csv", "json" },
        columns = x.Value, filters = x.Value.Where(c => new[] { "CollegeId", "DepartmentId", "CourseId", "BranchId", "SemesterId", "AcademicYearId", "Status" }.Contains(c))
    }) });

    [HttpGet("{screen}")]
    public async Task<IActionResult> Download(string screen, [FromQuery] ScreenExportQuery query)
    {
        if (!Catalog.TryGetValue(screen, out var columns)) return NotFound(new { success = false, message = "This screen has no configured database export." });
        var format = query.Format.Trim().ToLowerInvariant();
        if (format is not ("xlsx" or "csv" or "json")) return BadRequest(new { success = false, message = "Format must be xlsx, csv or json." });
        if (query.Search?.Length > 255) return BadRequest(new { success = false, message = "Search must be at most 255 characters." });
        if (!User.IsInRole("SUPER_ADMIN"))
        {
            if (columns.Contains("CollegeId"))
            {
                if (!long.TryParse(User.FindFirstValue("collegeId"), out var collegeId)) return Forbid();
                if (query.CollegeId.HasValue && query.CollegeId != collegeId) return Forbid();
                query.CollegeId = collegeId;
            }
            else if (screen is not ("academic-years" or "academic-levels" or "roles")) return Forbid();
        }
        var filters = new Dictionary<string, long?> { ["CollegeId"]=query.CollegeId,["DepartmentId"]=query.DepartmentId,["CourseId"]=query.CourseId,["BranchId"]=query.BranchId,["SemesterId"]=query.SemesterId,["AcademicYearId"]=query.AcademicYearId };
        foreach (var f in filters.Where(x => x.Value.HasValue))
            if (f.Value <= 0 || !columns.Contains(f.Key)) return BadRequest(new { success=false, message=$"{f.Key} must be a positive supported filter for this screen." });
        if (query.Status != null && !columns.Contains("Status")) return BadRequest(new { success=false,message="Status is not a filter for this screen." });
        var status = query.Status?.Trim();
        if (screen != "student-admissions") status = status?.ToLowerInvariant() switch { "active" or "true" => "1", "inactive" or "false" => "0", _ => status };
        await using var connection = new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await connection.OpenAsync(HttpContext.RequestAborted);
        using var reader = await connection.ExecuteReaderAsync(new CommandDefinition("sp_cms_export", new {
            p_screen=screen.ToLowerInvariant(),p_search=query.Search,p_status=status,p_college_id=query.CollegeId,
            p_department_id=query.DepartmentId,p_course_id=query.CourseId,p_branch_id=query.BranchId,
            p_semester_id=query.SemesterId,p_academic_year_id=query.AcademicYearId
        }, commandType:CommandType.StoredProcedure, cancellationToken:HttpContext.RequestAborted));
        var rows = new List<Dictionary<string, object?>>();
        var headers = Enumerable.Range(0,reader.FieldCount).Select(reader.GetName).ToArray();
        while (reader.Read())
        {
            var row = new Dictionary<string,object?>();
            for (var i=0;i<reader.FieldCount;i++) row[headers[i]]=reader.IsDBNull(i)?null:reader.GetValue(i);
            rows.Add(row);
            if (rows.Count>100000) return BadRequest(new { success=false,message="Export exceeds 100000 rows. Add filters and retry; no partial file was generated." });
        }
        byte[] bytes;
        if (format == "json") bytes=JsonSerializer.SerializeToUtf8Bytes(rows,new JsonSerializerOptions { WriteIndented=true });
        else if (format == "xlsx") bytes = BuildXlsx(headers, rows, screen);
        else
        {
            var text = new StringBuilder();
            text.AppendLine(string.Join(",",headers.Select(EscapeCsv)));
            foreach(var row in rows) text.AppendLine(string.Join(",",headers.Select(h=>EscapeCsv(row[h]))));
            bytes = new UTF8Encoding(true).GetPreamble().Concat(Encoding.UTF8.GetBytes(text.ToString())).ToArray();
        }
        Response.Headers["X-Total-Count"]=rows.Count.ToString(CultureInfo.InvariantCulture);
        Response.Headers["Cache-Control"]="no-store";
        logger.LogInformation("Screen download completed. Screen={Screen}, Rows={Rows}, Format={Format}, CorrelationId={CorrelationId}",screen,rows.Count,format,HttpContext.TraceIdentifier);
        return File(bytes, format switch { "csv" => "text/csv; charset=utf-8", "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", _ => "application/json" },$"{screen}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.{format}");
    }


    private static byte[] BuildXlsx(string[] headers, List<Dictionary<string, object?>> rows, string screen)
    {
        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteZipEntry(archive, "[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/></Types>");
            WriteZipEntry(archive, "_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            WriteZipEntry(archive, "xl/workbook.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"{XmlEscape(SafeSheetName(screen))}\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            WriteZipEntry(archive, "xl/_rels/workbook.xml.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>");

            var sheet = new StringBuilder(64 * 1024);
            sheet.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>");
            AppendXlsxRow(sheet, headers.Cast<object?>());
            foreach (var row in rows) AppendXlsxRow(sheet, headers.Select(h => row.TryGetValue(h, out var value) ? value : null));
            sheet.Append("</sheetData></worksheet>");
            WriteZipEntry(archive, "xl/worksheets/sheet1.xml", sheet.ToString());
        }
        return output.ToArray();
    }

    private static void AppendXlsxRow(StringBuilder sheet, IEnumerable<object?> values)
    {
        sheet.Append("<row>");
        foreach (var value in values)
        {
            var text = value switch
            {
                null => string.Empty,
                DateTime dt => dt.ToString("O", CultureInfo.InvariantCulture),
                IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
                _ => value.ToString() ?? string.Empty
            };
            sheet.Append("<c t=\"inlineStr\"><is><t xml:space=\"preserve\">")
                 .Append(XmlEscape(text))
                 .Append("</t></is></c>");
        }
        sheet.Append("</row>");
    }

    private static void WriteZipEntry(ZipArchive archive, string name, string content)
    {
        var entry = archive.CreateEntry(name, CompressionLevel.Fastest);
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
        writer.Write(content);
    }

    private static string XmlEscape(string value) => SecurityElement.Escape(value) ?? string.Empty;
    private static string SafeSheetName(string value)
    {
        var invalid = new[] { ':', '\\', '/', '?', '*', '[', ']' };
        var cleaned = new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? "Export" : cleaned[..Math.Min(31, cleaned.Length)];
    }

    public static string EscapeCsv(object? value)
    {
        var text = value switch { null => "", DateTime dt => dt.ToString("O",CultureInfo.InvariantCulture), IFormattable f => f.ToString(null,CultureInfo.InvariantCulture), _ => value.ToString() ?? "" };
        if (value is string && text.TrimStart() is { Length: > 0 } trimmed && "=+-@".Contains(trimmed[0])) text="'"+text;
        return "\""+text.Replace("\"","\"\"")+"\"";
    }

    [HttpGet("~/api/v1/colleges/download")]
    [HttpGet("~/api/v1/colleges/export")]
    public Task<IActionResult> DownloadColleges([FromQuery] ScreenExportQuery query) => Download("colleges",query);

    [HttpGet("~/api/college-settings/download")]
    [HttpGet("~/api/college-settings/export")]
    public Task<IActionResult> DownloadCollegeSettings([FromQuery] ScreenExportQuery query) => Download("college-settings",query);

    [HttpGet("~/api/v1/academic-years/download")]
    [HttpGet("~/api/v1/academic-years/export")]
    public Task<IActionResult> DownloadAcademicYears([FromQuery] ScreenExportQuery query) => Download("academic-years",query);

    [HttpGet("~/api/academic-levels/download")]
    [HttpGet("~/api/academic-levels/export")]
    public Task<IActionResult> DownloadAcademicLevels([FromQuery] ScreenExportQuery query) => Download("academic-levels",query);

    [HttpGet("~/api/v1/departments/download")]
    [HttpGet("~/api/v1/departments/export")]
    public Task<IActionResult> DownloadDepartments([FromQuery] ScreenExportQuery query) => Download("departments",query);

    [HttpGet("~/api/v1/courses/download")]
    [HttpGet("~/api/v1/courses/export")]
    public Task<IActionResult> DownloadCourses([FromQuery] ScreenExportQuery query) => Download("courses",query);

    [HttpGet("~/api/v1/branches/download")]
    [HttpGet("~/api/v1/branches/export")]
    public Task<IActionResult> DownloadBranches([FromQuery] ScreenExportQuery query) => Download("branches",query);

    [HttpGet("~/api/semester/download")]
    [HttpGet("~/api/semester/export")]
    public Task<IActionResult> DownloadSemesters([FromQuery] ScreenExportQuery query) => Download("semesters",query);

    [HttpGet("~/api/v1/sections/download")]
    [HttpGet("~/api/v1/sections/export")]
    public Task<IActionResult> DownloadSections([FromQuery] ScreenExportQuery query) => Download("sections",query);

    [HttpGet("~/api/v1/course-structures/download")]
    [HttpGet("~/api/v1/course-structures/export")]
    public Task<IActionResult> DownloadCourseStructures([FromQuery] ScreenExportQuery query) => Download("course-structures",query);

    [HttpGet("~/api/v1/students/download")]
    [HttpGet("~/api/v1/students/export")]
    public Task<IActionResult> DownloadStudents([FromQuery] ScreenExportQuery query) => Download("students",query);

    [HttpGet("~/api/v1/student-profiles/download")]
    [HttpGet("~/api/v1/student-profiles/export")]
    public Task<IActionResult> DownloadStudentProfiles([FromQuery] ScreenExportQuery query) => Download("student-profiles",query);

    [HttpGet("~/api/v1/student-admissions/download")]
    [HttpGet("~/api/v1/student-admissions/export")]
    public Task<IActionResult> DownloadStudentAdmissions([FromQuery] ScreenExportQuery query) => Download("student-admissions",query);

    [HttpGet("~/api/v1/promotions/download")]
    [HttpGet("~/api/v1/promotions/export")]
    public Task<IActionResult> DownloadPromotions([FromQuery] ScreenExportQuery query) => Download("promotions",query);

    [HttpGet("~/api/v1/users/download")]
    [HttpGet("~/api/v1/users/export")]
    public Task<IActionResult> DownloadUsers([FromQuery] ScreenExportQuery query) => Download("users",query);

    [HttpGet("~/api/roles/download")]
    [HttpGet("~/api/roles/export")]
    public Task<IActionResult> DownloadRoles([FromQuery] ScreenExportQuery query) => Download("roles",query);

    [HttpGet("~/api/v1/faculty/download")]
    [HttpGet("~/api/v1/faculty/export")]
    public Task<IActionResult> DownloadFaculty([FromQuery] ScreenExportQuery query) => Download("faculty",query);

    [HttpGet("~/api/v1/fee-structures/download")]
    [HttpGet("~/api/v1/fee-structures/export")]
    public Task<IActionResult> DownloadFeeStructures([FromQuery] ScreenExportQuery query) => Download("fee-structures",query);

    [HttpGet("~/api/v1/hostel-fees/download")]
    [HttpGet("~/api/v1/hostel-fees/export")]
    public Task<IActionResult> DownloadHostelFees([FromQuery] ScreenExportQuery query) => Download("hostel-fees",query);

    [HttpGet("~/api/v1/transport-fees/download")]
    [HttpGet("~/api/v1/transport-fees/export")]
    public Task<IActionResult> DownloadTransportFees([FromQuery] ScreenExportQuery query) => Download("transport-fees",query);
}
