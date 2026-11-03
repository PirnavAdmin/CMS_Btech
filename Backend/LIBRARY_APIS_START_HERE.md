# Library APIs — setup and Swagger testing

This is the complete supplied backend plus an additive LibraryManagement module.
All files and endpoints in the supplied backend are preserved byte-for-byte,
including Program.cs, BTech.csproj, appsettings, the fee module and existing SQL.
No DI registration or EF migration is needed: ASP.NET Core discovers the new
controller and it uses the existing DefaultConnection with Dapper/MySqlConnector.

## 1. Database setup

In MySQL Workbench, select your existing `cms_btech` database. Back up your data.
Execute these files from Database/LibraryManagement in order:

1. `01_Library_Tables_Only.sql`: create the four supplied library tables if absent.
2. `02_Library_History_And_Payments.sql`: create two new audit/payment tables.
3. `03_Import_Existing_History.sql`: optional, import snapshots of old issues and fines.

Do NOT rerun the optional original sample script if those sample records already
exist: its explicit IDs would duplicate records and its stock updates are sample-specific.
On a fresh database, you may run `OPTIONAL_Original_Library_Tables_And_Sample_Data.sql`
instead of 01 (requires existing college 1, students 2–6 and users 1/2), then run 02 and 03.
The attached document SQL is included as a reference, unchanged. It is unrelated
to book categories and is not needed for these APIs.

The SQL uses the exact four library schemas from your supplied file. Existing
schemas created differently must be aligned before using this module.

## 2. Run and authenticate

Open BTech.slnx/BTech.csproj in Visual Studio, restore packages and run.
Or, in the extracted CMS_BTech folder: `dotnet run --project BTech.csproj`.
Open the Swagger URL shown for your running backend and log in using your existing
login API. Click Authorize and enter the token as required by your Swagger setup.
Use a library operator/admin account. Mutations identify staff from the JWT;
there is no client-controlled issuedBy/returnedBy/createdBy field.
The controller follows the existing authenticated-user access model; it does not
introduce a new role permission policy. Restrict library operators through your
existing access governance if required. A non-SuperAdmin must send the same
collegeId as in their token. SuperAdmin can select a college explicitly.

Swagger tag: `LibraryManagement`. Base URL: `/api/v1/library`.
All GET/DELETE/PATCH routes use `?collegeId=1`. Create/update bodies contain collegeId.
List routes support `page=1&pageSize=50` (max 200); data is an array of database
column names such as book_id and category_name. Success envelopes are
`{ "success": true, "message": "...", "data": ... }`.

## 3. Added endpoints (27)

| Method | Path after /api/v1/library | Purpose |
|---|---|---|
| GET | /categories | List/search; filters search/status |
| GET | /categories/{id} | Category detail |
| POST | /categories | Create category |
| PUT | /categories/{id} | Update category |
| PATCH | /categories/{id}/status | Activate/deactivate |
| DELETE | /categories/{id} | Delete only when no books reference it |
| GET | /books | List/search; categoryId/search/status/availableOnly |
| GET | /books/{id} | Book detail |
| POST | /books | Create book |
| PUT | /books/{id} | Update metadata/total copies |
| PATCH | /books/{id}/status | Activate/deactivate |
| DELETE | /books/{id} | Delete only when no issue history exists |
| GET | /issues | List; studentId/bookId/status |
| GET | /issues/{id} | Issue detail |
| POST | /issues | Issue a book |
| POST | /issues/{id}/return | Return a book |
| GET | /returns | Returned issues; studentId/bookId |
| GET | /fines | List; studentId/issueId/status; includes balance |
| GET | /fines/{id} | Fine, balance and payment records |
| POST | /fines | Assess one fine per issue |
| POST | /fines/{id}/payments | Pay partially or fully |
| GET | /fines/{id}/payments | Receipt/payment records |
| PATCH | /fines/{id}/waive | Waive outstanding balance |
| GET | /history | Audit; studentId/bookId/issueId/fineId/action |
| GET | /students/{studentId}/history | Student audit |
| GET | /books/{id}/history | Book audit |
| GET | /issues/{id}/history | Issue and fine audit |

## 4. Valid Swagger workflow

Use real IDs returned by GET endpoints; examples below assume the supplied sample data.
Dates shown work on 8 October 2026; use current valid dates when testing later.

1. `GET /api/v1/library/books?collegeId=1&availableOnly=true`
2. Create a category with a new unique code/name:

```json
{ "collegeId": 1, "categoryCode": "SWAGGER-LIB", "categoryName": "Swagger Library Books", "description": "API test category", "status": true }
```

3. POST /books; replace categoryId with the returned category_id:

```json
{ "collegeId": 1, "categoryId": 1, "isbn": null, "accessionNo": "SWAGGER-BOOK-001", "title": "Library API Test Book", "author": "Test Author", "publisher": "Test Publisher", "edition": "1", "publicationYear": 2026, "language": "English", "totalCopies": 2, "shelfLocation": "TEST-A1", "price": 250.00, "description": "Testing issue and return", "status": true }
```

4. POST /issues; replace bookId with returned book_id; use an existing student in college 1:

```json
{ "collegeId": 1, "bookId": 8, "studentId": 2, "issueDate": "2026-10-08", "dueDate": "2026-10-22", "remarks": "Swagger issue test" }
```

5. Verify available_copies decreases by one. Repeat the same issue: expect 409.
6. POST /issues/{newIssueId}/return?collegeId=1:

```json
{ "returnDate": "2026-10-08", "remarks": "Returned in good condition" }
```

Verify available_copies increases once. Repeat return: expect 409 and no stock change.
7. POST /fines for that issue (manual assessment; there is no configured automatic daily fine rate):

```json
{ "collegeId": 1, "issueId": 7, "fineReason": "Damaged cover", "fineAmount": 50.00, "assessedDate": "2026-10-08", "remarks": "Manual assessment" }
```

Replace issueId with your new issue_id. A second fine for that issue returns 409.
8. POST /fines/{newFineId}/payments?collegeId=1:

```json
{ "amount": 20.00, "paymentMethod": "CASH", "receiptNo": "LIB-TEST-20261008-001", "paymentDate": "2026-10-08", "remarks": "First instalment" }
```

Fine becomes PARTIALLY_PAID with balance 30. Then pay 30 using a different receipt.
Fine becomes PAID. Amount 31 after first payment is rejected with 409.
Duplicate receipt, zero/negative amount, more than two decimals, unsupported mode,
future payment date and payment on a waived/paid fine are rejected.
Modes: CASH, UPI, CARD, BANK_TRANSFER, CHEQUE, ONLINE.
9. Alternatively, on an unpaid/partially paid fine, PATCH /fines/{id}/waive?collegeId=1:

```json
{ "reason": "Approved by library administrator" }
```

Previously received payments stay intact; the outstanding balance becomes zero.
10. GET /history?collegeId=1 and /students/2/history?collegeId=1.
Also GET /returns?collegeId=1 and /fines/{id}?collegeId=1.

## 5. Behavior and validation

- Books/category uniqueness honors trimming and case-insensitive checks; update excludes its own ID.
- ISBN matches the supplied globally unique ISBN constraint; null ISBN is allowed.
- Available stock is derived from total copies. Updates preserve outstanding copies.
- Issue/return and fine/payment mutations use transactions and row locks; history is committed atomically.
- Issuing requires active book/category, a student in the same college and available stock.
- Past due active issues are shown as OVERDUE via effective_status in lists, without altering original records.
- Returning does not automatically assess a fine: staff use POST /fines according to college policy.
- Returns use library_issues.return_date/returned_by/status, matching your schema.
- Fine receipts are unique per college. Payments are additional amounts, not cumulative totals.
- Audit records are append-only through these APIs. Historical imported snapshots are labeled clearly.
- Old aggregate paid_amount remains authoritative; old payments have no invented receipt rows.
- 400 invalid input, 401 missing/invalid token, 403 college mismatch, 404 missing record,
  409 duplicate/conflict/overpayment, 500 setup/unexpected error with correlationId.
- ILogger records successful operations, rejected validations and errors through existing logging configuration.

## 6. Verification limits

The final ZIP is checked for integrity and every original backend file is compared
byte-for-byte. The added routes are checked for uniqueness and SQL references are
checked against the supplied schemas. This environment has no .NET SDK or MySQL
server; compilation and live database/Swagger execution could not be performed.
Run the provided workflow locally before integration.
