 using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class FacultyDocumentService : IFacultyDocumentService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public FacultyDocumentService(
            ApplicationDbContext context,
            IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        // LIST
        public async Task<IEnumerable<FacultyDocumentResponseDto>> GetDocumentsAsync(
            long facultyId)
        {
            return await _context.FacultyDocuments
                .AsNoTracking()
                .Where(x =>
                    x.FacultyId == facultyId &&
                    x.DeletedAt == null &&
                    x.Status == 1)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new FacultyDocumentResponseDto
                {
                    FacultyDocumentId = x.FacultyDocumentId,
                    FacultyId = x.FacultyId,
                    UserId = x.UserId,

                    DocumentType = x.DocumentType,
                    DocumentName = x.DocumentName,

                    FileName = x.FileName,
                    OriginalFileName = x.OriginalFileName,

                    FilePath = x.FilePath,
                    FileUrl = x.FileUrl,

                    FileExtension = x.FileExtension,
                    MimeType = x.MimeType,
                    FileSize = x.FileSize,

                    DocumentNumber = x.DocumentNumber,

                    IssueDate = x.IssueDate,
                    ExpiryDate = x.ExpiryDate,

                    Remarks = x.Remarks,

                    IsVerified = x.IsVerified,
                    Status = x.Status,

                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();
        }

        // UPLOAD
        public async Task<FacultyDocumentResponseDto> UploadDocumentAsync(
            long facultyId,
            FacultyDocumentUploadDto request,
            string? createdBy)
        {
            if (request.File == null || request.File.Length == 0)
                throw new Exception("Please select a file.");

            if (string.IsNullOrWhiteSpace(request.DocumentType))
                throw new Exception("Document type is required.");

            if (string.IsNullOrWhiteSpace(request.DocumentName))
                throw new Exception("Document name is required.");

            // Check faculty
            var faculty = await _context.Faculties
                .FirstOrDefaultAsync(x =>
                    x.FacultyId == facultyId &&
                    x.DeletedAt == null);

            if (faculty == null)
                throw new Exception("Faculty not found.");

            // Maximum file size = 5 MB
            const long maxFileSize = 5 * 1024 * 1024;

            if (request.File.Length > maxFileSize)
                throw new Exception("File size cannot exceed 5 MB.");

            // Allowed extensions
            var allowedExtensions = new[]
            {
                ".pdf",
                ".jpg",
                ".jpeg",
                ".png"
            };

            var extension =
                Path.GetExtension(request.File.FileName)
                    .ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new Exception(
                    "Only PDF, JPG, JPEG and PNG files are allowed.");

            // Create folder
            var facultyCode = faculty.FacultyCode;

            var uploadFolder = Path.Combine(
                _environment.WebRootPath ?? _environment.ContentRootPath,
                "Uploads",
                "FacultyDocuments",
                facultyCode);

            Directory.CreateDirectory(uploadFolder);

            // Unique file name
            var storedFileName =
                $"{Guid.NewGuid():N}{extension}";

            var fullPath = Path.Combine(
                uploadFolder,
                storedFileName);

            using (var stream = new FileStream(
                fullPath,
                FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }

            string? createdById = null;

            if (long.TryParse(createdBy, out var parsedCreatedBy))
            {
                createdById = parsedCreatedBy.ToString();
            }

            long? createdByLong = null;

            if (long.TryParse(createdById, out var id))
            {
                createdByLong = id;
            }

            var document = new FacultyDocument
            {
                FacultyId = faculty.FacultyId,
                UserId = faculty.UserId,

                DocumentType = request.DocumentType,
                DocumentName = request.DocumentName,

                FileName = storedFileName,
                OriginalFileName = request.File.FileName,

                FilePath =
                    $"Uploads/FacultyDocuments/{facultyCode}/{storedFileName}",

                FileUrl =
                    $"/Uploads/FacultyDocuments/{facultyCode}/{storedFileName}",

                FileExtension = extension,
                MimeType = request.File.ContentType,
                FileSize = request.File.Length,

                DocumentNumber = request.DocumentNumber,

                IssueDate = request.IssueDate,
                ExpiryDate = request.ExpiryDate,

                Remarks = request.Remarks,

                IsVerified = 0,
                Status = 1,

                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdByLong
            };

            _context.FacultyDocuments.Add(document);

            await _context.SaveChangesAsync();

            return new FacultyDocumentResponseDto
            {
                FacultyDocumentId = document.FacultyDocumentId,
                FacultyId = document.FacultyId,
                UserId = document.UserId,

                DocumentType = document.DocumentType,
                DocumentName = document.DocumentName,

                FileName = document.FileName,
                OriginalFileName = document.OriginalFileName,

                FilePath = document.FilePath,
                FileUrl = document.FileUrl,

                FileExtension = document.FileExtension,
                MimeType = document.MimeType,
                FileSize = document.FileSize,

                DocumentNumber = document.DocumentNumber,

                IssueDate = document.IssueDate,
                ExpiryDate = document.ExpiryDate,

                Remarks = document.Remarks,

                IsVerified = document.IsVerified,
                Status = document.Status,

                CreatedAt = document.CreatedAt
            };
        }

        // DELETE
        // DELETE
        public async Task DeleteDocumentAsync(
            long facultyDocumentId,
            string? deletedBy)
        {
            var document = await _context.FacultyDocuments
                .FirstOrDefaultAsync(x =>
                    x.FacultyDocumentId == facultyDocumentId &&
                    x.DeletedAt == null);

            if (document == null)
                throw new Exception("Faculty document not found.");

            document.Status = 0;
            document.DeletedAt = DateTime.UtcNow;

            if (long.TryParse(deletedBy, out var deletedById))
            {
                document.DeletedBy = deletedById;
            }

            await _context.SaveChangesAsync();

            // Delete physical file
            if (!string.IsNullOrWhiteSpace(document.FilePath))
            {
                var physicalPath = Path.Combine(
                    _environment.WebRootPath ?? _environment.ContentRootPath,
                    document.FilePath.Replace(
                        '/',
                        Path.DirectorySeparatorChar));

                if (File.Exists(physicalPath))
                {
                    File.Delete(physicalPath);
                }
            }
        }
    }
}