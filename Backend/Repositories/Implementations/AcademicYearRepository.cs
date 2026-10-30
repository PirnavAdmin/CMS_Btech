using BTech.Data;
using BTech.DTOs.AcademicYear;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BTech.Repositories.Implementations;

public class AcademicYearRepository : IAcademicYearRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AcademicYearRepository> _logger;

    public AcademicYearRepository(
        ApplicationDbContext context,
        ILogger<AcademicYearRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AcademicYear?> AddAsync(
        long collegeId,
        string academicYearName,
        DateTime startDate,
        DateTime endDate,
        long? createdBy)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);
        await LockCollegeAsync(collegeId);

        var normalizedName = academicYearName.Trim().ToLowerInvariant();
        var nameExists = await _context.AcademicYears
            .AsNoTracking()
            .AnyAsync(x =>
                x.CollegeId == collegeId &&
                x.AcademicYearName.Trim().ToLower() == normalizedName);

        if (nameExists)
        {
            throw new InvalidOperationException(
                $"Academic year '{academicYearName.Trim()}' already exists for college {collegeId}.");
        }

        // Bootstrap only the first current year. Future/additional years still
        // require explicit activation and cannot replace an existing active year.
        var hasExistingYears = await _context.AcademicYears.AsNoTracking()
            .AnyAsync(x => x.CollegeId == collegeId && x.DeletedAt == null);
        var today = DateTime.UtcNow.Date;
        var activateFirstYear = !hasExistingYears && startDate.Date <= today && endDate.Date >= today;

        var entity = new AcademicYear
        {
            CollegeId = collegeId,
            AcademicYearName = academicYearName.Trim(),
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            Status = activateFirstYear ? (sbyte)1 : (sbyte)0,
            IsArchived = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        _context.AcademicYears.Add(entity);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation(
            "Academic year created. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActivatedFirstYear={ActivatedFirstYear}, ActorUserId={ActorUserId}",
            entity.AcademicYearId, collegeId, activateFirstYear, createdBy);

        return entity;
    }

    public async Task<IEnumerable<AcademicYear>> GetAllAsync(long collegeId)
    {
        return await _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.CollegeId == collegeId && x.DeletedAt == null)
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.AcademicYearId)
            .ToListAsync();
    }

    public async Task<AcademicYearDashboardDto> GetDashboardAsync(
        long collegeId,
        string? search,
        string? filter)
    {
        var query = _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.CollegeId == collegeId && x.DeletedAt == null);

        var normalizedFilter = string.IsNullOrWhiteSpace(filter)
            ? "all"
            : filter.Trim().ToLowerInvariant();

        if (normalizedFilter != "all" &&
            normalizedFilter != "active" &&
            normalizedFilter != "upcoming" &&
            normalizedFilter != "archived")
        {
            normalizedFilter = "all";
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();

            query = query.Where(x =>
                x.AcademicYearName.ToLower().Contains(term) ||
                (x.Status == 1 && "active".Contains(term)) ||
                (x.Status == 0 && x.IsArchived == 0 && "upcoming".Contains(term)) ||
                (x.IsArchived == 1 && "archived".Contains(term)));
        }

        query = normalizedFilter switch
        {
            "active" => query.Where(x => x.Status == 1 && x.IsArchived == 0),
            "upcoming" => query.Where(x => x.Status == 0 && x.IsArchived == 0),
            "archived" => query.Where(x => x.IsArchived == 1),
            _ => query
        };

        var filtered = await query
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.AcademicYearId)
            .ToListAsync();

        var allNonDeleted = _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.CollegeId == collegeId && x.DeletedAt == null);

        var total = await allNonDeleted.CountAsync();
        var active = await allNonDeleted.CountAsync(x => x.Status == 1 && x.IsArchived == 0);
        var upcoming = await allNonDeleted.CountAsync(x => x.Status == 0 && x.IsArchived == 0);
        var archived = await allNonDeleted.CountAsync(x => x.IsArchived == 1);

        var activeEntity = await allNonDeleted
            .Where(x => x.Status == 1 && x.IsArchived == 0)
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.AcademicYearId)
            .FirstOrDefaultAsync();

        static AcademicYearResponseDto MapDashboard(AcademicYear x)
        {
            return new AcademicYearResponseDto
            {
                AcademicYearId = x.AcademicYearId,
                CollegeId = x.CollegeId,
                AcademicYearName = x.AcademicYearName,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                Status = x.Status,
                IsArchived = x.IsArchived,
                CreatedAt = x.CreatedAt,
                CreatedBy = x.CreatedBy,
                UpdatedAt = x.UpdatedAt,
                UpdatedBy = x.UpdatedBy
            };
        }

        return new AcademicYearDashboardDto
        {
            CollegeId = collegeId,
            ActiveAcademicYear = activeEntity == null ? null : MapDashboard(activeEntity),
            TotalAcademicYears = total,
            ActiveYears = active,
            UpcomingYears = upcoming,
            ArchivedYears = archived,
            AcademicYears = filtered.Select(MapDashboard).ToList()
        };
    }

    public async Task<AcademicYear?> GenerateNextYearAsync(
        long collegeId,
        bool activateImmediately,
        long? createdBy,
        DateTime? firstStartDate = null)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);

        try
        {
            await LockCollegeAsync(collegeId);
            var lastYear = await _context.AcademicYears
                .Where(x => x.CollegeId == collegeId && x.DeletedAt == null)
                .OrderByDescending(x => x.EndDate)
                .ThenByDescending(x => x.AcademicYearId)
                .FirstOrDefaultAsync();

            if (lastYear == null && !firstStartDate.HasValue)
                throw new ArgumentException("StartDate is required to generate the first academic year for this college.");

            var startDate = lastYear == null ? firstStartDate!.Value.Date : lastYear.EndDate.Date.AddDays(1);
            if (startDate.Year < 1900 || startDate.Year > 9998)
                throw new ArgumentException("StartDate must be between 1900 and 9998.");
            var endDate = startDate.AddYears(1).AddDays(-1);
            var today = DateTime.UtcNow.Date;
            var shouldActivate = activateImmediately ||
                (lastYear == null && startDate <= today && endDate >= today);
            var academicYearName = $"{startDate.Year}-{(endDate.Year % 100):00}";
            var normalizedName = academicYearName.ToLowerInvariant();

            var exists = await _context.AcademicYears
                .AnyAsync(x =>
                    x.CollegeId == collegeId &&
                    x.AcademicYearName.Trim().ToLower() == normalizedName);

            if (exists)
            {
                throw new InvalidOperationException(
                    $"Academic year '{academicYearName}' already exists for college {collegeId}.");
            }

            if (shouldActivate)
            {
                var activeYears = await _context.AcademicYears
                    .Where(x =>
                        x.CollegeId == collegeId &&
                        x.Status == 1 &&
                        x.IsArchived == 0 &&
                        x.DeletedAt == null)
                    .ToListAsync();

                foreach (var activeYear in activeYears)
                {
                    activeYear.Status = 0;
                    activeYear.IsArchived = 1;
                    activeYear.UpdatedAt = DateTime.UtcNow;
                    activeYear.UpdatedBy = createdBy;
                }

                if (activeYears.Count > 0)
                    await _context.SaveChangesAsync();
            }

            var entity = new AcademicYear
            {
                CollegeId = collegeId,
                AcademicYearName = academicYearName,
                StartDate = startDate,
                EndDate = endDate,
                Status = shouldActivate ? (sbyte)1 : (sbyte)0,
                IsArchived = 0,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            };

            _context.AcademicYears.Add(entity);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation(
                "Next academic year generated. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActivatedImmediately={ActivatedImmediately}, ActorUserId={ActorUserId}",
                entity.AcademicYearId, collegeId, shouldActivate, createdBy);

            return entity;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<AcademicYear?> GetByIdAsync(
        long academicYearId,
        long collegeId)
    {
        return await _context.AcademicYears
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.CollegeId == collegeId &&
                x.DeletedAt == null);
    }

    public async Task<AcademicYear?> EditAsync(
        long academicYearId,
        long collegeId,
        string academicYearName,
        DateTime startDate,
        DateTime endDate,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.CollegeId == collegeId &&
                x.DeletedAt == null);

        if (entity == null)
            return null;

        var normalizedName = academicYearName.Trim().ToLowerInvariant();
        var duplicateName = await _context.AcademicYears
            .AsNoTracking()
            .AnyAsync(x =>
                x.CollegeId == collegeId &&
                x.AcademicYearId != academicYearId &&
                x.AcademicYearName.Trim().ToLower() == normalizedName);

        if (duplicateName)
        {
            throw new InvalidOperationException(
                $"Academic year '{academicYearName.Trim()}' already exists for college {collegeId}.");
        }

        entity.AcademicYearName = academicYearName.Trim();
        entity.StartDate = startDate.Date;
        entity.EndDate = endDate.Date;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Academic year updated. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}",
            academicYearId, collegeId, updatedBy);

        return entity;
    }

    public async Task<bool> ActivateAsync(
        long academicYearId,
        long collegeId,
        long? updatedBy)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);

        try
        {
            await LockCollegeAsync(collegeId);
            var entity = await _context.AcademicYears
                .FirstOrDefaultAsync(x =>
                    x.AcademicYearId == academicYearId &&
                    x.CollegeId == collegeId &&
                    x.DeletedAt == null);

            if (entity == null)
            {
                await transaction.RollbackAsync();
                return false;
            }

            var previouslyActive = await _context.AcademicYears
                .Where(x =>
                    x.CollegeId == collegeId &&
                    x.AcademicYearId != academicYearId &&
                    x.Status == 1 &&
                    x.IsArchived == 0 &&
                    x.DeletedAt == null)
                .ToListAsync();

            foreach (var activeYear in previouslyActive)
            {
                activeYear.Status = 0;
                activeYear.IsArchived = 1;
                activeYear.UpdatedAt = DateTime.UtcNow;
                activeYear.UpdatedBy = updatedBy;
            }

            if (previouslyActive.Count > 0)
                await _context.SaveChangesAsync();

            entity.Status = 1;
            entity.IsArchived = 0;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation(
                "Academic year activated. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}",
                academicYearId, collegeId, updatedBy);

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeactivateAsync(
        long academicYearId,
        long collegeId,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.CollegeId == collegeId &&
                x.DeletedAt == null);

        if (entity == null)
            return false;

        entity.Status = 0;
        entity.IsArchived = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Academic year deactivated/archived. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}",
            academicYearId, collegeId, updatedBy);

        return true;
    }

    public async Task<AcademicYear?> ArchiveAsync(
        long academicYearId,
        long collegeId,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.CollegeId == collegeId &&
                x.DeletedAt == null &&
                x.IsArchived == 0);

        if (entity == null)
            return null;

        entity.IsArchived = 1;
        entity.Status = 0;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Academic year archived. AcademicYearId={AcademicYearId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}",
            academicYearId, collegeId, updatedBy);

        return entity;
    }

    private async Task LockCollegeAsync(long collegeId)
    {
        // Lock an existing parent row, including when a college has no years yet.
        // All activation/creation paths take this lock before reading the years.
        var colleges = await _context.Database.SqlQuery<long>(
            $"SELECT college_id AS Value FROM colleges WHERE college_id = {collegeId} AND deleted_at IS NULL FOR UPDATE")
            .ToListAsync();
        if (colleges.Count != 1)
            throw new ArgumentException("The selected college does not exist.");
    }
}
