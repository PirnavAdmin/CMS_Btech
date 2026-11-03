using System.Data;
using BTech.DTOs.ResultManagement;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class ResultRepository : IResultRepository
{
    private readonly IConfiguration _configuration;

    public ResultRepository(IConfiguration configuration)
        => _configuration = configuration;


    // ============================================================
    // EXISTING - DATABASE CONNECTION
    // ============================================================

    private MySqlConnection CreateConnection()
    {
        var cs =
            _configuration.GetConnectionString(
                "DefaultConnection");

        if (string.IsNullOrWhiteSpace(cs))
        {
            throw new InvalidOperationException(
                "DefaultConnection is missing from appsettings.json.");
        }

        return new MySqlConnection(cs);
    }


    // ============================================================
    // EXISTING - SUBJECT RESULT SQL
    // ============================================================

    private const string SubjectSql = @"
SELECT
    er.result_id AS ResultId,
    er.exam_schedule_id AS ExamScheduleId,
    es.subject_id AS SubjectId,
    s.subject_code AS SubjectCode,
    s.subject_name AS SubjectName,
    COALESCE(s.credits, 0) AS Credits,
    er.maximum_marks AS MaximumMarks,
    er.marks_obtained AS MarksObtained,

    COALESCE(
        er.percentage,
        CASE
            WHEN er.maximum_marks > 0
            THEN
                (er.marks_obtained / er.maximum_marks) * 100
            ELSE 0
        END
    ) AS Percentage,

    g.grade_code AS Grade,
    g.grade_point AS GradePoint,
    er.result_status AS ResultStatus,
    er.is_absent AS IsAbsent,

    CASE
        WHEN er.result_status IN ('FAIL', 'ABSENT')
             OR er.is_absent = 1
        THEN 1
        ELSE 0
    END AS IsBacklog

FROM exam_results er

JOIN exam_schedules es
    ON es.exam_schedule_id =
       er.exam_schedule_id

JOIN subjects s
    ON s.subject_id =
       es.subject_id

LEFT JOIN grades g
    ON g.grade_id =
       er.grade_id

WHERE er.student_id =
      @StudentId

  AND es.exam_id =
      @ExamId

  AND er.deleted_at IS NULL

  AND es.deleted_at IS NULL

ORDER BY
    es.exam_schedule_id;";


    // ============================================================
    // EXISTING - GET RESULT
    // ============================================================

    public async Task<ResultSummaryDto?>
        GetAsync(
            long studentId,
            long examId)
    {
        await using var c =
            CreateConnection();


        var subjects =
            (
                await c.QueryAsync<ResultSubjectDto>(
                    SubjectSql,
                    new
                    {
                        StudentId = studentId,
                        ExamId = examId
                    }
                )
            ).AsList();


        if (subjects.Count == 0)
            return null;


        var totalMaximum =
            subjects.Sum(
                x => x.MaximumMarks);


        var totalObtained =
            subjects.Sum(
                x => x.MarksObtained);


        var percentage =
            totalMaximum > 0

                ? Math.Round(
                    totalObtained * 100m
                    / totalMaximum,
                    2)

                : 0m;


        var grade =
            await GetOverallGradeAsync(
                c,
                percentage);


        var sgpa =
            CalculateGpa(
                subjects);


        var cgpa =
            await CalculateCgpaAsync(
                c,
                studentId);


        var backlogCount =
            subjects.Count(
                x => x.IsBacklog);


        return new ResultSummaryDto
        {
            StudentId =
                studentId,

            ExamId =
                examId,

            TotalMaximumMarks =
                totalMaximum,

            TotalMarksObtained =
                totalObtained,

            Percentage =
                percentage,

            OverallGrade =
                grade,

            Sgpa =
                sgpa,

            Cgpa =
                cgpa,

            ResultStatus =
                backlogCount == 0
                    ? "PASS"
                    : "FAIL",

            BacklogCount =
                backlogCount,

            Subjects =
                subjects
        };
    }


    // ============================================================
    // EXISTING - GET ALL STUDENT RESULTS
    // ============================================================

    public async Task<IReadOnlyList<ResultSummaryDto>>
        GetStudentResultsAsync(
            long studentId)
    {
        await using var c =
            CreateConnection();


        var examIds =
            await c.QueryAsync<long>(
                @"
SELECT DISTINCT
    es.exam_id

FROM exam_results er

JOIN exam_schedules es
    ON es.exam_schedule_id =
       er.exam_schedule_id

WHERE er.student_id =
      @StudentId

  AND er.deleted_at IS NULL

  AND es.deleted_at IS NULL

ORDER BY
    es.exam_id;",
                new
                {
                    StudentId = studentId
                });


        var results =
            new List<ResultSummaryDto>();


        foreach (var examId in examIds)
        {
            var result =
                await GetAsync(
                    studentId,
                    examId);


            if (result is not null)
            {
                results.Add(result);
            }
        }


        return results;
    }


    // ============================================================
    // EXISTING - GET BACKLOGS
    // ============================================================

    public async Task<IReadOnlyList<BacklogDto>>
        GetBacklogsAsync(
            long studentId)
    {
        await using var c =
            CreateConnection();


        const string sql = @"
SELECT
    b.backlog_id AS BacklogId,
    b.student_id AS StudentId,
    b.subject_id AS SubjectId,
    s.subject_code AS SubjectCode,
    s.subject_name AS SubjectName,
    b.source_result_id AS SourceResultId,
    b.cleared_result_id AS ClearedResultId,
    b.attempt_count AS AttemptCount,
    b.backlog_status AS BacklogStatus,
    b.identified_at AS IdentifiedAt,
    b.cleared_at AS ClearedAt

FROM student_backlogs b

JOIN subjects s
    ON s.subject_id =
       b.subject_id

WHERE b.student_id =
      @StudentId

  AND b.deleted_at IS NULL

ORDER BY
    b.backlog_id DESC;";


        return
            (
                await c.QueryAsync<BacklogDto>(
                    sql,
                    new
                    {
                        StudentId = studentId
                    }
                )
            ).AsList();
    }


    // ============================================================
    // TASK 17 - GET GRADE RULE
    // ============================================================

    public async Task<GradeRuleDto?>
        GetGradeRuleAsync(
            long examId,
            decimal percentage)
    {
        await using var c =
            CreateConnection();


        const string sql = @"
SELECT
    g.grade_code AS GradeCode,
    COALESCE(g.grade_point, 0) AS GradePoint,
    g.is_pass AS IsPass

FROM grades g

INNER JOIN exams e
    ON e.college_id =
       g.college_id

WHERE e.exam_id =
      @ExamId

  AND @Percentage BETWEEN
      g.min_percentage
      AND g.max_percentage

  AND g.status = 1

  AND g.deleted_at IS NULL

ORDER BY
    g.min_percentage DESC

LIMIT 1;";


        return
            await c.QueryFirstOrDefaultAsync<GradeRuleDto>(
                sql,
                new
                {
                    ExamId = examId,
                    Percentage = percentage
                });
    }


    // ============================================================
    // TASK 17 - GET RESULT MEMO
    // ============================================================

    public async Task<ResultMemoValidationDto?>
        GetResultMemoAsync(
            long studentId,
            long examId)
    {
        await using var c =
            CreateConnection();


        const string sql = @"
SELECT
    rm.overall_percentage AS OverallPercentage,
    rm.sgpa AS Sgpa,
    rm.cgpa AS Cgpa,
    g.grade_code AS OverallGrade,
    rm.overall_result_status AS OverallResultStatus

FROM result_memos rm

LEFT JOIN grades g
    ON g.grade_id =
       rm.overall_grade_id

WHERE rm.student_id =
      @StudentId

  AND rm.exam_id =
      @ExamId

  AND rm.status = 1

  AND rm.deleted_at IS NULL

LIMIT 1;";


        return
            await c.QueryFirstOrDefaultAsync<ResultMemoValidationDto>(
                sql,
                new
                {
                    StudentId = studentId,
                    ExamId = examId
                });
    }


    // ============================================================
    // TASK 17 - CALCULATE CGPA
    // ============================================================

    public async Task<decimal?>
        GetCalculatedCgpaAsync(
            long studentId)
    {
        await using var c =
            CreateConnection();


        const string sql = @"
SELECT
    CASE

        WHEN SUM(
            COALESCE(
                s.credits,
                0
            )
        ) > 0

        THEN ROUND(

            SUM(
                COALESCE(
                    s.credits,
                    0
                )
                *
                COALESCE(
                    g.grade_point,
                    0
                )
            )

            /

            SUM(
                COALESCE(
                    s.credits,
                    0
                )
            ),

            2
        )

        ELSE NULL

    END

FROM exam_results er

JOIN exam_schedules es
    ON es.exam_schedule_id =
       er.exam_schedule_id

JOIN subjects s
    ON s.subject_id =
       es.subject_id

LEFT JOIN grades g
    ON g.grade_id =
       er.grade_id

WHERE er.student_id =
      @StudentId

  AND er.deleted_at IS NULL

  AND es.deleted_at IS NULL

  AND er.attempt_number = (

      SELECT MAX(er2.attempt_number)

      FROM exam_results er2

      WHERE er2.student_id =
            er.student_id

        AND er2.exam_schedule_id =
            er.exam_schedule_id

        AND er2.deleted_at IS NULL
  );";


        return
            await c.ExecuteScalarAsync<decimal?>(
                sql,
                new
                {
                    StudentId = studentId
                });
    }


    // ============================================================
    // TASK 17 - GET BACKLOG COUNT
    // ============================================================

    public async Task<int>
        GetExamBacklogCountAsync(
            long studentId,
            long examId)
    {
        await using var c =
            CreateConnection();


        const string sql = @"
SELECT
    COUNT(*)

FROM student_backlogs b

JOIN exam_results er
    ON er.result_id =
       b.source_result_id

JOIN exam_schedules es
    ON es.exam_schedule_id =
       er.exam_schedule_id

WHERE b.student_id =
      @StudentId

  AND es.exam_id =
      @ExamId

  AND b.deleted_at IS NULL

  AND b.status = 1

  AND er.deleted_at IS NULL

  AND es.deleted_at IS NULL;";


        return
            await c.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    StudentId = studentId,
                    ExamId = examId
                });
    }


    // ============================================================
    // EXISTING - SGPA
    // ============================================================

    private static decimal?
        CalculateGpa(
            IEnumerable<ResultSubjectDto> subjects)
    {
        var graded =
            subjects
                .Where(
                    x =>
                        x.Credits > 0 &&
                        x.GradePoint.HasValue)
                .ToList();


        if (graded.Count == 0)
            return null;


        var credits =
            graded.Sum(
                x => x.Credits);


        return
            credits <= 0
                ? null
                : Math.Round(
                    graded.Sum(
                        x =>
                            x.Credits *
                            x.GradePoint!.Value)
                    / credits,
                    2);
    }


    // ============================================================
    // EXISTING - CGPA
    // ============================================================

    private static async Task<decimal?>
        CalculateCgpaAsync(
            MySqlConnection c,
            long studentId)
    {
        const string sql = @"
SELECT
    CASE

        WHEN SUM(
            COALESCE(
                s.credits,
                0
            )
        ) > 0

        THEN ROUND(

            SUM(
                COALESCE(
                    s.credits,
                    0
                )
                *
                COALESCE(
                    g.grade_point,
                    0
                )
            )

            /

            SUM(
                COALESCE(
                    s.credits,
                    0
                )
            ),

            2
        )

        ELSE NULL

    END

FROM exam_results er

JOIN exam_schedules es
    ON es.exam_schedule_id =
       er.exam_schedule_id

JOIN subjects s
    ON s.subject_id =
       es.subject_id

LEFT JOIN grades g
    ON g.grade_id =
       er.grade_id

WHERE er.student_id =
      @StudentId

  AND er.deleted_at IS NULL

  AND es.deleted_at IS NULL

  AND er.attempt_number = (

      SELECT MAX(er2.attempt_number)

      FROM exam_results er2

      WHERE er2.student_id =
            er.student_id

        AND er2.exam_schedule_id =
            er.exam_schedule_id

        AND er2.deleted_at IS NULL
  );";


        return
            await c.ExecuteScalarAsync<decimal?>(
                sql,
                new
                {
                    StudentId = studentId
                });
    }


    // ============================================================
    // EXISTING - OVERALL GRADE
    // ============================================================

    private static async Task<string?>
        GetOverallGradeAsync(
            MySqlConnection c,
            decimal percentage)
    {
        return
            await c.ExecuteScalarAsync<string?>(
                @"
SELECT
    grade_code

FROM grades

WHERE @Percentage BETWEEN
      min_percentage
      AND max_percentage

  AND status = 1

  AND deleted_at IS NULL

ORDER BY
    min_percentage DESC

LIMIT 1;",
                new
                {
                    Percentage = percentage
                });
    }
}