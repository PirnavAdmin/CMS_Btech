using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController, Authorize, Route("api/v1/profile/photo")]
public sealed class ProfilePhotoController(IConfiguration configuration, IWebHostEnvironment environment) : ControllerBase
{
    [HttpPost, RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0 || file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, message = "Choose a photo of 5 MB or smaller." });
        var extension=Path.GetExtension(file.FileName).ToLowerInvariant();
        await using var input=file.OpenReadStream();
        var header=new byte[12];var read=await input.ReadAsync(header,ct);
        var valid=read>=12 && extension switch
        {
            ".png" => header.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}),
            ".jpg" or ".jpeg" => header[0]==255&&header[1]==216&&header[2]==255,
            ".webp" => System.Text.Encoding.ASCII.GetString(header,0,4)=="RIFF" && System.Text.Encoding.ASCII.GetString(header,8,4)=="WEBP",
            _ => false
        };
        if(!valid)return BadRequest(new{success=false,message="Upload a valid PNG, JPEG or WebP image."});
        if(CollegeDataScope.HasRole(HttpContext,"STUDENT"))
            throw new ContractException(403,"STUDENT_PROFILE_REQUIRED","Update a student's photograph through the student profile API.");
        var actor=CollegeDataScope.Actor(HttpContext);
        var directory=Path.Combine(environment.ContentRootPath,"wwwroot","uploads","profile-photos");
        Directory.CreateDirectory(directory);
        var name=$"{Guid.NewGuid():N}{extension}";var path=Path.Combine(directory,name);
        var imagePath="/uploads/profile-photos/"+name;
        await using var c=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await c.OpenAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        try
        {
            await using(var output=new FileStream(path,FileMode.CreateNew,FileAccess.Write))
            { await output.WriteAsync(header.AsMemory(0,read),ct);await input.CopyToAsync(output,ct); }
            await c.ExecuteAsync(new CommandDefinition("""
                INSERT INTO employee_profiles(user_id,profile_image_path,status,created_by,updated_by)
                VALUES(@actor,@imagePath,1,@actor,@actor)
                ON DUPLICATE KEY UPDATE profile_image_path=@imagePath,updated_by=@actor,updated_at=UTC_TIMESTAMP()
                """,new{actor,imagePath},tx,cancellationToken:ct));
            await c.ExecuteAsync(new CommandDefinition("""
                INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id)
                SELECT college_id,'profile-photo',user_id,'PHOTO_UPDATED',@actor,@trace FROM users WHERE user_id=@actor
                """,new{actor,trace=HttpContext.TraceIdentifier},tx,cancellationToken:ct));
            await tx.CommitAsync(ct);
            return Ok(new{success=true,data=new{profileImagePath=imagePath}});
        }
        catch { if(System.IO.File.Exists(path))System.IO.File.Delete(path);throw; }
    }
}
