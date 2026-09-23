using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations;

public class AcademicYearRepository : IAcademicYearRepository
{
    private readonly ApplicationDbContext _context;

    public AcademicYearRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // ADD ACADEMIC YEAR
    // =========================================================

    public async Task<AcademicYear?> AddAsync(
        string academicYearName,
        DateTime startDate,
        DateTime endDate,
        long? createdBy)
    {
        var entity = new AcademicYear
        {
            AcademicYearName = academicYearName,
            StartDate = startDate,
            EndDate = endDate,
            // New academic years are upcoming. Activation is explicit so
            // creating a record can never produce a second active year.
            Status = 0,
            IsArchived = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        _context.AcademicYears.Add(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    // =========================================================
    // GET ALL ACADEMIC YEARS
    // =========================================================

    public async Task<IEnumerable<AcademicYear>> GetAllAsync()
    {
        return await _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .OrderByDescending(x => x.StartDate)
            .ToListAsync();
    }


    // =========================================================
    // ACADEMIC YEAR DASHBOARD
    // =========================================================

    public async Task<BTech.DTOs.AcademicYear.AcademicYearDashboardDto>
        GetDashboardAsync(string? search, string? filter)
    {
        var query = _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.DeletedAt == null);

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
            var term = search.Trim().ToLower();

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

        var all = await query
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.AcademicYearId)
            .ToListAsync();

        var allNonDeleted = _context.AcademicYears
            .AsNoTracking()
            .Where(x => x.DeletedAt == null);

        var total = await allNonDeleted.CountAsync();
        var active = await allNonDeleted.CountAsync(x => x.Status == 1 && x.IsArchived == 0);
        var upcoming = await allNonDeleted.CountAsync(x => x.Status == 0 && x.IsArchived == 0);
        var archived = await allNonDeleted.CountAsync(x => x.IsArchived == 1);

        var activeEntity = await allNonDeleted
            .Where(x => x.Status == 1 && x.IsArchived == 0)
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.AcademicYearId)
            .FirstOrDefaultAsync();

        static BTech.DTOs.AcademicYear.AcademicYearResponseDto MapDashboard(
            BTech.Models.AcademicYear x)
        {
            return new BTech.DTOs.AcademicYear.AcademicYearResponseDto
            {
                AcademicYearId = x.AcademicYearId,
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

        return new BTech.DTOs.AcademicYear.AcademicYearDashboardDto
        {
            ActiveAcademicYear = activeEntity == null ? null : MapDashboard(activeEntity),
            TotalAcademicYears = total,
            ActiveYears = active,
            UpcomingYears = upcoming,
            ArchivedYears = archived,
            AcademicYears = all.Select(MapDashboard).ToList()
        };
    }

    // =========================================================
    // GENERATE NEXT ACADEMIC YEAR
    // =========================================================

    public async Task<AcademicYear?> GenerateNextYearAsync(
        bool activateImmediately,
        long? createdBy)
    {
        var lastYear = await _context.AcademicYears
            .Where(x => x.DeletedAt == null)
            .OrderByDescending(x => x.EndDate)
            .ThenByDescending(x => x.AcademicYearId)
            .FirstOrDefaultAsync();

        if (lastYear == null)
        {
            throw new InvalidOperationException(
                "Create the first academic year manually before generating the next year.");
        }

        var startDate = lastYear.EndDate.Date.AddDays(1);
        var endDate = startDate.AddYears(1).AddDays(-1);
        var academicYearName =
            $"{startDate.Year}-{(endDate.Year % 100):00}";

        var exists = await _context.AcademicYears
            .AnyAsync(x =>
                x.DeletedAt == null &&
                x.AcademicYearName == academicYearName);

        if (exists)
        {
            throw new InvalidOperationException(
                "Next academic year already exists.");
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);

        try
        {
            if (activateImmediately)
            {
                var activeYears = await _context.AcademicYears
                    .Where(x =>
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
                AcademicYearName = academicYearName,
                StartDate = startDate,
                EndDate = endDate,
                Status = activateImmediately ? (sbyte)1 : (sbyte)0,
                IsArchived = 0,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy
            };

            _context.AcademicYears.Add(entity);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return entity;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // =========================================================
    // GET BY ID
    // =========================================================

    public async Task<AcademicYear?> GetByIdAsync(
        long academicYearId)
    {
        return await _context.AcademicYears
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.DeletedAt == null);
    }

    // =========================================================
    // EDIT ACADEMIC YEAR
    // =========================================================

    public async Task<AcademicYear?> EditAsync(
        long academicYearId,
        string academicYearName,
        DateTime startDate,
        DateTime endDate,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.DeletedAt == null);

        if (entity == null)
        {
            return null;
        }

        entity.AcademicYearName = academicYearName;
        entity.StartDate = startDate;
        entity.EndDate = endDate;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        return entity;
    }

    // =========================================================
    // ACTIVATE
    // =========================================================

    public async Task<bool> ActivateAsync(
        long academicYearId,
        long? updatedBy)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);

        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.DeletedAt == null);

        if (entity == null)
        {
            await transaction.RollbackAsync();
            return false;
        }

        var previouslyActive = await _context.AcademicYears
            .Where(x =>
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

        // Persist deactivation first so the database unique guard is never
        // temporarily violated while switching the active year.
        if (previouslyActive.Count > 0)
            await _context.SaveChangesAsync();

        entity.Status = 1;
        entity.IsArchived = 0;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return true;
    }

    // =========================================================
    // DEACTIVATE
    // =========================================================

    public async Task<bool> DeactivateAsync(
        long academicYearId,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.DeletedAt == null);

        if (entity == null)
        {
            return false;
        }

        entity.Status = 0;
        entity.IsArchived = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        return true;
    }

    // =========================================================
    // ARCHIVE ACADEMIC YEAR
    // =========================================================

    public async Task<AcademicYear?> ArchiveAsync(
        long academicYearId,
        long? updatedBy)
    {
        var entity = await _context.AcademicYears
            .FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.DeletedAt == null &&
                x.IsArchived == 0);

        if (entity == null)
        {
            return null;
        }

        entity.IsArchived = 1;
        entity.Status = 0;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        return entity;
    }
}
