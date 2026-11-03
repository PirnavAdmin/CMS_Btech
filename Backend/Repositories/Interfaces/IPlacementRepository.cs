using BTech.DTOs.Placements;
using BTech.Repositories.Implementations;
namespace BTech.Repositories.Interfaces;
public interface IPlacementRepository
{
    Task<T> RunAsync<T>(long userId,long? requestedCollegeId,bool write,Func<PlacementSession,PlacementActor,Task<T>> action,CancellationToken ct);
}
