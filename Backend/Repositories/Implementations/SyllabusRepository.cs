using System.Text.Json;
using BTech.DTOs.Syllabus;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class SyllabusRepository(IConfiguration configuration) : ISyllabusRepository
{
    private MySqlConnection Connect() => new(configuration.GetConnectionString("DefaultConnection"));

    private const string Visibility = """
        s.college_id = @CollegeId AND (
          @Portal = 0 OR (s.status = 'Published' AND (
            (@Student = 1 AND EXISTS (
              SELECT 1 FROM students st
              JOIN student_sections ss ON ss.student_id = st.student_id AND ss.is_active = 1
              JOIN sections sec ON sec.section_id = ss.section_id
              WHERE st.user_id = @UserId AND st.college_id = s.college_id
                AND st.status = 1 AND st.deleted_at IS NULL
                AND sec.college_id = s.college_id AND sec.status = 1 AND sec.deleted_at IS NULL
                AND sec.semester_id = s.semester_id AND ss.academic_year_id = s.academic_year_id
            )) OR (@Student = 0 AND @Faculty = 1 AND EXISTS (
              SELECT 1 FROM faculty f
              LEFT JOIN employee_profiles ep ON ep.employee_profile_id = f.employee_profile_id
              JOIN faculty_subject_allocations a ON a.faculty_id = f.faculty_id
              WHERE COALESCE(ep.user_id, f.user_id) = @UserId AND f.college_id = s.college_id
                AND f.status = 1 AND f.deleted_at IS NULL
                AND (f.employee_profile_id IS NULL OR (ep.status = 1 AND ep.deleted_at IS NULL))
                AND a.status = 1 AND a.deleted_at IS NULL
                AND a.semester_id = s.semester_id AND a.academic_year_id = s.academic_year_id
                AND (s.subject_id IS NULL OR a.subject_id = s.subject_id)
            ))
          ))
        )
        """;

    private const string RecordColumns = """
        s.syllabus_id SyllabusId, s.college_id CollegeId, s.academic_year_id AcademicYearId,
        s.course_id CourseId, s.department_id DepartmentId, s.branch_id BranchId, s.semester_id SemesterId,
        s.regulation_id RegulationId, s.batch_id BatchId, s.title, s.category, s.subject_id SubjectId,
        s.version, s.effective_academic_year_id EffectiveAcademicYearId, s.effective_date EffectiveDate,
        s.description, s.revision_notes RevisionNotes, s.status, s.created_at CreatedAt, s.published_at PublishedAt
        """;

    private const string DocumentColumns = """
        d.document_id DocumentId, d.syllabus_id SyllabusId, d.file_name FileName,
        d.content_type ContentType, d.file_size FileSize, d.created_at CreatedAt
        """;

    private const string FromRecords = """
        FROM syllabi s
        JOIN courses c ON c.course_id = s.course_id
        JOIN semesters sem ON sem.semester_id = s.semester_id
        LEFT JOIN branches b ON b.branch_id = s.branch_id
        """;

    public async Task<IReadOnlyList<SyllabusRecord>> List(SyllabusAccess access, SyllabusFilter filter, long? id = null)
    {
        await using var db = Connect();
        await db.OpenAsync();
        await using var tx = await db.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
        var args = new DynamicParameters(access);
        args.AddDynamicParams(new
        {
            Id = id, filter.AcademicYearId, filter.CourseId, filter.DepartmentId, filter.BranchId,
            filter.SemesterId, filter.RegulationId, filter.BatchId
        });
        var rows = (await db.QueryAsync<SyllabusRecord>($"""
            SELECT {RecordColumns}, c.course_name CourseName, b.branch_name BranchName, sem.semester_name SemesterName
            {FromRecords}
            WHERE {Visibility}
              AND (@Id IS NULL OR s.syllabus_id = @Id)
              AND (@AcademicYearId IS NULL OR s.academic_year_id = @AcademicYearId)
              AND (@CourseId IS NULL OR s.course_id = @CourseId)
              AND (@DepartmentId IS NULL OR s.department_id = @DepartmentId)
              AND (@BranchId IS NULL OR s.branch_id = @BranchId)
              AND (@SemesterId IS NULL OR s.semester_id = @SemesterId)
              AND (@RegulationId IS NULL OR s.regulation_id = @RegulationId)
              AND (@BatchId IS NULL OR s.batch_id = @BatchId)
            ORDER BY s.syllabus_id DESC
            """, args, tx)).AsList();

        if (rows.Count > 0)
        {
            var documents = await db.QueryAsync<SyllabusDocument>($"""
                SELECT {DocumentColumns} FROM syllabus_documents d
                WHERE d.syllabus_id IN @Ids AND d.superseded_at IS NULL ORDER BY d.document_id
                """, new { Ids = rows.Select(row => row.SyllabusId).ToArray() }, tx);
            var bySyllabus = documents.ToLookup(document => document.SyllabusId);
            foreach (var row in rows)
                row.Documents = bySyllabus[row.SyllabusId].ToArray();
        }
        await tx.CommitAsync();
        return rows;
    }

    public Task<long> Save(SyllabusAccess access, long? id, SyllabusInput input) =>
        Write(access, id, async (db, tx, current) =>
        {
            if (current == "Archived") throw Conflict("Archived syllabi cannot be edited.");

            var args = new DynamicParameters(input);
            args.Add("CollegeId", access.CollegeId);
            args.Add("Id", id);
            var validScope = await db.ExecuteScalarAsync<int>("""
                SELECT EXISTS (
                  SELECT 1 FROM courses c JOIN semesters sem ON sem.course_id = c.course_id
                  JOIN academicyears ay ON ay.academic_year_id = @AcademicYearId AND ay.college_id = c.college_id
                  JOIN academicyears eff ON eff.academic_year_id = @EffectiveAcademicYearId AND eff.college_id = c.college_id
                  LEFT JOIN branches b ON b.branch_id = sem.branch_id AND b.course_id = c.course_id
                  WHERE c.course_id = @CourseId AND c.college_id = @CollegeId AND c.deleted_at IS NULL
                    AND sem.semester_id = @SemesterId AND sem.is_archived = 0
                    AND ay.deleted_at IS NULL AND eff.deleted_at IS NULL
                    AND (@BranchId IS NULL OR (b.branch_id = @BranchId AND b.deleted_at IS NULL))
                    AND (@DepartmentId IS NULL OR EXISTS (
                      SELECT 1 FROM departments dep WHERE dep.department_id = @DepartmentId
                        AND dep.college_id = c.college_id AND dep.deleted_at IS NULL
                        AND dep.department_id = COALESCE(b.department_id, c.department_id)
                    ))
                    AND (@SubjectId IS NULL OR EXISTS (
                      SELECT 1 FROM vw_sm_subject_mappings m JOIN subjects sub ON sub.subject_id = m.subject_id
                      WHERE m.subject_id = @SubjectId AND m.semester_id = sem.semester_id AND sub.deleted_at IS NULL
                    ))
                )
                """, args, tx);
            if (validScope != 1)
                throw new BadHttpRequestException("The academic selections do not match the syllabus college, course and semester.");

            const string fields = """
                academic_year_id = @AcademicYearId, course_id = @CourseId, department_id = @DepartmentId,
                branch_id = @BranchId, semester_id = @SemesterId, regulation_id = @RegulationId, batch_id = @BatchId,
                title = @Title, category = @Category, subject_id = @SubjectId, version = @Version,
                effective_academic_year_id = @EffectiveAcademicYearId, effective_date = @EffectiveDate,
                description = @Description, revision_notes = @RevisionNotes
                """;

            if (id is long existing)
            {
                await db.ExecuteAsync($"UPDATE syllabi SET {fields} WHERE syllabus_id = @Id", args, tx);
                await Audit(db, tx, access, existing, "Updated");
                return existing;
            }

            var created = await db.ExecuteScalarAsync<long>(
                $"INSERT INTO syllabi SET college_id = @CollegeId, {fields}; SELECT LAST_INSERT_ID();", args, tx);
            await Audit(db, tx, access, created, "Created");
            return created;
        });

    public Task ChangeStatus(SyllabusAccess access, long id, string status) =>
        Write(access, id, async (db, tx, current) =>
        {
            if (current == status) return id;
            if (current == "Archived") throw Conflict("Archived syllabi cannot be published.");
            if (status == "Published" && !await db.ExecuteScalarAsync<bool>("""
                SELECT EXISTS (SELECT 1 FROM syllabus_documents WHERE syllabus_id = @id AND superseded_at IS NULL)
                """, new { id }, tx))
                throw Conflict("Add at least one document before publishing.");

            await db.ExecuteAsync("""
                UPDATE syllabi SET status = @status,
                    published_at = CASE WHEN @status = 'Published' THEN UTC_TIMESTAMP(6) ELSE published_at END
                WHERE syllabus_id = @id
                """, new { id, status }, tx);
            await Audit(db, tx, access, id, status);
            return id;
        });

    public Task<long> Upload(SyllabusAccess access, long id, long? replaces, SyllabusDownload document) =>
        Write(access, id, async (db, tx, current) =>
        {
            if (current == "Archived") throw Conflict("Archived syllabus documents cannot be changed.");
            if (replaces.HasValue)
            {
                var affected = await db.ExecuteAsync("""
                    UPDATE syllabus_documents SET superseded_at = UTC_TIMESTAMP(6)
                    WHERE document_id = @replaces AND syllabus_id = @id AND superseded_at IS NULL
                    """, new { replaces, id }, tx);
                if (affected != 1) throw Missing("The current document was not found.");
            }

            var created = await db.ExecuteScalarAsync<long>("""
                INSERT INTO syllabus_documents
                    (syllabus_id, file_name, content_type, file_size, content, replaces_document_id)
                VALUES (@id, @FileName, @ContentType, @FileSize, @Content, @replaces);
                SELECT LAST_INSERT_ID();
                """, new { id, document.FileName, document.ContentType, document.FileSize, document.Content, replaces }, tx);
            await Audit(db, tx, access, id, replaces.HasValue ? "Document replaced" : "Document uploaded");
            return created;
        });

    private async Task<T> Write<T>(SyllabusAccess access, long? id,
        Func<MySqlConnection, MySqlTransaction, string?, Task<T>> write)
    {
        await using var db = Connect();
        await db.OpenAsync();
        await using var tx = await db.BeginTransactionAsync();
        string? current = null;
        if (id.HasValue)
        {
            current = await db.QuerySingleOrDefaultAsync<string>("""
                SELECT status FROM syllabi WHERE syllabus_id = @id AND college_id = @CollegeId FOR UPDATE
                """, new { id, access.CollegeId }, tx) ?? throw Missing("Syllabus not found.");
        }
        var result = await write(db, tx, current);
        await tx.CommitAsync();
        return result;
    }

    private static async Task Audit(MySqlConnection db, MySqlTransaction tx, SyllabusAccess access, long id, string action)
    {
        var record = await db.QuerySingleAsync<SyllabusRecord>(
            $"SELECT {RecordColumns} FROM syllabi s WHERE s.syllabus_id = @id", new { id }, tx);
        record.Documents = (await db.QueryAsync<SyllabusDocument>($"""
            SELECT {DocumentColumns} FROM syllabus_documents d
            WHERE d.syllabus_id = @id AND d.superseded_at IS NULL ORDER BY d.document_id
            """, new { id }, tx)).AsList();
        var snapshot = JsonSerializer.Serialize(record, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        await db.ExecuteAsync("""
            INSERT INTO syllabus_history (syllabus_id, actor_id, action, snapshot)
            VALUES (@id, @UserId, @action, @snapshot)
            """, new { id, access.UserId, action, snapshot }, tx);
    }

    private sealed record HistoryRow(long Id, long ActorId, string Action, string Snapshot, DateTime CreatedAt);

    public async Task<IEnumerable<object>> History(SyllabusAccess access, long id, bool versions)
    {
        await using var db = Connect();
        var args = new { id, access.CollegeId };
        if (!await db.ExecuteScalarAsync<bool>("""
            SELECT EXISTS (SELECT 1 FROM syllabi WHERE syllabus_id = @id AND college_id = @CollegeId)
            """, args))
            throw Missing("Syllabus not found.");

        var rows = await db.QueryAsync<HistoryRow>("""
            SELECT history_id Id, actor_id ActorId, action Action, CAST(snapshot AS CHAR) Snapshot, created_at CreatedAt
            FROM syllabus_history WHERE syllabus_id = @id ORDER BY history_id DESC
            """, args);
        if (!versions) return rows.Select(row => (object)new { row.Id, row.ActorId, row.Action, row.CreatedAt });
        return rows.Where(row => row.Action != "Archived").Select(row =>
        {
            var revision = JsonSerializer.Deserialize<SyllabusRecord>(row.Snapshot, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            return (object)new { row.Id, row.ActorId, row.Action, row.CreatedAt, revision.Version, revision.RevisionNotes, Revision = revision };
        }).ToArray();
    }

    public async Task<SyllabusDownload?> Download(SyllabusAccess access, long documentId)
    {
        await using var db = Connect();
        var args = new DynamicParameters(access);
        args.Add("DocumentId", documentId);
        return await db.QuerySingleOrDefaultAsync<SyllabusDownload>($"""
            SELECT {DocumentColumns}, d.content
            FROM syllabus_documents d JOIN syllabi s ON s.syllabus_id = d.syllabus_id
            WHERE d.document_id = @DocumentId AND (@Portal = 0 OR d.superseded_at IS NULL) AND {Visibility}
            """, args);
    }

    private static BadHttpRequestException Missing(string message) => new(message, StatusCodes.Status404NotFound);
    private static BadHttpRequestException Conflict(string message) => new(message, StatusCodes.Status409Conflict);
}
