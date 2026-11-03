using System.Security.Claims;
using BTech.DTOs.Exams;
using BTech.Exceptions;
using BTech.Repositories.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/exam-types")]
[Authorize]
public sealed class ExamTypesController : ControllerBase
{
    private readonly ExamManagementRepository _repository;
    private readonly ILogger<ExamTypesController> _logger;

    public ExamTypesController(ExamManagementRepository repository, ILogger<ExamTypesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    private CancellationToken Cancellation => HttpContext.RequestAborted;
    private long? Actor => long.TryParse(
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("user_id"),
        out var id) ? id : null;

    [HttpGet]
    public Task<IActionResult> GetAll([FromQuery] ExamTypeSearchRequest request) => Execute(async () =>
    {
        var rows = await _repository.ListTypesAsync(request, null, Cancellation);
        return Ok(new { success = true, message = "Exam types retrieved successfully.", data = rows, count = rows.Count });
    });

    [HttpGet("{examTypeId:long}")]
    public Task<IActionResult> GetById(long examTypeId) => Execute(async () =>
    {
        RequirePositive(examTypeId, "examTypeId");
        var row = (await _repository.ListTypesAsync(new ExamTypeSearchRequest(), examTypeId, Cancellation)).FirstOrDefault()
            ?? throw new ExamNotFoundException("examTypeId", "Exam type not found.");
        return Ok(new { success = true, message = "Exam type retrieved successfully.", data = row });
    });

    [HttpPost]
    public Task<IActionResult> Create([FromBody] ExamTypeWriteRequest request) => Execute(async () =>
    {
        var id = await _repository.CreateTypeAsync(request, Actor, Cancellation);
        var row = (await _repository.ListTypesAsync(new ExamTypeSearchRequest(), id, Cancellation)).First();
        _logger.LogInformation("Exam type API create completed. ExamTypeId={ExamTypeId}, Actor={Actor}, CorrelationId={CorrelationId}",
            id, Actor, HttpContext.TraceIdentifier);
        return StatusCode(201, new { success = true, message = "Exam type created successfully.", examTypeId = id, data = row });
    });

    [HttpPut("{examTypeId:long}")]
    public Task<IActionResult> Update(long examTypeId, [FromBody] ExamTypeWriteRequest request) => Execute(async () =>
    {
        RequirePositive(examTypeId, "examTypeId");
        await _repository.UpdateTypeAsync(examTypeId, request, Actor, Cancellation);
        var row = (await _repository.ListTypesAsync(new ExamTypeSearchRequest(), examTypeId, Cancellation)).First();
        _logger.LogInformation("Exam type API update completed. ExamTypeId={ExamTypeId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examTypeId, Actor, HttpContext.TraceIdentifier);
        return Ok(new { success = true, message = "Exam type updated successfully.", data = row });
    });

    [HttpDelete("{examTypeId:long}")]
    public Task<IActionResult> Delete(long examTypeId) => Execute(async () =>
    {
        RequirePositive(examTypeId, "examTypeId");
        await _repository.DeleteTypeAsync(examTypeId, Actor, Cancellation);
        _logger.LogInformation("Exam type API delete completed. ExamTypeId={ExamTypeId}, Actor={Actor}, CorrelationId={CorrelationId}",
            examTypeId, Actor, HttpContext.TraceIdentifier);
        return Ok(new { success = true, message = "Exam type deleted successfully.", examTypeId });
    });

    private static void RequirePositive(long id, string field)
    {
        if (id <= 0) throw new ExamValidationException(field, $"{field} must be a positive number.");
    }

    private async Task<IActionResult> Execute(Func<Task<IActionResult>> action)
    {
        _logger.LogInformation("ExamType request {Method} {Path}; Actor={Actor}; CorrelationId={CorrelationId}",
            Request.Method, Request.Path, Actor, HttpContext.TraceIdentifier);
        try { return await action(); }
        catch (ExamValidationException ex) { return Failure(400, ex.Field, ex.Message); }
        catch (ExamConflictException ex) { return Failure(409, ex.Field, ex.Message); }
        catch (ExamNotFoundException ex) { return Failure(404, ex.Field, ex.Message); }
        catch (MySqlException ex) when (ex.Number is 1062 or 1451 or 1452 or 3819)
        {
            _logger.LogWarning(ex, "Exam type database validation failed. CorrelationId={CorrelationId}", HttpContext.TraceIdentifier);
            return Failure(ex.Number is 1062 or 1451 ? 409 : 400, "examType", "Exam type data conflicts with an existing or related record.");
        }
        catch (OperationCanceledException) when (Cancellation.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exam type request failed. CorrelationId={CorrelationId}", HttpContext.TraceIdentifier);
            return Failure(500, "examType", "Unable to complete the exam type request. Check server logs using the correlation ID.");
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
