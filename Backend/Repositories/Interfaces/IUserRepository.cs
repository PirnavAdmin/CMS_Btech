using System.Threading.Tasks;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> FindByLoginIdentifierAsync(string loginIdentifier);
        Task UpdateLastLoginAsync(long userId);
        Task<User?> GetByIdAsync(long userId);
        Task<User?> GetProfileByIdAsync(long userId);
        Task<bool> UpdateProfileAsync(long userId, string? fullName, string? email, string? mobile);
        Task<User?> GetByIdentifierForUpdateAsync(string identifier);
        Task UpdateAsync(User user);
    }
}