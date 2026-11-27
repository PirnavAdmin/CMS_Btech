using System.Threading.Tasks;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IOtpVerificationRepository
    {
        Task CreateOtpAsync(OtpVerification otpVerification);
        Task InvalidateOtpAsync(OtpVerification otpVerification);
        Task InvalidatePreviousOtpsAsync(string identifier, string otpType);
    }
}