# College API — Principal and Accreditation Fields

## What changed

The College create, update, list, search, status-update, and by-id flows now
carry the following optional frontend fields from JSON to MySQL and back:

| Frontend JSON | MySQL column | Type |
| --- | --- | --- |
| `principal` | `principal` | `VARCHAR(200) NULL` |
| `principalEmail` | `principal_email` | `VARCHAR(150) NULL` |
| `principalContact` | `principal_contact` | `VARCHAR(10) NULL` |
| `alternateContactNumber` | `alternate_contact_number` | `VARCHAR(10) NULL` |
| `accreditationStatus` | `accreditation_status` | `VARCHAR(30) NULL` |
| `accreditationBody` | `accreditation_body` | `VARCHAR(80) NULL` |
| `accreditationGrade` | `accreditation_grade` | `VARCHAR(20) NULL` |
| `accreditationNumber` | `accreditation_number` | `VARCHAR(50) NULL` |
| `validFrom` | `valid_from` | `DATE NULL` |
| `validUntil` | `valid_until` | `DATE NULL` |
| `area` | `area` | `VARCHAR(150) NULL` |
| `district` | `district` | `VARCHAR(100) NULL` |

The request listed these as 11 fields, but it contains 12; all 12 are
implemented.

## Files changed

1. `Models/College.cs`
   - Added all 12 mapped entity properties.
2. `DTOs/College/CreateCollegeDto.cs`
   - Added all 12 optional request properties and validation.
3. `DTOs/College/UpdateCollegeDto.cs`
   - Added all 12 optional request properties and validation.
4. `DTOs/College/CollegeResponseDto.cs`
   - Added all 12 properties returned by list, search, status update, create,
     update, and by-id responses.
5. `Services/Implementations/CollegeService.cs`
   - Maps request DTO values into the entity and entity values into every
     College response.
6. `Repositories/Implementations/CollegeRepository.cs`
   - Sends all new stored-procedure parameters and reads all new result columns.
7. `Controllers/V1/CollegesController.cs`
   - Supports both `PUT /api/v1/colleges/{id}` and
     `PATCH /api/v1/colleges/{id}` for the existing edit operation.
8. `Database/BackendTasks/02_College_CRUD.sql`
   - Updated the clean-install table definition and College stored procedures.
9. `Database/Migrations/20260827_AddCollegePrincipalAndAccreditation.sql`
   - Idempotent migration for an existing database. It preserves existing data,
     adds missing nullable columns, and recreates `sp_College_Create` and
     `sp_College_Update` with the new parameters.

## Validation applied

- `principalEmail` must be a valid email when supplied.
- Principal and alternate contacts must contain exactly 10 digits when supplied.
- `accreditationStatus` must be `Accredited`, `Not Accredited`, `Under Review`,
  or `Expired` when supplied.
- `validUntil` cannot be earlier than `validFrom` when both are supplied.
- Every new field remains optional and existing College records continue to work.

## Deployment order

1. Back up the current database.
2. Select the API database in MySQL Workbench.
3. Run:
   `Database/Migrations/20260827_AddCollegePrincipalAndAccreditation.sql`
4. Confirm the verification query at the end returns 12 columns and the two
   updated procedures.
5. Deploy/restart this updated backend.
6. Run `dotnet clean`, `dotnet restore`, and `dotnet build`.
7. Test the POST, GET, PUT/PATCH, and GET-by-id requests below.

Do not deploy the updated C# API before running the migration. The repository
will call the new stored-procedure signatures immediately after deployment.

## POST test

`POST /api/v1/colleges`

```json
{
  "collegeCode": "AIT027",
  "collegeName": "Andhra Institute of Technology",
  "collegeType": "Engineering College",
  "universityName": "Andhra University",
  "email": "office@ait027.edu.in",
  "mobile": "9876501027",
  "phone": "08912561027",
  "principal": "Dr. S. Ramesh Kumar",
  "principalEmail": "principal@ait027.edu.in",
  "principalContact": "9876543210",
  "alternateContactNumber": "9123456780",
  "accreditationStatus": "Accredited",
  "accreditationBody": "NAAC",
  "accreditationGrade": "A+",
  "accreditationNumber": "NAAC/AP/2026/027",
  "validFrom": "2026-07-01",
  "validUntil": "2031-06-30",
  "addressLine1": "Beach Road",
  "addressLine2": "Madhurawada",
  "area": "Madhurawada Post Office",
  "district": "Visakhapatnam",
  "city": "Visakhapatnam",
  "state": "Andhra Pradesh",
  "country": "India",
  "pincode": "530048",
  "website": "https://www.ait027.edu.in",
  "timezone": "Asia/Kolkata",
  "currencyCode": "INR"
}
```

## Update test

Use the same full edit-form payload with either endpoint:

- `PUT /api/v1/colleges/{id}`
- `PATCH /api/v1/colleges/{id}`

The current edit DTO still requires `collegeName`/`name`, matching the existing
full-form frontend update behavior.

## Persistence verification

After create or update, call both:

- `GET /api/v1/colleges`
- `GET /api/v1/colleges/{id}`

The response `data` must include the same camel-case fields, including
`principalEmail`, `accreditationStatus`, `validFrom`, `area`, and `district`.

You can also verify the stored values directly:

```sql
SELECT
    college_id,
    college_code,
    principal,
    principal_email,
    principal_contact,
    alternate_contact_number,
    accreditation_status,
    accreditation_body,
    accreditation_grade,
    accreditation_number,
    valid_from,
    valid_until,
    area,
    district
FROM colleges
WHERE college_id = <created_or_updated_id>;
```
