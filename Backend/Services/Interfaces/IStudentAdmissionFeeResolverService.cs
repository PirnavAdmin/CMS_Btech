using BTech.DTOs.Fees;

namespace BTech.Services.Interfaces
{
    public interface IStudentAdmissionFeeResolverService
    {
        Task<StudentAdmissionFeeResolveResultDto?> ResolveAndSaveAsync(
            long admissionId,
            StudentAdmissionFeeResolveRequestDto request,
            long actorUserId);
    }
}
