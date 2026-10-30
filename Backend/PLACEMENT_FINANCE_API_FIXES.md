# Placement and Finance API fixes

Changes are limited to the requested backend files. Existing unrelated source files and the SQL dump were not changed.

- Swagger tags: company list/create, company CRUD/status and placement report routes are grouped under `PlacementCompanies`; finance additional routes are tagged `Finance`.
- Placement company queries/inserts/updates now use the actual dump schema (`college_id`, `company_code`, `contact_person_name`, integer status, soft delete via `deleted_at`) rather than attempting to create an incompatible `companies` table. The create endpoint selects the first existing college and generates a unique company code because the current request contract does not expose these fields.
- Fee structure GET/PUT/DELETE use `fee_structures.fee_structure_id`.
- Fee component list/delete use `fee_categories.fee_category_id`. Deletion returns 409 when foreign keys prevent deletion.
- Payment GET uses `fee_payments.payment_id`; receipt fetch uses `fee_receipts.receipt_id`. The receipt endpoint returns the existing receipt record as JSON because PDF/binary generation is not implemented here.

## Verification status

Static inspection against `Dump202612thOCT.sql` was performed. A live database/API integration test and .NET build were not run in this environment; run the project and verify endpoints in Swagger before deployment.
