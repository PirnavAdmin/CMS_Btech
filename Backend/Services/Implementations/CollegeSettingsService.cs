using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations;

public class CollegeSettingsService
    : ICollegeSettingsService
{
    private readonly ICollegeSettingsRepository _repository;
    private readonly ApplicationDbContext _context;

    public CollegeSettingsService(
        ICollegeSettingsRepository repository,
        ApplicationDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    // =====================================================
    // GET ALL SETTINGS
    // =====================================================

    public async Task<List<CollegeSettingDto>> GetAllAsync()
    {
        var settings =
            await _repository.GetAllAsync();

        return settings
            .Select(Map)
            .ToList();
    }

    // =====================================================
    // GET BY SETTINGS ID
    // =====================================================

    public async Task<CollegeSettingDto?> GetByIdAsync(
        long id)
    {
        var setting =
            await _repository.GetByIdAsync(id);

        return setting == null
            ? null
            : Map(setting);
    }

    // =====================================================
    // GET BY MASTER COLLEGE ID
    // =====================================================

    public async Task<CollegeSettingDto?> GetByCollegeIdAsync(
        long collegeId)
    {
        var setting =
            await _repository.GetByCollegeIdAsync(collegeId);

        return setting == null
            ? null
            : Map(setting);
    }

    // =====================================================
    // CREATE SETTINGS
    // =====================================================

    public async Task<CollegeSettingDto> CreateAsync(
        CollegeSettingRequestDto request)
    {
        // Resolve the college from the College/Institution master.
        var college =
            await ResolveCollegeAsync(request);

        // One Settings row is allowed per master college.
        var existing =
            await _repository.GetByCollegeIdAsync(
                college.CollegeId);

        if (existing != null)
        {
            throw new InvalidOperationException(
                "College settings already exist for this college.");
        }

        var setting = Apply(
            new CollegeSetting
            {
                CollegeId = college.CollegeId,
                CreatedAt = DateTime.UtcNow
            },
            request,
            college);

        var created =
            await _repository.CreateAsync(setting);

        return Map(created);
    }

    // =====================================================
    // UPDATE SETTINGS
    // =====================================================

    public async Task<CollegeSettingDto?> UpdateAsync(
        long id,
        CollegeSettingRequestDto request)
    {
        var setting =
            await _repository.GetByIdAsync(id);

        if (setting == null)
        {
            return null;
        }

        // Use CollegeId when supplied. Otherwise resolve using
        // CollegeCode or the setting's existing CollegeId.
        var college =
            await ResolveCollegeAsync(
                request,
                setting.CollegeId);

        var existingForCollege =
            await _repository.GetByCollegeIdAsync(
                college.CollegeId);

        if (existingForCollege != null &&
            existingForCollege.Id != id)
        {
            throw new InvalidOperationException(
                "College settings already exist for this college.");
        }

        Apply(
            setting,
            request,
            college);

        setting.UpdatedAt =
            DateTime.UtcNow;

        var updated =
            await _repository.UpdateAsync(setting);

        return Map(updated);
    }

    // =====================================================
    // APPLY REQUEST VALUES
    // =====================================================

    private static CollegeSetting Apply(
        CollegeSetting setting,
        CollegeSettingRequestDto request,
        College college)
    {
        // These values always come from the master.
        // Do not save a separately entered college name/code.
        setting.CollegeId =
            college.CollegeId;

        setting.CollegeName =
            college.CollegeName;

        setting.CollegeCode =
            college.CollegeCode;

        // Settings-specific values
        setting.CollegeEmail =
            request.CollegeEmail?.Trim();

        setting.PhoneNumber =
            request.PhoneNumber?.Trim();

        setting.Website =
            request.Website?.Trim();

        setting.AddressLine1 =
            request.AddressLine1?.Trim();

        setting.AddressLine2 =
            request.AddressLine2?.Trim();

        setting.City =
            request.City?.Trim();

        setting.State =
            request.State?.Trim();

        setting.Pincode =
            request.Pincode?.Trim();

        setting.AcademicYear =
            request.AcademicYear?.Trim();

        setting.Semester =
            request.Semester?.Trim();

        setting.InstitutionType =
            request.InstitutionType?.Trim();

        setting.DateFormat =
            string.IsNullOrWhiteSpace(request.DateFormat)
                ? "dd-MM-yyyy"
                : request.DateFormat.Trim();

        setting.TimeZone =
            string.IsNullOrWhiteSpace(request.TimeZone)
                ? "Asia/Kolkata"
                : request.TimeZone.Trim();

        setting.Status =
            request.Status;

        return setting;
    }

    // =====================================================
    // RESOLVE AND VALIDATE MASTER COLLEGE
    // =====================================================

    private async Task<College> ResolveCollegeAsync(
        CollegeSettingRequestDto request,
        long? fallbackCollegeId = null)
    {
        College? college;

        // Preferred lookup: colleges.college_id
        if (request.CollegeId.HasValue &&
            request.CollegeId.Value > 0)
        {
            college =
                await _context.Colleges
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.CollegeId ==
                            request.CollegeId.Value &&
                        x.DeletedAt == null);
        }

        // Compatibility lookup for the existing frontend
        else if (!string.IsNullOrWhiteSpace(
                     request.CollegeCode))
        {
            var collegeCode =
                request.CollegeCode
                    .Trim()
                    .ToUpperInvariant();

            college =
                await _context.Colleges
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.CollegeCode == collegeCode &&
                        x.DeletedAt == null);
        }

        // During update, retain the existing master college
        else if (fallbackCollegeId.HasValue)
        {
            college =
                await _context.Colleges
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.CollegeId ==
                            fallbackCollegeId.Value &&
                        x.DeletedAt == null);
        }

        else
        {
            throw new InvalidOperationException(
                "CollegeId or CollegeCode is required. " +
                "Select a college from the College/Institution master.");
        }

        if (college == null)
        {
            throw new InvalidOperationException(
                "College was not found in the " +
                "College/Institution master.");
        }

        // If both CollegeId and CollegeCode were supplied,
        // ensure they refer to the same master row.
        if (!string.IsNullOrWhiteSpace(
                request.CollegeCode) &&
            !string.Equals(
                request.CollegeCode.Trim(),
                college.CollegeCode,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "CollegeId and CollegeCode refer to " +
                "different colleges.");
        }

        // Prevent a second college name from being maintained
        // inside College Settings.
        if (!string.IsNullOrWhiteSpace(
                request.CollegeName) &&
            !string.Equals(
                request.CollegeName.Trim(),
                college.CollegeName,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "CollegeName must match the " +
                "College/Institution master.");
        }

        return college;
    }

    // =====================================================
    // MODEL TO RESPONSE DTO
    // =====================================================

    private static CollegeSettingDto Map(
        CollegeSetting setting)
    {
        return new CollegeSettingDto
        {
            Id =
                setting.Id,

            CollegeId =
                setting.CollegeId,

            CollegeName =
                setting.CollegeName,

            CollegeCode =
                setting.CollegeCode,

            CollegeEmail =
                setting.CollegeEmail,

            PhoneNumber =
                setting.PhoneNumber,

            Website =
                setting.Website,

            AddressLine1 =
                setting.AddressLine1,

            AddressLine2 =
                setting.AddressLine2,

            City =
                setting.City,

            State =
                setting.State,

            Pincode =
                setting.Pincode,

            AcademicYear =
                setting.AcademicYear,

            Semester =
                setting.Semester,

            InstitutionType =
                setting.InstitutionType,

            DateFormat =
                setting.DateFormat,

            TimeZone =
                setting.TimeZone,

            Status =
                setting.Status,

            CreatedAt =
                setting.CreatedAt,

            CreatedBy =
                setting.CreatedBy,

            UpdatedAt =
                setting.UpdatedAt,

            UpdatedBy =
                setting.UpdatedBy
        };
    }
}