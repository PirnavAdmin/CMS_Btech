using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BTech.DTOs.College;
using BTech.Models;
using BTech.Services;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class CollegeService : ICollegeService
    {
        private readonly ICollegeRepository _collegeRepository;
        private readonly IHttpContextAccessor _http;

        public CollegeService(
            ICollegeRepository collegeRepository, IHttpContextAccessor http)
        {
            _collegeRepository = collegeRepository;
            _http = http;
        }

        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<IEnumerable<CollegeResponseDto>>
            GetAllCollegesAsync(
                string? search = null,
                sbyte? status = null)
        {
            var colleges =
                await _collegeRepository.GetAllAsync(
                    search,
                    status);

            return colleges.Select(
                MapToResponseDto);
        }

        // =====================================================
        // SEARCH
        // =====================================================

        public async Task<PagedResponseDto<CollegeResponseDto>>
            SearchCollegesAsync(
                CollegeSearchFilterDto filter)
        {
            if (filter.PageNumber < 1)
            {
                filter.PageNumber = 1;
            }

            if (filter.PageSize < 1 ||
                filter.PageSize > 100)
            {
                filter.PageSize = 10;
            }

            var (items, totalCount) =
                await _collegeRepository.SearchAsync(
                    filter);

            var mappedItems =
                items.Select(MapToResponseDto);

            return new PagedResponseDto<CollegeResponseDto>(
                mappedItems,
                filter.PageNumber,
                filter.PageSize,
                totalCount);
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<CollegeResponseDto?>
            GetCollegeByIdAsync(
                long collegeId)
        {
            var college =
                await _collegeRepository.GetByIdAsync(
                    collegeId);

            return college == null
                ? null
                : MapToResponseDto(college);
        }

        // =====================================================
        // CREATE
        // =====================================================

        public async Task<CollegeResponseDto>
            CreateCollegeAsync(
                CreateCollegeDto dto,
                long? userId = null)
        {
            var scope = CollegeManagementScope.From(_http.HttpContext);
            if (!scope.IsSuperAdmin && !scope.IsCollegeAdmin)
                throw new BTech.Exceptions.ForbiddenException("Only College Admin and Super Admin can create colleges.");
            userId = scope.UserId;
            var codeExists =
                await _collegeRepository.ExistsCodeAsync(
                    dto.EffectiveCollegeCode);

            if (codeExists)
            {
                throw new InvalidOperationException(
                    $"College with code " +
                    $"'{dto.EffectiveCollegeCode}' " +
                    "already exists.");
            }

            var college =
                new College
                {
                    CollegeCode =
                        dto.EffectiveCollegeCode,

                    CollegeName =
                        dto.EffectiveCollegeName,

                    CollegeType =
                        dto.EffectiveCollegeType,

                    UniversityName =
                        dto.EffectiveUniversityName,

                    Email =
                        dto.Email,

                    Mobile =
                        dto.EffectiveMobile,

                    Phone =
                        dto.Phone,

                    Principal =
                        NormalizeOptional(dto.Principal),

                    PrincipalEmail =
                        NormalizeOptional(dto.PrincipalEmail),

                    PrincipalContact =
                        NormalizeOptional(dto.PrincipalContact),

                    AlternateContactNumber =
                        NormalizeOptional(
                            dto.AlternateContactNumber),

                    AccreditationStatus =
                        NormalizeOptional(
                            dto.AccreditationStatus),

                    AccreditationBody =
                        NormalizeOptional(
                            dto.AccreditationBody),

                    AccreditationGrade =
                        NormalizeOptional(
                            dto.AccreditationGrade),

                    AccreditationNumber =
                        NormalizeOptional(
                            dto.AccreditationNumber),

                    ValidFrom =
                        dto.ValidFrom,

                    ValidUntil =
                        dto.ValidUntil,

                    AddressLine1 =
                        dto.EffectiveAddressLine1,

                    AddressLine2 =
                        dto.AddressLine2,

                    City =
                        dto.City,

                    Area =
                        NormalizeOptional(dto.Area),

                    District =
                        NormalizeOptional(dto.District),

                    State =
                        dto.State,

                    Country =
                        dto.Country,

                    Pincode =
                        dto.Pincode,

                    Website =
                        dto.Website,

                    AcademicYearId =
                        dto.AcademicYearId,

                    Timezone =
                        dto.Timezone,

                    CurrencyCode =
                        dto.CurrencyCode,

                    LogoPath =
                        dto.EffectiveLogoPath,

                    Status =
                        1,

                    CreatedAt =
                        DateTime.UtcNow,

                    CreatedBy =
                        userId
                };

            var created =
                await _collegeRepository.AddAsync(
                    college);

            return MapToResponseDto(created);
        }

        // =====================================================
        // UPDATE
        // =====================================================

        public async Task<CollegeResponseDto?>
            UpdateCollegeAsync(
                long collegeId,
                UpdateCollegeDto dto,
                long? userId = null)
        {
            var college =
                await _collegeRepository.GetByIdAsync(
                    collegeId);

            if (college == null)
            {
                return null;
            }

            var nextCode =
                string.IsNullOrWhiteSpace(
                    dto.EffectiveCollegeCode)
                    ? college.CollegeCode
                    : dto.EffectiveCollegeCode;

            var codeChanged =
                !string.Equals(
                    nextCode,
                    college.CollegeCode,
                    StringComparison.OrdinalIgnoreCase);

            if (codeChanged &&
                await _collegeRepository.ExistsCodeAsync(
                    nextCode,
                    collegeId))
            {
                throw new InvalidOperationException(
                    $"College with code " +
                    $"'{nextCode}' already exists.");
            }

            college.CollegeCode =
                nextCode;

            college.CollegeName = dto.CollegeName == null && dto.Name == null ? college.CollegeName : dto.EffectiveCollegeName;

            college.CollegeType = dto.EffectiveCollegeType ?? college.CollegeType;

            college.UniversityName = dto.EffectiveUniversityName ?? college.UniversityName;

            college.Email = dto.Email ?? college.Email;

            college.Mobile = dto.EffectiveMobile ?? college.Mobile;

            college.Phone = dto.Phone ?? college.Phone;

            college.Principal = dto.Principal == null ? college.Principal : NormalizeOptional(dto.Principal);

            college.PrincipalEmail = dto.PrincipalEmail == null ? college.PrincipalEmail : NormalizeOptional(dto.PrincipalEmail);

            college.PrincipalContact = dto.PrincipalContact == null ? college.PrincipalContact : NormalizeOptional(dto.PrincipalContact);

            college.AlternateContactNumber = dto.AlternateContactNumber == null ? college.AlternateContactNumber : NormalizeOptional(dto.AlternateContactNumber);

            college.AccreditationStatus = dto.AccreditationStatus == null ? college.AccreditationStatus : NormalizeOptional(dto.AccreditationStatus);

            college.AccreditationBody = dto.AccreditationBody == null ? college.AccreditationBody : NormalizeOptional(dto.AccreditationBody);

            college.AccreditationGrade = dto.AccreditationGrade == null ? college.AccreditationGrade : NormalizeOptional(dto.AccreditationGrade);

            college.AccreditationNumber = dto.AccreditationNumber == null ? college.AccreditationNumber : NormalizeOptional(dto.AccreditationNumber);

            college.ValidFrom = dto.ValidFrom ?? college.ValidFrom;

            college.ValidUntil = dto.ValidUntil ?? college.ValidUntil;

            if (college.ValidFrom.HasValue &&
                college.ValidUntil.HasValue &&
                college.ValidUntil.Value < college.ValidFrom.Value)
            {
                throw new InvalidOperationException(
                    "Valid until must be on or after valid from.");
            }

            college.AddressLine1 = dto.EffectiveAddressLine1 ?? college.AddressLine1;

            college.AddressLine2 = dto.AddressLine2 ?? college.AddressLine2;

            college.City = dto.City ?? college.City;

            college.Area = dto.Area == null ? college.Area : NormalizeOptional(dto.Area);

            college.District = dto.District == null ? college.District : NormalizeOptional(dto.District);

            college.State = dto.State ?? college.State;

            college.Country = dto.Country ?? college.Country;

            college.Pincode = dto.Pincode ?? college.Pincode;

            college.Website = dto.Website ?? college.Website;

            college.AcademicYearId = dto.AcademicYearId ?? college.AcademicYearId;

            college.Timezone =
                string.IsNullOrWhiteSpace(
                    dto.Timezone)
                    ? college.Timezone
                    : dto.Timezone;

            college.CurrencyCode =
                string.IsNullOrWhiteSpace(
                    dto.CurrencyCode)
                    ? college.CurrencyCode
                    : dto.CurrencyCode;

            college.LogoPath =
                dto.EffectiveLogoPath
                ?? college.LogoPath;

            college.UpdatedAt =
                DateTime.UtcNow;

            college.UpdatedBy =
                userId;

            await _collegeRepository.UpdateAsync(
                college);

            return MapToResponseDto(college);
        }

        // =====================================================
        // UPDATE STATUS
        // =====================================================

        public async Task<CollegeResponseDto?>
            UpdateCollegeStatusAsync(
                long collegeId,
                UpdateCollegeStatusDto dto,
                long? userId = null)
        {
            var college =
                await _collegeRepository.UpdateStatusAsync(
                    collegeId,
                    dto.Status,
                    userId);

            return college == null
                ? null
                : MapToResponseDto(college);
        }

        // =====================================================
        // SOFT DELETE
        // =====================================================

        public async Task<bool> DeleteCollegeAsync(
            long collegeId,
            long? userId = null)
        {
            if (collegeId <= 0)
            {
                return false;
            }

            var college =
                await _collegeRepository.GetByIdAsync(
                    collegeId);

            if (college == null)
            {
                return false;
            }

            return await _collegeRepository.DeleteAsync(
                collegeId,
                userId);
        }

        // =====================================================
        // MODEL TO RESPONSE DTO
        // =====================================================

        private static string? NormalizeOptional(
            string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static CollegeResponseDto MapToResponseDto(
            College college)
        {
            return new CollegeResponseDto
            {
                CollegeId =
                    college.CollegeId,
                CreatedBy = college.CreatedBy,

                CollegeCode =
                    college.CollegeCode,

                CollegeName =
                    college.CollegeName,

                CollegeType =
                    college.CollegeType,

                UniversityName =
                    college.UniversityName,

                Email =
                    college.Email,

                Mobile =
                    college.Mobile,

                Phone =
                    college.Phone,

                Principal =
                    college.Principal,

                PrincipalEmail =
                    college.PrincipalEmail,

                PrincipalContact =
                    college.PrincipalContact,

                AlternateContactNumber =
                    college.AlternateContactNumber,

                AccreditationStatus =
                    college.AccreditationStatus,

                AccreditationBody =
                    college.AccreditationBody,

                AccreditationGrade =
                    college.AccreditationGrade,

                AccreditationNumber =
                    college.AccreditationNumber,

                ValidFrom =
                    college.ValidFrom,

                ValidUntil =
                    college.ValidUntil,

                AddressLine1 =
                    college.AddressLine1,

                AddressLine2 =
                    college.AddressLine2,

                City =
                    college.City,

                Area =
                    college.Area,

                District =
                    college.District,

                State =
                    college.State,

                Country =
                    college.Country,

                Pincode =
                    college.Pincode,

                Website =
                    college.Website,

                AcademicYearId =
                    college.AcademicYearId,

                Timezone =
                    college.Timezone,

                CurrencyCode =
                    college.CurrencyCode,

                LogoPath =
                    college.LogoPath,

                Status =
                    college.Status,

                CreatedAt =
                    college.CreatedAt,

                UpdatedAt =
                    college.UpdatedAt
            };
        }
    }
}
