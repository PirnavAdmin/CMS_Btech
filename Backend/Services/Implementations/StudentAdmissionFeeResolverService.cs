using BTech.DTOs.Fees;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class StudentAdmissionFeeResolverService : IStudentAdmissionFeeResolverService
    {
        private readonly IStudentAdmissionFeeResolverRepository _repository;
        private readonly ILogger<StudentAdmissionFeeResolverService> _logger;

        public StudentAdmissionFeeResolverService(
            IStudentAdmissionFeeResolverRepository repository,
            ILogger<StudentAdmissionFeeResolverService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<StudentAdmissionFeeResolveResultDto?> ResolveAndSaveAsync(
            long admissionId,
            StudentAdmissionFeeResolveRequestDto request,
            long actorUserId)
        {
            if (admissionId <= 0)
                throw new ArgumentException("A valid admission id is required.");
            if (actorUserId <= 0)
                throw new UnauthorizedAccessException("Invalid authenticated user.");

            if (request.HostelRequired && string.IsNullOrWhiteSpace(request.RoomType))
                throw new ArgumentException("RoomType is required when hostel is selected.");

            if (request.TransportationRequired &&
                request.RouteId is null &&
                string.IsNullOrWhiteSpace(request.RouteCode) &&
                string.IsNullOrWhiteSpace(request.RouteName))
                throw new ArgumentException("RouteId, RouteCode or RouteName is required when transportation is selected.");

            // Fee structures use the academic entry type. For counselling admissions,
            // a Regular entry is the expected default unless the frontend explicitly sends EntryType.
            var resolvedAdmissionType = !string.IsNullOrWhiteSpace(request.EntryType)
                ? request.EntryType.Trim()
                : string.Equals(request.AdmissionType?.Trim(), "Counseling", StringComparison.OrdinalIgnoreCase)
                    ? "Regular"
                    : request.AdmissionType?.Trim() ?? string.Empty;

            request.AdmissionType = request.AdmissionType?.Trim();
            request.EntryType = request.EntryType?.Trim();
            request.Quota = request.Quota?.Trim();
            request.StudentCategory = request.StudentCategory?.Trim();
            request.HostelType = request.HostelType?.Trim();
            request.RoomType = NormalizeRoomType(request.RoomType);
            request.RouteCode = request.RouteCode?.Trim();
            request.RouteName = request.RouteName?.Trim();
            request.PaymentPlan = string.IsNullOrWhiteSpace(request.PaymentPlan) ? "ONE_TIME" : request.PaymentPlan.Trim();
            request.PaymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus) ? "PENDING" : request.PaymentStatus.Trim();

            _logger.LogInformation(
                "Resolving admission fees. AdmissionId={AdmissionId}, Hostel={Hostel}, Transport={Transport}, AdmissionType={AdmissionType}, Quota={Quota}",
                admissionId,
                request.HostelRequired,
                request.TransportationRequired,
                resolvedAdmissionType,
                request.Quota);

            var result = await _repository.ResolveAndSaveAsync(
                admissionId,
                request,
                resolvedAdmissionType,
                actorUserId);

            _logger.LogInformation(
                "Admission fee resolution completed. AdmissionId={AdmissionId}, TuitionFee={TuitionFee}, AdmissionFee={AdmissionFee}, HostelFee={HostelFee}, TransportationFee={TransportationFee}",
                admissionId,
                result?.TuitionFee,
                result?.AdmissionFee,
                result?.HostelFee,
                result?.TransportationFee);

            return result;
        }

        private static string? NormalizeRoomType(string? roomType)
        {
            if (string.IsNullOrWhiteSpace(roomType))
                return null;

            var value = roomType.Trim();
            return value.ToLowerInvariant() switch
            {
                "2 bed sharing" => "Double Sharing",
                "3 bed sharing" => "Triple Sharing",
                "4 bed sharing" => "Four Sharing",
                _ => value
            };
        }
    }
}
