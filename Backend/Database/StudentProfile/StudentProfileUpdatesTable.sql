-- =============================================================
-- STUDENT PROFILE UPDATE HISTORY TABLE
-- Idempotent: existing tables/data are preserved.
-- MySQL 8.x / database: cms_btech
-- =============================================================

USE `cms_btech`;

CREATE TABLE IF NOT EXISTS `student_profile_updates` (
    `StudentProfileUpdateId` BIGINT NOT NULL AUTO_INCREMENT,
    `StudentProfileId` BIGINT NOT NULL,
    `StudentId` BIGINT NOT NULL,
    `ChangeType` VARCHAR(50) NOT NULL DEFAULT 'Update',
    `ChangedFields` LONGTEXT NULL,
    `OldValues` LONGTEXT NULL,
    `NewValues` LONGTEXT NULL,
    `ChangeReason` VARCHAR(500) NULL,
    `ChangeSource` VARCHAR(50) NOT NULL DEFAULT 'API',
    `ChangedBy` BIGINT NULL,
    `ChangedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,
    PRIMARY KEY (`StudentProfileUpdateId`),
    KEY `IX_StudentProfileUpdates_ProfileDate` (`StudentProfileId`, `ChangedAt`),
    KEY `IX_StudentProfileUpdates_StudentDate` (`StudentId`, `ChangedAt`),
    KEY `IX_StudentProfileUpdates_ChangedBy` (`ChangedBy`),
    KEY `IX_StudentProfileUpdates_ChangeType` (`ChangeType`),
    KEY `IX_StudentProfileUpdates_ChangedAt` (`ChangedAt`),
    CONSTRAINT `FK_StudentProfileUpdates_StudentProfile`
        FOREIGN KEY (`StudentProfileId`)
        REFERENCES `student_profiles` (`StudentProfileId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `FK_StudentProfileUpdates_Student`
        FOREIGN KEY (`StudentId`)
        REFERENCES `students` (`student_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `FK_StudentProfileUpdates_ChangedBy`
        FOREIGN KEY (`ChangedBy`)
        REFERENCES `users` (`user_id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Immutable history of changes made to student profiles';
