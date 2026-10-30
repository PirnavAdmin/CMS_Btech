# Placement workflow changes

Existing file changed: `Program.cs`, two additive scoped DI registrations. All existing controller files and API contracts are byte-identical to the uploaded base.

New implementation files:

- `Controllers/V1/PlacementWorkflowController.cs`
- `DTOs/Placements/PlacementDtos.cs`
- `DTOs/Placements/PlacementRequests.cs`
- `Repositories/Interfaces/IPlacementRepository.cs`
- `Repositories/Implementations/PlacementRepository.cs`
- `Services/Interfaces/IPlacementService.cs`
- `Services/Implementations/PlacementService.cs`
- `Services/Implementations/PlacementWorkflowRules.cs`

No schema ALTER/DROP, migrations or stored procedures were added. Existing placement tables are reused. The original configuration and other modules are retained.

See PLACEMENT_APIS_START_HERE.md and Database/Placements/Validation_Report.json for setup, tests, and limitations.
