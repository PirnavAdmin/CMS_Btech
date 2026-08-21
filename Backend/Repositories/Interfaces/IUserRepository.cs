using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> FindByLoginIdentifierAsync(
            string loginIdentifier);

        Task<User?> GetByIdAsync(
            long userId);

        Task UpdateLastLoginAsync(
            long userId);

        Task<User?> GetProfileByIdAsync(
            long userId);

        Task<bool> UpdateProfileAsync(
            long userId,
            string? fullName,
            string? email,
            string? mobile);
    }
}