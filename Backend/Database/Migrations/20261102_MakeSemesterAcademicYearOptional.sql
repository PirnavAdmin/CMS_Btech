-- Academic year setup is optional while generating a course semester structure.
-- Existing semester academic-year links are preserved.
-- Run once against the CMS database used by the backend.
ALTER TABLE semesters
    MODIFY COLUMN academic_year_id BIGINT NULL;
