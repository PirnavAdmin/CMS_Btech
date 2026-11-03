using BTech.DTOs.ResultManagement;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class ResultService : IResultService
{
    private readonly IResultRepository _repository;

    public ResultService(
        IResultRepository repository)
        => _repository = repository;


    // ============================================================
    // EXISTING - CALCULATE
    // ============================================================

    public async Task<ResultSummaryDto>
        CalculateAsync(
            ResultCalculationRequest request)
    {
        if (
            request.StudentId <= 0 ||
            request.ExamId <= 0)
        {
            throw new ArgumentException(
                "StudentId and ExamId must be greater than zero.");
        }


        var result =
            await _repository.GetAsync(
                request.StudentId,
                request.ExamId);


        if (result is null)
        {
            throw new KeyNotFoundException(
                "No exam result data found for the supplied student and exam.");
        }


        return result;
    }


    // ============================================================
    // EXISTING - GET
    // ============================================================

    public async Task<ResultSummaryDto>
        GetAsync(
            long studentId,
            long examId)
    {
        return
            await CalculateAsync(
                new ResultCalculationRequest
                {
                    StudentId = studentId,
                    ExamId = examId
                });
    }


    // ============================================================
    // EXISTING - STUDENT RESULTS
    // ============================================================

    public Task<IReadOnlyList<ResultSummaryDto>>
        GetStudentResultsAsync(
            long studentId)
    {
        if (studentId <= 0)
        {
            throw new ArgumentException(
                "StudentId must be greater than zero.");
        }


        return
            _repository.GetStudentResultsAsync(
                studentId);
    }


    // ============================================================
    // EXISTING - BACKLOGS
    // ============================================================

    public Task<IReadOnlyList<BacklogDto>>
        GetBacklogsAsync(
            long studentId)
    {
        if (studentId <= 0)
        {
            throw new ArgumentException(
                "StudentId must be greater than zero.");
        }


        return
            _repository.GetBacklogsAsync(
                studentId);
    }


    // ============================================================
    // TASK 17 - RESULT CALCULATION VALIDATION
    // ============================================================

    public async Task<ResultValidationResponseDto>
        ValidateAsync(
            ResultValidationRequest request)
    {
        // --------------------------------------------------------
        // STEP 1 - Validate input
        // --------------------------------------------------------

        if (
            request.StudentId <= 0 ||
            request.ExamId <= 0)
        {
            throw new ArgumentException(
                "StudentId and ExamId must be greater than zero.");
        }


        // --------------------------------------------------------
        // STEP 2 - Get existing calculated result
        // --------------------------------------------------------

        var result =
            await _repository.GetAsync(
                request.StudentId,
                request.ExamId);


        if (result is null)
        {
            throw new KeyNotFoundException(
                "No exam result data found for the supplied student and exam.");
        }


        // --------------------------------------------------------
        // STEP 3 - Get stored memo
        // --------------------------------------------------------

        var memo =
            await _repository.GetResultMemoAsync(
                request.StudentId,
                request.ExamId);


        var validations =
            new List<ValidationDetailDto>();


        // ========================================================
        // VALIDATION 1 - PERCENTAGE
        // ========================================================

        var calculatedPercentage =
            result.TotalMaximumMarks > 0

                ? Math.Round(
                    result.TotalMarksObtained * 100m
                    / result.TotalMaximumMarks,
                    2)

                : 0m;


        var percentageValid =
            calculatedPercentage ==
            result.Percentage;


        var memoPercentageValid =
            memo is null ||
            !memo.OverallPercentage.HasValue ||
            calculatedPercentage ==
            memo.OverallPercentage.Value;


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "Percentage",

                IsValid =
                    percentageValid &&
                    memoPercentageValid,

                Message =
                    percentageValid &&
                    memoPercentageValid

                        ? $"Percentage is correct: " +
                          $"{calculatedPercentage}%."

                        : $"Percentage mismatch. " +
                          $"Calculated = " +
                          $"{calculatedPercentage}%, " +
                          $"Result = " +
                          $"{result.Percentage}%, " +
                          $"Memo = " +
                          $"{memo?.OverallPercentage?.ToString()
                            ?? "NULL"}%."
            });


        // ========================================================
        // VALIDATION 2 - SUBJECT GRADE
        // ========================================================

        var gradeValid = true;

        var gradePointValid = true;


        foreach (var subject in result.Subjects)
        {
            var subjectPercentage =
                subject.Percentage

                ??

                (
                    subject.MaximumMarks > 0

                        ? Math.Round(
                            subject.MarksObtained * 100m
                            / subject.MaximumMarks,
                            2)

                        : 0m
                );


            var expectedGrade =
                await _repository.GetGradeRuleAsync(
                    request.ExamId,
                    subjectPercentage);


            if (expectedGrade is null)
            {
                gradeValid = false;

                gradePointValid = false;


                validations.Add(
                    new ValidationDetailDto
                    {
                        Rule =
                            $"Grade - " +
                            $"{subject.SubjectCode}",

                        IsValid = false,

                        Message =
                            $"No grade rule found for " +
                            $"{subjectPercentage}%."
                    });


                continue;
            }


            var subjectGradeValid =
                string.Equals(
                    subject.Grade,
                    expectedGrade.GradeCode,
                    StringComparison.OrdinalIgnoreCase);


            if (!subjectGradeValid)
            {
                gradeValid = false;
            }


            validations.Add(
                new ValidationDetailDto
                {
                    Rule =
                        $"Grade - " +
                        $"{subject.SubjectCode}",

                    IsValid =
                        subjectGradeValid,

                    Message =
                        subjectGradeValid

                            ? $"Grade is correct: " +
                              $"{subject.Grade}."

                            : $"Grade mismatch. " +
                              $"Expected = " +
                              $"{expectedGrade.GradeCode}, " +
                              $"Found = " +
                              $"{subject.Grade ?? "NULL"}."
                });


            // ====================================================
            // VALIDATION 3 - GRADE POINT
            // ====================================================

            var subjectGradePointValid =
                subject.GradePoint.HasValue &&
                subject.GradePoint.Value ==
                expectedGrade.GradePoint;


            if (!subjectGradePointValid)
            {
                gradePointValid = false;
            }


            validations.Add(
                new ValidationDetailDto
                {
                    Rule =
                        $"Grade Point - " +
                        $"{subject.SubjectCode}",

                    IsValid =
                        subjectGradePointValid,

                    Message =
                        subjectGradePointValid

                            ? $"Grade point is correct: " +
                              $"{subject.GradePoint}."

                            : $"Grade point mismatch. " +
                              $"Expected = " +
                              $"{expectedGrade.GradePoint}, " +
                              $"Found = " +
                              $"{subject.GradePoint?.ToString()
                                ?? "NULL"}."
                });
        }


        // ========================================================
        // VALIDATION 4 - OVERALL GRADE
        // ========================================================

        var overallGradeValid =
            memo is null ||
            string.IsNullOrWhiteSpace(
                memo.OverallGrade) ||
            string.Equals(
                result.OverallGrade,
                memo.OverallGrade,
                StringComparison.OrdinalIgnoreCase);


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "Overall Grade",

                IsValid =
                    overallGradeValid,

                Message =
                    overallGradeValid

                        ? $"Overall grade is correct: " +
                          $"{result.OverallGrade ?? "NULL"}."

                        : $"Overall grade mismatch. " +
                          $"Calculated = " +
                          $"{result.OverallGrade ?? "NULL"}, " +
                          $"Memo = " +
                          $"{memo?.OverallGrade ?? "NULL"}."
            });


        // ========================================================
        // VALIDATION 5 - PASS / FAIL
        // ========================================================

        var calculatedBacklogCount =
            result.Subjects.Count(
                x => x.IsBacklog);


        var calculatedResultStatus =
            calculatedBacklogCount == 0
                ? "PASS"
                : "FAIL";


        var resultStatusValid =
            string.Equals(
                result.ResultStatus,
                calculatedResultStatus,
                StringComparison.OrdinalIgnoreCase);


        var memoResultStatusValid =
            memo is null ||

            string.IsNullOrWhiteSpace(
                memo.OverallResultStatus) ||

            string.Equals(
                memo.OverallResultStatus,
                calculatedResultStatus,
                StringComparison.OrdinalIgnoreCase);


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "Pass / Fail",

                IsValid =
                    resultStatusValid &&
                    memoResultStatusValid,

                Message =
                    resultStatusValid &&
                    memoResultStatusValid

                        ? $"Result status is correct: " +
                          $"{calculatedResultStatus}."

                        : $"Result status mismatch. " +
                          $"Calculated = " +
                          $"{calculatedResultStatus}, " +
                          $"Result = " +
                          $"{result.ResultStatus}, " +
                          $"Memo = " +
                          $"{memo?.OverallResultStatus ?? "NULL"}."
            });


        // ========================================================
        // VALIDATION 6 - BACKLOG
        // ========================================================

        var storedBacklogCount =
            await _repository
                .GetExamBacklogCountAsync(
                    request.StudentId,
                    request.ExamId);


        var backlogValid =
            calculatedBacklogCount ==
            storedBacklogCount;


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "Backlog",

                IsValid =
                    backlogValid,

                Message =
                    backlogValid

                        ? $"Backlog count is correct: " +
                          $"{calculatedBacklogCount}."

                        : $"Backlog mismatch. " +
                          $"Calculated = " +
                          $"{calculatedBacklogCount}, " +
                          $"Stored = " +
                          $"{storedBacklogCount}."
            });


        // ========================================================
        // VALIDATION 7 - SGPA
        // ========================================================

        var calculatedSgpa =
            CalculateSgpa(
                result.Subjects);


        var sgpaValid =
            memo is null ||

            !memo.Sgpa.HasValue ||

            (
                calculatedSgpa.HasValue &&
                calculatedSgpa.Value ==
                memo.Sgpa.Value
            );


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "SGPA",

                IsValid =
                    sgpaValid,

                Message =
                    sgpaValid

                        ? $"SGPA is correct: " +
                          $"{calculatedSgpa?.ToString()
                            ?? "Not available"}."

                        : $"SGPA mismatch. " +
                          $"Calculated = " +
                          $"{calculatedSgpa?.ToString()
                            ?? "NULL"}, " +
                          $"Memo = " +
                          $"{memo?.Sgpa?.ToString()
                            ?? "NULL"}."
            });


        // ========================================================
        // VALIDATION 8 - CGPA
        // ========================================================

        var calculatedCgpa =
            await _repository
                .GetCalculatedCgpaAsync(
                    request.StudentId);


        var cgpaValid =
            memo is null ||

            !memo.Cgpa.HasValue ||

            (
                calculatedCgpa.HasValue &&
                calculatedCgpa.Value ==
                memo.Cgpa.Value
            );


        validations.Add(
            new ValidationDetailDto
            {
                Rule =
                    "CGPA",

                IsValid =
                    cgpaValid,

                Message =
                    cgpaValid

                        ? $"CGPA is correct: " +
                          $"{calculatedCgpa?.ToString()
                            ?? "Not available"}."

                        : $"CGPA mismatch. " +
                          $"Calculated = " +
                          $"{calculatedCgpa?.ToString()
                            ?? "NULL"}, " +
                          $"Memo = " +
                          $"{memo?.Cgpa?.ToString()
                            ?? "NULL"}."
            });


        // ========================================================
        // FINAL VALIDATION
        // ========================================================

        var isValid =
            percentageValid &&
            memoPercentageValid &&
            gradeValid &&
            gradePointValid &&
            overallGradeValid &&
            resultStatusValid &&
            memoResultStatusValid &&
            backlogValid &&
            sgpaValid &&
            cgpaValid;


        // ========================================================
        // RETURN RESPONSE
        // ========================================================

        return new ResultValidationResponseDto
        {
            StudentId =
                request.StudentId,

            ExamId =
                request.ExamId,

            IsValid =
                isValid,

            CalculatedPercentage =
                calculatedPercentage,

            CalculatedOverallGrade =
                result.OverallGrade,

            CalculatedSgpa =
                calculatedSgpa,

            CalculatedCgpa =
                calculatedCgpa,

            CalculatedBacklogCount =
                calculatedBacklogCount,

            CalculatedResultStatus =
                calculatedResultStatus,

            Validations =
                validations
        };
    }


    // ============================================================
    // TASK 17 - SGPA CALCULATION
    // ============================================================

    private static decimal?
        CalculateSgpa(
            IEnumerable<ResultSubjectDto> subjects)
    {
        var gradedSubjects =
            subjects
                .Where(
                    x =>
                        x.Credits > 0 &&
                        x.GradePoint.HasValue)
                .ToList();


        if (gradedSubjects.Count == 0)
            return null;


        var totalCredits =
            gradedSubjects.Sum(
                x => x.Credits);


        if (totalCredits <= 0)
            return null;


        return Math.Round(
            gradedSubjects.Sum(
                x =>
                    x.Credits *
                    x.GradePoint!.Value)
            / totalCredits,
            2);
    }
}