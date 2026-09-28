-- Run once against the CMS database to persist the Subject Management field.
USE cms_btech;

ALTER TABLE subjects
    ADD COLUMN elective_type VARCHAR(20) NULL AFTER subject_type;
