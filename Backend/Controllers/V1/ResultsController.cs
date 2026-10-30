using BTech.DTOs.ResultManagement;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/results")]
[Authorize]
public sealed class ResultsController : ControllerBase
{
    private readonly IResultService _service;

    public ResultsController(
        IResultService service)
        => _service = service;


    // ============================================================
    // EXISTING - CALCULATE
    // ============================================================

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate(
        [FromBody] ResultCalculationRequest request)
        => await Execute(
            () => _service.CalculateAsync(request),
            "Result calculated successfully.");


    // ============================================================
    // EXISTING - GET
    // ============================================================

    [HttpGet(
        "student/{studentId:long}/exam/{examId:long}")]
    public async Task<IActionResult> Get(
        long studentId,
        long examId)
        => await Execute(
            () => _service.GetAsync(
                studentId,
                examId),
            "Result retrieved successfully.");


    // ============================================================
    // EXISTING - STUDENT RESULTS
    // ============================================================

    [HttpGet(
        "student/{studentId:long}")]
    public async Task<IActionResult> StudentResults(
        long studentId)
        => await Execute(
            () => _service.GetStudentResultsAsync(
                studentId),
            "Student results retrieved successfully.");


    // ============================================================
    // EXISTING - BACKLOGS
    // ============================================================

    [HttpGet(
        "student/{studentId:long}/backlogs")]
    public async Task<IActionResult> Backlogs(
        long studentId)
        => await Execute(
            () => _service.GetBacklogsAsync(
                studentId),
            "Student backlogs retrieved successfully.");


    // ============================================================
    // TASK 17 - RESULT VALIDATION
    // ============================================================

    [HttpPost("validate")]
    public async Task<IActionResult> Validate(
        [FromBody] ResultValidationRequest request)
        => await Execute(
            () => _service.ValidateAsync(request),
            "Result validation completed successfully.");


    // ============================================================
    // EXISTING - COMMON EXECUTION
    // ============================================================

    private async Task<IActionResult> Execute<T>(
        Func<Task<T>> action,
        string message)
    {
        try
        {
            var data =
                await action();


            return Ok(
                new
                {
                    success = true,
                    message,
                    data
                });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(
                new
                {
                    success = false,
                    message = ex.Message
                });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(
                new
                {
                    success = false,
                    message = ex.Message
                });
        }
    }
}