using BTech.DTOs;

namespace BTech.Services.Interfaces
{
    public interface IAdmissionService
    {
        Task<AdmissionActionResponseDto?> ApproveAdmissionAsync(
            long admissionId,
            AdmissionStatusRequestDto request,
            long? userId);

        Task<AdmissionActionResponseDto?> RejectAdmissionAsync(
            long admissionId,
            AdmissionStatusRequestDto request,
            long? userId);

        Task<List<AdmissionStatusHistoryDto>> GetStatusHistoryAsync(
            long admissionId);
    }
}