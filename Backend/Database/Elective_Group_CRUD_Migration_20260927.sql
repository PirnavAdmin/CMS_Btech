-- Run once after selecting the target CMS database.
USE cms_btech;

ALTER TABLE elective_groups
    ADD COLUMN elective_type VARCHAR(50) NULL,
    ADD COLUMN credits DECIMAL(5,2) NULL,
    ADD COLUMN selection_start_date DATE NULL,
    ADD COLUMN selection_end_date DATE NULL;
