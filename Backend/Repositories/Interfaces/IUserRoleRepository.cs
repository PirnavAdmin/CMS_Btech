namespace BTech.Repositories.Interfaces
{
    public interface IUserRoleRepository
    {
        Task<List<string>> GetRoleCodesByUserIdAsync(long userId);
    }
}