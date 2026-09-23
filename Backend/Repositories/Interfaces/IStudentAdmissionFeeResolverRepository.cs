using BTech.DTOs.Fees;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentAdmissionFeeResolverRepository
    {
        Task<StudentAdmissionFeeResolveResultDto?> ResolveAndSaveAsync(
            long admissionId,
            StudentAdmissionFeeResolveRequestDto request,
            string resolvedAdmissionType,
            long actorUserId);
    }
}
