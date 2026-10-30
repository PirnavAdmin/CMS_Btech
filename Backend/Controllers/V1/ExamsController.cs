using System.Security.Claims;
using BTech.DTOs.Exams;
using BTech.Exceptions;
using BTech.Repositories.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/exams")]
[Authorize]
public sealed class ExamsController : ControllerBase
{
    private readonly ExamManagementRepository _repository;
    private readonly ILogger<ExamsController> _logger;

    public ExamsController(ExamManagementRepository repository, ILogger<ExamsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    private CancellationToken Cancellation => HttpContext.RequestAborted;
    private long? Actor => long.TryParse(
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("user_id"),
        out var id) ? id : null;

    // ------------------------------------------------------------------
    // EXAM CRUD - Ticket 173
    // ------------------------------------------------------------------
    [HttpGet]
    public Task<IActionResult> GetAll([FromQuery] ExamSearchRequest request) => Execute(async () =>
    {
        var all = await _repository.ListExamsAsync(request, null, Cancellation);
        var total = all.Count;
        var page = request.Page ?? 1;
        var pageSize = request.PageSize ?? (request.Page.HasValue ? 25 : Math.Max(total, 1));
        var rows = all.Skip((int)Math.Min((long)(page - 1) * pageSize, total)).Take(pageSize).ToList();
        return Ok(new
        {
            success = true,
            message = "Exams retrieved successfully.",
            data = rows,
            count = rows.Count,
            totalCount = total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        });
    });

    [HttpGet("{examId:long}")]
    public Task<IActionResult> GetById(long examId) => Execute(async () =>
    {
        var row = await FindExam(examId);
        return Ok(new { success = true, message = "Exam retrieved successfully.", data = row });
    });

    [HttpPost]
    public Task<IActionResult> Create([FromBody] ExamWriteRequest request) => Execute(async () =>
    {
        var id = await _repository.CreateExamAsync(request, Actor, Cancellation);
        var row = await FindExam(id);
        _logger.LogInformation("Exam API create completed. ExamId={ExamId}, Actor={Actor}, CorrelationId={CorrelationId}",
            id, Actor, HttpContext.TraceIdentifier);
        return StatusCode(201, new { success = true, message = "Exam created successfully.", examId = id, data = row });
    });

    [HttpPut("{examId:long}")]
    public Task<IActionResult> Update(long examId, [FromBody] ExamWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        await _repository.UpdateExamAsync(examId, request, Actor, Cancellation);
        var row = await FindExam(examId);
        _logger.LogInformation("Exam API update completed. ExamId={ExamId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examId, Actor, HttpContext.TraceIdentifier);
        return Ok(new { success = true, message = "Exam updated successfully.", data = row });
    });

    [HttpDelete("{examId:long}")]
    public Task<IActionResult> Delete(long examId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        await _repository.DeleteExamAsync(examId, Actor, Cancellation);
        _logger.LogInformation("Exam API delete completed. ExamId={ExamId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examId, Actor, HttpContext.TraceIdentifier);
        return Ok(new { success = true, message = "Exam deleted successfully.", examId });
    });

    // ------------------------------------------------------------------
    // SCHEDULES - Ticket 173
    // ------------------------------------------------------------------
    [HttpGet("{examId:long}/schedules")]
    public Task<IActionResult> GetSchedules(long examId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        var rows = await _repository.ListSchedulesAsync(examId, null, Cancellation);
        return Ok(new { success = true, message = "Exam schedules retrieved successfully.", data = rows, count = rows.Count });
    });

    [HttpGet("{examId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> GetSchedule(long examId, long scheduleId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(scheduleId, "scheduleId");
        var row = (await _repository.ListSchedulesAsync(examId, scheduleId, Cancellation)).FirstOrDefault()
            ?? throw new ExamNotFoundException("scheduleId", "Exam schedule not found.");
        return Ok(new { success = true, message = "Exam schedule retrieved successfully.", data = row });
    });

    [HttpPost("{examId:long}/schedules")]
    public Task<IActionResult> CreateSchedule(long examId, [FromBody] ExamScheduleWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        var id = await _repository.CreateScheduleAsync(examId, request, Actor, Cancellation);
        var row = (await _repository.ListSchedulesAsync(examId, id, Cancellation)).First();
        _logger.LogInformation("Exam schedule API create completed. ExamId={ExamId}, ScheduleId={ScheduleId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examId, id, Actor, HttpContext.TraceIdentifier);
        return StatusCode(201, new { success = true, message = "Exam schedule created successfully.", examScheduleId = id, data = row });
    });

    [HttpPut("{examId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> UpdateSchedule(long examId, long scheduleId, [FromBody] ExamScheduleWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(scheduleId, "scheduleId");
        await _repository.UpdateScheduleAsync(examId, scheduleId, request, Actor, Cancellation);
        var row = (await _repository.ListSchedulesAsync(examId, scheduleId, Cancellation)).First();
        return Ok(new { success = true, message = "Exam schedule updated successfully.", data = row });
    });

    [HttpDelete("{examId:long}/schedules/{scheduleId:long}")]
    public Task<IActionResult> DeleteSchedule(long examId, long scheduleId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(scheduleId, "scheduleId");
        await _repository.DeleteScheduleAsync(examId, scheduleId, Actor, Cancellation);
        return Ok(new { success = true, message = "Exam schedule deleted successfully.", examId, examScheduleId = scheduleId });
    });

    // ------------------------------------------------------------------
    // RULES - Ticket 173
    // ------------------------------------------------------------------
    [HttpGet("{examId:long}/rules")]
    public Task<IActionResult> GetRules(long examId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        var rows = await _repository.ListRulesAsync(examId, null, Cancellation);
        return Ok(new { success = true, message = "Exam rules retrieved successfully.", data = rows, count = rows.Count });
    });

    [HttpGet("{examId:long}/rules/{ruleId:long}")]
    public Task<IActionResult> GetRule(long examId, long ruleId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(ruleId, "ruleId");
        var row = (await _repository.ListRulesAsync(examId, ruleId, Cancellation)).FirstOrDefault()
            ?? throw new ExamNotFoundException("ruleId", "Exam rule not found.");
        return Ok(new { success = true, message = "Exam rule retrieved successfully.", data = row });
    });

    [HttpPost("{examId:long}/rules")]
    public Task<IActionResult> CreateRule(long examId, [FromBody] ExamRuleWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        var id = await _repository.CreateRuleAsync(examId, request, Actor, Cancellation);
        var row = (await _repository.ListRulesAsync(examId, id, Cancellation)).First();
        _logger.LogInformation("Exam rule API create completed. ExamId={ExamId}, RuleId={RuleId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examId, id, Actor, HttpContext.TraceIdentifier);
        return StatusCode(201, new { success = true, message = "Exam rule created successfully.", examRuleId = id, data = row });
    });

    [HttpPut("{examId:long}/rules/{ruleId:long}")]
    public Task<IActionResult> UpdateRule(long examId, long ruleId, [FromBody] ExamRuleWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(ruleId, "ruleId");
        await _repository.UpdateRuleAsync(examId, ruleId, request, Actor, Cancellation);
        var row = (await _repository.ListRulesAsync(examId, ruleId, Cancellation)).First();
        return Ok(new { success = true, message = "Exam rule updated successfully.", data = row });
    });

    [HttpDelete("{examId:long}/rules/{ruleId:long}")]
    public Task<IActionResult> DeleteRule(long examId, long ruleId) => Execute(async () =>
    {
        RequirePositive(examId, "examId");
        RequirePositive(ruleId, "ruleId");
        await _repository.DeleteRuleAsync(examId, ruleId, Actor, Cancellation);
        return Ok(new { success = true, message = "Exam rule deleted successfully.", examId, examRuleId = ruleId });
    });

    // Frontend-friendly master lookups without changing any existing academic APIs.
    [HttpGet("lookups")]
    public Task<IActionResult> Lookups(
        [FromQuery] long? collegeId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? courseId,
        [FromQuery] long? branchId,
        [FromQuery] long? semesterId) => Execute(async () =>
    {
        return Ok(new
        {
            success = true,
            message = "Exam lookups retrieved successfully.",
            data = await _repository.LookupsAsync(collegeId, academicYearId, courseId, branchId, semesterId, Cancellation)
        });
    });

    private async Task<Dictionary<string, object?>> FindExam(long examId)
    {
        RequirePositive(examId, "examId");
        return (await _repository.ListExamsAsync(new ExamSearchRequest(), examId, Cancellation)).FirstOrDefault()
            ?? throw new ExamNotFoundException("examId", "Exam not found.");
    }

    private static void RequirePositive(long id, string field)
    {
        if (id <= 0) throw new ExamValidationException(field, $"{field} must be a positive number.");
    }

    private async Task<IActionResult> Execute(Func<Task<IActionResult>> action)
    {
        _logger.LogInformation("Exam request {Method} {Path}; Actor={Actor}; CorrelationId={CorrelationId}",
            Request.Method, Request.Path, Actor, HttpContext.TraceIdentifier);
        try { return await action(); }
        catch (ExamValidationException ex)
        {
            _logger.LogWarning("Exam validation failed. Field={Field}, Message={Message}, CorrelationId={CorrelationId}",
                ex.Field, ex.Message, HttpContext.TraceIdentifier);
            return Failure(400, ex.Field, ex.Message);
        }
        catch (ExamConflictException ex)
        {
            _logger.LogWarning("Exam conflict. Field={Field}, Message={Message}, CorrelationId={CorrelationId}",
                ex.Field, ex.Message, HttpContext.TraceIdentifier);
            return Failure(409, ex.Field, ex.Message);
        }
        catch (ExamNotFoundException ex) { return Failure(404, ex.Field, ex.Message); }
        catch (MySqlException ex) when (ex.Number is 1062 or 1451 or 1452 or 3819)
        {
            _logger.LogWarning(ex, "Exam database validation failed. DatabaseCode={Code}, CorrelationId={CorrelationId}",
                ex.Number, HttpContext.TraceIdentifier);
            return Failure(ex.Number is 1062 or 1451 ? 409 : 400, "exam", "Exam data conflicts with an existing or related record.");
        }
        catch (OperationCanceledException) when (Cancellation.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exam request failed. CorrelationId={CorrelationId}", HttpContext.TraceIdentifier);
            return Failure(500, "exam", "Unable to complete the exam request. Check server logs using the correlation ID.");
        }
    }

    private ObjectResult Failure(int code, string field, string message) => StatusCode(code, new
    {
        success = false,
        message,
        errors = new Dictionary<string, string[]> { [field] = new[] { message } },
        correlationId = HttpContext.TraceIdentifier
    });
}
