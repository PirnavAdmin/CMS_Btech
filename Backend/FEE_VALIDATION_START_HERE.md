# Amount, mode, balance and receipt validation — 8 October 2026

## Install
1. Extract this ZIP into a NEW folder and open CMS_BTech/BTech.csproj in Visual Studio.
2. Keep your current database and appsettings.json connection details.
3. In MySQL Workbench execute Database/FeeValidation/FeeValidation_20261008.sql.
   The script uses cms_btech; adjust USE only if your database has another name.
4. Build and run the backend. Authorize Swagger with your usual JWT.

IMPORTANT: The updated repository calls the four new *_validated routines.
Run the SQL patch before using fee payment, fine create/waive and receipt APIs.
The patch does not drop tables, remove data or replace your original procedures.
It only installs/reinstalls its own four validated procedures. Do not re-import
or replace your complete database dump for this task.

## Existing endpoints preserved (no new endpoints)
- GET /api/v1/fee-collection/dashboard
- GET /api/v1/fee-collection/pending
- POST /api/v1/fee-collection/payments
- GET /api/v1/fee-collection/history
- GET /api/v1/fee-collection/fines
- POST /api/v1/fee-collection/fines
- POST /api/v1/fee-collection/fines/{fineId}/waive
- GET /api/v1/fee-collection/receipts/{receiptId}
- GET /api/v1/fee-collection/payments/{paymentId}/receipt
All other API routes and request/response DTOs are preserved. Fee configuration
amounts also receive precision/range checks without changing their DTOs/routes.

## Validation added
- FeeAmount is positive; FineAmount is nonnegative. The existing requirement for
  a positive fee component is retained; fine-only collection is not added.
- Currency amounts must fit DECIMAL(12,2): maximum 9999999999.99 and at most two
  decimal places. Fee + fine must also fit this limit. Values are rejected rather
  than silently rounded. Fine, waiver and configuration amounts get the same checks.
- Modes: CASH, UPI, CARD, BANK_TRANSFER, CHEQUE. Trimmed/case-insensitive input
  is normalized to the stored uppercase enum. Other modes are rejected.
- Non-cash payments require a nonblank transaction reference. References are
  trimmed; the existing database unique index rejects duplicates, returning 409.
  A supplied cash reference is also subject to that existing unique index.
- FineId must be positive and present when paying a fine, and omitted when
  FineAmount is zero. The fine must belong to the selected active student fee.
- Fee/fine payments cannot exceed their current unpaid balance. Inconsistent
  historical balances are rejected for reconciliation rather than hidden.
- Waivers cannot exceed the fine balance after previous waivers and payments.
- Payment and waiver routines use transactions and lock fee -> fine in the same
  order. Competing API calls recheck balances after locking.
- Payment and receipt insert together; receipt validation occurs before commit.
  Any insertion/validation failure rolls back both. Existing unique receipt-number
  and one-receipt-per-payment constraints remain.
- Receipt numbering avoids truncating payment IDs exceeding eight digits.
- Receipt lookups check positive IDs, receipt/payment identity, amounts and mode.
  Missing/unauthorized receipts retain the existing 404 behavior.
- Receipt issuer lookup uses users.user_id, matching the authenticated actor stored
  by collection APIs. Fine creation sets due date no earlier than assessment date,
  respecting the dump's existing fee_fines date constraint.
- Logs cover validation, rejection, payment/receipt creation, fine create/waive,
  receipt lookup, duplicates and unexpected database failures. Payment request logs
  include correlation IDs. Full transaction references and payment credentials are
  not logged. Existing exception middleware handles validation as 400 and duplicate
  or inconsistent-record conflicts as 409.

## Swagger examples using the supplied dump
Your dump has pending fee balances: fee 1 = 30000; fee 2 = 0; fee 3 = 3000;
fee 4 = 0; fee 5 = 15000. Fine 1 is fully paid; fine 2 has 300 remaining.
Use GET pending and GET fines first because balances may have changed locally.

POST /api/v1/fee-collection/payments — valid fee payment:
```json
{"studentFeeId":1,"feeAmount":1000.00,"fineAmount":0,"fineId":null,"paymentMode":"CASH","transactionReference":null,"remarks":"Validation test"}
```
Expected 201. This writes real test data: pending fee becomes 29000 for the
original dump values. Read data.receiptId and data.paymentId from the response,
then GET both receipt endpoints with those IDs. Receipt total should be 1000.

A valid fee + fine payment against the ORIGINAL dump values:
```json
{"studentFeeId":5,"feeAmount":500.00,"fineAmount":100.00,"fineId":2,"paymentMode":"UPI","transactionReference":"TEST-FEE-20261008-UNIQUE-001","remarks":"Fee and fine validation test"}
```
Use a NEW reference each time; repeating the same reference must return 409.
This successful test writes a payment and receipt and reduces both balances.

Invalid payment cases (expect 400, with no payment/receipt inserted):
- feeAmount = -1, 0, 1.001, or 10000000000.
- paymentMode = CRYPTO, or UPI without a transactionReference.
- fineAmount > 0 without fineId; fineAmount = 0 with fineId supplied.
- fee 1 payment above its CURRENT remaining balance.
- fee 2 or fee 4 positive payment, since those fees are already fully paid.
- fine 2 payment above its CURRENT unpaid fine balance.

POST /api/v1/fee-collection/fines/2/waive:
```json
{"waivedAmount":50.00,"reason":"Approved partial waiver test"}
```
Expected 200 only if at least 50 remains. Waiving more than the current unpaid
fine or using three decimal places should return 400. A successful test changes
the stored fine. Do not assume original balances after successful tests.

## Files and SQL routines
Changed existing files:
- Controllers/V1/FeeCollectionController.cs (logs and college claim alias)
- Controllers/V1/FeeConfigurationController.cs (amount precision/range)
- Services/Implementations/FeeCollectionService.cs (validation and logs)
- Repositories/Implementations/FeeCollectionRepository.cs (new routine calls/logs)

Added validator: Services/Implementations/FeeCollectionValidation.cs.
New SQL routines: sp_fc_payment_create_validated, sp_fc_fine_create_validated,
sp_fc_fine_waive_validated, sp_fc_receipt_get_validated.
The original full stored procedure installation file is unchanged.

## Verification and practical limits
- All route annotations preserved across 79 API source files.
- Existing route checker: 486 Controller routes, zero removed, 123 checked frontend
  routes present. No API added/deleted by this task.
- 468 C# files passed the supplied source structure check.
- Supplied fee data passed five read-only audit result sets with no violations.
- Fourteen actual SQL balance predicates passed SQLite boundary checks.
- ZIP integrity and extraction verified.

The environment has no .NET SDK or live MySQL server. A .NET build, C# runtime
unit tests and MySQL integration/concurrency tests could NOT be executed here.
SQLite audits/predicate checks do not validate stored procedure installation or
MySQL locking. Build locally, run the SQL patch and Swagger examples before deployment.

Run Verification/FeeValidation/Run-ValidationTests.ps1 in PowerShell with .NET 8
installed to execute the included C# tests against the actual production validator.
Run Database/FeeValidation/FeeValidation_DataAudit.sql for read-only database checks.
Audit violations are reported only; no existing financial data is automatically repaired.
Other applications calling legacy procedures or writing SQL directly bypass the
new validated routines; use the new routines for this workflow.
