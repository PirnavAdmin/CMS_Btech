using Microsoft.EntityFrameworkCore;
using BTech.Data;

namespace UserRoleManagement.API.Services
{
    public class CollegeService : ICollegeService
    {
        private readonly ApplicationDbContext _context;

        public CollegeService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string> UploadCollegeLogoAsync(
            long collegeId,
            IFormFile logo)
        {
            var college = await _context.Colleges
                .FindAsync(collegeId);

            if (college == null)
                throw new Exception("College not found");

            if (logo == null || logo.Length == 0)
                throw new Exception("Logo file is required");

            const long maxFileSize = 2 * 1024 * 1024;

            if (logo.Length > maxFileSize)
                throw new Exception(
                    "Logo size must not exceed 2 MB");

            var allowedExtensions = new[]
            {
                ".jpg",
                ".jpeg",
                ".png"
            };

            var extension = Path
                .GetExtension(logo.FileName)
                .ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new Exception(
                    "Only JPG, JPEG and PNG files are allowed");

            var uploadFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Uploads",
                "CollegeLogos");

            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            var fileName =
                $"{Guid.NewGuid()}{extension}";

            var filePath =
                Path.Combine(uploadFolder, fileName);

            using (var stream = new FileStream(
                filePath,
                FileMode.Create))
            {
                await logo.CopyToAsync(stream);
            }

            college.LogoPath = fileName;

            await _context.SaveChangesAsync();

            return fileName;
        }

        public async Task<(byte[] FileBytes, string ContentType)> GetCollegeLogoAsync(
            long collegeId)
        {
            var college = await _context.Colleges
                .FindAsync(collegeId);

            if (college == null)
                throw new Exception("College not found");

            if (string.IsNullOrEmpty(college.LogoPath))
                throw new Exception("College logo not found");

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Uploads",
                "CollegeLogos",
                college.LogoPath);

            if (!File.Exists(filePath))
                throw new Exception("Logo file not found");

            var fileBytes =
                await File.ReadAllBytesAsync(filePath);

            var extension = Path
                .GetExtension(filePath)
                .ToLowerInvariant();

            var contentType = extension switch
            {
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };

            return (fileBytes, contentType);
        }
    }
}