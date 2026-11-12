using Dapper;
using System.Data;
using Microsoft.EntityFrameworkCore.Storage;
using MySqlConnector;
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

        public async Task<(bool Success, string Message)> AssignAsync(long userId, long collegeSettingId, long assignedBy)
        {
            // The procedure locks the target account and enforces one live
            // college mapping for College Admin, including concurrent requests.
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var message = await _context.Database.GetDbConnection().QuerySingleAsync<string>(
                    "sp_cms_assign_college_user", new { p_user_id = userId,
                        p_college_setting_id = collegeSettingId, p_actor = assignedBy },
                    tx.GetDbTransaction(), commandType: CommandType.StoredProcedure);
                await tx.CommitAsync();
                return (true, message);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000" || ex.Number == 1062)
            {
                return (false, ex.Number == 1062 ? "This college assignment already exists." : ex.Message);
            }
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