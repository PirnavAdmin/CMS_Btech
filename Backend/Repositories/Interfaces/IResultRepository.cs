using BTech.DTOs.ResultManagement;

namespace BTech.Repositories.Interfaces;

public interface IResultRepository
{
    // ============================================================
    // EXISTING METHODS
    // ============================================================

    Task<ResultSummaryDto?> GetAsync(
        long studentId,
        long examId);

    Task<IReadOnlyList<ResultSummaryDto>>
        GetStudentResultsAsync(
            long studentId);

    Task<IReadOnlyList<BacklogDto>>
        GetBacklogsAsync(
            long studentId);


    // ============================================================
    // TASK 17 - RESULT CALCULATION VALIDATION
    // ============================================================

    Task<GradeRuleDto?> GetGradeRuleAsync(
        long examId,
        decimal percentage);

    Task<ResultMemoValidationDto?> GetResultMemoAsync(
        long studentId,
        long examId);

    Task<decimal?> GetCalculatedCgpaAsync(
        long studentId);

    Task<int> GetExamBacklogCountAsync(
        long studentId,
        long examId);
}