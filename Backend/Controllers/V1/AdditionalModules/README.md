# Additional API additions (isolated extension)

These files were added without editing or deleting existing teammate files. ASP.NET Core controller discovery loads them automatically; no `Program.cs` registration is required.

## Controllers added
- `GradeManagementController.cs` — `/api/v1/grades`
- `GradePoliciesController.cs` — `/api/v1/grade-policies`
- `ResultsAdditionalController.cs` — additional official-results routes
- `FinanceAdditionalController.cs` — student ledger/balance, fee components/structure operations, assignments, and fee collection additions
- `HostelFeesController.cs` — hostel fee CRUD, assignments, dues, payments, receipts, history and refunds
- `TransportFeesController.cs` — transport fees, assignments, student fees, dues, payments and reports
- `PlacementCompanyController.cs` — company detail/update/delete/status routes using the existing `companies` table
- `PlacementReportsController.cs` — placement reports summary endpoint
- `AdditionalApiControllerBase.cs`, `AdditionalApiStore.cs` — shared helpers for the isolated extension endpoints

## Persistence/integration note
The uploaded ZIP contains existing domain services for results and fee collection, but the requested endpoint contracts do not provide the complete DTO/service/schema requirements for every new route. To avoid changing teammate code, extension-only routes (grades, grade policies, fee components/assignments, hostel/transport fee resources, and some result operations) use the isolated MySQL table `cms_supplemental_api_records`, created on first use. This preserves existing tables and files but does **not** automatically read/write the application's domain tables or reproduce PDF receipt generation. Before production use, map these routes to the approved domain tables/services and frontend DTO contracts. The existing payment receipt route was retained and not duplicated.

## Verification
The archive was statically inspected and existing source files were preserved byte-for-byte while adding this folder. A .NET SDK was not available in the execution environment, so `dotnet build`/runtime Swagger verification could not be run. Therefore, a zero-build-error or zero-runtime-integration-error guarantee cannot honestly be claimed from this environment alone.
