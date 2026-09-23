USE cms_btech;

-- These two endpoints are implemented in the .NET repository/service layer.
-- This script is optional because no new table/column is required.

-- The expected endpoints are:
-- GET  /api/v1/academic-years/dashboard?search=&filter=all
-- POST /api/v1/academic-years/generate-next-year
-- Body: {"activateImmediately": true}
