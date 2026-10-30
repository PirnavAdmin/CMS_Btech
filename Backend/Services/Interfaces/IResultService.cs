using BTech.DTOs.ResultManagement;

namespace BTech.Services.Interfaces;

public interface IResultService
{
    // ============================================================
    // EXISTING METHODS
    // ============================================================

    Task<ResultSummaryDto>
        CalculateAsync(
            ResultCalculationRequest request);

    Task<ResultSummaryDto>
        GetAsync(
            long studentId,
            long examId);

    Task<IReadOnlyList<ResultSummaryDto>>
        GetStudentResultsAsync(
            long studentId);

    Task<IReadOnlyList<BacklogDto>>
        GetBacklogsAsync(
            long studentId);


    // ============================================================
    // TASK 17
    // ============================================================

    Task<ResultValidationResponseDto>
        ValidateAsync(
            ResultValidationRequest request);
}