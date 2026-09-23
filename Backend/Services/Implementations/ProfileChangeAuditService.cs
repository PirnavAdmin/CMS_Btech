using System.Text.Json;
using BTech.DTOs.ProfileAudit;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class ProfileChangeAuditService : IProfileChangeAuditService
    {
        private readonly IProfileChangeAuditRepository _repository;
        private readonly ILogger<ProfileChangeAuditService> _logger;

        public ProfileChangeAuditService(
            IProfileChangeAuditRepository repository,
            ILogger<ProfileChangeAuditService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task RecordAsync(
            long userId,
            long changedBy,
            IReadOnlyCollection<ProfileFieldChangeDto> changes)
        {
            if (changes.Count == 0)
            {
                _logger.LogDebug(
                    "No changed profile fields found; audit record skipped. UserId={UserId}",
                    userId);
                return;
            }

            var json = JsonSerializer.Serialize(changes);
            await _repository.CreateAsync(userId, changedBy, json);

            _logger.LogInformation(
                "Profile changes recorded. UserId={UserId}, ChangedBy={ChangedBy}, FieldCount={FieldCount}",
                userId,
                changedBy,
                changes.Count);
        }

        public async Task<IReadOnlyList<ProfileChangeAuditResponseDto>> GetByUserIdAsync(long userId)
        {
            var records = await _repository.GetByUserIdAsync(userId);

            return records.Select(x => new ProfileChangeAuditResponseDto
            {
                ProfileChangeAuditId = x.ProfileChangeAuditId,
                UserId = x.UserId,
                ChangedBy = x.ChangedBy,
                ChangedByName = x.ChangedByName,
                ChangedAt = x.ChangedAt,
                ChangedInformation = DeserializeChanges(x.ChangedInformation)
            }).ToList();
        }

        private static List<ProfileFieldChangeDto> DeserializeChanges(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<List<ProfileFieldChangeDto>>(
                    json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            }
            catch (JsonException)
            {
                return new();
            }
        }
    }
}
