using System.Data;
using Dapper;
using MySqlConnector;

namespace BTech.DocumentManagement;

public sealed class DocumentManagementStore
{
    private readonly string _connectionString;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger _logger;

    public DocumentManagementStore(IConfiguration configuration, IWebHostEnvironment environment, ILogger logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is required.");
        _environment = environment;
        _logger = logger;
    }

    private MySqlConnection Connection() => new(_connectionString);
    private static CommandDefinition Command(string name, object args, CancellationToken ct)
        => new(name, args, commandType: CommandType.StoredProcedure, cancellationToken: ct);
    private static DynamicParameters Parameters(DocumentActor actor)
    {
        var p = new DynamicParameters();
        p.Add("p_actor_id", actor.UserId);
        p.Add("p_college_id", actor.CollegeId);
        return p;
    }
    public static string NormalizeEntityType(string? value)
    {
        var result = value?.Trim().ToUpperInvariant();
        return result is "STUDENT" or "FACULTY" ? result
            : throw new DocumentApiException(400, "EntityType must be STUDENT or FACULTY.");
    }
    private static void Positive(long id)
    {
        if (id <= 0) throw new DocumentApiException(400, "ID must be greater than zero.");
    }
    private static void Entity(DynamicParameters p, string? type, long id)
    {
        Positive(id);
        p.Add("p_entity_type", NormalizeEntityType(type));
        p.Add("p_entity_id", id);
    }
    private static DynamicParameters UploadParameters(DocumentActor actor, DocumentUploadRequest request)
    {
        var p = Parameters(actor);
        Entity(p, request.EntityType, request.EntityId);
        Positive(request.CategoryId);
        if (string.IsNullOrWhiteSpace(request.DocumentTitle)) throw new DocumentApiException(400, "DocumentTitle is required.");
        if (request.IssueDate?.Year < 1000 || request.ExpiryDate?.Year < 1000)
            throw new DocumentApiException(400, "IssueDate and ExpiryDate must be valid dates from year 1000 onwards.");
        p.Add("p_category_id", request.CategoryId);
        p.Add("p_issue_date", request.IssueDate?.Date, DbType.Date);
        p.Add("p_expiry_date", request.ExpiryDate?.Date, DbType.Date);
        return p;
    }

    public async Task<IReadOnlyList<DocumentCategoryResponse>> GetCategoriesAsync(DocumentActor actor, string? entityType, bool includeInactive, CancellationToken ct)
    {
        var p = Parameters(actor);
        p.Add("p_entity_type", string.IsNullOrWhiteSpace(entityType) ? null : NormalizeEntityType(entityType));
        p.Add("p_include_inactive", includeInactive);
        await using var db = Connection();
        return (await db.QueryAsync<DocumentCategoryResponse>(Command("sp_document_categories_get", p, ct))).AsList();
    }

    public async Task<DocumentDashboardResponse> GetDashboardAsync(DocumentActor actor, CancellationToken ct)
    {
        await using var db = Connection();
        using var results = await db.QueryMultipleAsync(Command("sp_document_dashboard_get", Parameters(actor), ct));
        var summary = await results.ReadSingleAsync<DocumentDashboardResponse>();
        summary.RecentDocuments = (await results.ReadAsync<DocumentResponse>()).AsList();
        return summary;
    }

    public async Task<DocumentEntityPermissions> GetAccessAsync(DocumentActor actor, string entityType, long entityId, CancellationToken ct)
    {
        var p = Parameters(actor);
        Entity(p, entityType, entityId);
        await using var db = Connection();
        return await db.QuerySingleOrDefaultAsync<DocumentEntityPermissions>(Command("sp_document_entity_permissions", p, ct))
            ?? throw new DocumentApiException(403, "Access to this document entity is not permitted.");
    }

    public async Task<DocumentFileValidator.ValidatedFile> ValidateAsync(DocumentActor actor, DocumentUploadRequest request, CancellationToken ct)
    {
        var p = UploadParameters(actor, request);
        await using var db = Connection();
        await db.ExecuteAsync(Command("sp_document_validate_upload", p, ct));
        var file = await DocumentFileValidator.ValidateAsync(request.File, ct);
        _logger.LogInformation("Document upload validation passed. UserId={UserId}, EntityType={EntityType}, EntityId={EntityId}, FileBytes={FileBytes}",
            actor.UserId, NormalizeEntityType(request.EntityType), request.EntityId, file.Bytes.Length);
        return file;
    }

    public async Task<DocumentResponse> UploadAsync(DocumentActor actor, DocumentUploadRequest request, CancellationToken ct)
    {
        var file = await ValidateAsync(actor, request, ct);
        var p = UploadParameters(actor, request);
        var type = NormalizeEntityType(request.EntityType);
        var fileName = $"{Guid.NewGuid():N}{file.Extension}";
        var relativePath = $"Documents/{type}/{request.EntityId}/{fileName}";
        var physicalPath = ConfinedPath(Path.Combine(_environment.ContentRootPath, "App_Data", "DocumentStorage"), relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(physicalPath)!);
        var databaseAttempted = false;
        try
        {
            await using (var output = new FileStream(physicalPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true))
                await output.WriteAsync(file.Bytes.AsMemory(), ct);
            p.Add("p_title", request.DocumentTitle.Trim());
            p.Add("p_number", request.DocumentNumber?.Trim());
            p.Add("p_file_name", fileName);
            p.Add("p_original_name", file.OriginalName);
            p.Add("p_file_path", relativePath);
            p.Add("p_extension", file.Extension);
            p.Add("p_mime_type", file.MimeType);
            p.Add("p_remarks", request.Remarks?.Trim());
            p.Add("p_file_size", file.Bytes.LongLength);
            await using var db = Connection();
            await db.OpenAsync(ct);
            databaseAttempted = true;
            var created = await db.QuerySingleAsync<DocumentResponse>(Command("sp_document_upload", p, ct));
            _logger.LogInformation("Document and submission history saved. DocumentId={DocumentId}, UserId={UserId}", created.DocumentId, actor.UserId);
            return created;
        }
        catch (Exception ex)
        {
            // Preserve bytes when a connection loss makes the COMMIT outcome unknown.
            if (!databaseAttempted || ex is MySqlException { Number: 1644 or 1062 or 1452 or 1406 or 1213 or 1205 })
            {
                try { File.Delete(physicalPath); }
                catch (Exception cleanup) { _logger.LogError(cleanup, "Failed to remove uncommitted document file. StorageFile={StorageFile}", fileName); }
            }
            else _logger.LogError("Document save outcome is uncertain; retained file for reconciliation. StorageFile={StorageFile}, UserId={UserId}", fileName, actor.UserId);
            throw;
        }
    }

    public async Task<DocumentResponse> GetDocumentAsync(DocumentActor actor, long id, CancellationToken ct, string operation = "VIEW")
    {
        Positive(id);
        var p = Parameters(actor);
        p.Add("p_document_id", id);
        p.Add("p_operation", operation);
        await using var db = Connection();
        return await db.QuerySingleAsync<DocumentResponse>(Command("sp_document_get", p, ct));
    }

    public async Task<DocumentResponse> GetExpiryAsync(DocumentActor actor, long id, CancellationToken ct)
    {
        Positive(id);
        var p = Parameters(actor);
        p.Add("p_document_id", id);
        await using var db = Connection();
        return await db.QuerySingleAsync<DocumentResponse>(Command("sp_document_expiry_check", p, ct));
    }

    public async Task<(DocumentResponse Document, string PhysicalPath)> GetDownloadAsync(DocumentActor actor, long id, CancellationToken ct)
    {
        var document = await GetDocumentAsync(actor, id, ct, "DOWNLOAD");
        var relative = (document.FilePath ?? "").Replace('\\', '/');
        var prefix = $"Documents/{NormalizeEntityType(document.EntityType)}/{document.EntityId}/";
        var expectedNew = prefix + document.FileName;
        var expectedLegacy = "Uploads/" + expectedNew;
        if (string.IsNullOrEmpty(document.FileName) || document.FileName.Contains('/') || document.FileName.Contains('\\'))
            throw new DocumentApiException(400, "Invalid document file path.");
        string path;
        if (relative == expectedNew)
            path = ConfinedPath(Path.Combine(_environment.ContentRootPath, "App_Data", "DocumentStorage"), relative);
        else if (relative == expectedLegacy)
        {
            path = ConfinedPath(string.IsNullOrWhiteSpace(_environment.WebRootPath) ? _environment.ContentRootPath : _environment.WebRootPath, relative);
            if (!File.Exists(path)) path = ConfinedPath(_environment.ContentRootPath, relative);
        }
        else throw new DocumentApiException(400, "Invalid document file path.");
        if (!File.Exists(path)) throw new DocumentApiException(404, "Document file was not found on the server.");
        _logger.LogInformation("Document download authorized. DocumentId={DocumentId}, UserId={UserId}", id, actor.UserId);
        return (document, path);
    }

    public static string ConfinedPath(string root, string relative)
    {
        if (Path.IsPathRooted(relative) || relative.Split('/', '\\').Any(x => x is ".." or "."))
            throw new DocumentApiException(400, "Invalid document file path.");
        var normalizedRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        var full = Path.GetFullPath(Path.Combine(normalizedRoot, relative.Replace('/', Path.DirectorySeparatorChar)));
        if (!full.StartsWith(normalizedRoot, comparison)) throw new DocumentApiException(400, "Invalid document file path.");
        for (FileSystemInfo? current = new FileInfo(full); current != null; current = current is FileInfo f ? f.Directory : ((DirectoryInfo)current).Parent)
        {
            if (current.Exists && (current.Attributes & FileAttributes.ReparsePoint) != 0)
                throw new DocumentApiException(400, "Linked document storage paths are not allowed.");
            if (string.Equals(current.FullName.TrimEnd(Path.DirectorySeparatorChar), normalizedRoot.TrimEnd(Path.DirectorySeparatorChar), comparison)) break;
        }
        return full;
    }

    public async Task<DocumentApprovalResponse> ApproveAsync(DocumentActor actor, long id, DocumentApprovalRequest request, CancellationToken ct)
    {
        Positive(id);
        var p = Parameters(actor);
        p.Add("p_document_id", id);
        p.Add("p_action", request.Action?.Trim().ToUpperInvariant());
        p.Add("p_level", request.ApprovalLevel);
        p.Add("p_comments", request.Comments?.Trim());
        await using var db = Connection();
        var result = await db.QuerySingleAsync<DocumentApprovalResponse>(Command("sp_document_approval", p, ct));
        _logger.LogInformation("Document workflow changed. DocumentId={DocumentId}, UserId={UserId}, Action={Action}, Status={Status}", id, actor.UserId, result.Action, result.DocumentStatus);
        return result;
    }

    public async Task<ExpiredDocumentsResponse> GetExpiredAsync(DocumentActor actor, string? entityType, CancellationToken ct)
    {
        var p = Parameters(actor);
        p.Add("p_entity_type", string.IsNullOrWhiteSpace(entityType) ? null : NormalizeEntityType(entityType));
        await using var db = Connection();
        var rows = (await db.QueryAsync<DocumentResponse>(Command("sp_document_expired_get", p, ct))).AsList();
        return new ExpiredDocumentsResponse { Total = rows.Count, Documents = rows };
    }

    public async Task<IReadOnlyList<DocumentEntityAccessResponse>> ListGrantsAsync(DocumentActor actor, string entityType, long entityId, CancellationToken ct)
    {
        var p = Parameters(actor);
        Entity(p, entityType, entityId);
        await using var db = Connection();
        return (await db.QueryAsync<DocumentEntityAccessResponse>(Command("sp_document_entity_access_list", p, ct))).AsList();
    }

    public async Task<DocumentEntityAccessResponse> SaveGrantAsync(DocumentActor actor, DocumentEntityAccessRequest request, CancellationToken ct)
    {
        Positive(request.UserId);
        var p = Parameters(actor);
        Entity(p, request.EntityType, request.EntityId);
        p.Add("p_user_id", request.UserId);
        p.Add("p_download", request.CanDownload);
        p.Add("p_upload", request.CanUpload);
        p.Add("p_approve", request.CanApprove);
        p.Add("p_expires_at", request.ExpiresAt?.UtcDateTime);
        await using var db = Connection();
        var grant = await db.QuerySingleAsync<DocumentEntityAccessResponse>(Command("sp_document_entity_access_save", p, ct));
        _logger.LogInformation("Document entity access granted. AccessId={AccessId}, ActorId={ActorId}, UserId={UserId}, EntityType={EntityType}, EntityId={EntityId}",
            grant.AccessId, actor.UserId, grant.UserId, grant.EntityType, grant.EntityId);
        return grant;
    }

    public async Task<DocumentEntityAccessResponse> RevokeGrantAsync(DocumentActor actor, long accessId, CancellationToken ct)
    {
        Positive(accessId);
        var p = Parameters(actor);
        p.Add("p_access_id", accessId);
        await using var db = Connection();
        var grant = await db.QuerySingleAsync<DocumentEntityAccessResponse>(Command("sp_document_entity_access_revoke", p, ct));
        _logger.LogInformation("Document entity access revoked. AccessId={AccessId}, ActorId={ActorId}, UserId={UserId}", accessId, actor.UserId, grant.UserId);
        return grant;
    }
}
