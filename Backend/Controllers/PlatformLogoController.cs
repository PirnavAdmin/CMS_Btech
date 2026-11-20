using BTech.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers;

[ApiController]
[Authorize]
[Route("api/platform-branding/logo")]
public sealed class PlatformLogoController(IWebHostEnvironment environment) : ControllerBase
{
    private const int MaxLogoSize = 2 * 1024 * 1024;
    private string LogoPath => Path.Combine(environment.ContentRootPath, "Uploads", "PlatformBranding", "logo");

    [AllowAnonymous]
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetLogo(CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = new FileStream(LogoPath, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete);
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();
            var contentType = GetImageType(bytes);
            if (contentType is null) return NotFound();
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return File(bytes, contentType);
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    [RequestSizeLimit(MaxLogoSize + 64 * 1024)]
    public async Task<IActionResult> UploadLogo(IFormFile? logo, CancellationToken cancellationToken)
    {
        if (HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is not true) return Forbid();
        if (logo is null || logo.Length == 0) return BadRequest(new { message = "Choose a logo file." });
        if (logo.Length > MaxLogoSize) return BadRequest(new { message = "Logo size must not exceed 2 MB." });

        using var buffer = new MemoryStream();
        await logo.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var expectedType = Path.GetExtension(logo.FileName).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => null
        };
        if (expectedType is null || GetImageType(bytes) != expectedType)
            return BadRequest(new { message = "Choose a valid JPG, JPEG or PNG image." });

        var path = LogoPath;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporaryPath = $"{path}.{Guid.NewGuid():N}.tmp";
        try
        {
            await System.IO.File.WriteAllBytesAsync(temporaryPath, bytes, cancellationToken);
            System.IO.File.Move(temporaryPath, path, overwrite: true);
        }
        finally
        {
            System.IO.File.Delete(temporaryPath);
        }

        return Ok(new { message = "Platform logo saved." });
    }

    private static string? GetImageType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return "image/png";
        if (bytes.StartsWith(new byte[] { 255, 216, 255 })) return "image/jpeg";
        return null;
    }
}
