using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations
{
    public class CollegeUserMappingService
        : ICollegeUserMappingService
    {
        private readonly ApplicationDbContext _context;

        public CollegeUserMappingService(
            ApplicationDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // GET ALL USER-COLLEGE MAPPINGS
        // =====================================================

        public async Task<
            IReadOnlyList<CollegeUserMappingDto>>
            GetAllAsync()
        {
            return await
                (
                    from mapping
                        in _context.CollegeUserMappings

                    join setting
                        in _context.CollegeSettings
                        on mapping.CollegeSettingId
                        equals setting.Id

                    // College name and code now come from
                    // the College/Institution master.
                    join college
                        in _context.Colleges
                        on setting.CollegeId
                        equals college.CollegeId

                    where college.DeletedAt == null

                    select new CollegeUserMappingDto
                    {
                        Id =
                            mapping.Id,

                        UserId =
                            mapping.UserId,

                        CollegeSettingId =
                            mapping.CollegeSettingId,

                        CollegeName =
                            college.CollegeName,

                        CollegeCode =
                            college.CollegeCode,

                        Status =
                            mapping.Status,

                        AssignedAt =
                            mapping.AssignedAt,

                        AssignedBy =
                            mapping.AssignedBy,

                        UpdatedAt =
                            mapping.UpdatedAt,

                        UpdatedBy =
                            mapping.UpdatedBy,

                        RemovedAt =
                            mapping.RemovedAt,

                        RemovedBy =
                            mapping.RemovedBy
                    }
                )
                .AsNoTracking()
                .ToListAsync();
        }

        // =====================================================
        // GET MAPPINGS BY USER ID
        // =====================================================

        public async Task<
            IReadOnlyList<CollegeUserMappingDto>>
            GetByUserIdAsync(
                long userId)
        {
            return await
                (
                    from mapping
                        in _context.CollegeUserMappings

                    join setting
                        in _context.CollegeSettings
                        on mapping.CollegeSettingId
                        equals setting.Id

                    join college
                        in _context.Colleges
                        on setting.CollegeId
                        equals college.CollegeId

                    where mapping.UserId == userId
                       && college.DeletedAt == null

                    select new CollegeUserMappingDto
                    {
                        Id =
                            mapping.Id,

                        UserId =
                            mapping.UserId,

                        CollegeSettingId =
                            mapping.CollegeSettingId,

                        CollegeName =
                            college.CollegeName,

                        CollegeCode =
                            college.CollegeCode,

                        Status =
                            mapping.Status,

                        AssignedAt =
                            mapping.AssignedAt,

                        AssignedBy =
                            mapping.AssignedBy,

                        UpdatedAt =
                            mapping.UpdatedAt,

                        UpdatedBy =
                            mapping.UpdatedBy,

                        RemovedAt =
                            mapping.RemovedAt,

                        RemovedBy =
                            mapping.RemovedBy
                    }
                )
                .AsNoTracking()
                .ToListAsync();
        }

        // =====================================================
        // ASSIGN COLLEGE TO USER
        // =====================================================

        public async Task<(bool Success, string Message)>
            AssignAsync(
                long userId,
                long collegeSettingId,
                long assignedBy)
        {
            var userExists =
                await _context.Users
                    .AnyAsync(x =>
                        x.user_id == userId &&
                        x.Status == 1 &&
                        x.DeletedAt == null);

            if (!userExists)
            {
                return (
                    false,
                    "User not found or inactive.");
            }

            // Validate both the Settings record and its
            // connected College/Institution master record.
            var collegeExists =
                await
                (
                    from setting
                        in _context.CollegeSettings

                    join college
                        in _context.Colleges
                        on setting.CollegeId
                        equals college.CollegeId

                    where setting.Id ==
                              collegeSettingId

                       && setting.Status == 1

                       && college.Status == 1

                       && college.DeletedAt == null

                    select setting.Id
                )
                .AnyAsync();

            if (!collegeExists)
            {
                return (
                    false,
                    "College not found or inactive.");
            }

            var mapping =
                await _context.CollegeUserMappings
                    .FirstOrDefaultAsync(x =>
                        x.UserId == userId &&
                        x.CollegeSettingId ==
                            collegeSettingId);

            if (mapping != null &&
                mapping.Status == 1)
            {
                return (
                    false,
                    "User is already mapped to this college.");
            }

            if (mapping != null)
            {
                mapping.Status = 1;

                mapping.AssignedAt =
                    DateTime.UtcNow;

                mapping.AssignedBy =
                    assignedBy;

                mapping.UpdatedAt =
                    DateTime.UtcNow;

                mapping.UpdatedBy =
                    assignedBy;

                mapping.RemovedAt =
                    null;

                mapping.RemovedBy =
                    null;
            }
            else
            {
                mapping =
                    new CollegeUserMapping
                    {
                        UserId =
                            userId,

                        CollegeSettingId =
                            collegeSettingId,

                        Status =
                            1,

                        AssignedAt =
                            DateTime.UtcNow,

                        AssignedBy =
                            assignedBy
                    };

                await _context
                    .CollegeUserMappings
                    .AddAsync(mapping);
            }

            await _context.SaveChangesAsync();

            return (
                true,
                "College mapped to user successfully.");
        }

        // =====================================================
        // REMOVE COLLEGE FROM USER
        // =====================================================

        public async Task<(bool Success, string Message)>
            RemoveAsync(
                long userId,
                long collegeSettingId,
                long removedBy)
        {
            var mapping =
                await _context.CollegeUserMappings
                    .FirstOrDefaultAsync(x =>
                        x.UserId == userId &&
                        x.CollegeSettingId ==
                            collegeSettingId &&
                        x.Status == 1);

            if (mapping == null)
            {
                return (
                    false,
                    "Active college mapping not found.");
            }

            mapping.Status = 0;

            mapping.RemovedAt =
                DateTime.UtcNow;

            mapping.RemovedBy =
                removedBy;

            mapping.UpdatedAt =
                DateTime.UtcNow;

            mapping.UpdatedBy =
                removedBy;

            await _context.SaveChangesAsync();

            return (
                true,
                "College mapping removed successfully.");
        }
    }
}