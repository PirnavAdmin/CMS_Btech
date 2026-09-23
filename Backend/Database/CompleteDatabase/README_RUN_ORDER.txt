COMPLETE DATABASE RUN ORDER
===========================

Existing database:
1. Back up cms_btech.
2. Do not import the base dump again.
3. Run ../IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql.

Fresh database:
1. Run CMS_BTECH_COMPLETE_UPDATED.sql.

The complete file creates/selects cms_btech, imports the supplied database
snapshot, and applies every current integration update in one execution.
