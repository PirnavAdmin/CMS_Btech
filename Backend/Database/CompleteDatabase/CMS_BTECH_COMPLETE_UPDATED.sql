-- =============================================================
-- CMS BTECH COMPLETE DATABASE
-- Generated: 2026-09-04
-- Target: MySQL 8.x
-- Creates/selects cms_btech, imports the supplied snapshot,
-- then applies all integration corrections.
-- =============================================================

CREATE DATABASE IF NOT EXISTS `cms_btech`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `cms_btech`;

-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: cms_btech
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `academic_levels`
--

DROP TABLE IF EXISTS `academic_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_levels` (
  `academic_level_id` bigint NOT NULL AUTO_INCREMENT,
  `academic_year_id` bigint DEFAULT NULL,
  `level_type` varchar(20) NOT NULL,
  `level_name` varchar(100) NOT NULL,
  `level_number` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`academic_level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_levels`
--

LOCK TABLES `academic_levels` WRITE;
/*!40000 ALTER TABLE `academic_levels` DISABLE KEYS */;
INSERT INTO `academic_levels` VALUES (1,2,'Undergraduate','B.Tech First Year',1,1,'2026-08-25 19:27:56',1,NULL,NULL),(2,2,'Undergraduate','B.Tech Second Year',2,1,'2026-08-25 19:27:56',1,NULL,NULL),(3,2,'Undergraduate','B.Tech Third Year',3,1,'2026-08-25 19:27:56',1,NULL,NULL),(4,2,'Undergraduate','B.Tech Fourth Year',4,1,'2026-08-25 19:27:56',1,NULL,NULL),(5,2,'Postgraduate','M.Tech First Year',1,1,'2026-08-25 19:27:56',1,NULL,NULL),(6,2,'Post graduate','M.Tech 2nd Year',2,0,'2026-08-25 13:59:41',NULL,NULL,NULL);
/*!40000 ALTER TABLE `academic_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `academicyears`
--

DROP TABLE IF EXISTS `academicyears`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academicyears` (
  `academic_year_id` bigint NOT NULL AUTO_INCREMENT,
  `academic_year_name` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `is_archived` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  `active_guard` tinyint GENERATED ALWAYS AS ((case when ((`status` = 1) and (`is_archived` = 0) and (`deleted_at` is null)) then 1 else NULL end)) STORED,
  PRIMARY KEY (`academic_year_id`),
  UNIQUE KEY `uq_academic_year_name` (`academic_year_name`),
  UNIQUE KEY `uq_academicyears_single_active` (`active_guard`),
  CONSTRAINT `chk_academic_year_dates` CHECK ((`end_date` >= `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academicyears`
--

LOCK TABLES `academicyears` WRITE;
/*!40000 ALTER TABLE `academicyears` DISABLE KEYS */;
INSERT INTO `academicyears` (`academic_year_id`, `academic_year_name`, `start_date`, `end_date`, `status`, `is_archived`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`) VALUES (1,'2025-26','2025-06-01','2026-05-31',0,1,'2026-08-21 11:54:42',NULL,'2026-08-21 11:54:42',NULL,NULL,NULL),(2,'2026-27','2026-06-01','2027-05-31',1,0,'2026-08-21 11:54:42',NULL,'2026-08-31 05:32:33',1,NULL,NULL),(15,'2027 - 2028','2027-05-31','2028-05-30',0,0,'2026-08-31 05:38:05',1,NULL,NULL,NULL,NULL),(16,'2029-2030','2029-06-30','2030-10-31',0,0,'2026-08-31 12:58:27',2,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `academicyears` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admission_status_history`
--

DROP TABLE IF EXISTS `admission_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admission_status_history` (
  `AdmissionStatusHistoryId` bigint NOT NULL AUTO_INCREMENT,
  `AdmissionId` bigint NOT NULL,
  `PreviousStatus` varchar(50) DEFAULT NULL,
  `NewStatus` varchar(50) NOT NULL,
  `ActionType` varchar(50) NOT NULL,
  `Remarks` text,
  `RejectionReason` varchar(500) DEFAULT NULL,
  `ChangedBy` bigint DEFAULT NULL,
  `ChangedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `IsApproved` tinyint(1) NOT NULL DEFAULT '0',
  `IsRejected` tinyint(1) NOT NULL DEFAULT '0',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `IsDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedBy` bigint DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedBy` bigint DEFAULT NULL,
  `UpdatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `DeletedBy` bigint DEFAULT NULL,
  `DeletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`AdmissionStatusHistoryId`),
  KEY `IX_AdmissionStatusHistory_AdmissionId` (`AdmissionId`),
  KEY `IX_AdmissionStatusHistory_PreviousStatus` (`PreviousStatus`),
  KEY `IX_AdmissionStatusHistory_NewStatus` (`NewStatus`),
  KEY `IX_AdmissionStatusHistory_ActionType` (`ActionType`),
  KEY `IX_AdmissionStatusHistory_ChangedBy` (`ChangedBy`),
  KEY `IX_AdmissionStatusHistory_ChangedAt` (`ChangedAt`),
  CONSTRAINT `FK_AdmissionStatusHistory_Admission` FOREIGN KEY (`AdmissionId`) REFERENCES `studentadmissions` (`AdmissionId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_AdmissionStatusHistory_ChangedBy` FOREIGN KEY (`ChangedBy`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admission_status_history`
--

LOCK TABLES `admission_status_history` WRITE;
/*!40000 ALTER TABLE `admission_status_history` DISABLE KEYS */;
INSERT INTO `admission_status_history` VALUES (1,1,NULL,'Draft','CREATED','Admission application created.',NULL,1,'2026-04-01 09:00:00',0,0,1,0,1,'2026-04-01 03:30:00',NULL,'2026-04-01 03:30:00',NULL,NULL),(2,1,'Draft','Registered','REGISTERED','Student registration completed successfully.',NULL,1,'2026-04-01 10:00:00',0,0,1,0,1,'2026-04-01 04:30:00',NULL,'2026-04-01 04:30:00',NULL,NULL),(3,1,'Registered','Application Submitted','SUBMITTED','Admission application submitted for review.',NULL,1,'2026-04-02 10:00:00',0,0,1,0,1,'2026-04-02 04:30:00',NULL,'2026-04-02 04:30:00',NULL,NULL),(4,1,'Application Submitted','Under Review','REVIEW_STARTED','Application review started.',NULL,1,'2026-04-04 11:00:00',0,0,1,0,1,'2026-04-04 05:30:00',NULL,'2026-04-04 05:30:00',NULL,NULL),(5,1,'Under Review','Document Verification','DOCUMENTS_VERIFIED','All submitted documents verified successfully.',NULL,1,'2026-04-04 14:00:00',0,0,1,0,1,'2026-04-04 08:30:00',NULL,'2026-04-04 08:30:00',NULL,NULL),(6,1,'Document Verification','Approved','APPROVED','Admission approved after successful review and document verification.',NULL,1,'2026-04-05 12:00:00',1,0,1,0,1,'2026-04-05 06:30:00',NULL,'2026-04-05 06:30:00',NULL,NULL),(7,1,'Approved','Admitted','ADMITTED','Admission completed successfully after fee payment.',NULL,1,'2026-04-10 10:30:00',1,0,1,0,1,'2026-04-10 05:00:00',NULL,'2026-04-10 05:00:00',NULL,NULL);
/*!40000 ALTER TABLE `admission_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `branch_id` bigint NOT NULL AUTO_INCREMENT,
  `course_id` bigint NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `short_name` varchar(50) DEFAULT NULL,
  `specialization` varchar(150) DEFAULT NULL,
  `department_id` bigint DEFAULT NULL,
  `branch_type` varchar(50) DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `total_semesters` int DEFAULT NULL,
  `intake_capacity` int DEFAULT NULL,
  `starting_academic_year_id` bigint DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `uq_branches_course_code` (`course_id`,`branch_code`),
  KEY `idx_branches_course_id` (`course_id`),
  KEY `idx_branches_status` (`status`),
  CONSTRAINT `fk_branches_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,1,'CSE','Computer Science and Engineering','CSE',NULL,1,'Engineering',4,8,60,2,'Bachelor of Technology in Computer Science and Engineering',1,'2026-08-25 15:31:13',NULL,'2026-08-25 15:31:13',NULL,NULL,NULL),(2,1,'ECE','Electronics and Communication Engineering','ECE',NULL,2,'Engineering',4,8,60,2,'Bachelor of Technology in Electronics and Communication Engineering',1,'2026-08-25 15:31:13',NULL,'2026-08-25 15:31:13',NULL,NULL,NULL),(3,1,'EEE','Electrical and Electronics Engineering','EEE',NULL,3,'Engineering',4,8,60,2,'Bachelor of Technology in Electrical and Electronics Engineering',1,'2026-08-25 15:31:13',NULL,'2026-08-25 15:31:13',NULL,NULL,NULL),(4,1,'MECH','Mechanical Engineering','MECH',NULL,4,'Engineering',4,8,60,2,'Bachelor of Technology in Mechanical Engineering',1,'2026-08-25 15:31:13',NULL,'2026-08-25 15:31:13',NULL,NULL,NULL),(5,5,'CIVIL','Civil Engineering','CIVIL',NULL,6,'Engineering',4,8,60,2,'Bachelor of Technology in Civil Engineering',1,'2026-08-25 15:31:13',NULL,'2026-08-27 11:10:56',1,NULL,NULL),(6,1,'AIDS','Artificial Intelligence and Data Science','AI&DS',NULL,1,'Engineering',4,8,90,2,'Updated B.Tech specialization in Artificial Intelligence, Machine Learning and Data Science',0,'2026-08-25 14:10:27',1,'2026-08-25 19:43:41',1,'2026-08-25 14:13:41',1),(7,7,'JSTWUQ','gW2EW',NULL,NULL,14,'Core',4,8,60,NULL,NULL,0,'2026-08-27 11:36:41',1,'2026-08-31 14:47:50',NULL,'2026-08-31 09:17:50',1),(8,5,'CSH','computer science hkdt',NULL,NULL,13,'Core',4,8,60,NULL,NULL,0,'2026-08-27 11:38:40',1,'2026-08-31 14:48:00',NULL,'2026-08-31 09:18:00',1),(9,1,'C','CSE','SS',NULL,1,'Core',4,8,60,NULL,NULL,0,'2026-08-31 07:18:51',1,'2026-08-31 14:48:12',NULL,'2026-08-31 09:18:12',1);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `college_settings`
--

DROP TABLE IF EXISTS `college_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `college_settings` (
  `college_setting_id` bigint NOT NULL AUTO_INCREMENT,
  `college_id` bigint NOT NULL,
  `college_name` varchar(200) NOT NULL,
  `college_code` varchar(50) NOT NULL,
  `college_email` varchar(150) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `semester` varchar(50) DEFAULT NULL,
  `institution_type` varchar(100) DEFAULT NULL,
  `date_format` varchar(30) DEFAULT 'dd-MM-yyyy',
  `time_zone` varchar(100) DEFAULT 'Asia/Kolkata',
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`college_setting_id`),
  UNIQUE KEY `college_code` (`college_code`),
  UNIQUE KEY `uq_college_settings_college_id` (`college_id`),
  CONSTRAINT `fk_college_settings_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `college_settings`
--

LOCK TABLES `college_settings` WRITE;
/*!40000 ALTER TABLE `college_settings` DISABLE KEYS */;
INSERT INTO `college_settings` VALUES (1,1,'BTech College of Engineering','BTECH001','admin@btechcollege.edu.in','9876543210','https://btechcollege.edu.in','Main Road','College Campus','Hyderabad','Telangana','500001','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-26 12:19:02',1),(2,12,'CMR College of Engineering and Technology','CMR001','admin@cmrcet.edu.in','9876500001','https://cmrcet.edu.in','Kandlakoya','Medchal Road','Hyderabad','Telangana','501401','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:22:16',1),(3,13,'VNR VJIET','VNR002','admin@vnrvjiet.in','9876500002','https://vnrvjiet.ac.in','Bachupally','Pragathi Nagar Road','Hyderabad','Telangana','500090','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:22:02',1),(4,14,'Malla Reddy Engineering College','MREC003','admin@mrec.ac.in','9876500003','https://mrec.ac.in','Maisammaguda','Dhulapally','Hyderabad','Telangana','500100','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:21:56',1),(5,15,'BITS Pilani Hyderabad Campus','BITS004','admin@hyderabad.bits-pilani.ac.in','9876500004','https://www.bits-pilani.ac.in','Shameerpet','Jawahar Nagar','Hyderabad','Telangana','500078','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:21:43',1),(6,16,'VCE','VCE005','admin@vce.ac.in','9876500005','https://www.vce.ac.in','Osmania University Campus','VCE Campus','Hyderabad','Telangana','500007','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-21 16:58:22',NULL,'2026-08-26 13:15:25',1),(7,2,'Sri Venkateswara Institute of Technology','BTECH002','info@svit.edu.in','9876501002','https://www.svit.edu.in','College Road','Near Bus Stand','Anantapur','Andhra Pradesh','515001',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-26 12:12:50',NULL,'2026-08-26 12:12:50',NULL),(8,3,'Andhra Institute of Technology','BTECH003','info@ait.edu.in','9876501003','https://www.ait.edu.in','Beach Road','Madhurawada','Visakhapatnam','Andhra Pradesh','530048',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-26 12:12:50',NULL,'2026-08-26 12:12:50',NULL),(9,4,'Krishna Engineering College','BTECH004','info@kec.edu.in','9876501004','https://www.kec.edu.in','NH-16 Highway','Near Gannavaram','Vijayawada','Andhra Pradesh','520008',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-26 12:12:50',NULL,'2026-08-26 12:12:50',NULL),(10,5,'Green Valley College of Engineering','BTECH005','info@gvce.edu.in','9876501005','https://www.gvce.edu.in','Medchal Road','Kompally','Hyderabad','Telangana','500014',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:25:07',1),(11,6,'Narayana Institute of Technology','BTECH006','info@nit.edu.in','9876501006','https://www.nit.edu.in','Warangal Highway','Near Uppal','Hyderabad','Telangana','500039',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:24:48',1),(12,7,'Coastal Engineering College','BTECH007','info@cec.edu.in','9876501007','https://www.cec.edu.in','NH-16','Anandapuram','Visakhapatnam','Andhra Pradesh','531173',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:24:36',1),(13,8,'Rayalaseema Institute of Technology','BTECH008','info@rit.edu.in','9876501008','https://www.rit.edu.in','Tadipatri Road','Near Industrial Area','Kadapa','Andhra Pradesh','516003',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:24:17',1),(14,9,'Deccan College of Technology','BTECH009','info@dct.edu.in','9876501009','https://www.dct.edu.in','Mehdipatnam Road','Near NMDC','Hyderabad','Telangana','500028',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:24:08',1),(15,10,'Eastern Valley Institute of Engineering','BTECH010','info@evie.edu.in','9876501010','https://www.evie.edu.in','Kakinada Road','Near Main Campus','Rajahmundry','Andhra Pradesh','533101',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:23:53',1),(16,11,'Hyderabad Institute of Engineering','BTECH011','info@hiet.edu.in','9876501011','https://www.hiet.edu.in','Knowledge City Road','Near Financial District','Hyderabad','Telangana','500032',NULL,NULL,'Engineering College','dd-MM-yyyy','Asia/Kolkata',0,'2026-08-26 12:12:50',NULL,'2026-08-31 04:23:47',1);
/*!40000 ALTER TABLE `college_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `college_user_mappings`
--

DROP TABLE IF EXISTS `college_user_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `college_user_mappings` (
  `college_user_mapping_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `college_setting_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `removed_by` bigint DEFAULT NULL,
  PRIMARY KEY (`college_user_mapping_id`),
  UNIQUE KEY `uq_college_user_mapping_user_college` (`user_id`,`college_setting_id`),
  KEY `idx_college_user_mapping_user_id` (`user_id`),
  KEY `idx_college_user_mapping_college_setting_id` (`college_setting_id`),
  CONSTRAINT `fk_college_user_mapping_college` FOREIGN KEY (`college_setting_id`) REFERENCES `college_settings` (`college_setting_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_college_user_mapping_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `college_user_mappings`
--

LOCK TABLES `college_user_mappings` WRITE;
/*!40000 ALTER TABLE `college_user_mappings` DISABLE KEYS */;
INSERT INTO `college_user_mappings` VALUES (1,2,1,0,'2026-08-25 13:20:05',1,'2026-08-25 13:20:05',1,'2026-08-25 13:20:05',1);
/*!40000 ALTER TABLE `college_user_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `colleges`
--

DROP TABLE IF EXISTS `colleges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colleges` (
  `college_id` bigint NOT NULL AUTO_INCREMENT,
  `college_code` varchar(50) NOT NULL,
  `college_name` varchar(200) NOT NULL,
  `college_type` varchar(50) DEFAULT NULL,
  `university_name` varchar(200) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `principal` varchar(200) DEFAULT NULL,
  `principal_email` varchar(150) DEFAULT NULL,
  `principal_contact` varchar(10) DEFAULT NULL,
  `alternate_contact_number` varchar(10) DEFAULT NULL,
  `accreditation_status` varchar(30) DEFAULT NULL,
  `accreditation_body` varchar(80) DEFAULT NULL,
  `accreditation_grade` varchar(20) DEFAULT NULL,
  `accreditation_number` varchar(50) DEFAULT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `area` varchar(150) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `academic_year_id` bigint DEFAULT NULL,
  `timezone` varchar(100) DEFAULT 'Asia/Kolkata',
  `currency_code` varchar(10) DEFAULT 'INR',
  `logo_path` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`college_id`),
  UNIQUE KEY `UK_colleges_college_code` (`college_code`),
  KEY `IX_colleges_college_name` (`college_name`),
  KEY `IX_colleges_status` (`status`),
  KEY `IX_colleges_academic_year_id` (`academic_year_id`),
  CONSTRAINT `fk_college_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academicyears` (`academic_year_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `colleges`
--

LOCK TABLES `colleges` WRITE;
/*!40000 ALTER TABLE `colleges` DISABLE KEYS */;
INSERT INTO `colleges` VALUES (1,'BTECH001','BTech College of Engineering','Engineering College','Jawaharlal Nehru Technological University','info@btechcollege.edu.in','9876501001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Main Road, Madhapur','Near Metro Station','Shaikpet',NULL,NULL,'Telangana','India','500081','https://www.btechcollege.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech001.png',1,'2026-08-20 19:49:10',NULL,'2026-08-27 07:52:00',1,NULL,NULL),(2,'BTECH002','Sri Venkateswara Institute of Technology','Engineering College','Jawaharlal Nehru Technological University Anantapur','info@svit.edu.in','9876501002','08518-221001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'College Road','Near Bus Stand','Anantapur',NULL,NULL,'Andhra Pradesh','India','515001','https://www.svit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech002.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(3,'BTECH003','Andhra Institute of Technology','Engineering College','Andhra University','info@ait.edu.in','9876501003',NULL,'arunsingh','arunsingh@gmail.com','9978979797',NULL,'Not Accredited','NBA','A','797','2026-07-01','2026-08-30','Beach Road','Madhurawada','Shaikpet','Dr.B R Ambedkar O.U','Hyderabad','Telangana','India','500033','https://www.ait.edu.in',NULL,'Asia/Kolkata','INR','7b28b1be-346d-45f1-acd5-6ee1fee9b686.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 12:56:10',2,NULL,NULL),(4,'BTECH004','Krishna Engineering College','Engineering College','Jawaharlal Nehru Technological University Kakinada','info@kec.edu.in','9876501004',NULL,'kumar','kumar@gmail.com','9345938750',NULL,'Under Review','NBA','A',NULL,'2026-06-02','2026-08-31','NH-16 Highway, Near Gannavaram','Near Gannavaram','Vijayawada (Urban)','A.P.U.H.S','Krishna','Andhra Pradesh','India','520008','https://www.kec.edu.in',NULL,'Asia/Kolkata','INR','55e1f464-5879-4788-b95c-3e39b6b7f3d6.png',1,'2026-08-20 19:49:10',NULL,'2026-08-31 14:51:42',1,NULL,NULL),(5,'BTECH005','Green Valley College of Engineering','Engineering College','Osmania University','info@gvce.edu.in','9876501005','040-27861005',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Medchal Road','Kompally','Hyderabad',NULL,NULL,'Telangana','India','500014','https://www.gvce.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech005.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:25:07',1,'2026-08-31 04:25:07',1),(6,'BTECH006','Narayana Institute of Technology','Engineering College','JNTU Hyderabad','info@nit.edu.in','9876501006','040-26961006',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Warangal Highway','Near Uppal','Hyderabad',NULL,NULL,'Telangana','India','500039','https://www.nit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech006.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:24:48',1,'2026-08-31 04:24:48',1),(7,'BTECH007','Coastal Engineering College','Engineering College','Andhra University','info@cec.edu.in','9876501007','0891-2761007',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'NH-16','Anandapuram','Visakhapatnam',NULL,NULL,'Andhra Pradesh','India','531173','https://www.cec.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech007.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:24:36',1,'2026-08-31 04:24:36',1),(8,'BTECH008','Rayalaseema Institute of Technology','Engineering College','JNTU Anantapur','info@rit.edu.in','9876501008',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Tadipatri Road',NULL,'Kadapa',NULL,NULL,'Andhra Pradesh',NULL,'516003','https://www.rit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech008.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:24:17',1,'2026-08-31 04:24:17',1),(9,'BTECH009','Deccan College of Technology','Engineering College','Osmania University','info@dct.edu.in','9876501009','040-24561009',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Mehdipatnam Road','Near NMDC','Hyderabad',NULL,NULL,'Telangana','India','500028','https://www.dct.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech009.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:24:08',1,'2026-08-31 04:24:08',1),(10,'BTECH010','Eastern Valley Institute of Engineering','Engineering College','JNTU Kakinada','info@evie.edu.in','9876501010','0884-2361010',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Kakinada Road','Near Main Campus','Rajahmundry',NULL,NULL,'Andhra Pradesh','India','533101','https://www.evie.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech010.png',0,'2026-08-20 19:49:10',NULL,'2026-08-31 04:23:53',1,'2026-08-31 04:23:53',1),(11,'BTECH011','Hyderabad Institute of Engineering','Engineering College','JNTU Hyderabad','info@hiet.edu.in','9876501011','040-24561011',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Knowledge City Road','Near Financial District','Hyderabad',NULL,NULL,'Telangana','India','500032','https://www.hiet.edu.in',2,'Asia/Kolkata','INR',NULL,0,'2026-08-25 14:32:32',1,'2026-08-31 04:23:47',1,'2026-08-31 04:23:47',1),(12,'CMR001','CMR College of Engineering and Technology','Engineering College',NULL,'admin@cmrcet.edu.in','9876500001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Kandlakoya','Medchal Road','Hyderabad',NULL,NULL,'Telangana','India','501401','https://cmrcet.edu.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:22:16',1,'2026-08-31 04:22:16',1),(13,'VNR002','VNR VJIET','Engineering College',NULL,'admin@vnrvjiet.in','9876500002',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Bachupally','Pragathi Nagar Road','Hyderabad',NULL,NULL,'Telangana','India','500090','https://vnrvjiet.ac.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:22:02',1,'2026-08-31 04:22:02',1),(14,'MREC003','Malla Reddy Engineering College','Engineering College',NULL,'admin@mrec.ac.in','9876500003',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Maisammaguda','Dhulapally','Hyderabad',NULL,NULL,'Telangana','India','500100','https://mrec.ac.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:21:56',1,'2026-08-31 04:21:56',1),(15,'BITS004','BITS Pilani Hyderabad Campus','Engineering College','jshwdhsd','admin@hyderabad.bits-pilani.ac.in','9876500004',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Shameerpet','Jawahar Nagar','Tirumalagiri',NULL,NULL,'Telangana','India','500078','https://www.bits-pilani.ac.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-21 16:58:22',NULL,'2026-08-31 04:21:43',1,'2026-08-31 04:21:43',1),(16,'VCE005','VCE','Engineering College',NULL,'admin@vce.ac.in','9876500005',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Osmania University Campus','VCE Campus','Hyderabad',NULL,NULL,'Telangana','India','500007','https://www.vce.ac.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-21 16:58:22',NULL,'2026-08-26 13:15:25',1,'2026-08-26 13:15:25',1),(19,'CIT002','Btech college','Affiliated College','Andhra University','chinnalurupravallika789@gmail.com','9087899899',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'rtui','','Serilingampally',NULL,NULL,'Telangana','India','500084','https://btechcollege.edu',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-27 04:30:11',1,'2026-08-31 04:20:56',1,'2026-08-31 04:20:56',1),(20,'BTECH0010','B.Tech Engineering College','Affiliated College','jshwdhsd','chinnalurupravallika789@gmail.com','8998998999',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Yerrapragadavari','35-50-11','Tanuku',NULL,NULL,'Andhra Pradesh','India','534211','https://btechcollege.edu.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-27 07:53:11',1,'2026-08-31 04:18:58',1,'2026-08-31 04:18:58',1),(21,'BTECH0016','pirnav engineering college','dfcgv','jshwdhsd','chinnalurupravallika789@gmail.com','6686886886',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'590/B Aditya Nagar New Hafeezpet,Near St.Rita High School','','Serilingampally',NULL,NULL,'Telangana','India','500084','https://btechcollege.edu.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-27 09:43:50',1,'2026-08-31 04:17:11',1,'2026-08-31 04:17:11',1),(55,'BTECH0017','Andhra Institute of Technology','Engineering College','Andhra University','info@ait.edu.in','9876501003','','arunsingh','arunsingh@gmail.com','9978979797',NULL,'Not Accredited','NBA','A','797','2026-07-01','2026-08-30','Beach Road','Madhurawada','Shaikpet','Dr.B R Ambedkar O.U','Hyderabad','Telangana','India','500033','https://www.ait.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech003.png',1,'2026-08-31 06:24:34',1,'2026-09-01 06:05:02',1,NULL,NULL),(56,'JEIJ','hello','Autonomous College','iuhurfhehfu','veesamsaicharanreddy@gmail.com','9989888888',NULL,'ihihhiuhh','veesamsaicharanreddy@gmail.com','9989009999','9909090909','Not Accredited','naac','A','667676876667','2002-12-09','2030-12-06','mangampeta kapupalli','','Kodur','Anantharajup R.S.','Cuddapah','Andhra Pradesh','India','516105',NULL,NULL,'Asia/Kolkata','INR','9e3fbf7b-f046-406d-8731-cfcb91bce5c8.png',1,'2026-08-31 06:33:40',1,'2026-08-31 14:54:09',1,NULL,NULL),(57,'BTECH000','tdhr dfh','Deemed University','Andhra University','cheedellayagnasri@gmail.com','9876542345',NULL,'kfhgdfresrdfghjkhjmg','cheedellayagnasri@gmail.com','9876543234','8765432123','Under Review','NAAC','A','89765641','2026-08-20','2032-09-30','H.no - 3/28','','Tirumalagiri','Kukatpally','Hyderabad','Telangana','India','500072','https://gectcr.ac.in',NULL,'Asia/Kolkata','INR',NULL,0,'2026-08-31 06:51:52',1,'2026-08-31 09:13:57',1,'2026-08-31 09:13:57',1),(58,'S12','sri','Deemed University','Andhra University','cheedellayagnasri@gmail.com','8576431345',NULL,'sri','cheedellayagnasri@gmail.com','9756431223',NULL,'Under Review','NAAC','A',NULL,'2026-08-18','2030-10-29','H.no - 3/28','','Tirumalagiri','Kukatpally','Hyderabad','Telangana','India','500072','https://gectcr.ac.in',NULL,'Asia/Kolkata','INR','20a5c96d-c11e-49c2-96f5-749f9b5eeeb0.png',1,'2026-08-31 12:52:59',2,'2026-08-31 18:23:00',NULL,NULL,NULL),(59,'S123','sri','University','Andhra University','cheedellayagnasri@gmail.com','8765432134',NULL,'sri','cheedellayagnasri@gmail.com','9876543212','8765432123','Under Review','NBA','A',NULL,'2026-09-01','2030-10-01','H.no - 3/28','','Tirumalagiri','Kukatpally','Hyderabad','Telangana','India','500072','https://gectcr.ac.in',NULL,'Asia/Kolkata','INR','5f77287f-1a29-43ee-9545-cea51ddbc92d.png',1,'2026-09-01 06:03:33',1,'2026-09-01 11:33:34',NULL,NULL,NULL);
/*!40000 ALTER TABLE `colleges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_semester_mappings`
--

DROP TABLE IF EXISTS `course_semester_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_semester_mappings` (
  `course_semester_mapping_id` bigint NOT NULL AUTO_INCREMENT,
  `course_id` bigint NOT NULL,
  `semester_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`course_semester_mapping_id`),
  UNIQUE KEY `uq_course_semester` (`course_id`,`semester_id`),
  KEY `idx_csm_course_id` (`course_id`),
  KEY `idx_csm_semester_id` (`semester_id`),
  KEY `idx_csm_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_semester_mappings`
--

LOCK TABLES `course_semester_mappings` WRITE;
/*!40000 ALTER TABLE `course_semester_mappings` DISABLE KEYS */;
INSERT INTO `course_semester_mappings` VALUES (1,1,1,1,'2026-08-25 23:38:13',1,'2026-08-25 23:38:13',NULL,NULL,NULL),(2,1,2,1,'2026-08-25 23:38:13',1,'2026-08-25 23:38:13',NULL,NULL,NULL),(3,1,3,1,'2026-08-25 23:38:13',1,'2026-08-25 23:38:13',NULL,NULL,NULL),(4,1,4,1,'2026-08-25 18:09:47',1,NULL,NULL,NULL,NULL),(5,5,5,0,'2026-08-31 12:21:49',1,'2026-08-31 12:25:12',0,NULL,NULL);
/*!40000 ALTER TABLE `course_semester_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_structures`
--

DROP TABLE IF EXISTS `course_structures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_structures` (
  `structure_id` bigint NOT NULL AUTO_INCREMENT,
  `course_id` bigint NOT NULL,
  `branch_id` bigint DEFAULT NULL,
  `year_number` int NOT NULL,
  `semester_number` int NOT NULL,
  `semester_name` varchar(100) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`structure_id`),
  KEY `idx_course_structures_course` (`course_id`),
  KEY `idx_course_structures_branch` (`branch_id`),
  KEY `idx_course_structures_year_semester` (`course_id`,`year_number`,`semester_number`),
  CONSTRAINT `fk_course_structures_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_course_structures_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_structures`
--

LOCK TABLES `course_structures` WRITE;
/*!40000 ALTER TABLE `course_structures` DISABLE KEYS */;
INSERT INTO `course_structures` VALUES (17,1,1,1,1,'B.Tech CSE Semester 1',1,'2026-08-25 23:32:52',1,'2026-08-27 10:07:57',1,NULL,NULL),(18,1,1,1,2,'B.Tech CSE Semester 2',1,'2026-08-25 23:32:52',1,'2026-08-27 10:08:05',1,NULL,NULL),(19,1,1,2,3,'B.Tech CSE Semester 3',1,'2026-08-25 23:32:52',1,'2026-08-25 23:32:52',NULL,NULL,NULL),(20,1,1,2,4,'B.Tech CSE Semester 4',1,'2026-08-25 23:32:52',1,'2026-08-25 23:32:52',NULL,NULL,NULL),(21,1,1,3,5,'B.Tech CSE Semester 5',1,'2026-08-25 23:32:52',1,'2026-08-27 09:08:30',1,NULL,NULL),(22,1,1,3,6,'B.Tech CSE Semester 6',1,'2026-08-25 23:32:52',1,'2026-08-25 23:32:52',NULL,NULL,NULL),(23,1,1,4,7,'B.Tech CSE Semester 7',1,'2026-08-25 23:32:52',1,'2026-08-25 23:32:52',NULL,NULL,NULL),(24,1,1,4,8,'B.Tech CSE Semester 8',1,'2026-08-25 23:32:52',1,'2026-08-25 23:32:52',NULL,NULL,NULL),(25,1,1,1,8,'Semester 8',1,'2026-08-27 08:50:23',1,'2026-08-27 14:20:23',NULL,NULL,NULL),(26,1,3,1,7,'Semester 7',1,'2026-08-27 09:07:50',1,'2026-08-27 14:37:50',NULL,NULL,NULL),(27,1,3,1,4,'Semester 8',1,'2026-08-27 10:08:24',1,'2026-08-27 15:38:24',NULL,NULL,NULL),(28,1,3,1,1,'Semester 1',1,'2026-08-27 11:47:15',1,'2026-08-27 17:17:15',NULL,NULL,NULL),(29,1,2,1,1,'Semester 1',1,'2026-08-31 07:20:29',1,'2026-08-31 12:50:29',NULL,NULL,NULL);
/*!40000 ALTER TABLE `course_structures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `course_id` bigint NOT NULL AUTO_INCREMENT,
  `college_id` bigint NOT NULL,
  `department_id` bigint DEFAULT NULL,
  `course_code` varchar(50) NOT NULL,
  `course_name` varchar(150) NOT NULL,
  `course_short_name` varchar(50) DEFAULT NULL,
  `course_type` varchar(50) DEFAULT NULL,
  `duration_years` int NOT NULL,
  `total_semesters` int NOT NULL,
  `eligibility` varchar(255) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`course_id`),
  UNIQUE KEY `uq_courses_course_code` (`course_code`),
  KEY `idx_courses_college_id` (`college_id`),
  KEY `idx_courses_department_id` (`department_id`),
  KEY `idx_courses_course_name` (`course_name`),
  KEY `idx_courses_status` (`status`),
  CONSTRAINT `fk_courses_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`),
  CONSTRAINT `fk_courses_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,1,1,'BTECH','Bachelor of Technology','B.Tech','Undergraduate',4,8,'10+2 with Mathematics, Physics and Chemistry','Bachelor of Technology undergraduate programme',1,'2026-08-24 14:42:19',1,'2026-09-03 09:40:41',1,NULL,NULL),(5,19,13,'BA','Bachelor of Arts','BA','Undergraduate',4,8,'10+2 or equivalent','Bachelor of Arts undergraduate programme',0,'2026-08-24 14:42:19',1,'2026-08-31 08:41:18',1,'2026-08-31 08:41:18',1),(6,1,1,'MTECH','Master of Technology','M.Tech','Postgraduate',2,4,'B.E. or B.Tech degree in a relevant engineering discipline','Master of Technology postgraduate engineering programme',0,'2026-08-25 17:51:24',1,'2026-08-31 08:41:18',1,'2026-08-31 08:41:18',1),(7,15,14,'TACC','Test Auto College Course','TACC','Undergraduate',4,8,'','',0,'2026-08-27 08:23:23',1,'2026-08-31 08:41:18',1,'2026-08-31 08:41:18',1),(8,1,3,'EEE','B.Tech','EEE','Undergraduate',4,8,'10+2','',0,'2026-08-31 07:05:13',1,'2026-08-31 08:41:18',1,'2026-08-31 08:41:18',1);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `department_id` bigint NOT NULL AUTO_INCREMENT,
  `college_id` bigint NOT NULL,
  `department_code` varchar(50) NOT NULL,
  `department_name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  `hod_user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_department_college_code` (`college_id`,`department_code`),
  KEY `idx_departments_college_id` (`college_id`),
  KEY `idx_departments_status` (`status`),
  CONSTRAINT `fk_departments_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,1,'CSE','Computer Science and Engineering','Department of Computer Science and Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:34',NULL,NULL,NULL,NULL),(2,1,'ECE','Electronics and Communication Engineering','Department of Electronics and Communication Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL,NULL),(3,1,'EEE','Electrical and Electronics Engineering','Department of Electrical and Electronics Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL,NULL),(4,1,'MECH','Mechanical Engineering','Department of Mechanical Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL,NULL),(5,1,'CIVIL','Civil Engineering',NULL,1,'2026-08-21 16:28:54',NULL,'2026-08-31 12:32:45',NULL,NULL,NULL,2343555),(6,3,'CSE','Computer Science',NULL,1,'2026-08-25 13:15:20',1,'2026-08-31 11:26:04',NULL,NULL,NULL,34567),(12,1,'TDR1','Test Department Redmark',NULL,1,'2026-08-27 08:10:30',NULL,NULL,NULL,NULL,NULL,NULL),(13,19,'MECT','Mechatronics Engineering',NULL,1,'2026-08-27 08:11:18',NULL,NULL,NULL,NULL,NULL,NULL),(14,15,'AERO','Aerospace Engineering',NULL,1,'2026-08-27 08:15:01',NULL,'2026-09-03 05:17:54',NULL,NULL,NULL,234567),(15,3,'CSE001','sdffgg',NULL,1,'2026-08-27 08:15:04',NULL,NULL,NULL,NULL,NULL,NULL),(16,15,'567T','sfdg',NULL,1,'2026-08-27 09:56:43',NULL,NULL,NULL,NULL,NULL,345678),(17,3,'CSE-02','cse',NULL,1,'2026-08-27 11:25:02',NULL,'2026-08-27 11:25:58',NULL,NULL,NULL,123),(18,3,'CST','Computer science and technology',NULL,1,'2026-08-31 05:30:27',NULL,NULL,NULL,NULL,NULL,NULL),(19,4,'MECH','Mehanical Engineeriung','Updated Mehanical Engineering Department',0,'2026-08-31 10:46:25',NULL,'2026-08-31 16:21:04',NULL,'2026-08-31 10:51:05',NULL,NULL),(20,55,'LOJKUGJFHFGDSXCV','hgfgdxcfhvgjbhkjnlm,',NULL,1,'2026-08-31 11:04:38',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_profiles`
--

DROP TABLE IF EXISTS `employee_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_profiles` (
  `employee_profile_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `department_id` bigint DEFAULT NULL,
  `designation` varchar(150) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `about_me` varchar(1000) DEFAULT NULL,
  `profile_image_path` varchar(500) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`employee_profile_id`),
  UNIQUE KEY `uq_employee_profiles_user_id` (`user_id`),
  KEY `idx_employee_profiles_department_id` (`department_id`),
  KEY `idx_employee_profiles_status` (`status`),
  CONSTRAINT `fk_employee_profiles_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_profiles`
--

LOCK TABLES `employee_profiles` WRITE;
/*!40000 ALTER TABLE `employee_profiles` DISABLE KEYS */;
INSERT INTO `employee_profiles` VALUES (1,1,'1978-05-15','Male',1,'President','Banjara Hills, Hyderabad, Updated','500035','Hyderabad','K.V.Rangareddy','Telangana','President responsible for institutional leadership, strategic planning, governance and overall administration of the college.',NULL,1,'2026-08-21 16:30:34',1,'2026-09-02 12:58:59',1,NULL,NULL),(2,2,'1985-08-20','Male',1,'Administrator','Kukatpally, Hyderabad','500072','Hyderabad','Hyderabad','Telangana','Administrative staff responsible for institutional operations and management.',NULL,1,'2026-08-21 16:30:34',2,'2026-08-21 16:30:34',NULL,NULL,NULL),(3,3,'1982-03-10','Female',2,'Professor','Miyapur, Hyderabad','500049','Hyderabad','Hyderabad','Telangana','Professor involved in teaching, research and academic activities.',NULL,1,'2026-08-21 16:30:34',3,'2026-08-21 16:30:34',NULL,NULL,NULL),(4,4,'1979-11-25','Male',1,'Head of Department','Gachibowli, Hyderabad','500032','Hyderabad','Rangareddy','Telangana','Head of Department responsible for academic planning and departmental administration.',NULL,1,'2026-08-21 16:30:34',4,'2026-08-21 16:30:34',NULL,NULL,NULL),(5,5,'1990-06-18','Female',1,'Assistant Professor','Manikonda, Hyderabad','500089','Hyderabad','Rangareddy','Telangana','Assistant Professor involved in undergraduate teaching and student mentoring.',NULL,1,'2026-08-21 16:30:34',5,'2026-08-21 16:30:34',NULL,NULL,NULL);
/*!40000 ALTER TABLE `employee_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_audits`
--

DROP TABLE IF EXISTS `login_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_audits` (
  `login_audit_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `login_identifier` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`login_audit_id`),
  KEY `idx_login_audits_user_id` (`user_id`),
  KEY `idx_login_audits_event_type` (`event_type`),
  KEY `idx_login_audits_login_status` (`login_status`),
  KEY `idx_login_audits_login_at` (`login_at`),
  CONSTRAINT `fk_login_audits_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=261 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_audits`
--

LOCK TABLES `login_audits` WRITE;
/*!40000 ALTER TABLE `login_audits` DISABLE KEYS */;
INSERT INTO `login_audits` VALUES (1,1,'ADM001','LOGIN','SUCCESS','192.168.1.10','Chrome / Windows 11',NULL,'2026-08-19 08:45:00','2026-08-19 17:30:00','2026-08-19 08:45:00'),(2,2,'ADM002','LOGIN','SUCCESS','192.168.1.11','Chrome / Windows 11',NULL,'2026-08-19 08:50:00','2026-08-19 17:15:00','2026-08-19 08:50:00'),(3,3,'PRN001','LOGIN','SUCCESS','192.168.1.20','Edge / Windows 11',NULL,'2026-08-19 09:00:00','2026-08-19 16:45:00','2026-08-19 09:00:00'),(4,4,'HOD001','LOGIN','SUCCESS','192.168.1.30','Chrome / Windows 11',NULL,'2026-08-19 09:05:00','2026-08-19 16:30:00','2026-08-19 09:05:00'),(5,5,'FAC001','LOGIN','FAILED','192.168.1.40','Chrome / Windows 11','Invalid password','2026-08-19 09:10:00',NULL,'2026-08-19 09:10:00'),(6,5,'FAC001','LOGIN','SUCCESS','192.168.1.40','Chrome / Windows 11',NULL,'2026-08-19 09:12:00','2026-08-19 16:00:00','2026-08-19 09:12:00'),(7,6,'STU2026001','LOGIN','SUCCESS','192.168.1.101','Chrome / Android',NULL,'2026-08-19 09:20:00','2026-08-19 14:30:00','2026-08-19 09:20:00'),(8,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:07:02',NULL,'2026-08-19 16:07:02'),(9,NULL,'EMP001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-19 16:26:45',NULL,'2026-08-19 16:26:45'),(10,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:39:25',NULL,'2026-08-19 16:39:25'),(11,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:39:54',NULL,'2026-08-19 16:39:54'),(12,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:14:24',NULL,'2026-08-19 17:14:24'),(13,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:14:57',NULL,'2026-08-19 17:14:57'),(14,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:15:53',NULL,'2026-08-19 17:15:53'),(15,2,'ADM002','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:16:13',NULL,'2026-08-19 17:16:13'),(16,1,'rajesh.kumar@btechcollege.edu.in','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:20:01',NULL,'2026-08-19 17:20:01'),(17,2,'ADM002','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:30:56',NULL,'2026-08-19 17:30:56'),(18,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:16:36',NULL,'2026-08-20 05:16:36'),(19,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:21:56',NULL,'2026-08-20 05:21:56'),(20,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:25:18',NULL,'2026-08-20 05:25:18'),(21,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:33:39',NULL,'2026-08-20 11:33:39'),(22,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:51:46',NULL,'2026-08-20 11:51:46'),(23,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:52:51',NULL,'2026-08-20 11:52:51'),(24,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:53:26',NULL,'2026-08-20 11:53:26'),(25,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:55:32',NULL,'2026-08-20 11:55:32'),(26,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:57:25',NULL,'2026-08-20 11:57:25'),(27,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:59:20',NULL,'2026-08-20 11:59:20'),(28,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:17:28',NULL,'2026-08-20 12:17:28'),(29,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:19:11',NULL,'2026-08-20 12:19:11'),(30,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:37:17',NULL,'2026-08-20 12:37:17'),(31,NULL,'AD001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-20 13:38:37',NULL,'2026-08-20 13:38:37'),(32,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:38:50',NULL,'2026-08-20 13:38:50'),(33,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:39:45',NULL,'2026-08-20 13:39:45'),(34,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:55:34',NULL,'2026-08-20 13:55:34'),(35,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:58:27',NULL,'2026-08-20 13:58:27'),(36,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:59:54',NULL,'2026-08-20 13:59:54'),(37,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 14:06:10',NULL,'2026-08-20 14:06:10'),(38,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 14:07:47',NULL,'2026-08-20 14:07:47'),(39,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-21 07:06:03',NULL,'2026-08-21 07:06:03'),(40,NULL,'ADMN001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-21 07:06:13',NULL,'2026-08-21 07:06:13'),(41,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 07:06:49',NULL,'2026-08-21 07:06:49'),(42,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 08:57:19',NULL,'2026-08-21 08:57:19'),(43,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 09:05:18',NULL,'2026-08-21 09:05:18'),(44,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 11:07:26',NULL,'2026-08-21 11:07:26'),(45,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 03:49:01',NULL,'2026-08-24 03:49:01'),(46,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 04:16:31',NULL,'2026-08-24 04:16:31'),(47,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 04:19:43',NULL,'2026-08-24 04:19:43'),(48,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 04:33:53',NULL,'2026-08-24 04:33:53'),(49,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 05:11:35',NULL,'2026-08-24 05:11:35'),(50,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 05:23:27',NULL,'2026-08-24 05:23:27'),(51,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 05:24:43',NULL,'2026-08-24 05:24:43'),(52,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 05:25:02',NULL,'2026-08-24 05:25:02'),(53,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 06:08:04',NULL,'2026-08-24 06:08:04'),(54,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 06:41:19',NULL,'2026-08-24 06:41:19'),(55,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 06:47:40',NULL,'2026-08-24 06:47:40'),(56,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 07:06:19',NULL,'2026-08-24 07:06:19'),(57,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-24 07:13:02',NULL,'2026-08-24 07:13:02'),(58,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-24 07:13:29',NULL,'2026-08-24 07:13:29'),(59,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 07:13:53',NULL,'2026-08-24 07:13:53'),(60,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 07:29:37',NULL,'2026-08-24 07:29:37'),(61,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 07:33:16',NULL,'2026-08-24 07:33:16'),(62,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 08:42:45',NULL,'2026-08-24 08:42:45'),(63,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 08:50:31',NULL,'2026-08-24 08:50:31'),(64,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Edg/151.0.0.0 Mobile Safari/537.36',NULL,'2026-08-24 08:55:51',NULL,'2026-08-24 08:55:51'),(65,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 08:58:40',NULL,'2026-08-24 08:58:40'),(66,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 08:59:09',NULL,'2026-08-24 08:59:09'),(67,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:06:05',NULL,'2026-08-24 09:06:05'),(68,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:14:05',NULL,'2026-08-24 09:14:05'),(69,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:16:55',NULL,'2026-08-24 09:16:55'),(70,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:17:26',NULL,'2026-08-24 09:17:26'),(71,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:18:52',NULL,'2026-08-24 09:18:52'),(72,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:19:14',NULL,'2026-08-24 09:19:14'),(73,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:21:52',NULL,'2026-08-24 09:21:52'),(74,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:28:46',NULL,'2026-08-24 09:28:46'),(75,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:31:00',NULL,'2026-08-24 09:31:00'),(76,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:34:48',NULL,'2026-08-24 09:34:48'),(77,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 09:36:03',NULL,'2026-08-24 09:36:03'),(78,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:40:24',NULL,'2026-08-24 09:40:24'),(79,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 09:55:48',NULL,'2026-08-24 09:55:48'),(80,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 10:00:28',NULL,'2026-08-24 10:00:28'),(81,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 10:13:08',NULL,'2026-08-24 10:13:08'),(82,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 11:01:48',NULL,'2026-08-24 11:01:48'),(83,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 11:03:47',NULL,'2026-08-24 11:03:47'),(84,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 11:25:10',NULL,'2026-08-24 11:25:10'),(85,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 11:25:21',NULL,'2026-08-24 11:25:21'),(86,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-24 11:25:31',NULL,'2026-08-24 11:25:31'),(87,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 11:38:31',NULL,'2026-08-24 11:38:31'),(88,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 11:44:23',NULL,'2026-08-24 11:44:23'),(89,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 12:49:34',NULL,'2026-08-24 12:49:34'),(90,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 16:42:22',NULL,'2026-08-24 16:42:22'),(91,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-24 17:02:41',NULL,'2026-08-24 17:02:41'),(92,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-25 04:56:26',NULL,'2026-08-25 04:56:26'),(93,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-25 04:56:37',NULL,'2026-08-25 04:56:37'),(94,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-25 09:17:57',NULL,'2026-08-25 09:17:57'),(95,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 13:39:34',NULL,'2026-08-25 13:39:34'),(96,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Password reset OTP generated','2026-08-25 14:06:24',NULL,'2026-08-25 14:06:24'),(97,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 14:19:58',NULL,'2026-08-25 14:19:58'),(98,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 17:44:36',NULL,'2026-08-25 17:44:36'),(99,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Password reset OTP generated','2026-08-25 18:12:32',NULL,'2026-08-25 18:12:32'),(100,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 18:15:55',NULL,'2026-08-25 18:15:55'),(101,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 18:23:10',NULL,'2026-08-25 18:23:10'),(102,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-25 18:27:17',NULL,'2026-08-25 18:27:17'),(103,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-26 06:49:46',NULL,'2026-08-26 06:49:46'),(104,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-26 09:33:52',NULL,'2026-08-26 09:33:52'),(105,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-26 12:25:19',NULL,'2026-08-26 12:25:19'),(106,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-26 13:15:02',NULL,'2026-08-26 13:15:02'),(107,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 02:35:02',NULL,'2026-08-27 02:35:02'),(108,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 03:51:28',NULL,'2026-08-27 03:51:28'),(109,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 04:10:11',NULL,'2026-08-27 04:10:11'),(110,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 04:12:14',NULL,'2026-08-27 04:12:14'),(111,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 04:14:32',NULL,'2026-08-27 04:14:32'),(112,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 04:19:49',NULL,'2026-08-27 04:19:49'),(113,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 04:29:33',NULL,'2026-08-27 04:29:33'),(114,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 04:44:08',NULL,'2026-08-27 04:44:08'),(115,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 04:47:56',NULL,'2026-08-27 04:47:56'),(116,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 04:57:23',NULL,'2026-08-27 04:57:23'),(117,1,'rajesh.kumar@btechcollege.edu.in','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 05:11:12',NULL,'2026-08-27 05:11:12'),(118,NULL,'chinnalurupravallika789@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-27 05:11:51',NULL,'2026-08-27 05:11:51'),(119,NULL,'chinnalurupravallika789@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-27 05:12:15',NULL,'2026-08-27 05:12:15'),(120,1,'9876501001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 05:12:48',NULL,'2026-08-27 05:12:48'),(121,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 05:21:27',NULL,'2026-08-27 05:21:27'),(122,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 05:23:37',NULL,'2026-08-27 05:23:37'),(123,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 05:51:43',NULL,'2026-08-27 05:51:43'),(124,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 05:59:30',NULL,'2026-08-27 05:59:30'),(125,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 06:00:04',NULL,'2026-08-27 06:00:04'),(126,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 06:07:32',NULL,'2026-08-27 06:07:32'),(127,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 06:11:57',NULL,'2026-08-27 06:11:57'),(128,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 06:15:04',NULL,'2026-08-27 06:15:04'),(129,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 07:09:18',NULL,'2026-08-27 07:09:18'),(130,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 07:14:54',NULL,'2026-08-27 07:14:54'),(131,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 07:26:01',NULL,'2026-08-27 07:26:01'),(132,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 07:37:44',NULL,'2026-08-27 07:37:44'),(133,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 07:54:44',NULL,'2026-08-27 07:54:44'),(134,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-27 08:05:07',NULL,'2026-08-27 08:05:07'),(135,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-27 08:09:00',NULL,'2026-08-27 08:09:00'),(136,NULL,'veesamsaicharanreddy@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','User not found','2026-08-27 08:09:24',NULL,'2026-08-27 08:09:24'),(137,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-27 08:15:05',NULL,'2026-08-27 08:15:05'),(138,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 08:15:13',NULL,'2026-08-27 08:15:13'),(139,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.134.0 Chrome/148.0.7778.280 Electron/42.8.1 Safari/537.36',NULL,'2026-08-27 08:26:49',NULL,'2026-08-27 08:26:49'),(140,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 08:41:47',NULL,'2026-08-27 08:41:47'),(141,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 08:41:57',NULL,'2026-08-27 08:41:57'),(142,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 08:59:13',NULL,'2026-08-27 08:59:13'),(143,NULL,'ADN001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-27 09:17:16',NULL,'2026-08-27 09:17:16'),(144,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 09:23:37',NULL,'2026-08-27 09:23:37'),(145,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 09:25:01',NULL,'2026-08-27 09:25:01'),(146,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 09:25:17',NULL,'2026-08-27 09:25:17'),(147,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 09:42:10',NULL,'2026-08-27 09:42:10'),(148,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 10:01:01',NULL,'2026-08-27 10:01:01'),(149,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 10:12:17',NULL,'2026-08-27 10:12:17'),(150,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 10:18:21',NULL,'2026-08-27 10:18:21'),(151,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-27 10:18:52',NULL,'2026-08-27 10:18:52'),(152,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 10:19:03',NULL,'2026-08-27 10:19:03'),(153,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 10:21:27',NULL,'2026-08-27 10:21:27'),(154,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 10:27:13',NULL,'2026-08-27 10:27:13'),(155,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 10:28:05',NULL,'2026-08-27 10:28:05'),(156,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 10:28:49',NULL,'2026-08-27 10:28:49'),(157,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-27 10:38:02',NULL,'2026-08-27 10:38:02'),(158,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 10:38:14',NULL,'2026-08-27 10:38:14'),(159,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 10:50:24',NULL,'2026-08-27 10:50:24'),(160,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 11:09:36',NULL,'2026-08-27 11:09:36'),(161,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-27 11:10:17',NULL,'2026-08-27 11:10:17'),(162,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 11:10:21',NULL,'2026-08-27 11:10:21'),(163,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-27 11:16:24',NULL,'2026-08-27 11:16:24'),(164,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-27 11:35:57',NULL,'2026-08-27 11:35:57'),(165,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-27 11:36:00',NULL,'2026-08-27 11:36:00'),(166,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','Invalid password','2026-08-31 03:52:01',NULL,'2026-08-31 03:52:01'),(167,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 03:52:15',NULL,'2026-08-31 03:52:15'),(168,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-08-31 03:53:14',NULL,'2026-08-31 03:53:14'),(169,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-31 04:17:56',NULL,'2026-08-31 04:17:56'),(170,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 04:18:20',NULL,'2026-08-31 04:18:20'),(171,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 04:19:01',NULL,'2026-08-31 04:19:01'),(172,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 05:02:25',NULL,'2026-08-31 05:02:25'),(173,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 05:06:16',NULL,'2026-08-31 05:06:16'),(174,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-31 05:08:51',NULL,'2026-08-31 05:08:51'),(175,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 05:08:58',NULL,'2026-08-31 05:08:58'),(176,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 05:22:10',NULL,'2026-08-31 05:22:10'),(177,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 05:31:50',NULL,'2026-08-31 05:31:50'),(178,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 06:12:52',NULL,'2026-08-31 06:12:52'),(179,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 06:22:59',NULL,'2026-08-31 06:22:59'),(180,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-31 06:39:30',NULL,'2026-08-31 06:39:30'),(181,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 06:39:38',NULL,'2026-08-31 06:39:38'),(182,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 06:46:16',NULL,'2026-08-31 06:46:16'),(183,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 07:20:32',NULL,'2026-08-31 07:20:32'),(184,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 07:27:46',NULL,'2026-08-31 07:27:46'),(185,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-31 08:41:09',NULL,'2026-08-31 08:41:09'),(186,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 08:41:16',NULL,'2026-08-31 08:41:16'),(187,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 08:42:31',NULL,'2026-08-31 08:42:31'),(188,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 08:52:36',NULL,'2026-08-31 08:52:36'),(189,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','Invalid password','2026-08-31 08:55:43',NULL,'2026-08-31 08:55:43'),(190,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-08-31 08:55:55',NULL,'2026-08-31 08:55:55'),(191,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 09:10:12',NULL,'2026-08-31 09:10:12'),(192,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-31 09:11:11',NULL,'2026-08-31 09:11:11'),(193,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 09:21:11',NULL,'2026-08-31 09:21:11'),(194,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 09:32:20',NULL,'2026-08-31 09:32:20'),(195,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-31 09:41:35',NULL,'2026-08-31 09:41:35'),(196,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 09:41:59',NULL,'2026-08-31 09:41:59'),(197,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 09:45:05',NULL,'2026-08-31 09:45:05'),(198,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 09:52:42',NULL,'2026-08-31 09:52:42'),(199,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 10:36:34',NULL,'2026-08-31 10:36:34'),(200,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 10:40:52',NULL,'2026-08-31 10:40:52'),(201,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','Invalid password','2026-08-31 11:16:05',NULL,'2026-08-31 11:16:05'),(202,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-08-31 11:16:15',NULL,'2026-08-31 11:16:15'),(203,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 11:36:39',NULL,'2026-08-31 11:36:39'),(204,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 11:42:07',NULL,'2026-08-31 11:42:07'),(205,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 11:47:40',NULL,'2026-08-31 11:47:40'),(206,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 12:07:07',NULL,'2026-08-31 12:07:07'),(207,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Invalid password','2026-08-31 12:10:26',NULL,'2026-08-31 12:10:26'),(208,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 12:10:38',NULL,'2026-08-31 12:10:38'),(209,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 12:10:39',NULL,'2026-08-31 12:10:39'),(210,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-08-31 12:28:27',NULL,'2026-08-31 12:28:27'),(211,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-08-31 12:37:15',NULL,'2026-08-31 12:37:15'),(212,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 12:44:52',NULL,'2026-08-31 12:44:52'),(213,2,'ADM002','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','Invalid password','2026-08-31 12:48:19',NULL,'2026-08-31 12:48:19'),(214,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-08-31 12:48:34',NULL,'2026-08-31 12:48:34'),(215,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 04:15:09',NULL,'2026-09-01 04:15:09'),(216,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-09-01 04:26:44',NULL,'2026-09-01 04:26:44'),(217,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-09-01 04:36:15',NULL,'2026-09-01 04:36:15'),(218,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',NULL,'2026-09-01 05:19:17',NULL,'2026-09-01 05:19:17'),(219,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-01 05:23:38',NULL,'2026-09-01 05:23:38'),(220,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 05:28:44',NULL,'2026-09-01 05:28:44'),(221,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 05:59:14',NULL,'2026-09-01 05:59:14'),(222,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 08:35:11',NULL,'2026-09-01 08:35:11'),(223,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 09:09:25',NULL,'2026-09-01 09:09:25'),(224,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','Invalid password','2026-09-01 09:38:56',NULL,'2026-09-01 09:38:56'),(225,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-01 09:39:06',NULL,'2026-09-01 09:39:06'),(226,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-09-01 09:51:03',NULL,'2026-09-01 09:51:03'),(227,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-09-01 09:51:09',NULL,'2026-09-01 09:51:09'),(228,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-02 04:05:23',NULL,'2026-09-02 04:05:23'),(229,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-02 04:25:33',NULL,'2026-09-02 04:25:33'),(230,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-02 04:40:27',NULL,'2026-09-02 04:40:27'),(231,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-02 12:20:24',NULL,'2026-09-02 12:20:24'),(232,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-02 12:53:22',NULL,'2026-09-02 12:53:22'),(233,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','Invalid password','2026-09-03 03:48:09',NULL,'2026-09-03 03:48:09'),(234,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 03:48:17',NULL,'2026-09-03 03:48:17'),(235,NULL,'veesamsaicharanreddy@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','User not found','2026-09-03 03:50:22',NULL,'2026-09-03 03:50:22'),(236,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 03:50:32',NULL,'2026-09-03 03:50:32'),(237,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 03:51:05',NULL,'2026-09-03 03:51:05'),(238,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 03:51:57',NULL,'2026-09-03 03:51:57'),(239,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 03:54:32',NULL,'2026-09-03 03:54:32'),(240,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 04:36:58',NULL,'2026-09-03 04:36:58'),(241,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 04:56:05',NULL,'2026-09-03 04:56:05'),(242,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 06:32:04',NULL,'2026-09-03 06:32:04'),(243,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 09:16:57',NULL,'2026-09-03 09:16:57'),(244,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 09:28:35',NULL,'2026-09-03 09:28:35'),(245,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 09:32:06',NULL,'2026-09-03 09:32:06'),(246,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 10:11:37',NULL,'2026-09-03 10:11:37'),(247,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 10:15:02',NULL,'2026-09-03 10:15:02'),(248,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 10:16:46',NULL,'2026-09-03 10:16:46'),(249,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 10:25:41',NULL,'2026-09-03 10:25:41'),(250,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 10:41:57',NULL,'2026-09-03 10:41:57'),(251,NULL,'cheedellayagnika@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','User not found','2026-09-03 10:45:57',NULL,'2026-09-03 10:45:57'),(252,NULL,'cheedellayagnika@gmail.com','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','User not found','2026-09-03 10:46:01',NULL,'2026-09-03 10:46:01'),(253,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 10:52:15',NULL,'2026-09-03 10:52:15'),(254,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 10:57:57',NULL,'2026-09-03 10:57:57'),(255,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 10:58:07',NULL,'2026-09-03 10:58:07'),(256,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 11:02:11',NULL,'2026-09-03 11:02:11'),(257,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0','Invalid password','2026-09-03 11:03:22',NULL,'2026-09-03 11:03:22'),(258,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 11:03:31',NULL,'2026-09-03 11:03:31'),(259,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',NULL,'2026-09-03 11:17:17',NULL,'2026-09-03 11:17:17'),(260,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,'2026-09-03 17:59:46',NULL,'2026-09-03 17:59:46');
/*!40000 ALTER TABLE `login_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_verifications`
--

DROP TABLE IF EXISTS `otp_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_verifications` (
  `otp_verification_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `identifier` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_verification_id`),
  KEY `idx_otp_user_id` (`user_id`),
  KEY `idx_otp_identifier` (`identifier`),
  KEY `idx_otp_type` (`otp_type`),
  KEY `idx_otp_expires_at` (`expires_at`),
  KEY `idx_otp_status` (`status`),
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_verifications`
--

LOCK TABLES `otp_verifications` WRITE;
/*!40000 ALTER TABLE `otp_verifications` DISABLE KEYS */;
INSERT INTO `otp_verifications` VALUES (1,5,'priya.nair@btechcollege.edu.in','DEMO_OTP_HASH_100001','PASSWORD_RESET','EMAIL','2026-08-19 10:20:00','2026-08-19 10:16:00',1,5,0,'2026-08-19 10:10:00'),(2,6,'9876502001','DEMO_OTP_HASH_100002','MOBILE_VERIFICATION','SMS','2026-08-19 10:30:00','2026-08-19 10:25:00',1,5,0,'2026-08-19 10:20:00'),(3,7,'sneha.rao@student.btechcollege.edu.in','DEMO_OTP_HASH_100003','PASSWORD_RESET','EMAIL','2026-08-19 11:00:00',NULL,2,5,1,'2026-08-19 10:50:00'),(4,8,'9876502003','DEMO_OTP_HASH_100004','MOBILE_VERIFICATION','SMS','2026-08-19 11:30:00','2026-08-19 11:25:00',1,5,0,'2026-08-19 11:20:00'),(5,3,'anitha.sharma@btechcollege.edu.in','DEMO_OTP_HASH_100005','PASSWORD_RESET','EMAIL','2026-08-19 12:00:00','2026-08-19 11:55:00',1,5,0,'2026-08-19 11:50:00'),(6,NULL,'yourmail@gmail.com','8847F2F78A2D5F79A87A4DE231E780F05C569D7969DBF4190766D4B7FC388E66','LOGIN','EMAIL','2026-08-24 04:42:50',NULL,0,5,0,'2026-08-24 04:37:50'),(7,NULL,'yourmail@gmail.com','2DCB2ACB46003B1D97FABABCCE9D34146B4F29D7A3809BB07CB7B65560000805','LOGIN','EMAIL','2026-08-24 05:17:43',NULL,0,5,1,'2026-08-24 05:12:43'),(8,1,'rajesh.kumar@btechcollege.edu.in','$2a$11$5rYm6Z2p2IcWdPSK6Da16uJ.UR7k2JXtFbBsdo5N1Ydns7Hj39arW','PASSWORD_RESET','EMAIL','2026-08-25 14:16:23',NULL,0,5,0,'2026-08-25 14:06:23'),(9,1,'rajesh.kumar@btechcollege.edu.in','$2a$11$BRc5rhsZzwHz77CyDjAKKOsgr9ndrNUn/xrPp/l0Xy4b.Z.3v8SKm','PASSWORD_RESET','EMAIL','2026-08-25 18:22:31',NULL,0,5,0,'2026-08-25 18:12:31'),(10,1,'rajesh.kumar@btechcollege.edu.in','95E814C1B93B47875409391A5DD0DE679F77DE36B47702F69B7DB722344B7669','FORGOT_PASSWORD','EMAIL','2026-08-25 18:23:28',NULL,0,5,1,'2026-08-25 18:18:28'),(11,1,'rajesh.kumar@btechcollege.edu.in','FFEE8BB1ABF59204340F85A996315C0EDEE5DF6B221870820C2E7C9AB65C434E','PASSWORD_RESET','EMAIL','2026-08-27 05:05:39',NULL,0,5,1,'2026-08-27 05:00:39'),(12,1,'maturivikas7@gmail.com','D75A57B6A91DC19B7CC1CED90B5D8CE0D3C8195F1FBA0FFD0B8D20D3C4552966','LOGIN','EMAIL','2026-08-27 08:12:09','2026-08-27 08:07:39',0,5,0,'2026-08-27 08:07:09'),(13,1,'maturivikas7@gmail.com','D0775B574BED0DF93DE9896EAB71D8AD0D846CB3BFEA5E689D563C910CAE19BA','PASSWORD_RESET','EMAIL','2026-08-27 09:23:21','2026-08-27 09:21:56',0,5,0,'2026-08-27 09:21:16'),(14,1,'maturivikas7@gmail.com','FAD21581CE642BA11F049FB7CF3F79AD768BAAF804E6BB91BF210F879EA3464F','PASSWORD_RESET','EMAIL','2026-08-27 10:17:55','2026-08-27 10:17:06',0,5,0,'2026-08-27 10:14:14'),(15,1,'maturivikas7@gmail.com','12F1A6CB87B42389BBB3B9969E325BBA096974D605967E2C3E83F5144120743F','PASSWORD_RESET','EMAIL','2026-08-27 11:09:18','2026-08-27 11:08:48',0,5,0,'2026-08-27 11:08:02'),(16,1,'cheedellayagnasri@gmail.com','C7471A59609DB4724E97F81FD61E86D8E99709AB16E28F7DF3C4CCC40C8D71E7','PASSWORD_RESET','EMAIL','2026-08-31 05:13:08','2026-08-31 05:08:42',0,5,0,'2026-08-31 05:08:08'),(17,1,'cheedellayagnasri@gmail.com','4D61E0861502BEB45728144CDF06B7505AC7EF871960AFDCC4A4FAA45DFB72D9','PASSWORD_RESET','EMAIL','2026-09-01 06:02:23','2026-09-01 05:58:03',0,5,0,'2026-09-01 05:57:23'),(18,1,'cheedellayagnasri@gmail.com','2E4096C42ADAE4E36E8D0DF7A3F9DF674FF24FD9E3BB60FF7DFF5E0880553764','PASSWORD_RESET','EMAIL','2026-09-03 10:20:39','2026-09-03 10:16:40',0,5,0,'2026-09-03 10:15:40');
/*!40000 ALTER TABLE `otp_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `password_reset_token_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`password_reset_token_id`),
  UNIQUE KEY `uq_password_reset_token_hash` (`token_hash`),
  KEY `idx_password_reset_user_id` (`user_id`),
  KEY `idx_password_reset_expires_at` (`expires_at`),
  KEY `idx_password_reset_status` (`status`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,5,'DEMO_RESET_TOKEN_HASH_001','2026-08-19 11:00:00','2026-08-19 10:20:00','2026-08-19 10:15:00',NULL,0),(2,6,'DEMO_RESET_TOKEN_HASH_002','2026-08-19 12:00:00',NULL,'2026-08-19 11:30:00',NULL,1),(3,7,'DEMO_RESET_TOKEN_HASH_003','2026-08-19 13:00:00',NULL,'2026-08-19 12:30:00',NULL,1),(4,3,'DEMO_RESET_TOKEN_HASH_004','2026-08-19 14:00:00','2026-08-19 13:20:00','2026-08-19 13:15:00',NULL,0),(5,4,'DEMO_RESET_TOKEN_HASH_005','2026-08-19 15:00:00',NULL,'2026-08-19 14:30:00',NULL,1);
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile_change_audits`
--

DROP TABLE IF EXISTS `profile_change_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile_change_audits` (
  `profile_change_audit_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `changed_by` bigint NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `changed_information` json NOT NULL,
  PRIMARY KEY (`profile_change_audit_id`),
  KEY `ix_profile_change_audits_user_id` (`user_id`),
  KEY `ix_profile_change_audits_changed_by` (`changed_by`),
  KEY `ix_profile_change_audits_changed_at` (`changed_at`),
  CONSTRAINT `fk_profile_change_audits_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_profile_change_audits_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_change_audits`
--

LOCK TABLES `profile_change_audits` WRITE;
/*!40000 ALTER TABLE `profile_change_audits` DISABLE KEYS */;
INSERT INTO `profile_change_audits` VALUES (1,1,1,'2026-09-02 12:58:59','[{\"NewValue\": \"Dr. Rajesh Kumar Updated\", \"OldValue\": \"Dr. Rajesh Kumar\", \"FieldName\": \"FullName\"}, {\"NewValue\": \"9876501099\", \"OldValue\": \"9876501001\", \"FieldName\": \"Mobile\"}, {\"NewValue\": \"Banjara Hills, Hyderabad, Updated\", \"OldValue\": \"Banjara Hills, Hyderabad,charan\", \"FieldName\": \"Address\"}, {\"NewValue\": \"Hyderabad\", \"OldValue\": \"Saroornagar\", \"FieldName\": \"City\"}]');
/*!40000 ALTER TABLE `profile_change_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `refresh_token_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_token_hash` varchar(255) DEFAULT NULL,
  `created_by_ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`refresh_token_id`),
  UNIQUE KEY `uk_refresh_token_hash` (`token_hash`),
  KEY `idx_refresh_user_id` (`user_id`),
  KEY `idx_refresh_expires_at` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (1,5,'ZVcF1lypYelzxMJhzkM7ih/VsJts31ZitXWKjreIVTU=','2026-08-27 11:33:39','2026-08-20 11:33:39',NULL,NULL,'::1'),(2,5,'4fjEsiv3IdH9VSKG9HCHrWM1ONiq+9bMTpYvfXVZLOg=','2026-08-27 11:55:32','2026-08-20 11:55:32',NULL,NULL,'::1'),(3,1,'NeLbABEmZPXbsZmOO6OsnVk2au4Ex7p+wr7s2TuDHMU=','2026-08-27 11:57:24','2026-08-20 11:57:24',NULL,NULL,'::1'),(4,2,'9htG+2OZd9yAoZZ1AgVVoN9vKdad26DWEXVJXWbs8fg=','2026-08-27 11:59:19','2026-08-20 11:59:19',NULL,NULL,'::1'),(5,1,'RSpZYJg6/p5Qx3/09Odt8HWc4a4DJ0ZegCoAFBEeaQo=','2026-08-27 12:17:27','2026-08-20 12:17:27',NULL,NULL,'::1'),(6,2,'fJBbQJe/5Hlwh1M2RYgefxCl3Dc2/GQYPswyw3w56wk=','2026-08-27 12:19:11','2026-08-20 12:19:11',NULL,NULL,'::1'),(7,5,'Sh9Rhl5dnNkBYL8oZQXc2pFLthP22P6grWPSdTT2cOI=','2026-08-27 12:37:17','2026-08-20 12:37:17',NULL,NULL,'::1'),(8,1,'AvT1PnkB64a56jQlVck3HJVEQrqdKDfCVdQ1LN+UIlY=','2026-08-27 13:38:50','2026-08-20 13:38:50',NULL,NULL,'::1'),(9,2,'Lx5MmpenBstmmdRS79+I4LPyfm8E4Hqk9BL5gF5QKRQ=','2026-08-27 13:39:45','2026-08-20 13:39:45',NULL,NULL,'::1'),(10,1,'KXuh/NMzHLYCLNHUFLN9aIdRBXITRF4jSSvl5abGcYc=','2026-08-27 13:55:34','2026-08-20 13:55:34',NULL,NULL,'::1'),(11,2,'aRtS0/h4Jlwy/0OARCw1OxN22hIPtAHhOVMFip7K/Ns=','2026-08-27 13:58:27','2026-08-20 13:58:27',NULL,NULL,'::1'),(12,2,'gV5/joFZDZS9Iajx9KyTjmQbzeP3Mg9GmC5URVZDuH0=','2026-08-27 13:59:54','2026-08-20 13:59:54',NULL,NULL,'::1'),(13,2,'oyO3rAhm+MEQtarUlU9QOqqRT9tQSCYWulhJ/SQwpZ0=','2026-08-27 14:06:09','2026-08-20 14:06:09',NULL,NULL,'::1'),(14,5,'Zkt5RxBXb/60Cdn0GyxWTL+y4tgpWc0u0TSYASHw/n4=','2026-08-27 14:07:47','2026-08-20 14:07:47',NULL,NULL,'::1'),(15,1,'xqlSur+z++PEt/uDSgpt+JC7GUH8girLfSRE8Y4TR9M=','2026-08-28 07:06:49','2026-08-21 07:06:49',NULL,NULL,'::1'),(16,1,'/F3K9OZpGmslQzNl/m14hWMemfBp21Zk3XGG9UhpPxU=','2026-08-28 08:57:19','2026-08-21 08:57:19',NULL,NULL,'::1'),(17,1,'p1baOuollvRgVaCFag5HZnTT0i/UGV0Apmsx68tRPKU=','2026-08-28 09:05:17','2026-08-21 09:05:17',NULL,NULL,'::1'),(18,1,'zJaVJAPtW8hHhowdki60JIWfVrTLdPzsd2K81K+/ZFQ=','2026-08-28 11:07:26','2026-08-21 11:07:26',NULL,NULL,'::1'),(19,1,'DnNklx7QWHsFN+aaLkN6olc2EwudGKWr6uiEmZ+R9qE=','2026-08-31 03:49:00','2026-08-24 03:49:00',NULL,NULL,'::1'),(20,1,'hfb3LJKeYl9g1bKrFs3K1fmh6G4LeMucMWl/p5rlMTU=','2026-08-31 04:16:31','2026-08-24 04:16:31',NULL,NULL,'::1'),(21,5,'aNDaevZW4J4IA5cyCCN95/ApZXvKh0BrTKJGXYLz4YQ=','2026-08-31 04:19:43','2026-08-24 04:19:43',NULL,NULL,'::1'),(22,1,'z7t611ifQ2t62AeU53+Nz8cnvsnBTxDbjFcZ6GeZ0Z4=','2026-08-31 04:33:53','2026-08-24 04:33:53',NULL,NULL,'::1'),(23,1,'HDRveVh7TZSULDIU3/7pTxbBMU2u8GaXc/MAVUMDt3k=','2026-08-31 05:11:35','2026-08-24 05:11:35',NULL,NULL,'::1'),(24,1,'PIFt4VHgYgg7MNIOw7sbpqT2cobIzBMDbpKFwQ84mNo=','2026-08-31 05:23:27','2026-08-24 05:23:27',NULL,NULL,'::1'),(25,1,'3ByaM14af0qBBCML8qaVI6ubg6TDXzyJw+zvYPxoEXk=','2026-08-31 05:24:43','2026-08-24 05:24:43',NULL,NULL,'::1'),(26,1,'TU+NvxaMrlSfycbQDgZnSQp8vi6IFq6YlWmF3JNFVe8=','2026-08-31 05:25:01','2026-08-24 05:25:01',NULL,NULL,'::1'),(27,1,'VYXyqgk+Gs2aBorR3T5PqC3898xdqrhqzacSWmsezVw=','2026-08-31 06:08:04','2026-08-24 06:08:04',NULL,NULL,'::1'),(28,1,'6BQaB5q3CNzTbklqeUPmdUja1FVyQsiVEW5N3zehd6E=','2026-08-31 06:41:19','2026-08-24 06:41:19',NULL,NULL,'::1'),(29,1,'+hMyUHUHEyLcHib7c7Z35eeqqVtSJJgs8+my5FRIWk0=','2026-08-31 06:47:39','2026-08-24 06:47:39',NULL,NULL,'::1'),(30,1,'pOoWK1O4SCHAEFb3cm67fhRCHofa6ktfll/AsxRr/r8=','2026-08-31 07:06:19','2026-08-24 07:06:19',NULL,NULL,'::1'),(31,1,'CiHYmAfqCrqkql4MnXAud0J6MNWvXH3dtXiPTpwXnYg=','2026-08-31 07:13:52','2026-08-24 07:13:52',NULL,NULL,'::1'),(32,1,'I81ND17GsHlL7KJiktUZ/LB2mFRSXYDnnijMSRaHPg8=','2026-08-31 07:29:37','2026-08-24 07:29:37',NULL,NULL,'::1'),(33,1,'+5diHiVGbNW1oXHJ/CoNUrD/GhEceTY91fjWrPIxlJU=','2026-08-31 07:33:16','2026-08-24 07:33:16','2026-08-24 08:33:41','6BovnCAoUy9TyUPEUdeMMpnMCXwyUTfFgn0b7t1rEr0=','::1'),(34,1,'6BovnCAoUy9TyUPEUdeMMpnMCXwyUTfFgn0b7t1rEr0=','2026-08-31 08:33:41','2026-08-24 08:33:41',NULL,NULL,'::1'),(35,1,'Uaci1hgWRz9Vu8bvVVLMhs9JyGIfxMPfNm5xY9epHfM=','2026-08-31 08:42:45','2026-08-24 08:42:45',NULL,NULL,'::1'),(36,1,'C7fwsiktvv7CGrwGZshOCWB5eqMKEjbjCz2xEkQFL+Q=','2026-08-31 08:50:31','2026-08-24 08:50:31',NULL,NULL,'::1'),(37,1,'Ka5RZ6arYfAQaLgaStwZpbQPIv4HNM4F+gwByYN9rcY=','2026-08-31 08:55:51','2026-08-24 08:55:51','2026-08-24 10:09:30','ETWSdlC+B7bCsqspOTB31zesYzqJP4IiyvCJnJSC2Go=','::1'),(38,1,'OpHpEu4C3XTUNmS0kgVB9TLqiPKf/CPnAPMqVhfA1q8=','2026-08-31 08:58:39','2026-08-24 08:58:39',NULL,NULL,'::1'),(39,1,'0mLtkjlqw09bkynV4p+l95yVSzMlZSXjuThiVZA1+V4=','2026-08-31 08:59:09','2026-08-24 08:59:09',NULL,NULL,'::1'),(40,1,'22ewJ43bxXSWKmuzHCn0T2w7MAx4NYQtB+xSjJdypnQ=','2026-08-31 09:06:05','2026-08-24 09:06:05',NULL,NULL,'::1'),(41,1,'7qWUprmNkdN30U6S6cHo6/sj/Iy2Q14yFF/GISdkzX4=','2026-08-31 09:14:05','2026-08-24 09:14:05',NULL,NULL,'::1'),(42,1,'oW5OSc8UjdoMrNN87CUOcOOoh6xNuI5mbIi3jaP3rdc=','2026-08-31 09:16:55','2026-08-24 09:16:55',NULL,NULL,'::1'),(43,1,'ueY96PPFd4jea8aVKthj5f4SlNzCoxZyJ1H4uvmkTds=','2026-08-31 09:17:26','2026-08-24 09:17:26',NULL,NULL,'::1'),(44,1,'/N5W+9F4TlFfLgX77wvbgZT22tt1+pGEAPu1upQHiRc=','2026-08-31 09:18:52','2026-08-24 09:18:52',NULL,NULL,'::1'),(45,1,'421Mf/oSvjhIFutbuywKfUEi/hFOcVnzUJ9S9TgdeWI=','2026-08-31 09:19:14','2026-08-24 09:19:14',NULL,NULL,'::1'),(46,1,'LXmMx72nBJ5ue5tucDKlCOZQGaqUrnJE6pLzJsPJeM4=','2026-08-31 09:21:52','2026-08-24 09:21:52',NULL,NULL,'::1'),(47,1,'0937XfT4fMJD6m6bHsMQjcKae2LduD6fICbEcfTu8sw=','2026-08-31 09:28:46','2026-08-24 09:28:46',NULL,NULL,'::1'),(48,1,'7VPTukIIZmlzuvjguWxT/McvhKrh+oFZtjkTDGULW6A=','2026-08-31 09:31:00','2026-08-24 09:31:00',NULL,NULL,'::1'),(49,1,'9d5Uu9wScfx1fQba/ILVWBuQ/rsiljK/1f7TRlRtfQQ=','2026-08-31 09:34:48','2026-08-24 09:34:48',NULL,NULL,'::1'),(50,1,'LoM9Uf47fs1OQJPbJQmMoReyPyGrU/HTs+knBYDeSX0=','2026-08-31 09:36:03','2026-08-24 09:36:03',NULL,NULL,'::1'),(51,1,'mvBThYFcNI/RB9yMcEQ/AidyVTDfN1eLbF09RJt1uQ8=','2026-08-31 09:40:24','2026-08-24 09:40:24',NULL,NULL,'::1'),(52,1,'EFIX/qbeD+0u5lNYy90966x66+WdoklPdO5QlQlEv8M=','2026-08-31 09:55:48','2026-08-24 09:55:48',NULL,NULL,'::1'),(53,1,'ViMytfqxaVi6r4/jcQryKPogJ75cfBxCHv+i/bhOJ2s=','2026-08-31 10:00:28','2026-08-24 10:00:28',NULL,NULL,'::1'),(54,1,'ETWSdlC+B7bCsqspOTB31zesYzqJP4IiyvCJnJSC2Go=','2026-08-31 10:09:31','2026-08-24 10:09:31',NULL,NULL,'::1'),(55,1,'LReIUQPEQvKk2kvkEk/sRY0RhaP9nfsqrWu2EuQwwkM=','2026-08-31 10:09:31','2026-08-24 10:09:31',NULL,NULL,'::1'),(56,1,'1j/wbgj4mrui+MQK0MtDA3nT1++LKbmcfSjKNQ2Attw=','2026-08-31 10:13:08','2026-08-24 10:13:08',NULL,NULL,'::1'),(57,1,'UY5suBt2zs/H5t1lkZjvKDhACRqamI4Dl/JAFn2NiY4=','2026-08-31 11:01:48','2026-08-24 11:01:48',NULL,NULL,'::1'),(58,1,'UnrYugbmiyC3iixUJ2RAoFtmueixogFzPZjsCqduVB4=','2026-08-31 11:03:47','2026-08-24 11:03:47',NULL,NULL,'::1'),(59,1,'N5ZWiZLdWH5itE/QIWt6NldK3ccpX8ncVsGyWffEKf8=','2026-08-31 11:25:09','2026-08-24 11:25:09',NULL,NULL,'::1'),(60,1,'eDUHUdWcuhgdPwZGkkXw3FfDucHuHsjfyl5TzydPlds=','2026-08-31 11:25:21','2026-08-24 11:25:21',NULL,NULL,'::1'),(61,1,'h979iiSIhm6Zh/k3tFi6eajMII3l9ocMQElz197X3Hs=','2026-08-31 11:25:30','2026-08-24 11:25:30',NULL,NULL,'::1'),(62,1,'QH+EI6LSrsQw9xu77oWNGRA3U79WouU11sNbV18cPhE=','2026-08-31 11:38:31','2026-08-24 11:38:31',NULL,NULL,'::1'),(63,1,'ZNPot5dItPoWjTOEuZMIrWIAeAEzQerokK2ek4lItu8=','2026-08-31 11:44:22','2026-08-24 11:44:22',NULL,NULL,'::1'),(64,1,'tslrEQpQClgHJkLQNQW5Is7oCw/uynxAhB47XU2PVpk=','2026-08-31 12:49:33','2026-08-24 12:49:33',NULL,NULL,'::1'),(65,1,'FxG2UCQAO4pcO+hM15ELElbLsg7Db/DC5FtRg1xIVQc=','2026-08-31 16:42:21','2026-08-24 16:42:21',NULL,NULL,'::1'),(66,1,'Va/XPBE9j0AgicYdsX5ofN+ZKj50JIIDI0iZSASZj2w=','2026-08-31 17:02:40','2026-08-24 17:02:40',NULL,NULL,'::1'),(67,1,'W6gHqI2pMtxO+3qm/zqBAtBqI5KmiAVfOcrqToWU2nk=','2026-09-01 04:56:37','2026-08-25 04:56:37',NULL,NULL,'::1'),(68,1,'CeLTgoHw07m3ojGHPkU/ush7Rsimdxfi+Gk5z5l2RRo=','2026-09-24 09:17:57','2026-08-25 09:17:57',NULL,NULL,'::1'),(69,1,'geoxFBt101mAw3G7ItgbbdXWhlmmg7OHtAISsS8+tgY=','2026-09-01 13:39:34','2026-08-25 13:39:34',NULL,NULL,'::1'),(70,1,'N+QP8z3dpx6zrL5VwaPfO6K+VXgLE4uZ+Kurwpmvd8o=','2026-09-01 14:19:57','2026-08-25 14:19:57',NULL,NULL,'::1'),(71,1,'TkTBX6v/Zelw+IsCnycGxvkn30JXilcqc+Gxu0jLQOQ=','2026-09-01 17:44:36','2026-08-25 17:44:36',NULL,NULL,'::1'),(72,1,'VYovd7pqNSToehap8+qv8IOyVohLJ3lwsKuB7Vv0A4o=','2026-09-01 18:15:54','2026-08-25 18:15:54',NULL,NULL,'::1'),(73,1,'l4A8Yb9GcM6U9bUqNQiHQTGXEDK9LSM5UIpomup4rAc=','2026-09-01 18:23:09','2026-08-25 18:23:09',NULL,NULL,'::1'),(74,1,'FLQOkB/ct8U+0mdVaaDNX+xhYTYCMSPN4Eli1WiKp5Y=','2026-09-01 18:27:17','2026-08-25 18:27:17',NULL,NULL,'::1'),(75,1,'eZbPMpVFjWRUbEJqmO6+VsZAH8JNcpGxQ/DOdLR5nE4=','2026-09-02 06:49:45','2026-08-26 06:49:45',NULL,NULL,'::1'),(76,1,'awWdeM/gwWPf6meb+5S6AWoiGYBBznv2fmdW11ym4G0=','2026-09-02 09:33:51','2026-08-26 09:33:51',NULL,NULL,'::1'),(77,1,'HxPlWcUc3lWlMkfmgnaLdEfQ+oqQUga7WNjemV8h1uw=','2026-09-02 12:25:18','2026-08-26 12:25:18',NULL,NULL,'::1'),(78,1,'7U70dupaRDmF1IP9NJpUc7JZbkvUDISPyeWwU3Iv9v0=','2026-09-02 13:15:02','2026-08-26 13:15:02',NULL,NULL,'::1'),(79,1,'LDH79p2+UbgtkFglE/dH6KIapm0+yl9AvYiE+rHpYQY=','2026-09-03 02:35:02','2026-08-27 02:35:02',NULL,NULL,'::1'),(80,1,'S4yiW/KU+BFEz/hpjAEtCiWIg1jz/g7Np+j9L2BGbJM=','2026-09-03 03:51:27','2026-08-27 03:51:27',NULL,NULL,'::1'),(81,1,'4p+3FZ8NPm8EGZrTMnSJpnfWvvRZ8kZ2Nb+tz4Vxw5g=','2026-09-03 04:10:11','2026-08-27 04:10:11',NULL,NULL,'::1'),(82,1,'l0O0AVxH8HQ6dqj4uEUUXITI9sb8M6YXQjLoXvPye0g=','2026-09-03 04:12:14','2026-08-27 04:12:14',NULL,NULL,'::1'),(83,1,'f1N6eyHIrIrJYtezyvN78mxPKOnUxt13uLYc409tFXQ=','2026-09-03 04:14:32','2026-08-27 04:14:32',NULL,NULL,'::1'),(84,1,'dJ0oLN+v4swNTDWy8oCc6rh0oJqPIKagkBjIb2G9C0k=','2026-09-03 04:19:49','2026-08-27 04:19:49',NULL,NULL,'::1'),(85,1,'EydukTmelHevphmLmaVU74rMoEJl8YaoZ6iGqi9wmiE=','2026-09-03 04:29:33','2026-08-27 04:29:33',NULL,NULL,'::1'),(86,1,'a5QTR282gP4SEJw7WvNQ60s0FeLnGO0t8kUhACu8564=','2026-09-03 04:44:08','2026-08-27 04:44:08',NULL,NULL,'::1'),(87,1,'G98SCOpO5wEGBNAFdZbLQvaeQWPvBdyYugjPOG3W8Ac=','2026-09-03 04:47:56','2026-08-27 04:47:56',NULL,NULL,'::1'),(88,1,'yVTlmCAmK0a2lKt14xYkzQj2QUNac6VXnzhbUrkjSMI=','2026-09-03 04:57:23','2026-08-27 04:57:23',NULL,NULL,'::1'),(89,1,'BzkRFjW7vq67PkdwDFiijjTj8YodLA80ElHWg+Kq2oE=','2026-09-03 05:11:11','2026-08-27 05:11:11',NULL,NULL,'::1'),(90,1,'L0hqFeHMvrSk6680OsB5ZhACxApys93LTMMYP+E9Dfk=','2026-09-03 05:12:48','2026-08-27 05:12:48',NULL,NULL,'::1'),(91,1,'t5PRgVgdxQSTWYiFz7oIirziNQnx77DQjz3nQrW8zdM=','2026-09-03 05:21:27','2026-08-27 05:21:27',NULL,NULL,'::1'),(92,1,'paP4WGq8lBtPQsdxxUZ9cffG1foS5RENO98U7tjfsEk=','2026-09-03 05:23:37','2026-08-27 05:23:37',NULL,NULL,'::1'),(93,1,'ekpjWH/n7b7ZiNb9aBxbNxQJDSq21rl+WOBDye7gQo8=','2026-09-03 05:51:43','2026-08-27 05:51:43',NULL,NULL,'::1'),(94,1,'GckUYMPOHdruRqOaD0xr2GkLtxbXK3aVxdVHolXUp4c=','2026-09-03 05:59:30','2026-08-27 05:59:30',NULL,NULL,'::1'),(95,1,'ywUAq7t4u55DzPcn5nEM5J5QQkYIoV3bvrlX6TMD3ZI=','2026-09-03 06:00:04','2026-08-27 06:00:04',NULL,NULL,'::1'),(96,1,'NP4h/nMua1UtJJrt5QWirgmOPQKB2EUad7HdXhM5jSI=','2026-09-03 06:07:32','2026-08-27 06:07:32',NULL,NULL,'::1'),(97,1,'UW2Yd8a9PwQqeF1D3BYnQ9EGa0N87QwPJYr8GFOiEFw=','2026-09-03 06:11:57','2026-08-27 06:11:57',NULL,NULL,'::1'),(98,1,'hOFjtsC3XFJFu2mo9msxNb4P/u8wKC8IxAug9EwE0Bs=','2026-09-03 06:15:04','2026-08-27 06:15:04',NULL,NULL,'::1'),(99,1,'dtkpOJC8SzVbDbIlhJIIPPQN6rRSISjd0YTGLN6266I=','2026-09-03 07:09:18','2026-08-27 07:09:18',NULL,NULL,'::1'),(100,1,'1xbxi/T4DPsTsdmE6bLIeip2V2GDKHdKCNqjmCqvOZE=','2026-09-03 07:14:54','2026-08-27 07:14:54',NULL,NULL,'::1'),(101,1,'z1zItvt7YUMbE0gBUtOMtAPqf+FKppkhgdf8AfHmYLA=','2026-09-03 07:26:01','2026-08-27 07:26:01','2026-08-27 08:26:33','rNiW0Wt5Hs/r41KcmFlPcadeBJJ0dbNxPTH2TTcz5e0=','::1'),(102,1,'A8A2Q3XRnhz2cEmbKPGhfT/QOQnWE+uLvB0cks8B3sU=','2026-09-03 07:37:44','2026-08-27 07:37:44','2026-08-27 08:37:48','Exf3XNcy2ds1wHbaStg+n692DVcyWEbSBVHjuXr1FPM=','::1'),(103,1,'2N1f57Ildcrvulnslzx0EBKKSKqD46nXQ8PBlOe3QMw=','2026-09-03 07:54:44','2026-08-27 07:54:44',NULL,NULL,'::1'),(104,1,'3LYMJ9GXysWavNiDjuBhsOJwN9eIEV+x5mI7hOkOO4E=','2026-09-03 08:15:13','2026-08-27 08:15:13',NULL,NULL,'::1'),(105,1,'lZuQEBnNvFX8kaFM781hNoHGbQorK8X1HsmZKQBc05A=','2026-09-03 08:26:33','2026-08-27 08:26:33',NULL,NULL,'::1'),(106,1,'rNiW0Wt5Hs/r41KcmFlPcadeBJJ0dbNxPTH2TTcz5e0=','2026-09-03 08:26:33','2026-08-27 08:26:33',NULL,NULL,'::1'),(107,1,'8S3++IIRCoiLwTprM6MCnZ4tAdCmth+35nnroT9cnTc=','2026-09-03 08:26:49','2026-08-27 08:26:49',NULL,NULL,'::1'),(108,1,'GX7AjLYOimFG2vfc7+iqfh/RNytIHHG7HI2KBiuCIMQ=','2026-09-03 08:37:48','2026-08-27 08:37:48',NULL,NULL,'::1'),(109,1,'qdvwBonAv4gt1y/iKvld0vdnG8QQarTyJauDzBG6sO4=','2026-09-03 08:37:48','2026-08-27 08:37:48',NULL,NULL,'::1'),(110,1,'Exf3XNcy2ds1wHbaStg+n692DVcyWEbSBVHjuXr1FPM=','2026-09-03 08:37:48','2026-08-27 08:37:48',NULL,NULL,'::1'),(111,1,'vNjXdCHLVNPWTww+J5LMiBi5+m+TD54KN2CVgHmPjuc=','2026-09-03 08:41:46','2026-08-27 08:41:46',NULL,NULL,'::1'),(112,1,'+KgY4mdKna0ZXFbifhDvBOo6hO79EQePSlqnZUcWr08=','2026-09-03 08:41:57','2026-08-27 08:41:57',NULL,NULL,'::1'),(113,1,'YWDAT6RKFlzwyUf2fLK1dqIy/gD3cdmJNVBkFoYvjv8=','2026-09-03 08:59:13','2026-08-27 08:59:13',NULL,NULL,'::1'),(114,1,'oC9p5H7kZwnVqovCISUgKjh87e5ODWMysG7O+BSJtJU=','2026-09-03 09:23:37','2026-08-27 09:23:37',NULL,NULL,'::1'),(115,1,'2gZ5PitRWEUBEcbWn6cE9ehOoBxNjuwgJDZHMrHa73E=','2026-09-03 09:25:01','2026-08-27 09:25:01',NULL,NULL,'::1'),(116,1,'d/lfys2gHWLgdCnmHJDWIX8jeyRl8o3vJxRVGajDRb0=','2026-09-03 09:25:17','2026-08-27 09:25:17',NULL,NULL,'::1'),(117,1,'+8ctSuvshZeYvl4UWZzA/XAi76wqdTHZgFnDS6yNySE=','2026-09-03 09:42:10','2026-08-27 09:42:10',NULL,NULL,'::1'),(118,1,'McRSHO6S3govp9qtW9NIXCEazE9j1njEQdgdF2CpLDM=','2026-09-03 10:01:01','2026-08-27 10:01:01',NULL,NULL,'::1'),(119,1,'GFX62p7NKVwpDGK8g/JcQRKshffUL6QIdQYd9Bz+bIA=','2026-09-03 10:12:17','2026-08-27 10:12:17',NULL,NULL,'::1'),(120,1,'vncuelINMtz8AbqZwKQSjn0e4rlwjuuFB6v5qlfShkc=','2026-09-03 10:18:20','2026-08-27 10:18:20',NULL,NULL,'::1'),(121,1,'zGZmBPT36HTXk2SDhuWtoKow/OuBqU5VtmZ+1QWSMaU=','2026-09-03 10:19:03','2026-08-27 10:19:03',NULL,NULL,'::1'),(122,1,'IDEOmi3yLAXt7i7xAzuTKnFh2TdeUzoOUjkyBzVlCfc=','2026-09-03 10:21:27','2026-08-27 10:21:27',NULL,NULL,'::1'),(123,1,'A61fbza7jFYIo01D9DveFBFM7eEQw/ACJNdM8OaAKlw=','2026-09-03 10:27:13','2026-08-27 10:27:13',NULL,NULL,'::1'),(124,1,'BY9kIkPbZKqXLYunOnxXFio9YGFrwLaMdPKyJpF5j20=','2026-09-03 10:28:05','2026-08-27 10:28:05',NULL,NULL,'::1'),(125,1,'Fkb5oFcVGTfMD6FKabD5jqp5ZgofJtS38QKFBJIJ8R8=','2026-09-03 10:28:49','2026-08-27 10:28:49','2026-08-31 04:58:19','4kLxzBK4/4OwgSMRJTc38patvZ2sgz6pDXYWFEmzrwk=','::1'),(126,1,'toiPO7mGR+c3eWisKz0TTVbr2yHCyGJTeJzVYk+6EjE=','2026-09-03 10:38:14','2026-08-27 10:38:14',NULL,NULL,'::1'),(127,1,'88MN4b1fDBNXb5HkCyCtUea8wMzL8V2r2nTQmk0dpGI=','2026-09-03 10:50:24','2026-08-27 10:50:24',NULL,NULL,'::1'),(128,1,'YZeAWQJ58mcsNVCRFy9KXeng0Qc1zP+FKJbQ7+sFskE=','2026-09-03 11:09:36','2026-08-27 11:09:36',NULL,NULL,'::1'),(129,1,'EHA5EX+nh1SmoqNQyqyx1P6/XoAYZ4hmMwgC5bZ3Nw4=','2026-09-03 11:10:21','2026-08-27 11:10:21',NULL,NULL,'::1'),(130,1,'TM8VEpJ3LDIlWo8ljlbMFXv5vyc67VZfsvg+8SzNMSM=','2026-09-03 11:16:24','2026-08-27 11:16:24',NULL,NULL,'::1'),(131,1,'4KhyHOaJtn9fyo14PW+jB9evds0GhodQF51coT357vo=','2026-09-03 11:36:00','2026-08-27 11:36:00',NULL,NULL,'::1'),(132,1,'kDzr3chpJIdPj8SKInrSduQSrCkZFLv5xT1qSv1y2E8=','2026-09-07 03:52:15','2026-08-31 03:52:15',NULL,NULL,'::1'),(133,1,'9T9G/jCpzVG3NQ6oC0MOgPlCAF/WstMbQgoXO/ATeyg=','2026-09-07 03:53:14','2026-08-31 03:53:14','2026-08-31 05:03:47','3gR/aHs9mAoc8xKEymOK4ka9OWCe4Lm0jXAt5xbGTlg=','::1'),(134,1,'ZMI2aZhOMhusvdFeXKHOPOr82yOdC9z6wB+L1w+5/24=','2026-09-07 04:18:20','2026-08-31 04:18:20',NULL,NULL,'::1'),(135,1,'3PrRqK8rvUh2pqtxMum1Two8VEzE5qHmlU9H55DwByI=','2026-09-07 04:19:01','2026-08-31 04:19:01',NULL,NULL,'::1'),(136,1,'jrK0OYgvdNHwhqDx0hAk75H5M9s81QaEwJm/6Ckeuxs=','2026-09-07 04:58:19','2026-08-31 04:58:19',NULL,NULL,'::1'),(137,1,'Bp3btQf6XZMoLdYlms4cdtRCfvCkYumALRaHGbMAhRY=','2026-09-07 04:58:19','2026-08-31 04:58:19',NULL,NULL,'::1'),(138,1,'4kLxzBK4/4OwgSMRJTc38patvZ2sgz6pDXYWFEmzrwk=','2026-09-07 04:58:19','2026-08-31 04:58:19','2026-08-31 06:16:42','+nKl1YK0TCxB8GX8K3n4mfuHvYWaw4gsizUCZMsUSGw=','::1'),(139,1,'6Zj5SaD5QeOZkHpo9ulQTzzK/KfWsb7e42zYPeD4EdA=','2026-09-07 05:02:25','2026-08-31 05:02:25',NULL,NULL,'::1'),(140,1,'JV7VPm5dRU0s7oXhW4jVUhOOambwhGmjZoCuGYGl/Ss=','2026-09-07 05:03:47','2026-08-31 05:03:47',NULL,NULL,'::1'),(141,1,'3gR/aHs9mAoc8xKEymOK4ka9OWCe4Lm0jXAt5xbGTlg=','2026-09-07 05:03:47','2026-08-31 05:03:47','2026-08-31 05:03:48','00oniXJGwAJiv72G8y9KkXA1nwwsu9CVa+/Emiaeh74=','::1'),(142,1,'00oniXJGwAJiv72G8y9KkXA1nwwsu9CVa+/Emiaeh74=','2026-09-07 05:03:48','2026-08-31 05:03:48','2026-08-31 06:17:30','+e2tU/ZAQfMbp4Buo+QF6bbKfKyidxXLxdvVZMadKlo=','::1'),(143,1,'krCRHLPY1U3do90bRoSACqJ/bbA0g7oSLKIMGYjbSfk=','2026-09-07 05:06:16','2026-08-31 05:06:16',NULL,NULL,'::1'),(144,1,'PrN8DZ+tN8BQz9aGJKRF3nmiV+5cELQD13yCuFCYXCo=','2026-09-07 05:08:58','2026-08-31 05:08:58','2026-08-31 06:12:07','5e8xh4NiLqqmF3ClGrThLVM7wLQJLV7YobCJqjMj230=','::1'),(145,1,'XtI7qHRAffsWNbo5s/0U7rRHMJm0Q+yeby8Oc6U9wbU=','2026-09-07 05:22:10','2026-08-31 05:22:10',NULL,NULL,'::1'),(146,1,'fAFMfqLXmne2gAiawBSq+EyXhBH/xWjFUxqFIUaajeo=','2026-09-07 05:31:50','2026-08-31 05:31:50',NULL,NULL,'::1'),(147,1,'5e8xh4NiLqqmF3ClGrThLVM7wLQJLV7YobCJqjMj230=','2026-09-07 06:12:07','2026-08-31 06:12:07','2026-08-31 06:12:07','u/WQh6bgs/P1JyZaos+dz+sc01JPW6fgi8XeLjk9oEY=','::1'),(148,1,'u/WQh6bgs/P1JyZaos+dz+sc01JPW6fgi8XeLjk9oEY=','2026-09-07 06:12:07','2026-08-31 06:12:07',NULL,NULL,'::1'),(149,1,'rT3QYv+Ara58aeXNCFRX5fAPGxIA+1mNAwpjqESe+N0=','2026-09-07 06:12:52','2026-08-31 06:12:52',NULL,NULL,'::1'),(150,1,'+nKl1YK0TCxB8GX8K3n4mfuHvYWaw4gsizUCZMsUSGw=','2026-09-07 06:16:42','2026-08-31 06:16:42','2026-08-31 07:18:51','4WPOo2S+e8yWG9OCf67G5St0WXfc8GQJqHXrdsdffZk=','::1'),(151,1,'LY1ySBwyfo61dVRdjyY0WD7hdzSvgH9WRpkoAN7ES34=','2026-09-07 06:17:30','2026-08-31 06:17:30',NULL,NULL,'::1'),(152,1,'+e2tU/ZAQfMbp4Buo+QF6bbKfKyidxXLxdvVZMadKlo=','2026-09-07 06:17:30','2026-08-31 06:17:30','2026-08-31 06:17:30','ode1kUG6wmJ2PYSMoT0/RQp/XDtAL6f9kQ4o8LrMFLw=','::1'),(153,1,'ode1kUG6wmJ2PYSMoT0/RQp/XDtAL6f9kQ4o8LrMFLw=','2026-09-07 06:17:30','2026-08-31 06:17:30','2026-08-31 07:29:22','7EPZ6UCXlu/933tbT2yl2wl9pCxzUfNCkl24iEJH2DM=','::1'),(154,1,'9f0SeQYNH4G0R6piicKqrILZZhsTHYiim4eYAfeIFyQ=','2026-09-07 06:22:59','2026-08-31 06:22:59',NULL,NULL,'::1'),(155,1,'kP9wT51WKDBtZHGc6lMRM9a47z2Mv/uzIiVesTqyny8=','2026-09-07 06:39:38','2026-08-31 06:39:38',NULL,NULL,'::1'),(156,1,'/A4X+Yu87YsLNbiW4l6Uh+25Rk5vkv9LDXLrz3Tm1L4=','2026-09-07 06:46:16','2026-08-31 06:46:16','2026-08-31 08:37:45','OXXz5yepWbABBRW0iu0fNStrGk62Rk3tt/7e2Xf84kA=','::1'),(157,1,'4WPOo2S+e8yWG9OCf67G5St0WXfc8GQJqHXrdsdffZk=','2026-09-07 07:18:51','2026-08-31 07:18:51',NULL,NULL,'::1'),(158,1,'sQ7ZuvPvBR7Fg+KZkfOjJdBb2/A5e3GCPvCvOvIeqfI=','2026-09-07 07:20:32','2026-08-31 07:20:32',NULL,NULL,'::1'),(159,1,'NrlgkCOCmi4jkdDlLKmapXcO2MIHvvy9pONmOCQ5qHI=','2026-09-07 07:27:46','2026-08-31 07:27:46',NULL,NULL,'::1'),(160,1,'RHQdYKpwiX0YVUlzDvERUREwdpth9++Uf4DvVEnOyuE=','2026-09-07 07:29:22','2026-08-31 07:29:22',NULL,NULL,'::1'),(161,1,'tpReYTxcGd/tJow/lHst3f6zYpeXilUddanF7oze2go=','2026-09-07 07:29:22','2026-08-31 07:29:22',NULL,NULL,'::1'),(162,1,'7EPZ6UCXlu/933tbT2yl2wl9pCxzUfNCkl24iEJH2DM=','2026-09-07 07:29:22','2026-08-31 07:29:22','2026-08-31 08:40:31','YeFldNDTLJw1exbjJqrD2Ge5iVRfUXXiHvzBPXXsJLc=','::1'),(163,1,'OXXz5yepWbABBRW0iu0fNStrGk62Rk3tt/7e2Xf84kA=','2026-09-07 08:37:45','2026-08-31 08:37:45',NULL,NULL,'::1'),(164,1,'G0JgaBC3821jjzh0nb28fURKyH5pqvsqlDKDfI5ns7k=','2026-09-07 08:40:31','2026-08-31 08:40:31',NULL,NULL,'::1'),(165,1,'YeFldNDTLJw1exbjJqrD2Ge5iVRfUXXiHvzBPXXsJLc=','2026-09-07 08:40:31','2026-08-31 08:40:31',NULL,NULL,'::1'),(166,1,'5TA1rwBmmOI0B34L+Ikx+HUDwFXTZ2u9mopvU6fdrJY=','2026-09-07 08:41:16','2026-08-31 08:41:16',NULL,NULL,'::1'),(167,1,'19vOtK7zYDyKqZuF8Qa7CPPVmKpXXe4/25r7bB7Twyg=','2026-09-07 08:42:31','2026-08-31 08:42:31',NULL,NULL,'::1'),(168,1,'XSW2fz40KcrtOp1pMEIxXyS9OtBNk8viJ0tMv2has2Y=','2026-09-07 08:52:36','2026-08-31 08:52:36',NULL,NULL,'::1'),(169,1,'4a900mbtlNF/QimoOCXmw4FTOYY18t5bao5okyLMxgk=','2026-09-07 08:55:55','2026-08-31 08:55:55','2026-08-31 10:00:38','5/i17Qgwm7ne+Z2dvSeKEIH9TFBNN5h6C169C7naqsQ=','::1'),(170,1,'59C5uCHa+X7H2EiVba7m43g6uVnXxl4/PlH8AF9AnT8=','2026-09-07 09:10:12','2026-08-31 09:10:12',NULL,NULL,'::1'),(171,1,'3YPFUHP+1/Nc7IQlo1vXl3eRmq5XfHZ16tdZ/2+/gro=','2026-09-07 09:11:11','2026-08-31 09:11:11',NULL,NULL,'::1'),(172,1,'mNOafJZZJ9ro5r2AeJbQiFGaGMoUXrknGOjV9Z4qLrs=','2026-09-07 09:21:10','2026-08-31 09:21:10',NULL,NULL,'::1'),(173,1,'ZvH9YD22M/G/fduzKwyP0gh439/ZbK2W3aOUFpFpago=','2026-09-07 09:32:20','2026-08-31 09:32:20',NULL,NULL,'::1'),(174,1,'fnGzBhsJpRi2iNeqkrFc5BrHkWcKSTiuWUCG1FLrFZE=','2026-09-07 09:41:59','2026-08-31 09:41:59',NULL,NULL,'::1'),(175,1,'6hSPfNrS4qGMs+diMcTi0dkNnpnmd8Up6q0U1XVgbxA=','2026-09-07 09:45:05','2026-08-31 09:45:05','2026-08-31 10:45:45','vOYgsTklgt3I9nnkdY15rl3h0OAsloeTd701vZeu1Vk=','::1'),(176,1,'zMlgEXcLo1Vk6Sm8b09racO2VaEWR55Z3pjF05TelHU=','2026-09-07 09:52:41','2026-08-31 09:52:41','2026-08-31 10:54:12','PkZJZT3ciH320dAqE/RANqn1+2KmsAemRDwBfYfc3c0=','::1'),(177,1,'5/i17Qgwm7ne+Z2dvSeKEIH9TFBNN5h6C169C7naqsQ=','2026-09-07 10:00:38','2026-08-31 10:00:38','2026-08-31 11:12:09','VFuQOEsC+K3TQCL5E5dCNeJv6DMaN87+cZkEkr0Te9Y=','::1'),(178,1,'+dtwdc+ehyimCPxmXwroBB/PquEzzNkTVkCnKHvmV8g=','2026-09-07 10:36:33','2026-08-31 10:36:33',NULL,NULL,'::1'),(179,1,'Yq6ZjWYACfzXc4fabMGVXj87PDGcqu2+fdq9g70I/r8=','2026-09-07 10:40:52','2026-08-31 10:40:52',NULL,NULL,'::1'),(180,1,'vOYgsTklgt3I9nnkdY15rl3h0OAsloeTd701vZeu1Vk=','2026-09-07 10:45:45','2026-08-31 10:45:45',NULL,NULL,'::1'),(181,1,'PkZJZT3ciH320dAqE/RANqn1+2KmsAemRDwBfYfc3c0=','2026-09-07 10:54:12','2026-08-31 10:54:12','2026-08-31 12:08:08','NGOKdC3CQBk1XeCRniq5B939SJZVrzCqF5TMIHlyLuI=','::1'),(182,1,'VFuQOEsC+K3TQCL5E5dCNeJv6DMaN87+cZkEkr0Te9Y=','2026-09-07 11:12:09','2026-08-31 11:12:09',NULL,NULL,'::1'),(183,1,'Kvz4ju553yUqzYRPOC5TTS7qpRHh7cCtya4uVn95g9g=','2026-09-07 11:16:15','2026-08-31 11:16:15',NULL,NULL,'::1'),(184,1,'mAm92EksJcGkY6ic0qNHDBi4RL6QVWnCygH3Q3T9Lpw=','2026-09-07 11:36:38','2026-08-31 11:36:38',NULL,NULL,'::1'),(185,1,'86nXgx+fpyZzwv9CwPallR17cYXjvsK1AiYur0MP3VE=','2026-09-07 11:42:07','2026-08-31 11:42:07',NULL,NULL,'::1'),(186,1,'faU4xwoav5V8xnVGHfeGHJ4N/6YoIlsSl6MNw3l7fSU=','2026-09-07 11:47:40','2026-08-31 11:47:40',NULL,NULL,'::1'),(187,1,'alsCKD19MOd2R5MZuLAWLBvysSFnxhZNtZDL5czbUPc=','2026-09-07 12:07:06','2026-08-31 12:07:06',NULL,NULL,'::1'),(188,1,'slythDczvWzgYnnzWXyKyybjXDUPM+QGty59Uf3Cuno=','2026-09-07 12:08:08','2026-08-31 12:08:08',NULL,NULL,'::1'),(189,1,'JJQWstRgxpYSH4aF/XsNLjb5wZjeSo2LYC6acDsHYyY=','2026-09-07 12:08:08','2026-08-31 12:08:08',NULL,NULL,'::1'),(190,1,'NGOKdC3CQBk1XeCRniq5B939SJZVrzCqF5TMIHlyLuI=','2026-09-07 12:08:08','2026-08-31 12:08:08',NULL,NULL,'::1'),(191,1,'tiuaBtWv3zCtwQPEIfV2zFq936XVVA/9jATnzGlh7og=','2026-09-07 12:10:38','2026-08-31 12:10:38',NULL,NULL,'::1'),(192,1,'xJz/oKwh2qxuPfNj7WyXsjd3nuHQfpXFAD+FzLzpou8=','2026-09-07 12:10:39','2026-08-31 12:10:39',NULL,NULL,'::1'),(193,1,'ucYf7htXKY9Lq3SSilvzzUko0aozdh/Kq+cTsrzGZJ4=','2026-09-07 12:28:27','2026-08-31 12:28:27','2026-09-01 05:13:14','kzZObwXcFm/a0N8YE7LTN5qJRx+0IB5AWwKW+9NMjrU=','::1'),(194,1,'dBenYNVAUJgdjoLGDE8D5Uan0KzIbJJdgV5AruZxx6U=','2026-09-07 12:37:15','2026-08-31 12:37:15',NULL,NULL,'::1'),(195,1,'7sTwZU3Z4307f8TnZfuj8x8Y92cWTviyptHSp/5vCXs=','2026-09-07 12:44:52','2026-08-31 12:44:52',NULL,NULL,'::1'),(196,2,'4WUl6TKbVKLZfpiHco/o9ao416OD5pM4116Xgh9xO8k=','2026-09-07 12:48:34','2026-08-31 12:48:34',NULL,NULL,'::1'),(197,1,'uNhH6wBga8QL6dqW1ItXEYc5OP5zKbgxDNBfvEkp6Ps=','2026-09-08 04:15:08','2026-09-01 04:15:08',NULL,NULL,'::1'),(198,1,'vZwybD/PiBfT3k6+D2P9tz56PFr/y24JxIsVV+RZHRk=','2026-09-08 04:26:44','2026-09-01 04:26:44',NULL,NULL,'::1'),(199,1,'5UzMx73qbHycH0cf18LTcEdaAHfUzUgCbPv0o5cPqs4=','2026-09-08 04:36:15','2026-09-01 04:36:15',NULL,NULL,'::1'),(200,1,'y241O9LnLRAeHDSyaaOuv8BaFRBj+yHRsPElgQ9wxPY=','2026-09-08 05:13:14','2026-09-01 05:13:14',NULL,NULL,'::1'),(201,1,'kzZObwXcFm/a0N8YE7LTN5qJRx+0IB5AWwKW+9NMjrU=','2026-09-08 05:13:14','2026-09-01 05:13:14',NULL,NULL,'::1'),(202,1,'ya/tcSQsh0huPVS12r/swogCK+6FXD6htfSXEwvgVZE=','2026-09-08 05:19:17','2026-09-01 05:19:17',NULL,NULL,'::1'),(203,1,'MHz+fKbTJMgT+4J9KAPrrmXriNkzMtr3Sb3OPTZcqFA=','2026-09-08 05:23:38','2026-09-01 05:23:38','2026-09-01 06:28:08','q/HPFk6GLQ4LWaxIcCSD3LNbPJjKlYvKY9tGAbvvKyg=','::1'),(204,1,'cYJ1AwXN1p/I87dTWfw4YBMfvI+63G4ZqU2ojRcpY2Y=','2026-09-08 05:28:44','2026-09-01 05:28:44',NULL,NULL,'::1'),(205,1,'enGet94cioQKFXUN/qane8rPzYPBgC9/Id1AGlJ241s=','2026-09-08 05:59:14','2026-09-01 05:59:14','2026-09-01 10:41:55','Ga+lPk49KDpRmw043racdrjt/u6/mV9J+aPv5Kq42Rg=','::1'),(206,1,'SvbVtmYG/P5gCwkxH4XSwJSgxWuXRCdHSjJFICsPH1Y=','2026-09-08 06:28:08','2026-09-01 06:28:08',NULL,NULL,'::1'),(207,1,'q/HPFk6GLQ4LWaxIcCSD3LNbPJjKlYvKY9tGAbvvKyg=','2026-09-08 06:28:08','2026-09-01 06:28:08','2026-09-01 08:18:45','19ObNG2wuY0AJ6xyVQs1NF1XD0q0pifufrG13LwhAg4=','::1'),(208,1,'/JuNhpACOKbcMMSv2E1Op2NLGtBrAl471Qa+rz1uvSw=','2026-09-08 08:18:45','2026-09-01 08:18:45',NULL,NULL,'::1'),(209,1,'19ObNG2wuY0AJ6xyVQs1NF1XD0q0pifufrG13LwhAg4=','2026-09-08 08:18:45','2026-09-01 08:18:45',NULL,NULL,'::1'),(210,1,'950++1EQIQIHz/KK831QsmQr40+yjO0ch+uR3+Mi3QU=','2026-09-08 08:35:10','2026-09-01 08:35:10',NULL,NULL,'::1'),(211,1,'snvXim7uBpTqjNpoQClyDfCmzGE+5yFFVKvX4Z44dy0=','2026-09-08 09:09:25','2026-09-01 09:09:25',NULL,NULL,'::1'),(212,1,'MJvjtTVO3qyHGukGUsQlRV3JQq4bjuWEZljURa08TLE=','2026-09-08 09:39:06','2026-09-01 09:39:06',NULL,NULL,'::1'),(213,1,'PwM534y7BjNnu8MKmvL7+uSLrtfa8YdGklljcP9aL8s=','2026-09-08 09:51:09','2026-09-01 09:51:09','2026-09-01 11:17:45','FoCh9JhQ/rlO3FaY/3QR2WnuWq5FejKzafTrVT7B+Vw=','::1'),(214,1,'Ga+lPk49KDpRmw043racdrjt/u6/mV9J+aPv5Kq42Rg=','2026-09-08 10:41:55','2026-09-01 10:41:55',NULL,NULL,'::1'),(215,1,'FoCh9JhQ/rlO3FaY/3QR2WnuWq5FejKzafTrVT7B+Vw=','2026-09-08 11:17:45','2026-09-01 11:17:45',NULL,NULL,'::1'),(216,1,'N877I2Yxg9XcNm956JDcFk5ONoixK55c7rm0Ywddxio=','2026-09-09 04:05:22','2026-09-02 04:05:22',NULL,NULL,'::1'),(217,1,'N7xgE8lXbVrucG/l7ER9PMfsk1QjDv6e4WcWNBt5Ld4=','2026-09-09 04:25:32','2026-09-02 04:25:32',NULL,NULL,'::1'),(218,1,'3G6+fOz6siSv/6iu7ZioyHY8axyCSaTSkOVymDTGe5A=','2026-09-09 04:40:26','2026-09-02 04:40:26',NULL,NULL,'::1'),(219,1,'jEP7midDhehO2F0ZNQtKqU6h7Z4DxUs2elHS1/ghhVU=','2026-09-09 12:20:23','2026-09-02 12:20:23',NULL,NULL,'::1'),(220,1,'PiKTDbek1YFmtdaVDGyLZE0rSmzH/n6gZHHn31xMZ5Q=','2026-09-09 12:53:21','2026-09-02 12:53:21',NULL,NULL,'::1'),(221,1,'tlAfD29IkOm0MinJ5OHoEpMt6VP8ZXfpurEK4hdLt3o=','2026-09-10 03:48:17','2026-09-03 03:48:17','2026-09-03 06:17:35','O9P1U66EpCYyajuALNbU5Jc1YU8Kl+387k+fxvrGnKM=','::1'),(222,1,'NXT7gvgDZ8g7lXoMz1aswIuHx/cx4MAVf739Y6mEOxw=','2026-09-10 03:50:32','2026-09-03 03:50:32','2026-09-03 04:54:01','SuMeBHC1OVc8SjwMyvBt5LB0EPqu+kz8DiGEqMbBpMs=','::1'),(223,1,'3vydt2Mk1+MAiUy9sr4ezc6Z1SecJqoNBosbpgHVZ/o=','2026-09-10 03:51:05','2026-09-03 03:51:05',NULL,NULL,'::1'),(224,1,'rZ+5m3zxPM4zeKcgAL2zq7yKXWJWDZ1nOF5uuU275BM=','2026-09-10 03:51:57','2026-09-03 03:51:57',NULL,NULL,'::1'),(225,1,'qTKy8j0++68NDNkz/kG1+RYNC5/3msAFCSCPxeHBXbU=','2026-09-10 03:54:32','2026-09-03 03:54:32',NULL,NULL,'::1'),(226,1,'n76NzBngGvnK6+6tX2SnbJpfGuEy3s4Sq8sbzMho6r8=','2026-09-10 04:36:58','2026-09-03 04:36:58',NULL,NULL,'::1'),(227,1,'SuMeBHC1OVc8SjwMyvBt5LB0EPqu+kz8DiGEqMbBpMs=','2026-09-10 04:54:01','2026-09-03 04:54:01','2026-09-03 04:54:02','+2ZLlmMN3Hq7Gq2HFXQ//0Gky4Tmigg6FBsS/kAYKMU=','::1'),(228,1,'+2ZLlmMN3Hq7Gq2HFXQ//0Gky4Tmigg6FBsS/kAYKMU=','2026-09-10 04:54:02','2026-09-03 04:54:02','2026-09-03 05:55:55','Ofaw7At/EChEdsTNJBvJ4DX4P513MRaCxAJj9zOtLjM=','::1'),(229,1,'CWBpe5kTD7CqF1cEAGdhsEKM4m+OljlAsFebV++QB5s=','2026-09-10 04:56:05','2026-09-03 04:56:05','2026-09-03 06:03:54','H5Hnt8+afQp1gJZa+oc7psQwRDTrSTJUVmlkUSm6sqc=','::1'),(230,1,'8gGo33ThYfEuXHMSAwU6Hx79SOsG+ZX6iQfHtnqxuDo=','2026-09-10 05:55:55','2026-09-03 05:55:55',NULL,NULL,'::1'),(231,1,'pE5hkQee7lb29KLEvlDaigRiUphXjwQXTY/alOupZpQ=','2026-09-10 05:55:55','2026-09-03 05:55:55',NULL,NULL,'::1'),(232,1,'XTq73BPQwJNi8k3mO6hjIKCgJBHV/D/5mcV0zBePPb0=','2026-09-10 05:55:55','2026-09-03 05:55:55',NULL,NULL,'::1'),(233,1,'hOi2RKVOt1N9Rpxcma0xQJfiyfnCavjxDq1bt061P84=','2026-09-10 05:55:55','2026-09-03 05:55:55',NULL,NULL,'::1'),(234,1,'eLkCUBUNYq6We8YcqMg3Sxnq08bkDwO49ukgVIRrroY=','2026-09-10 05:55:55','2026-09-03 05:55:55',NULL,NULL,'::1'),(235,1,'Ofaw7At/EChEdsTNJBvJ4DX4P513MRaCxAJj9zOtLjM=','2026-09-10 05:55:55','2026-09-03 05:55:55','2026-09-03 07:28:15','ygFHFepfK4kDwRPjx82wBtLwQkA+/9A94cTjvwM25nI=','::1'),(236,1,'H5Hnt8+afQp1gJZa+oc7psQwRDTrSTJUVmlkUSm6sqc=','2026-09-10 06:03:54','2026-09-03 06:03:54','2026-09-03 07:04:59','hk6Vyneq7YlmQtZkYF5Xdu0Xn4u30bPFOh/4fz8YIZ8=','::1'),(237,1,'6arMl5lYqkghHw11zjIkxp083jCapIuRYs5yCZvDcVk=','2026-09-10 06:17:35','2026-09-03 06:17:35',NULL,NULL,'::1'),(238,1,'NA8Rn8iBk30GoHiWYrZa0Vz+82qwzoHlaudJ7QcL40M=','2026-09-10 06:17:35','2026-09-03 06:17:35',NULL,NULL,'::1'),(239,1,'O9P1U66EpCYyajuALNbU5Jc1YU8Kl+387k+fxvrGnKM=','2026-09-10 06:17:35','2026-09-03 06:17:35','2026-09-03 09:12:06','9cfm/NsTQmeFWXvguqXfv5j8Y/prETD2bXjCa5PHs/Y=','::1'),(240,2,'1MNcpqRfb3fszOTaxNwnv2NDtw/yxGpxM0P305QRNEk=','2026-09-10 06:32:04','2026-09-03 06:32:04','2026-09-03 08:54:06','Sf6gWEIkhXJICxhcZyO4YPazR990zxdNdvrBTkNrLuU=','::1'),(241,1,'hk6Vyneq7YlmQtZkYF5Xdu0Xn4u30bPFOh/4fz8YIZ8=','2026-09-10 07:04:59','2026-09-03 07:04:59','2026-09-03 08:43:31','GQ9GsrsxTRy4P09KzTpmxZu0ZoMnffvg70/3YQP1skc=','::1'),(242,1,'ygFHFepfK4kDwRPjx82wBtLwQkA+/9A94cTjvwM25nI=','2026-09-10 07:28:15','2026-09-03 07:28:15','2026-09-03 08:33:20','VHky28ptfMhZEXvrIu+sHn3kIvCu7LP5DM00pFs2BfQ=','::1'),(243,1,'VHky28ptfMhZEXvrIu+sHn3kIvCu7LP5DM00pFs2BfQ=','2026-09-10 08:33:21','2026-09-03 08:33:21','2026-09-03 11:06:01','WKWaEY8dktPum3j4oNRc83ZOJAQpyvTSw4atgdXZOfo=','::1'),(244,1,'GQ9GsrsxTRy4P09KzTpmxZu0ZoMnffvg70/3YQP1skc=','2026-09-10 08:43:31','2026-09-03 08:43:31','2026-09-03 09:44:39','UjeMqfW0OMKXWeD422U7GSd4MRrIxIJTay1f3sqJCUo=','::1'),(245,2,'Sf6gWEIkhXJICxhcZyO4YPazR990zxdNdvrBTkNrLuU=','2026-09-10 08:54:06','2026-09-03 08:54:06',NULL,NULL,'::1'),(246,1,'rzjOHpbE4oMoAnL06k2Ls/h5R60ToFcx90n/yWQTtjw=','2026-09-10 09:12:06','2026-09-03 09:12:06','2026-09-03 09:12:06','eB7SM7VygP68n8M0oP+2reV56sffNqqWP+wfz9PCvdo=','::1'),(247,1,'9cfm/NsTQmeFWXvguqXfv5j8Y/prETD2bXjCa5PHs/Y=','2026-09-10 09:12:06','2026-09-03 09:12:06','2026-09-03 09:12:07','asodkORhY3gxjpXOya8IIGjatsip5WxjWQaf10TbErk=','::1'),(248,1,'eB7SM7VygP68n8M0oP+2reV56sffNqqWP+wfz9PCvdo=','2026-09-10 09:12:06','2026-09-03 09:12:06','2026-09-03 09:12:07','JdNNlVcui30ypFXo8YKhnpjrSUyWvo26E8tsTYn88Do=','::1'),(249,1,'asodkORhY3gxjpXOya8IIGjatsip5WxjWQaf10TbErk=','2026-09-10 09:12:07','2026-09-03 09:12:07',NULL,NULL,'::1'),(250,1,'JdNNlVcui30ypFXo8YKhnpjrSUyWvo26E8tsTYn88Do=','2026-09-10 09:12:07','2026-09-03 09:12:07','2026-09-03 10:13:18','q+nIKGhnGB8rRVpZD1tCWtZ+QMOf3rhwiVHA9+94LDI=','::1'),(251,2,'24laSWAaUj28/f5UnN8UlIO4rs6YwzKzRn+Ed7FzbOk=','2026-09-10 09:16:56','2026-09-03 09:16:56',NULL,NULL,'::1'),(252,1,'3FycBs0ZZj+FJFgKbojIujXfdfNSv/GE/lCPvk7SB+U=','2026-09-10 09:28:35','2026-09-03 09:28:35',NULL,NULL,'::1'),(253,1,'iU7+lAbjCie+fX9jjozCfpeSlbdmoiuSYfEh9pcVn0c=','2026-09-10 09:32:06','2026-09-03 09:32:06',NULL,NULL,'::1'),(254,1,'f0SMNNXYYIUrzi/n7EqsH3nCggOyHXu9oIAvee74r2I=','2026-09-10 09:44:39','2026-09-03 09:44:39','2026-09-03 09:44:40','0JStVMoEa99qCovWvNDK/AX08STkbKuDLOO+i76RBto=','::1'),(255,1,'UjeMqfW0OMKXWeD422U7GSd4MRrIxIJTay1f3sqJCUo=','2026-09-10 09:44:39','2026-09-03 09:44:39','2026-09-03 09:44:40','nby6ZChnlksbwPsNaAA21C/T6RtgCOw9duzJbtD6yWI=','::1'),(256,1,'0JStVMoEa99qCovWvNDK/AX08STkbKuDLOO+i76RBto=','2026-09-10 09:44:40','2026-09-03 09:44:40',NULL,NULL,'::1'),(257,1,'nby6ZChnlksbwPsNaAA21C/T6RtgCOw9duzJbtD6yWI=','2026-09-10 09:44:40','2026-09-03 09:44:40',NULL,NULL,'::1'),(258,1,'SVcnl/7pBmsgDC5/77JwGBFRFkV69ClYoPg9vEVv06U=','2026-09-10 10:11:36','2026-09-03 10:11:36',NULL,NULL,'::1'),(259,1,'q+nIKGhnGB8rRVpZD1tCWtZ+QMOf3rhwiVHA9+94LDI=','2026-09-10 10:13:18','2026-09-03 10:13:18','2026-09-03 10:13:18','g5woT9yLNedh4/+a2cXTsp+8yT2lmJTP0hCpXn3IpoE=','::1'),(260,1,'g5woT9yLNedh4/+a2cXTsp+8yT2lmJTP0hCpXn3IpoE=','2026-09-10 10:13:18','2026-09-03 10:13:18',NULL,NULL,'::1'),(261,1,'GrxI9LqrAoVipXUZlzSkfDtyEYezbxeCvcDcKMjNVW0=','2026-09-10 10:15:02','2026-09-03 10:15:02',NULL,NULL,'::1'),(262,1,'h2O+CHXXpJesEIb9Mp6zIO1tbSlAUG7chtTWhOzvdQA=','2026-09-10 10:16:45','2026-09-03 10:16:45',NULL,NULL,'::1'),(263,2,'LCY7etZCJe3co6BHNY8ll7HJNmrMtmmN1P7msNtX8+A=','2026-09-10 10:25:41','2026-09-03 10:25:41',NULL,NULL,'::1'),(264,1,'SKWc5FxlKcR64USUEEVicRDs8VHVos6a+Ec66uZB3IY=','2026-09-10 10:41:56','2026-09-03 10:41:56',NULL,NULL,'::1'),(265,1,'ukXWbD9ihMi3q5au/nwFusfXRfPLyTgbO9Qjj24DEhU=','2026-09-10 10:52:15','2026-09-03 10:52:15',NULL,NULL,'::1'),(266,1,'Aq8DiXe1k1mVcz9j7twqOksVAdp+cWODzbtCC9n/My4=','2026-09-10 10:57:57','2026-09-03 10:57:57',NULL,NULL,'::1'),(267,2,'rHpSphUfFIdz6sOKIxgdru0XRpx3B9z7KiRbUsRsR08=','2026-09-10 10:58:07','2026-09-03 10:58:07',NULL,NULL,'::1'),(268,2,'dlMSBCfCrWaJ9i879yX86VzUZ7cdaFcfaarowUkpb0E=','2026-09-10 11:02:11','2026-09-03 11:02:11',NULL,NULL,'::1'),(269,1,'zHrTCaIk9CLHZ3BCqC4qnEjK5z8km19JpBSTKBvmrHQ=','2026-09-10 11:03:31','2026-09-03 11:03:31',NULL,NULL,'::1'),(270,1,'WKWaEY8dktPum3j4oNRc83ZOJAQpyvTSw4atgdXZOfo=','2026-09-10 11:06:01','2026-09-03 11:06:01',NULL,NULL,'::1'),(271,1,'yGoNIKLTNUwUryEPou43+6nkYXYiFvHWpL+PnlE1kkg=','2026-09-10 11:17:17','2026-09-03 11:17:17',NULL,NULL,'::1'),(272,1,'njJyHUuKJPiRe3Mgl7lypMFPd+3TfQO8NGEjhpXggks=','2026-09-10 17:59:46','2026-09-03 17:59:46',NULL,NULL,'::1');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registration_requests`
--

DROP TABLE IF EXISTS `registration_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_requests` (
  `registration_request_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `approved_user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`registration_request_id`),
  KEY `idx_registration_requests_status_created` (`status`,`created_at`),
  KEY `idx_registration_requests_email` (`email`),
  KEY `idx_registration_requests_mobile` (`mobile`),
  KEY `idx_registration_requests_approved_user` (`approved_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registration_requests`
--

LOCK TABLES `registration_requests` WRITE;
/*!40000 ALTER TABLE `registration_requests` DISABLE KEYS */;
INSERT INTO `registration_requests` VALUES (1,'Chinnaluru Pravallika','chinnalurupravallika789@gmail.com','9978997899','$2a$11$38mAhUkG/t67os64XM4aGeAmvkAGbdOv8XGAoGuYFPUVzWcPdIdJ6','PENDING','2026-08-27 09:19:49',NULL,NULL,NULL),(2,'Tharun kumar Ambala','ambalatharunkumar@gmail.com','9882634868','$2a$11$OkR7QxZA0a/Yku6a3caZx.FEDxtBk1wk5i6VpzDkkFYUEDILBmXni','PENDING','2026-08-27 10:13:52',NULL,NULL,NULL),(3,'suresh bandari','suresh@gmail.com','9472642752','$2a$11$kck2lfOP0Xdq2XMTq1CvUuc1.gaVnTOV7C0AH/1KKx0SIk0u6pv5m','PENDING','2026-08-27 11:14:29',NULL,NULL,NULL),(4,'sri','sri@gmail.com','9687543122','$2a$11$vyznLNkYGvyqSUxMi7Q4He5DHT9gwg.XTv/M/OHfaNLb3rCdisPb6','PENDING','2026-08-31 05:05:45',NULL,NULL,NULL),(5,'Yagnasri Cheedella','cheedellayagnika@gmail.com','9121440491','$2a$11$o9Sli1BDr2Ike52tT4WvNe19K3tY9BFL3.tK64pwebqB7Guz69Tk6','PENDING','2026-09-03 10:45:30',NULL,NULL,NULL);
/*!40000 ALTER TABLE `registration_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` bigint NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_roles_role_name` (`role_name`),
  UNIQUE KEY `uq_roles_role_code` (`role_code`),
  KEY `idx_roles_status` (`status`),
  KEY `idx_roles_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Super Admin','SUPER_ADMIN','Full system administration and configuration access',1,'2026-06-01 09:00:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(2,'College Admin','COLLEGE_ADMIN','Manages college, academic, user and administrative operations',1,'2026-06-01 09:05:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(3,'Principal','PRINCIPAL','College principal with academic and administrative oversight',1,'2026-06-01 09:10:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(4,'HOD','HOD','Head of Department responsible for department operations',1,'2026-06-01 09:15:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(5,'Faculty','FACULTY','Faculty member responsible for teaching and academic activities',1,'2026-06-01 09:20:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(6,'Student','STUDENT','Student access to academic and personal information',1,'2026-06-01 09:25:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sections`
--

DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `section_id` bigint NOT NULL AUTO_INCREMENT,
  `college_id` bigint NOT NULL,
  `academic_year_id` bigint NOT NULL,
  `department_id` bigint NOT NULL,
  `course_id` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `semester` int DEFAULT NULL,
  `semester_id` bigint DEFAULT NULL,
  `section_code` varchar(20) NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `capacity` int NOT NULL DEFAULT '60',
  `class_teacher_employee_profile_id` bigint DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `shift` varchar(30) DEFAULT NULL,
  `section_type` varchar(50) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `is_archived` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`section_id`),
  UNIQUE KEY `uq_section_code` (`academic_year_id`,`department_id`,`course_id`,`branch_id`,`semester_id`,`section_code`),
  KEY `idx_sections_college` (`college_id`),
  KEY `idx_sections_academic_year` (`academic_year_id`),
  KEY `idx_sections_course` (`course_id`),
  KEY `idx_sections_branch` (`branch_id`),
  KEY `idx_sections_teacher` (`class_teacher_employee_profile_id`),
  KEY `idx_sections_status` (`status`),
  KEY `fk_section_department` (`department_id`),
  KEY `fk_section_semester` (`semester_id`),
  CONSTRAINT `fk_section_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  CONSTRAINT `fk_section_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`semester_id`),
  CONSTRAINT `fk_sections_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `fk_sections_class_teacher` FOREIGN KEY (`class_teacher_employee_profile_id`) REFERENCES `employee_profiles` (`employee_profile_id`),
  CONSTRAINT `fk_sections_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`),
  CONSTRAINT `chk_sections_capacity` CHECK ((`capacity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sections`
--

LOCK TABLES `sections` WRITE;
/*!40000 ALTER TABLE `sections` DISABLE KEYS */;
INSERT INTO `sections` VALUES (1,1,2,1,1,1,1,NULL,'SEC-1','Section A',60,5,NULL,'Morning','Regular',1,0,'2026-08-24 22:36:41',1,'2026-08-26 12:31:42',1,NULL,NULL),(2,1,2,1,1,1,1,1,'B','Section B',60,NULL,NULL,'Morning','Regular',1,0,'2026-08-25 15:37:59',1,'2026-08-31 05:52:55',1,NULL,NULL),(3,1,2,1,1,2,1,1,'A','Section A',60,4,NULL,'Morning','Regular',1,0,'2026-08-25 15:37:59',1,'2026-08-27 08:47:16',1,NULL,NULL),(4,1,2,1,1,2,1,1,'B','Section B',60,NULL,NULL,'Morning','Regular',1,0,'2026-08-25 15:37:59',1,'2026-08-26 12:31:42',NULL,NULL,NULL),(5,1,2,4,1,4,1,25,'A','Section A',60,5,NULL,'Morning','Regular',1,0,'2026-08-25 15:37:59',1,'2026-08-27 09:10:39',1,NULL,NULL),(6,1,2,5,1,5,1,33,'A','Section A',60,1,NULL,'Morning','Regular',1,0,'2026-08-25 15:37:59',1,'2026-08-27 11:45:46',1,NULL,NULL);
/*!40000 ALTER TABLE `sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `semesters`
--

DROP TABLE IF EXISTS `semesters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `semesters` (
  `semester_id` bigint NOT NULL AUTO_INCREMENT,
  `course_id` bigint NOT NULL,
  `branch_id` bigint NOT NULL,
  `semester_number` int NOT NULL,
  `year_number` int NOT NULL,
  `semester_name` varchar(100) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `is_archived` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `academic_year_id` bigint NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`semester_id`),
  KEY `fk_semester_branch` (`branch_id`),
  KEY `idx_semesters_course` (`course_id`),
  CONSTRAINT `fk_semester_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_semesters_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `semesters`
--

LOCK TABLES `semesters` WRITE;
/*!40000 ALTER TABLE `semesters` DISABLE KEYS */;
INSERT INTO `semesters` VALUES (1,1,1,2,1,'Semester 1',1,0,'2026-08-25 15:32:29',NULL,'2026-08-31 11:45:22',NULL,1,'2026-08-31','2026-08-31'),(2,1,1,2,1,'Semester 2',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(3,1,1,3,2,'Semester 3',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(4,1,1,4,2,'Semester 4',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(5,1,1,5,3,'Semester 5',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(6,1,1,6,3,'Semester 6',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(7,1,1,7,4,'Semester 7',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(8,1,1,8,4,'Semester 8',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(9,1,2,1,1,'Semester 1',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(10,1,2,2,1,'Semester 2',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(11,1,2,3,2,'Semester 3',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(12,1,2,4,2,'Semester 4',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(13,1,2,5,3,'Semester 5',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(14,1,2,6,3,'Semester 6',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(15,1,2,7,4,'Semester 7',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(16,1,2,8,4,'Semester 8',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(17,1,3,1,1,'Semester 1',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(18,1,3,2,1,'Semester 2',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(19,1,3,3,2,'Semester 3',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(20,1,3,4,2,'Semester 4',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(21,1,3,5,3,'Semester 5',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(22,1,3,6,3,'Semester 6',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(23,1,3,7,4,'Semester 7',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(24,1,3,8,4,'Semester 8',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(25,1,4,1,1,'Semester 1',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(26,1,4,2,1,'Semester 2',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(27,1,4,3,2,'Semester 3',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(28,1,4,4,2,'Semester 4',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(29,1,4,5,3,'Semester 5',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(30,1,4,6,3,'Semester 6',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(31,1,4,7,4,'Semester 7',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(32,1,4,8,4,'Semester 8',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(33,5,5,1,1,'Semester 1',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(34,5,5,2,1,'Semester 2',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(35,5,5,3,2,'Semester 3',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(36,5,5,4,2,'Semester 4',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(37,5,5,5,3,'Semester 5',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(38,5,5,6,3,'Semester 6',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(39,5,5,7,4,'Semester 7',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(40,5,5,8,4,'Semester 8',1,0,'2026-08-25 15:32:29',NULL,NULL,NULL,0,NULL,NULL),(41,1,1,1,1,'Semester 1',1,0,'2026-08-31 11:43:22',1,NULL,NULL,1,'2026-08-31','2026-08-31'),(42,1,1,1,1,'Semester 1',1,0,'2026-09-03 18:06:15',1,NULL,NULL,2,'2026-09-01','2027-01-31');
/*!40000 ALTER TABLE `semesters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_academic_details`
--

DROP TABLE IF EXISTS `student_academic_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_academic_details` (
  `AcademicId` int NOT NULL AUTO_INCREMENT,
  `RollNumber` varchar(20) NOT NULL,
  `RegistrationNumber` varchar(30) NOT NULL,
  `AdmissionNumber` varchar(30) NOT NULL,
  `Course` varchar(100) NOT NULL,
  `Branch` varchar(100) NOT NULL,
  `Department` varchar(100) NOT NULL,
  `Semester` int NOT NULL,
  `Section` varchar(10) NOT NULL,
  `AcademicYear` varchar(20) NOT NULL,
  PRIMARY KEY (`AcademicId`),
  UNIQUE KEY `UQ_Student_Registration` (`RegistrationNumber`),
  UNIQUE KEY `UQ_Student_Admission` (`AdmissionNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_academic_details`
--

LOCK TABLES `student_academic_details` WRITE;
/*!40000 ALTER TABLE `student_academic_details` DISABLE KEYS */;
INSERT INTO `student_academic_details` VALUES (2,'21B01A002','REG2021002','ADM2021002','B.Tech','ECE','Electronics and Communication Engineering',3,'A','2026-2027'),(3,'21B01A003','REG2021003','ADM2021003','B.Tech','EEE','Electrical and Electronics Engineering',6,'B','2025-2026'),(4,'21B01A004','REG2021004','ADM2021004','B.Tech','MECH','Mechanical Engineering',4,'B','2025-2026'),(5,'21B01A005','REG2021005','ADM2021005','B.Tech','CIVIL','Civil Engineering',4,'C','2025-2026'),(6,'21B01A006','REG2021007','ADM2021007','B.Tech','CSE','Computer Science and Engineering',6,'A','2025-2026');
/*!40000 ALTER TABLE `student_academic_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_admission_fee_structures`
--

DROP TABLE IF EXISTS `student_admission_fee_structures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_admission_fee_structures` (
  `fee_structure_id` bigint NOT NULL AUTO_INCREMENT,
  `admission_id` bigint NOT NULL,
  `tuition_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `admission_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `hostel_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `transportation_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `scholarship_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_plan` varchar(50) NOT NULL DEFAULT 'ONE_TIME',
  `payment_status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`fee_structure_id`),
  UNIQUE KEY `uq_student_admission_fee_admission` (`admission_id`),
  CONSTRAINT `fk_student_admission_fee_admission` FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_student_admission_fee_nonnegative` CHECK (((`tuition_fee` >= 0) and (`admission_fee` >= 0) and (`hostel_fee` >= 0) and (`transportation_fee` >= 0) and (`scholarship_amount` >= 0) and (`amount_paid` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_admission_fee_structures`
--

LOCK TABLES `student_admission_fee_structures` WRITE;
/*!40000 ALTER TABLE `student_admission_fee_structures` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_admission_fee_structures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_admission_form_data`
--

DROP TABLE IF EXISTS `student_admission_form_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_admission_form_data` (
  `admission_id` bigint NOT NULL,
  `form_data` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`admission_id`),
  CONSTRAINT `fk_student_admission_form_data_admission` FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_admission_form_data`
--

LOCK TABLES `student_admission_form_data` WRITE;
/*!40000 ALTER TABLE `student_admission_form_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_admission_form_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_admission_previous_education`
--

DROP TABLE IF EXISTS `student_admission_previous_education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_admission_previous_education` (
  `previous_education_id` bigint NOT NULL AUTO_INCREMENT,
  `admission_id` bigint NOT NULL,
  `qualification_level` varchar(30) NOT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `board_or_university` varchar(150) DEFAULT NULL,
  `institution` varchar(255) DEFAULT NULL,
  `roll_number` varchar(50) DEFAULT NULL,
  `passing_year` varchar(20) DEFAULT NULL,
  `stream` varchar(100) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`previous_education_id`),
  UNIQUE KEY `uq_admission_previous_education_level` (`admission_id`,`qualification_level`),
  CONSTRAINT `fk_admission_previous_education_admission` FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_admission_previous_education_score` CHECK (((`score` is null) or ((`score` >= 0) and (`score` <= 100))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_admission_previous_education`
--

LOCK TABLES `student_admission_previous_education` WRITE;
/*!40000 ALTER TABLE `student_admission_previous_education` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_admission_previous_education` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_document_files`
--

DROP TABLE IF EXISTS `student_document_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_document_files` (
  `document_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `content_type` varchar(150) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `uploaded_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`document_id`),
  KEY `idx_student_document_files_student` (`student_id`,`is_deleted`),
  CONSTRAINT `fk_student_document_files_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1000000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_document_files`
--

LOCK TABLES `student_document_files` WRITE;
/*!40000 ALTER TABLE `student_document_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_document_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_documents`
--

DROP TABLE IF EXISTS `student_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_documents` (
  `DocumentId` int NOT NULL AUTO_INCREMENT,
  `Student_Id` bigint NOT NULL,
  `AadhaarDocument` varchar(500) DEFAULT NULL,
  `PreviousCertificates` varchar(500) DEFAULT NULL,
  `TransferCertificate` varchar(500) DEFAULT NULL,
  `PassportPhoto` varchar(500) DEFAULT NULL,
  `CasteCertificate` varchar(500) DEFAULT NULL,
  `IncomeCertificate` varchar(500) DEFAULT NULL,
  `UploadedDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`DocumentId`),
  KEY `FK_student_documents_Student` (`Student_Id`),
  CONSTRAINT `FK_student_documents_Student` FOREIGN KEY (`Student_Id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_documents`
--

LOCK TABLES `student_documents` WRITE;
/*!40000 ALTER TABLE `student_documents` DISABLE KEYS */;
INSERT INTO `student_documents` VALUES (1,1,'aadhaar_1001.pdf','10th_certificate_1001.pdf','transfer_certificate_1001.pdf','student_1001.jpg','caste_certificate_1001.pdf','income_certificate_1001.pdf','2026-09-01 13:02:26');
/*!40000 ALTER TABLE `student_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_parents`
--

DROP TABLE IF EXISTS `student_parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_parents` (
  `parent_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `father_name` varchar(150) DEFAULT NULL,
  `father_mobile` varchar(20) DEFAULT NULL,
  `father_email` varchar(150) DEFAULT NULL,
  `father_occupation` varchar(100) DEFAULT NULL,
  `mother_name` varchar(150) DEFAULT NULL,
  `mother_mobile` varchar(20) DEFAULT NULL,
  `mother_email` varchar(150) DEFAULT NULL,
  `mother_occupation` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parent_id`),
  UNIQUE KEY `uq_student_parent` (`student_id`),
  CONSTRAINT `fk_student_parents_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_parents`
--

LOCK TABLES `student_parents` WRITE;
/*!40000 ALTER TABLE `student_parents` DISABLE KEYS */;
INSERT INTO `student_parents` VALUES (1,1,'Ramesh Kumar','+919876543210','ramesh.kumar@gmail.com','Business','Lakshmi Devi','+919876543211','lakshmi.devi@gmail.com','Teacher','2026-09-01 13:21:23','2026-09-01 13:21:23'),(2,2,'Suresh Sharma','+919876543212','suresh.sharma@gmail.com','Engineer','Anitha Sharma','+919876543213','anitha.sharma@gmail.com','Bank Employee','2026-09-01 13:21:23','2026-09-01 13:21:23'),(3,3,'Rajesh Reddy','+919876543214','rajesh.reddy@gmail.com','Government Employee','Sunitha Reddy','+919876543215','sunitha.reddy@gmail.com','Homemaker','2026-09-01 13:21:23','2026-09-01 13:21:23');
/*!40000 ALTER TABLE `student_parents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profile_updates`
--

DROP TABLE IF EXISTS `student_profile_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profile_updates` (
  `StudentProfileUpdateId` bigint NOT NULL AUTO_INCREMENT,
  `StudentProfileId` bigint NOT NULL,
  `StudentId` bigint NOT NULL,
  `ChangeType` varchar(50) NOT NULL DEFAULT 'Update',
  `ChangedFields` longtext,
  `OldValues` longtext,
  `NewValues` longtext,
  `ChangeReason` varchar(500) DEFAULT NULL,
  `ChangeSource` varchar(50) NOT NULL DEFAULT 'API',
  `ChangedBy` bigint DEFAULT NULL,
  `ChangedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `IpAddress` varchar(45) DEFAULT NULL,
  `UserAgent` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`StudentProfileUpdateId`),
  KEY `IX_StudentProfileUpdates_ProfileDate` (`StudentProfileId`,`ChangedAt`),
  KEY `IX_StudentProfileUpdates_StudentDate` (`StudentId`,`ChangedAt`),
  KEY `IX_StudentProfileUpdates_ChangedBy` (`ChangedBy`),
  KEY `IX_StudentProfileUpdates_ChangeType` (`ChangeType`),
  KEY `IX_StudentProfileUpdates_ChangedAt` (`ChangedAt`),
  CONSTRAINT `FK_StudentProfileUpdates_ChangedBy` FOREIGN KEY (`ChangedBy`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_StudentProfileUpdates_Student` FOREIGN KEY (`StudentId`) REFERENCES `students` (`student_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_StudentProfileUpdates_StudentProfile` FOREIGN KEY (`StudentProfileId`) REFERENCES `student_profiles` (`StudentProfileId`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Immutable history of changes made to student profiles';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profile_updates`
--

LOCK TABLES `student_profile_updates` WRITE;
/*!40000 ALTER TABLE `student_profile_updates` DISABLE KEYS */;
INSERT INTO `student_profile_updates` VALUES (1,1,1,'Update','[\"AlternateEmail\", \"AlternateMobile\"]','{\"AlternateEmail\": \"aarav.kumar@oldmail.example\", \"AlternateMobile\": \"9000000009\"}','{\"AlternateEmail\": \"aarav.personal@example.com\", \"AlternateMobile\": \"9000000011\"}','Student updated alternate contact information.','API',1,'2026-08-25 09:15:00.000000','127.0.0.1','Swagger API'),(2,1,1,'Verify','[\"ProfileStatus\", \"IsVerified\", \"VerifiedBy\", \"VerifiedAt\"]','{\"IsVerified\": 0, \"VerifiedAt\": null, \"VerifiedBy\": null, \"ProfileStatus\": \"Pending Verification\"}','{\"IsVerified\": 1, \"VerifiedAt\": \"2026-08-25 10:30:00\", \"VerifiedBy\": 1, \"ProfileStatus\": \"Verified\"}','Student profile verified successfully.','Admin Portal',1,'2026-08-25 10:30:00.000000','127.0.0.1','College Admin Portal'),(3,2,2,'Update','[\"Address\", \"City\", \"District\", \"State\", \"Pincode\"]','{\"City\": \"Vijayawada\", \"State\": \"Andhra Pradesh\", \"Address\": \"Benz Circle, Vijayawada\", \"Pincode\": \"520010\", \"District\": \"Krishna\"}','{\"City\": \"Vijayawada\", \"State\": \"Andhra Pradesh\", \"Address\": \"Vijayawada, Andhra Pradesh\", \"Pincode\": \"520001\", \"District\": \"NTR\"}','Student corrected district and postal address.','API',2,'2026-08-26 10:15:00.000000','127.0.0.1','Swagger API'),(4,2,2,'Activate','[\"ProfileStatus\", \"IsActive\"]','{\"IsActive\": 1, \"ProfileStatus\": \"Verified\"}','{\"IsActive\": 1, \"ProfileStatus\": \"Active\"}','Verified student profile activated for portal use.','Admin Portal',1,'2026-08-26 11:00:00.000000','127.0.0.1','College Admin Portal'),(5,3,3,'SubmitForVerification','[\"ProfileStatus\", \"IsProfileCompleted\", \"ProfileCompletionPercentage\", \"Remarks\"]','{\"Remarks\": \"Additional information is required.\", \"ProfileStatus\": \"Incomplete\", \"IsProfileCompleted\": 0, \"ProfileCompletionPercentage\": 75.00}','{\"Remarks\": \"Profile completed and waiting for verification.\", \"ProfileStatus\": \"Pending Verification\", \"IsProfileCompleted\": 1, \"ProfileCompletionPercentage\": 100.00}','Student completed the profile and submitted it for verification.','Student Portal',6,'2026-09-01 07:40:00.000000','127.0.0.1','Student Self-Service Portal');
/*!40000 ALTER TABLE `student_profile_updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profiles` (
  `StudentProfileId` bigint NOT NULL AUTO_INCREMENT,
  `StudentId` bigint NOT NULL,
  `ProfilePhoto` varchar(500) DEFAULT NULL,
  `AlternateEmail` varchar(150) DEFAULT NULL,
  `AlternateMobile` varchar(20) DEFAULT NULL,
  `BloodGroup` varchar(10) DEFAULT NULL,
  `Nationality` varchar(100) DEFAULT NULL,
  `Religion` varchar(100) DEFAULT NULL,
  `Category` varchar(100) DEFAULT NULL,
  `Address` text,
  `City` varchar(100) DEFAULT NULL,
  `District` varchar(100) DEFAULT NULL,
  `State` varchar(100) DEFAULT NULL,
  `Country` varchar(100) DEFAULT 'India',
  `Pincode` varchar(10) DEFAULT NULL,
  `ProfileStatus` enum('Incomplete','Pending Verification','Verified','Active','Inactive','Suspended') NOT NULL DEFAULT 'Incomplete',
  `IsProfileCompleted` tinyint(1) NOT NULL DEFAULT '0',
  `IsVerified` tinyint(1) NOT NULL DEFAULT '0',
  `VerifiedBy` bigint DEFAULT NULL,
  `VerifiedAt` datetime DEFAULT NULL,
  `ProfileCompletionPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `Remarks` text,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `IsDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedBy` bigint DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedBy` bigint DEFAULT NULL,
  `UpdatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `DeletedBy` bigint DEFAULT NULL,
  `DeletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`StudentProfileId`),
  UNIQUE KEY `UQ_StudentProfiles_StudentId` (`StudentId`),
  KEY `IX_StudentProfiles_ProfileStatus` (`ProfileStatus`),
  KEY `IX_StudentProfiles_IsProfileCompleted` (`IsProfileCompleted`),
  KEY `IX_StudentProfiles_IsVerified` (`IsVerified`),
  KEY `IX_StudentProfiles_VerifiedBy` (`VerifiedBy`),
  KEY `IX_StudentProfiles_IsActive` (`IsActive`),
  KEY `IX_StudentProfiles_IsDeleted` (`IsDeleted`),
  CONSTRAINT `FK_StudentProfiles_Student` FOREIGN KEY (`StudentId`) REFERENCES `students` (`student_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_StudentProfiles_VerifiedBy` FOREIGN KEY (`VerifiedBy`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profiles`
--

LOCK TABLES `student_profiles` WRITE;
/*!40000 ALTER TABLE `student_profiles` DISABLE KEYS */;
INSERT INTO `student_profiles` VALUES (1,1,'/uploads/students/aarav.jpg','aarav.personal@example.com','9000000011','O+','Indian','Hindu','General','Hyderabad, Telangana','Hyderabad','Hyderabad','Telangana','India','500001','Verified',1,1,1,'2026-08-25 10:30:00',100.00,'Student profile verified successfully.',1,0,1,'2026-08-24 17:10:00',1,'2026-09-01 07:30:00',NULL,NULL),(2,2,'/uploads/students/diya.jpg','diya.personal@example.com','9000000012','A+','Indian','Hindu','General','Vijayawada, Andhra Pradesh','Vijayawada','NTR','Andhra Pradesh','India','520001','Active',1,1,1,'2026-08-26 11:00:00',100.00,'Student profile is complete and active.',1,0,1,'2026-08-24 17:15:00',1,'2026-09-01 07:35:00',NULL,NULL),(3,3,'/uploads/students/arjun.jpg','arjun.personal@example.com','9000000013','B+','Indian','Hindu','OBC','Guntur, Andhra Pradesh','Guntur','Guntur','Andhra Pradesh','India','522001','Pending Verification',1,0,NULL,NULL,100.00,'Profile completed and waiting for verification.',1,0,1,'2026-08-24 17:20:00',NULL,'2026-09-01 07:40:00',NULL,NULL);
/*!40000 ALTER TABLE `student_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_promotions`
--

DROP TABLE IF EXISTS `student_promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_promotions` (
  `promotion_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `from_academic_year_id` bigint NOT NULL,
  `to_academic_year_id` bigint NOT NULL,
  `from_course_id` bigint DEFAULT NULL,
  `to_course_id` bigint DEFAULT NULL,
  `from_branch_id` bigint DEFAULT NULL,
  `to_branch_id` bigint DEFAULT NULL,
  `from_semester` int DEFAULT NULL,
  `to_semester` int DEFAULT NULL,
  `promotion_status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `decision` varchar(30) DEFAULT NULL,
  `decision_date` datetime DEFAULT NULL,
  `decision_by` bigint DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  `college_id` bigint DEFAULT NULL,
  `from_section_id` bigint DEFAULT NULL,
  `to_section_id` bigint DEFAULT NULL,
  `attendance_percentage` decimal(5,2) DEFAULT NULL,
  `total_marks` decimal(10,2) DEFAULT NULL,
  `obtained_marks` decimal(10,2) DEFAULT NULL,
  `marks_percentage` decimal(5,2) DEFAULT NULL,
  `passed_subjects` int DEFAULT NULL,
  `failed_subjects` int DEFAULT NULL,
  `backlog_count` int DEFAULT NULL,
  `promotion_eligibility` varchar(30) DEFAULT NULL,
  `eligibility_remarks` varchar(500) DEFAULT NULL,
  `promotion_type` varchar(30) DEFAULT NULL,
  `promotion_date` datetime DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  `promotion_reason` varchar(500) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `is_final` tinyint(1) NOT NULL DEFAULT '0',
  `promotion_order` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`promotion_id`),
  KEY `idx_student_promotions_student` (`student_id`),
  KEY `idx_student_promotions_from_year` (`from_academic_year_id`),
  KEY `idx_student_promotions_to_year` (`to_academic_year_id`),
  KEY `idx_student_promotions_status` (`promotion_status`),
  CONSTRAINT `fk_student_promotions_from_academic_year` FOREIGN KEY (`from_academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `fk_student_promotions_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  CONSTRAINT `fk_student_promotions_to_academic_year` FOREIGN KEY (`to_academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `chk_student_promotions_decision` CHECK (((`decision` is null) or (`decision` in (_utf8mb4'APPROVE',_utf8mb4'REJECT')))),
  CONSTRAINT `chk_student_promotions_status` CHECK ((`promotion_status` in (_utf8mb4'PENDING',_utf8mb4'APPROVED',_utf8mb4'REJECTED',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_promotions`
--

LOCK TABLES `student_promotions` WRITE;
/*!40000 ALTER TABLE `student_promotions` DISABLE KEYS */;
INSERT INTO `student_promotions` VALUES (1,1,2,2,1,1,1,1,3,4,'PENDING',NULL,NULL,NULL,'Failed in two subjects','2026-09-03 12:17:05',NULL,'2026-09-03 12:17:05',NULL,NULL,NULL,1,NULL,NULL,82.50,700.00,420.00,60.00,5,2,2,'FAILED','Failed in two subjects',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,1),(2,2,2,2,1,1,1,1,3,4,'PENDING',NULL,NULL,NULL,'Student detained','2026-09-03 12:17:05',NULL,'2026-09-03 12:17:05',NULL,NULL,NULL,1,NULL,NULL,58.00,700.00,480.00,68.57,7,0,0,'DETAINED','Student detained','DETAINED',NULL,NULL,NULL,NULL,NULL,0,NULL,1);
/*!40000 ALTER TABLE `student_promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_section_assignments`
--

DROP TABLE IF EXISTS `student_section_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_section_assignments` (
  `student_section_assignment_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `section_id` bigint NOT NULL,
  `academic_year_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` bigint DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `removed_by` bigint DEFAULT NULL,
  PRIMARY KEY (`student_section_assignment_id`),
  KEY `idx_ssa_student` (`student_id`),
  KEY `idx_ssa_section` (`section_id`),
  KEY `idx_ssa_academic_year` (`academic_year_id`),
  KEY `idx_ssa_status` (`status`),
  CONSTRAINT `fk_ssa_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `fk_ssa_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`),
  CONSTRAINT `fk_ssa_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_section_assignments`
--

LOCK TABLES `student_section_assignments` WRITE;
/*!40000 ALTER TABLE `student_section_assignments` DISABLE KEYS */;
INSERT INTO `student_section_assignments` VALUES (1,1,1,2,1,'2026-08-24 17:16:29',1,NULL,NULL),(2,2,1,2,1,'2026-08-24 17:16:29',1,NULL,NULL),(3,3,1,2,1,'2026-08-24 17:16:29',1,NULL,NULL);
/*!40000 ALTER TABLE `student_section_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_sections`
--

DROP TABLE IF EXISTS `student_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_sections` (
  `student_section_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `section_id` bigint NOT NULL,
  `academic_year_id` bigint NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`student_section_id`),
  KEY `fk_student_section_section` (`section_id`),
  KEY `fk_student_section_academic_year` (`academic_year_id`),
  CONSTRAINT `fk_student_section_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `fk_student_section_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_sections`
--

LOCK TABLES `student_sections` WRITE;
/*!40000 ALTER TABLE `student_sections` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `studentadmissions`
--

DROP TABLE IF EXISTS `studentadmissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `studentadmissions` (
  `AdmissionId` bigint NOT NULL AUTO_INCREMENT,
  `RegistrationNo` varchar(50) DEFAULT NULL,
  `RegistrationDate` date DEFAULT NULL,
  `ApplicationNo` varchar(50) DEFAULT NULL,
  `ApplicationDate` date DEFAULT NULL,
  `AdmissionNo` varchar(50) DEFAULT NULL,
  `AdmissionDate` date DEFAULT NULL,
  `AdmissionType` varchar(50) DEFAULT NULL,
  `AdmissionQuota` varchar(100) DEFAULT NULL,
  `Medium` varchar(50) DEFAULT NULL,
  `ScholarshipStatus` varchar(50) DEFAULT NULL,
  `FirstName` varchar(100) NOT NULL,
  `LastName` varchar(100) DEFAULT NULL,
  `Gender` enum('Male','Female','Other') NOT NULL,
  `DateOfBirth` date NOT NULL,
  `BloodGroup` varchar(10) DEFAULT NULL,
  `StudentPhoto` varchar(500) DEFAULT NULL,
  `Email` varchar(150) DEFAULT NULL,
  `StudentEmail` varchar(150) DEFAULT NULL,
  `MobileNumber` varchar(20) DEFAULT NULL,
  `AadhaarNumber` varchar(20) DEFAULT NULL,
  `Nationality` varchar(100) DEFAULT NULL,
  `Religion` varchar(100) DEFAULT NULL,
  `Category` varchar(100) DEFAULT NULL,
  `FatherName` varchar(150) DEFAULT NULL,
  `MotherName` varchar(150) DEFAULT NULL,
  `GuardianName` varchar(150) DEFAULT NULL,
  `Occupation` varchar(150) DEFAULT NULL,
  `AnnualIncome` decimal(15,2) DEFAULT NULL,
  `MotherEmail` varchar(150) DEFAULT NULL,
  `GuardianMobile` varchar(20) DEFAULT NULL,
  `GuardianEmail` varchar(150) DEFAULT NULL,
  `Address` text,
  `City` varchar(100) DEFAULT NULL,
  `District` varchar(100) DEFAULT NULL,
  `State` varchar(100) DEFAULT NULL,
  `Pincode` varchar(10) DEFAULT NULL,
  `BoardId` bigint DEFAULT NULL,
  `AcademicYearId` bigint DEFAULT NULL,
  `AcademicLevelId` bigint DEFAULT NULL,
  `GroupId` bigint DEFAULT NULL,
  `SectionId` bigint DEFAULT NULL,
  `SecondLanguage` varchar(100) DEFAULT NULL,
  `PreviousSchool` varchar(255) DEFAULT NULL,
  `PreviousBoard` varchar(150) DEFAULT NULL,
  `PreviousYear` varchar(20) DEFAULT NULL,
  `PreviousPercentage` decimal(5,2) DEFAULT NULL,
  `PreviousHallTicket` varchar(100) DEFAULT NULL,
  `BirthCertificate` varchar(500) DEFAULT NULL,
  `TransferCertificate` varchar(500) DEFAULT NULL,
  `StudyCertificate` varchar(500) DEFAULT NULL,
  `AadhaarDocument` varchar(500) DEFAULT NULL,
  `CommunityCertificate` varchar(500) DEFAULT NULL,
  `IncomeCertificate` varchar(500) DEFAULT NULL,
  `PassportPhoto` varchar(500) DEFAULT NULL,
  `MarksMemo` varchar(500) DEFAULT NULL,
  `CasteCertificate` varchar(500) DEFAULT NULL,
  `TenthCertificate` varchar(500) DEFAULT NULL,
  `Status` varchar(50) DEFAULT NULL,
  `AdmissionStatus` enum('Draft','Registered','Application Submitted','Under Review','Document Verification','Interview Scheduled','Interview Completed','Approved','Rejected','Waitlisted','Admission Offered','Fee Pending','Admitted','Cancelled','Withdrawn') NOT NULL DEFAULT 'Draft',
  `IsVerified` tinyint(1) NOT NULL DEFAULT '0',
  `IsApproved` tinyint(1) NOT NULL DEFAULT '0',
  `IsRejected` tinyint(1) NOT NULL DEFAULT '0',
  `SubmittedAt` datetime DEFAULT NULL,
  `ReviewedAt` datetime DEFAULT NULL,
  `ApprovedAt` datetime DEFAULT NULL,
  `RejectedAt` datetime DEFAULT NULL,
  `AdmittedAt` datetime DEFAULT NULL,
  `CancelledAt` datetime DEFAULT NULL,
  `WithdrawnAt` datetime DEFAULT NULL,
  `ReviewedBy` bigint DEFAULT NULL,
  `ApprovedBy` bigint DEFAULT NULL,
  `RejectedBy` bigint DEFAULT NULL,
  `CancelledBy` bigint DEFAULT NULL,
  `RejectionReason` varchar(500) DEFAULT NULL,
  `CancellationReason` varchar(500) DEFAULT NULL,
  `WithdrawalReason` varchar(500) DEFAULT NULL,
  `DocumentsVerified` tinyint(1) NOT NULL DEFAULT '0',
  `DocumentsVerifiedBy` bigint DEFAULT NULL,
  `DocumentsVerifiedAt` datetime DEFAULT NULL,
  `InterviewRequired` tinyint(1) NOT NULL DEFAULT '0',
  `InterviewDate` datetime DEFAULT NULL,
  `InterviewStatus` enum('Not Required','Scheduled','Completed','Passed','Failed') NOT NULL DEFAULT 'Not Required',
  `InterviewRemarks` text,
  `OfferDate` datetime DEFAULT NULL,
  `OfferExpiryDate` datetime DEFAULT NULL,
  `OfferAcceptedAt` datetime DEFAULT NULL,
  `AdmissionFeeAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `AdmissionFeePaid` tinyint(1) NOT NULL DEFAULT '0',
  `AdmissionFeePaidAt` datetime DEFAULT NULL,
  `WaitlistNumber` int DEFAULT NULL,
  `WaitlistedAt` datetime DEFAULT NULL,
  `Remarks` text,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `IsDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedBy` bigint DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedBy` bigint DEFAULT NULL,
  `UpdatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `DeletedBy` bigint DEFAULT NULL,
  `DeletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`AdmissionId`),
  UNIQUE KEY `UQ_StudentAdmissions_RegistrationNo` (`RegistrationNo`),
  UNIQUE KEY `UQ_StudentAdmissions_ApplicationNo` (`ApplicationNo`),
  UNIQUE KEY `UQ_StudentAdmissions_AdmissionNo` (`AdmissionNo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `studentadmissions`
--

LOCK TABLES `studentadmissions` WRITE;
/*!40000 ALTER TABLE `studentadmissions` DISABLE KEYS */;
INSERT INTO `studentadmissions` VALUES (1,'REG2026001','2026-06-01','APP2026001','2026-06-05','ADM2026001','2026-06-15','Regular','General','English','Not Applied','Aarav','Kumar','Male','2010-05-15','O+',NULL,'aarav.kumar@example.com','aarav.kumar@example.com','9876543210',NULL,'Indian','Hindu','General','Rajesh Kumar','Sunitha Kumar','Rajesh Kumar','Business',500000.00,'sunitha.kumar@example.com','9876543211','rajesh.kumar@example.com','Madhapur','Hyderabad','Ranga Reddy','Telangana','500081',NULL,2,NULL,NULL,1,'Hindi','ABC High School','SSC','2025-26',90.50,'SSC2025001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active','Approved',1,1,0,'2026-04-02 10:00:00','2026-04-04 11:00:00','2026-04-05 12:00:00',NULL,'2026-04-10 10:30:00',NULL,NULL,1,1,NULL,NULL,NULL,NULL,NULL,1,1,'2026-04-03 14:00:00',0,'2026-04-04 10:00:00','Passed','Student successfully completed the admission interview.','2026-04-05 15:00:00','2026-04-08 23:59:59','2026-04-06 11:00:00',25000.00,1,'2026-04-08 10:00:00',NULL,NULL,'Student admission details updated successfully.',1,0,1,'2026-09-01 08:08:42',1,'2026-09-01 04:11:13',NULL,NULL),(2,'REG2026002','2026-04-05','APP2026002','2026-04-05',NULL,NULL,'New Admission','Management','English','Pending','Priya','Sharma','Female','2014-09-20','B+','/uploads/students/priya.jpg','priya.parent@example.com','priya@example.com','9876543220','234567890123','Indian','Hindu','General','Rajesh Sharma','Anita Sharma','Rajesh Sharma','Business',1200000.00,'anita@example.com','9876543221','guardian.priya@example.com','Kondapur','Hyderabad','Ranga Reddy','Telangana','500084',1,1,2,1,2,'Telugu','Delhi Public School','CBSE','2025',89.00,'HT2025002','/documents/priya/birth_certificate.pdf',NULL,'/documents/priya/study_certificate.pdf','/documents/priya/aadhaar.pdf',NULL,NULL,'/documents/priya/passport_photo.jpg','/documents/priya/marks_memo.pdf',NULL,NULL,'Pending','Under Review',0,0,0,'2026-04-05 09:30:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,NULL,'Scheduled','Interview will be scheduled after document verification.',NULL,NULL,NULL,30000.00,0,NULL,NULL,NULL,'Application is currently under review.',1,0,1,'2026-09-01 08:08:42',NULL,'2026-09-01 08:08:42',NULL,NULL),(3,'REG2026003','2026-04-07','APP2026003','2026-04-08',NULL,NULL,'Transfer','General','English','Eligible','Arjun','Reddy','Male','2013-01-12','A+','/uploads/students/arjun.jpg','arjun.parent@example.com','arjun@example.com','9876543230','345678901234','Indian','Hindu','OBC','Srinivas Reddy','Lakshmi Reddy','Srinivas Reddy','Farmer',600000.00,'lakshmi@example.com','9876543231','guardian.arjun@example.com','Gachibowli','Hyderabad','Ranga Reddy','Telangana','500032',1,1,3,2,3,'Hindi','St. Mary School','State Board','2025',85.50,'HT2025003','/documents/arjun/birth_certificate.pdf','/documents/arjun/transfer_certificate.pdf','/documents/arjun/study_certificate.pdf','/documents/arjun/aadhaar.pdf','/documents/arjun/community_certificate.pdf','/documents/arjun/income_certificate.pdf','/documents/arjun/passport_photo.jpg','/documents/arjun/marks_memo.pdf','/documents/arjun/caste_certificate.pdf',NULL,'Pending Fee','Fee Pending',1,1,0,'2026-04-08 10:00:00','2026-04-09 11:00:00','2026-04-10 12:00:00',NULL,NULL,NULL,NULL,1,1,NULL,NULL,NULL,NULL,NULL,1,1,'2026-04-09 15:00:00',0,NULL,'Not Required',NULL,'2026-04-10 14:00:00','2026-04-15 23:59:59','2026-04-11 10:00:00',28000.00,0,NULL,NULL,NULL,'Admission approved. Waiting for fee payment.',1,0,1,'2026-09-01 08:08:42',1,'2026-09-01 08:08:42',NULL,NULL),(4,'REG2026004','2026-04-10','APP2026004','2026-04-10',NULL,NULL,'New Admission','General','English','Pending','Sneha','Patel','Female','2015-03-25','AB+','/uploads/students/sneha.jpg','sneha.parent@example.com','sneha@example.com','9876543240','456789012345','Indian','Hindu','General','Mahesh Patel','Kavitha Patel','Mahesh Patel','Accountant',750000.00,'kavitha@example.com','9876543241','guardian.sneha@example.com','Kukatpally','Hyderabad','Hyderabad','Telangana','500072',1,1,1,1,1,'Telugu','Little Flower School','CBSE','2025',91.00,'HT2025004','/documents/sneha/birth_certificate.pdf',NULL,'/documents/sneha/study_certificate.pdf','/documents/sneha/aadhaar.pdf',NULL,NULL,'/documents/sneha/passport_photo.jpg','/documents/sneha/marks_memo.pdf',NULL,NULL,'Waitlisted','Waitlisted',1,0,0,'2026-04-10 09:00:00','2026-04-11 11:00:00',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,1,1,'2026-04-11 13:00:00',1,'2026-04-12 10:00:00','Passed','Student qualified but seats are currently unavailable.',NULL,NULL,NULL,25000.00,0,NULL,5,'2026-04-12 15:00:00','Student placed on waiting list.',1,0,1,'2026-09-01 08:08:42',1,'2026-09-01 08:08:42',NULL,NULL),(5,'REG2026005','2026-04-12','APP2026005','2026-04-12',NULL,NULL,'New Admission','General','English','Not Eligible','Kiran','Verma','Male','2012-11-05','B-','/uploads/students/kiran.jpg','kiran.parent@example.com','kiran@example.com','9876543250','567890123456','Indian','Hindu','General','Vijay Verma','Sujatha Verma','Vijay Verma','Private Employee',500000.00,'sujatha@example.com','9876543251','guardian.kiran@example.com','Miyapur','Hyderabad','Ranga Reddy','Telangana','500049',1,1,4,2,4,'Hindi','XYZ High School','State Board','2025',65.00,'HT2025005','/documents/kiran/birth_certificate.pdf',NULL,NULL,'/documents/kiran/aadhaar.pdf',NULL,NULL,'/documents/kiran/passport_photo.jpg','/documents/kiran/marks_memo.pdf',NULL,NULL,'Rejected','Rejected',0,0,1,'2026-04-12 09:30:00','2026-04-13 10:00:00',NULL,'2026-04-14 14:00:00',NULL,NULL,NULL,1,NULL,1,NULL,'Required eligibility criteria were not met.',NULL,NULL,0,NULL,NULL,0,NULL,'Not Required',NULL,NULL,NULL,NULL,0.00,0,NULL,NULL,NULL,'Admission application rejected after review.',0,0,1,'2026-09-01 08:08:42',1,'2026-09-01 08:08:42',NULL,NULL),(6,'REG2026010','2026-09-01','APP2026010','2026-09-01',NULL,NULL,'New Admission','General','English','Pending','Aarav','Rao','Male','2015-08-10','O+',NULL,NULL,'aarav.rao@example.com','9876543299',NULL,'Indian',NULL,NULL,'Ramesh Rao','Sujatha Rao',NULL,NULL,NULL,NULL,NULL,NULL,'Madhapur','Hyderabad','Ranga Reddy','Telangana','500081',NULL,2,1,NULL,1,NULL,'ABC Public School','CBSE','2025',88.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active','Draft',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,NULL,'Not Required',NULL,NULL,NULL,NULL,25000.00,0,NULL,NULL,NULL,'New registration created through API.',1,0,1,'2026-09-01 03:10:42',NULL,'2026-09-01 03:10:42',NULL,NULL);
/*!40000 ALTER TABLE `studentadmissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `student_id` bigint NOT NULL AUTO_INCREMENT,
  `admission_id` bigint DEFAULT NULL,
  `college_id` bigint NOT NULL,
  `student_code` varchar(50) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `course_id` bigint DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  `academic_year_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `uq_students_student_code` (`student_code`),
  KEY `idx_students_college` (`college_id`),
  KEY `idx_students_academic_year` (`academic_year_id`),
  KEY `idx_students_course` (`course_id`),
  KEY `idx_students_branch` (`branch_id`),
  KEY `idx_students_status` (`status`),
  KEY `idx_students_admission_id` (`admission_id`),
  CONSTRAINT `fk_students_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academicyears` (`academic_year_id`),
  CONSTRAINT `fk_students_admission` FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_students_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,1,1,'STU001','Aarav Kumar','Male','2005-05-15','aarav@example.com','9000000001','O+','Hyderabad, Telangana',1,1,2,1,'2026-08-24 22:36:41',1,'2026-09-02 17:45:22',NULL,NULL,NULL),(2,NULL,1,'STU002','Diya Sharma','Female','2005-08-20','diya@example.com','9000000002','A+','Vijayawada, Andhra Pradesh',1,1,2,1,'2026-08-24 22:36:41',1,'2026-09-01 11:48:26',NULL,NULL,NULL),(3,NULL,1,'STU003','Arjun Reddy','Male','2004-12-10','arjun@example.com','9000000003','B+','Guntur, Andhra Pradesh',1,1,2,1,'2026-08-24 22:36:41',1,'2026-09-01 11:48:26',NULL,NULL,NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subject_semester_assignments`
--

DROP TABLE IF EXISTS `subject_semester_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_semester_assignments` (
  `subject_semester_assignment_id` bigint NOT NULL AUTO_INCREMENT,
  `subject_id` bigint NOT NULL,
  `semester_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`subject_semester_assignment_id`),
  UNIQUE KEY `uq_subject_semester` (`subject_id`,`semester_id`),
  KEY `idx_ssa_subject_id` (`subject_id`),
  KEY `idx_ssa_semester_id` (`semester_id`),
  KEY `idx_ssa_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subject_semester_assignments`
--

LOCK TABLES `subject_semester_assignments` WRITE;
/*!40000 ALTER TABLE `subject_semester_assignments` DISABLE KEYS */;
INSERT INTO `subject_semester_assignments` VALUES (1,1,1,1,'2026-08-25 23:51:46',1,NULL,NULL),(2,2,1,1,'2026-08-25 23:51:46',1,NULL,NULL),(3,3,1,1,'2026-08-25 23:51:46',1,NULL,NULL),(4,4,2,1,'2026-08-25 23:51:46',1,NULL,NULL),(5,5,2,1,'2026-08-25 23:51:46',1,NULL,NULL);
/*!40000 ALTER TABLE `subject_semester_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_role_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `removed_by` bigint DEFAULT NULL,
  PRIMARY KEY (`user_role_id`),
  UNIQUE KEY `uq_user_roles_user_role` (`user_id`,`role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_role_id` (`role_id`),
  KEY `idx_user_roles_status` (`status`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,1,1,'2026-06-01 09:30:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(2,2,2,1,'2026-06-01 09:35:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(3,3,3,1,'2026-06-01 09:40:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(4,4,4,1,'2026-06-01 09:45:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(5,5,5,1,'2026-06-01 09:50:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(6,6,6,1,'2026-06-01 10:00:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(7,7,6,1,'2026-06-01 10:05:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(8,8,6,1,'2026-06-01 10:10:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL),(9,3,2,1,'2026-06-01 11:00:00',NULL,'2026-08-19 16:07:46',NULL,NULL,NULL);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `college_id` bigint DEFAULT NULL,
  `employee_user_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_employee_user_id` (`employee_user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_mobile` (`mobile`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_deleted_at` (`deleted_at`),
  KEY `idx_users_college_id` (`college_id`),
  CONSTRAINT `fk_users_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'ADM001','Dr. Rajesh Kumar Updated','cheedellayagnasri@gmail.com','9876501099','$2a$11$BvFhATEx9fnazfCMKPZNmurl/aCJS1N/IqW8TR2c9jkKuAuS7BX9m',1,'2026-09-03 17:59:46','2026-06-01 09:30:00',NULL,'2026-09-03 23:29:46',1,NULL,NULL),(2,1,'ADM002','Suresh Reddy','suresh.reddy@btechcollege.edu.in','9876501002','$2a$11$tUoAVhLuDMVtIwB15hnErOd7CzAZp4DOwaXmaCKG9A63Wsk332Ggq',1,'2026-09-03 11:02:11','2026-06-01 09:35:00',NULL,'2026-09-03 16:32:10',NULL,NULL,NULL),(3,1,'PRN001','Dr. Anitha Sharma','anitha.sharma@btechcollege.edu.in','9876501003','DEMO_HASH_PRINCIPAL_001',1,'2026-08-19 09:00:00','2026-06-01 09:40:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(4,1,'HOD001','Dr. Ravi Kumar','ravi.kumar@btechcollege.edu.in','9876501004','DEMO_HASH_HOD_001',1,'2026-08-19 09:05:00','2026-06-01 09:45:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(5,1,'FAC001','Priya Nair','priya.nair@btechcollege.edu.in','9876501005','$2a$11$rrx688SgHdQcOgYFq0l5eeMyJmreObd4jgOh.k26ApEb7JpUgt0pq',1,'2026-08-24 04:19:43','2026-06-01 09:50:00',NULL,'2026-08-24 09:49:43',NULL,NULL,NULL),(6,1,'STU2026001','Arjun Reddy','arjun.reddy@student.btechcollege.edu.in','9876502001','DEMO_HASH_STUDENT_001',1,'2026-08-19 09:20:00','2026-06-01 10:00:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(7,1,'STU2026002','Sneha Rao','sneha.rao@student.btechcollege.edu.in','9876502002','DEMO_HASH_STUDENT_002',1,NULL,'2026-06-01 10:05:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(8,1,'STU2026003','Kiran Kumar','kiran.kumar@student.btechcollege.edu.in','9876502003','DEMO_HASH_STUDENT_003',1,NULL,'2026-06-01 10:10:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_users_with_roles`
--

DROP TABLE IF EXISTS `vw_users_with_roles`;
/*!50001 DROP VIEW IF EXISTS `vw_users_with_roles`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_users_with_roles` AS SELECT 
 1 AS `user_id`,
 1 AS `college_id`,
 1 AS `employee_user_id`,
 1 AS `full_name`,
 1 AS `email`,
 1 AS `mobile`,
 1 AS `password_hash`,
 1 AS `role`,
 1 AS `status`,
 1 AS `last_login_at`,
 1 AS `created_at`,
 1 AS `created_by`,
 1 AS `updated_at`,
 1 AS `updated_by`,
 1 AS `deleted_at`,
 1 AS `deleted_by`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'cms_btech'
--

--
-- Dumping routines for database 'cms_btech'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicLevel` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicLevel`(
    IN p_action VARCHAR(20),
    IN p_academic_level_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_level_name VARCHAR(100),
    IN p_level_type VARCHAR(20),
    IN p_level_number INT,
    IN p_status TINYINT
)
BEGIN

    IF p_action = 'ADD' THEN

        INSERT INTO academic_levels
        (
            academic_year_id,
            level_name,
            level_type,
            level_number,
            status,
            created_at
        )
        VALUES
        (
            p_academic_year_id,
            p_level_name,
            p_level_type,
            p_level_number,
            p_status,
            NOW()
        );

    ELSEIF p_action = 'LIST' THEN

        SELECT *
        FROM academic_levels
        ORDER BY level_type, level_number;
    ELSEIF p_action = 'GET' THEN
        SELECT *
        FROM academic_levels
        WHERE academic_level_id = p_academic_level_id;

    ELSEIF p_action = 'UPDATE' THEN

        UPDATE academic_levels
        SET
            academic_year_id = p_academic_year_id,
            level_name = p_level_name,
            level_type = p_level_type,
            level_number = p_level_number,
            status = p_status
        WHERE academic_level_id = p_academic_level_id;

    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Activate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Activate`(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        START TRANSACTION;

        UPDATE academicyears
        SET status = 0,
            is_archived = 1,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id <> p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL;

        UPDATE academicyears
        SET status = 1,
            is_archived = 0,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL;

        COMMIT;

        SELECT * FROM academicyears
        WHERE academic_year_id = p_academic_year_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Add` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Add`(
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_created_by BIGINT
)
BEGIN
    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE deleted_at IS NULL
          AND NOT (p_end_date < start_date OR p_start_date > end_date)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year dates overlap an existing academic year.';
    END IF;

    -- New records are upcoming. Activate only through the activate operation.
    INSERT INTO academicyears (
        academic_year_name, start_date, end_date, status, is_archived,
        created_at, created_by
    ) VALUES (
        TRIM(p_academic_year_name), p_start_date, p_end_date, 0, 0,
        UTC_TIMESTAMP(), p_created_by
    );

    SELECT * FROM academicyears WHERE academic_year_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Archive` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Archive`(

    IN p_academic_year_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN

    UPDATE academicyears

    SET

        is_archived = 1,

        status = 0,

        updated_at = NOW(),

        updated_by = p_updated_by

    WHERE academic_year_id = p_academic_year_id

      AND deleted_at IS NULL

      AND is_archived = 0;
 
    IF ROW_COUNT() = 0 THEN

        SELECT *

        FROM academicyears

        WHERE 1 = 0;

    ELSE

        SELECT *

        FROM academicyears

        WHERE academic_year_id = p_academic_year_id;

    END IF;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Dashboard` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Dashboard`(
    IN p_search VARCHAR(100),
    IN p_filter VARCHAR(20)
)
BEGIN

    /* 1. Active Academic Year */
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND status = 1
      AND is_archived = 0
    ORDER BY start_date DESC
    LIMIT 1;


    /* 2. Dashboard Counts */
    SELECT
        COUNT(*) AS total_academic_years,

        SUM(
            CASE
                WHEN status = 1 AND is_archived = 0
                THEN 1 ELSE 0
            END
        ) AS active_years,

        SUM(
            CASE
                WHEN status = 0 AND is_archived = 0
                THEN 1 ELSE 0
            END
        ) AS upcoming_years,

        SUM(
            CASE
                WHEN is_archived = 1
                THEN 1 ELSE 0
            END
        ) AS archived_years

    FROM academicyears
    WHERE deleted_at IS NULL;


    /* 3. Academic Year Register */
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL

      AND (
            p_search IS NULL
            OR TRIM(p_search) = ''
            OR academic_year_name
                LIKE CONCAT('%', TRIM(p_search), '%')
          )

      AND (
            p_filter IS NULL
            OR TRIM(p_filter) = ''
            OR LOWER(TRIM(p_filter)) = 'all'

            OR (
                LOWER(TRIM(p_filter)) = 'active'
                AND status = 1
                AND is_archived = 0
            )

            OR (
                LOWER(TRIM(p_filter)) = 'upcoming'
                AND status = 0
                AND is_archived = 0
            )

            OR (
                LOWER(TRIM(p_filter)) = 'archived'
                AND is_archived = 1
            )
          )

    ORDER BY start_date DESC;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Deactivate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Deactivate`(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 0,
        is_archived = 1,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;

    SELECT * FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Edit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Edit`(
    IN p_academic_year_id BIGINT,
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND academic_year_id <> p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    UPDATE academicyears
    SET academic_year_name = TRIM(p_academic_year_name),
        start_date = p_start_date,
        end_date = p_end_date,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id;

    SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_GenerateNext` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_GenerateNext`(
    IN p_activate_immediately TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_last_year_name VARCHAR(50);
    DECLARE v_last_start_date DATE;
    DECLARE v_last_end_date DATE;

    DECLARE v_new_start_date DATE;
    DECLARE v_new_end_date DATE;

    DECLARE v_start_year INT;
    DECLARE v_end_year INT;

    DECLARE v_new_year_name VARCHAR(50);
    DECLARE v_new_id BIGINT;

    /* Get latest academic year */
    SELECT
        academic_year_name,
        start_date,
        end_date
    INTO
        v_last_year_name,
        v_last_start_date,
        v_last_end_date
    FROM academicyears
    WHERE deleted_at IS NULL
    ORDER BY end_date DESC
    LIMIT 1;

    /* If no academic year exists */
    IF v_last_start_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No academic year available to generate next year.';
    END IF;

    /* Generate next dates */
    SET v_new_start_date = DATE_ADD(v_last_start_date, INTERVAL 1 YEAR);
    SET v_new_end_date = DATE_ADD(v_last_end_date, INTERVAL 1 YEAR);

    SET v_start_year = YEAR(v_new_start_date);
    SET v_end_year = YEAR(v_new_end_date);

    /* Example: 2029-30 */
    SET v_new_year_name =
        CONCAT(
            v_start_year,
            '-',
            RIGHT(v_end_year, 2)
        );

    /* Prevent duplicate */
    IF EXISTS(
        SELECT 1
        FROM academicyears
        WHERE academic_year_name = v_new_year_name
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Next academic year already exists.';
    END IF;

    /* If activateImmediately = 1,
       deactivate current active year */
    IF p_activate_immediately = 1 THEN

        UPDATE academicyears
        SET
            status = 0,
            is_archived = 1,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_created_by
        WHERE status = 1
          AND deleted_at IS NULL;

    END IF;

    /* Insert generated year */
    INSERT INTO academicyears
    (
        academic_year_name,
        start_date,
        end_date,
        status,
        is_archived,
        created_at,
        created_by
    )
    VALUES
    (
        v_new_year_name,
        v_new_start_date,
        v_new_end_date,

        CASE
            WHEN p_activate_immediately = 1
            THEN 1
            ELSE 0
        END,

        0,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_new_id = LAST_INSERT_ID();

    /* Return generated academic year */
    SELECT *
    FROM academicyears
    WHERE academic_year_id = v_new_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_GetById`(
    IN p_academic_year_id BIGINT
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_List` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_List`(
    IN p_search VARCHAR(100),
    IN p_filter VARCHAR(20)
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR academic_year_name LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
            p_filter IS NULL OR TRIM(p_filter) = '' OR LOWER(TRIM(p_filter)) = 'all'
         OR (LOWER(TRIM(p_filter)) = 'active' AND status = 1 AND is_archived = 0)
         OR (LOWER(TRIM(p_filter)) = 'upcoming' AND status = 0 AND is_archived = 0)
         OR (LOWER(TRIM(p_filter)) = 'archived' AND is_archived = 1)
      )
    ORDER BY start_date DESC, academic_year_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_assign_college_to_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_assign_college_to_user`(
    IN p_user_id BIGINT,
    IN p_college_setting_id BIGINT,
    IN p_assigned_by BIGINT
)
BEGIN

    DECLARE v_mapping_id BIGINT DEFAULT NULL;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_college_exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_user_exists
    FROM users
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_user_exists = 0 THEN

        SELECT
            FALSE AS success,
            'User not found or inactive.' AS message;

    ELSE

        SELECT COUNT(*)
        INTO v_college_exists
        FROM college_settings
        WHERE college_setting_id = p_college_setting_id
          AND status = 1;

        IF v_college_exists = 0 THEN

            SELECT
                FALSE AS success,
                'College not found or inactive.' AS message;

        ELSE

            SELECT college_user_mapping_id
            INTO v_mapping_id
            FROM college_user_mappings
            WHERE user_id = p_user_id
              AND college_setting_id = p_college_setting_id
            LIMIT 1;

            IF v_mapping_id IS NOT NULL THEN

                UPDATE college_user_mappings
                SET
                    status = 1,
                    assigned_at = CURRENT_TIMESTAMP,
                    assigned_by = p_assigned_by,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = p_assigned_by,
                    removed_at = NULL,
                    removed_by = NULL
                WHERE college_user_mapping_id = v_mapping_id;

            ELSE

                INSERT INTO college_user_mappings
                (
                    user_id,
                    college_setting_id,
                    status,
                    assigned_at,
                    assigned_by
                )
                VALUES
                (
                    p_user_id,
                    p_college_setting_id,
                    1,
                    CURRENT_TIMESTAMP,
                    p_assigned_by
                );

            END IF;

            SELECT
                TRUE AS success,
                'College mapped to user successfully.' AS message;

        END IF;

    END IF;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_create`(
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM courses
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM(p_branch_code))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    INSERT INTO branches (
        course_id, branch_code, branch_name, short_name, specialization,
        department_id, branch_type, duration, total_semesters,
        intake_capacity, starting_academic_year_id, description,
        status, created_at, created_by
    ) VALUES (
        p_course_id, UPPER(TRIM(p_branch_code)), TRIM(p_branch_name),
        p_short_name, p_specialization, p_department_id, p_branch_type,
        p_duration, p_total_semesters, p_intake_capacity,
        p_starting_academic_year_id, p_description,
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_delete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_delete`(
    IN p_branch_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE branches
    SET status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_get_all`()
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.deleted_at IS NULL
    ORDER BY b.branch_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_get_by_course` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_get_by_course`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.course_id = p_course_id
      AND b.deleted_at IS NULL
    ORDER BY b.branch_name, b.branch_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_get_by_id`(
    IN p_branch_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_branch_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_branch_update`(
    IN p_branch_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM(p_branch_code))
          AND branch_id <> p_branch_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    UPDATE branches
    SET course_id = p_course_id,
        branch_code = UPPER(TRIM(p_branch_code)),
        branch_name = TRIM(p_branch_name),
        short_name = p_short_name,
        specialization = p_specialization,
        department_id = p_department_id,
        branch_type = p_branch_type,
        duration = p_duration,
        total_semesters = p_total_semesters,
        intake_capacity = p_intake_capacity,
        starting_academic_year_id = p_starting_academic_year_id,
        description = p_description,
        status = COALESCE(p_status, status),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_change_user_password` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_change_user_password`(
    IN p_user_id BIGINT,
    IN p_new_password_hash VARCHAR(255)
)
BEGIN
    UPDATE users
    SET
        password_hash = p_new_password_hash,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_CodeExists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_CodeExists`(
    IN p_college_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR college_id <> p_exclude_id)
    ) AS code_exists;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_Create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_Create`(
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_college_code IS NULL OR TRIM(p_college_code) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code is required.';
    END IF;

    IF p_college_name IS NULL OR TRIM(p_college_name) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College name is required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code already exists.';
    END IF;

    IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
       AND TRIM(p_accreditation_status) NOT IN (
           'Accredited', 'Not Accredited', 'Under Review', 'Expired'
       ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid accreditation status.';
    END IF;

    IF p_valid_from IS NOT NULL
       AND p_valid_until IS NOT NULL
       AND p_valid_until < p_valid_from THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
    END IF;

    INSERT INTO colleges (
        college_code, college_name, college_type, university_name,
        email, mobile, phone, principal, principal_email,
        principal_contact, alternate_contact_number,
        accreditation_status, accreditation_body, accreditation_grade,
        accreditation_number, valid_from, valid_until,
        address_line1, address_line2, city, area, district,
        state, country, pincode, website, academic_year_id,
        timezone, currency_code, logo_path, status, created_at, created_by
    ) VALUES (
        UPPER(TRIM(p_college_code)), TRIM(p_college_name), p_college_type,
        p_university_name, p_email, p_mobile, p_phone, p_principal,
        p_principal_email, p_principal_contact, p_alternate_contact_number,
        NULLIF(TRIM(p_accreditation_status), ''), p_accreditation_body, p_accreditation_grade,
        p_accreditation_number, p_valid_from, p_valid_until,
        p_address_line1, p_address_line2, p_city, p_area, p_district,
        p_state, p_country, p_pincode, p_website, p_academic_year_id,
        COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Kolkata'),
        COALESCE(NULLIF(TRIM(p_currency_code), ''), 'INR'),
        p_logo_path, COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT *
    FROM colleges
    WHERE college_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_Delete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_Delete`(
    IN p_college_id BIGINT,
    IN p_deleted_by BIGINT
)
main_block: BEGIN
    DECLARE v_affected_rows INT DEFAULT 0;

    -- Roll back all changes if any statement fails.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate the College/Institution master record.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SELECT
            0 AS Deleted,
            'College not found or already deleted.' AS Message;

        LEAVE main_block;
    END IF;

    START TRANSACTION;

    -- Soft-delete the College/Institution master.
    UPDATE colleges
    SET
        status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;

    SET v_affected_rows = ROW_COUNT();

    -- Deactivate the connected College Settings record.
    UPDATE college_settings
    SET
        status = 0,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE college_id = p_college_id;

    -- Deactivate active user-college mappings.
    UPDATE college_user_mappings mapping_record

    INNER JOIN college_settings setting_record
        ON setting_record.college_setting_id =
           mapping_record.college_setting_id

    SET
        mapping_record.status = 0,
        mapping_record.removed_at = UTC_TIMESTAMP(),
        mapping_record.removed_by = p_deleted_by,
        mapping_record.updated_at = UTC_TIMESTAMP(),
        mapping_record.updated_by = p_deleted_by

    WHERE setting_record.college_id = p_college_id
      AND mapping_record.status = 1;

    COMMIT;

    SELECT
        CASE
            WHEN v_affected_rows > 0 THEN 1
            ELSE 0
        END AS Deleted,

        CASE
            WHEN v_affected_rows > 0
                THEN 'College deleted successfully.'
            ELSE 'College could not be deleted.'
        END AS Message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_GetAll` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_GetAll`(
    IN p_search VARCHAR(200),
    IN p_status TINYINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_search), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR university_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR city LIKE CONCAT('%', TRIM(p_search), '%')
      )
    ORDER BY college_name, college_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_GetByCode` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_GetByCode`(
    IN p_college_code VARCHAR(50)
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_code = TRIM(p_college_code)
      AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_GetById`(
    IN p_college_id BIGINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_Search` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_Search`(
    IN p_query VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_status TINYINT,
    IN p_page_number INT,
    IN p_page_size INT,
    IN p_sort_by VARCHAR(50),
    IN p_sort_direction VARCHAR(10)
)
BEGIN
    DECLARE v_page INT DEFAULT 1;
    DECLARE v_size INT DEFAULT 10;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page = GREATEST(COALESCE(p_page_number, 1), 1);
    SET v_size = LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100);
    SET v_offset = (v_page - 1) * v_size;

    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (p_college_type IS NULL OR TRIM(p_college_type) = '' OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%'))
      AND (p_university_name IS NULL OR TRIM(p_university_name) = '' OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%'))
      AND (p_city IS NULL OR TRIM(p_city) = '' OR city LIKE CONCAT('%', TRIM(p_city), '%'))
      AND (p_state IS NULL OR TRIM(p_state) = '' OR state LIKE CONCAT('%', TRIM(p_state), '%'))
      AND (
            p_query IS NULL OR TRIM(p_query) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
         OR email LIKE CONCAT('%', TRIM(p_query), '%')
         OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
      )
    ORDER BY
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'collegecode' THEN college_code END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'collegecode' THEN college_code END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'city' THEN city END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'city' THEN city END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'status' THEN status END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'status' THEN status END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'createdat' THEN created_at END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'createdat' THEN created_at END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(COALESCE(p_sort_by, 'collegename')) = 'collegename' THEN college_name END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(COALESCE(p_sort_by, 'collegename')) = 'collegename' THEN college_name END ASC,
        college_id DESC
    LIMIT v_offset, v_size;

    SELECT COUNT(*) AS total_count
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (p_college_type IS NULL OR TRIM(p_college_type) = '' OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%'))
      AND (p_university_name IS NULL OR TRIM(p_university_name) = '' OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%'))
      AND (p_city IS NULL OR TRIM(p_city) = '' OR city LIKE CONCAT('%', TRIM(p_city), '%'))
      AND (p_state IS NULL OR TRIM(p_state) = '' OR state LIKE CONCAT('%', TRIM(p_state), '%'))
      AND (
            p_query IS NULL OR TRIM(p_query) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
         OR email LIKE CONCAT('%', TRIM(p_query), '%')
         OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
      );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_college_settings_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_college_settings_create`(
    IN p_college_id BIGINT,
    IN p_college_email VARCHAR(150),
    IN p_phone_number VARCHAR(20),
    IN p_website VARCHAR(200),
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_semester VARCHAR(50),
    IN p_institution_type VARCHAR(100),
    IN p_date_format VARCHAR(30),
    IN p_time_zone VARCHAR(100),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    -- Confirm the college exists in the master.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College not found in College/Institution master.';
    END IF;

    -- Only one Settings row is allowed per college.
    IF EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_id = p_college_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings already exist for this college.';
    END IF;

    -- Name and code are selected directly from colleges.
    INSERT INTO college_settings
    (
        college_id,
        college_name,
        college_code,
        college_email,
        phone_number,
        website,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        academic_year,
        semester,
        institution_type,
        date_format,
        time_zone,
        status,
        created_by
    )
    SELECT
        c.college_id,
        c.college_name,
        c.college_code,
        p_college_email,
        p_phone_number,
        p_website,
        p_address_line1,
        p_address_line2,
        p_city,
        p_state,
        p_pincode,
        p_academic_year,
        p_semester,
        p_institution_type,

        COALESCE(
            NULLIF(p_date_format, ''),
            'dd-MM-yyyy'
        ),

        COALESCE(
            NULLIF(p_time_zone, ''),
            'Asia/Kolkata'
        ),

        COALESCE(
            p_status,
            1
        ),

        p_created_by

    FROM colleges c

    WHERE c.college_id = p_college_id
      AND c.deleted_at IS NULL;

    -- Return the newly created Settings record.
    CALL sp_college_settings_get_by_id(
        LAST_INSERT_ID()
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_college_settings_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_college_settings_get_all`()
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- College identity comes from the master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        -- Settings-specific information
        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE c.deleted_at IS NULL

    ORDER BY
        c.college_name,
        c.college_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_college_settings_get_by_college` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_college_settings_get_by_college`(
    IN p_college_id BIGINT
)
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- Name and code come from the master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE cs.college_id = p_college_id

      AND c.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_college_settings_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_college_settings_get_by_id`(
    IN p_college_setting_id BIGINT
)
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- Identity comes from the College/Institution master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE cs.college_setting_id =
          p_college_setting_id

      AND c.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_college_settings_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_college_settings_update`(
    IN p_college_setting_id BIGINT,
    IN p_college_id BIGINT,
    IN p_college_email VARCHAR(150),
    IN p_phone_number VARCHAR(20),
    IN p_website VARCHAR(200),
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_semester VARCHAR(50),
    IN p_institution_type VARCHAR(100),
    IN p_date_format VARCHAR(30),
    IN p_time_zone VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    -- Confirm that the Settings record exists.
    IF NOT EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_setting_id =
              p_college_setting_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings record not found.';
    END IF;

    -- Confirm that the supplied college exists in the master.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College not found in College/Institution master.';
    END IF;

    -- Prevent another Settings record from using the same college.
    IF EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_id = p_college_id
          AND college_setting_id <>
              p_college_setting_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings already exist for this college.';
    END IF;

    UPDATE college_settings cs

    INNER JOIN colleges c
        ON c.college_id = p_college_id

    SET
        -- Master mapping
        cs.college_id =
            c.college_id,

        -- Always synchronize identity from the master
        cs.college_name =
            c.college_name,

        cs.college_code =
            c.college_code,

        -- Settings-specific fields
        cs.college_email =
            p_college_email,

        cs.phone_number =
            p_phone_number,

        cs.website =
            p_website,

        cs.address_line1 =
            p_address_line1,

        cs.address_line2 =
            p_address_line2,

        cs.city =
            p_city,

        cs.state =
            p_state,

        cs.pincode =
            p_pincode,

        cs.academic_year =
            p_academic_year,

        cs.semester =
            p_semester,

        cs.institution_type =
            p_institution_type,

        cs.date_format =
            COALESCE(
                NULLIF(p_date_format, ''),
                'dd-MM-yyyy'
            ),

        cs.time_zone =
            COALESCE(
                NULLIF(p_time_zone, ''),
                'Asia/Kolkata'
            ),

        cs.status =
            COALESCE(
                p_status,
                1
            ),

        cs.updated_by =
            p_updated_by,

        cs.updated_at =
            UTC_TIMESTAMP()

    WHERE cs.college_setting_id =
          p_college_setting_id;

    -- Return the updated Settings record.
    CALL sp_college_settings_get_by_id(
        p_college_setting_id
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_Update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_Update`(
    IN p_college_id BIGINT,
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM colleges WHERE 1 = 0;
    ELSE
        IF EXISTS (
            SELECT 1 FROM colleges
            WHERE college_code = TRIM(p_college_code)
              AND college_id <> p_college_id
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'College code already exists.';
        END IF;

        IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
           AND TRIM(p_accreditation_status) NOT IN (
               'Accredited', 'Not Accredited', 'Under Review', 'Expired'
           ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid accreditation status.';
        END IF;

        IF p_valid_from IS NOT NULL
           AND p_valid_until IS NOT NULL
           AND p_valid_until < p_valid_from THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
        END IF;

        UPDATE colleges
        SET college_code = UPPER(TRIM(p_college_code)),
            college_name = TRIM(p_college_name),
            college_type = p_college_type,
            university_name = p_university_name,
            email = p_email,
            mobile = p_mobile,
            phone = p_phone,
            principal = p_principal,
            principal_email = p_principal_email,
            principal_contact = p_principal_contact,
            alternate_contact_number = p_alternate_contact_number,
            accreditation_status = NULLIF(TRIM(p_accreditation_status), ''),
            accreditation_body = p_accreditation_body,
            accreditation_grade = p_accreditation_grade,
            accreditation_number = p_accreditation_number,
            valid_from = p_valid_from,
            valid_until = p_valid_until,
            address_line1 = p_address_line1,
            address_line2 = p_address_line2,
            city = p_city,
            area = p_area,
            district = p_district,
            state = p_state,
            country = p_country,
            pincode = p_pincode,
            website = p_website,
            academic_year_id = p_academic_year_id,
            timezone = COALESCE(NULLIF(TRIM(p_timezone), ''), timezone),
            currency_code = COALESCE(NULLIF(TRIM(p_currency_code), ''), currency_code),
            logo_path = p_logo_path,
            status = COALESCE(p_status, status),
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE college_id = p_college_id;

        SELECT *
        FROM colleges
        WHERE college_id = p_college_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_College_UpdateStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_College_UpdateStatus`(
    IN p_college_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE colleges
    SET status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;

    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_Add` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CourseSemesterMapping_Add`(
    IN p_course_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1     
        FROM course_semester_mappings
        WHERE course_id = p_course_id
          AND semester_id = p_semester_id
          AND status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is already mapped to this semester.';
    END IF;

    INSERT INTO course_semester_mappings
    (
        course_id,
        semester_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_semester_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM course_semester_mappings
    WHERE course_semester_mapping_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_Edit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CourseSemesterMapping_Edit`(
    IN p_course_semester_mapping_id BIGINT,
    IN p_course_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM course_semester_mappings
        WHERE course_semester_mapping_id =
              p_course_semester_mapping_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course semester mapping not found.';
    END IF;

    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM course_semester_mappings
        WHERE course_id = p_course_id
          AND semester_id = p_semester_id
          AND course_semester_mapping_id <>
              p_course_semester_mapping_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is already mapped to this semester.';
    END IF;

    UPDATE course_semester_mappings
    SET
        course_id = p_course_id,
        semester_id = p_semester_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE course_semester_mapping_id =
          p_course_semester_mapping_id;

    CALL sp_CourseSemesterMapping_GetById(
        p_course_semester_mapping_id
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CourseSemesterMapping_GetById`(
    IN p_course_semester_mapping_id BIGINT
)
BEGIN
    SELECT
        course_semester_mapping_id,
        course_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM course_semester_mappings
    WHERE course_semester_mapping_id =
          p_course_semester_mapping_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_List` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CourseSemesterMapping_List`()
BEGIN
    SELECT
        course_semester_mapping_id,
        course_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM course_semester_mappings
    ORDER BY course_id ASC, semester_id ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_code_exists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_code_exists`(
    IN p_course_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR course_id <> p_exclude_id)
    ) AS code_exists;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_create`(
    IN p_college_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_code VARCHAR(50),
    IN p_course_name VARCHAR(150),
    IN p_course_short_name VARCHAR(50),
    IN p_course_type VARCHAR(50),
    IN p_duration_years INT,
    IN p_total_semesters INT,
    IN p_eligibility VARCHAR(255),
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College not found.';
    END IF;

    IF p_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM departments
        WHERE department_id = p_department_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    IF p_duration_years <= 0 OR p_total_semesters <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duration and total semesters must be greater than zero.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    INSERT INTO courses (
        college_id, department_id, course_code, course_name,
        course_short_name, course_type, duration_years, total_semesters,
        eligibility, description, status, created_at, created_by
    ) VALUES (
        p_college_id, p_department_id, UPPER(TRIM(p_course_code)),
        TRIM(p_course_name), p_course_short_name, p_course_type,
        p_duration_years, p_total_semesters, p_eligibility, p_description,
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_get_all`(
    IN p_search VARCHAR(200),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_college_id IS NULL OR c.college_id = p_college_id)
      AND (p_department_id IS NULL OR c.department_id = p_department_id)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR c.course_code LIKE CONCAT('%', TRIM(p_search), '%')
         OR c.course_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR c.course_short_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR d.department_name LIKE CONCAT('%', TRIM(p_search), '%')
      )
    ORDER BY c.course_name, c.course_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_get_by_id`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_create`(
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO course_structures
    (
        course_id,
        branch_id,
        year_number,
        semester_number,
        semester_name,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_branch_id,
        p_year_number,
        p_semester_number,
        p_semester_name,
        p_created_by
    );

    SELECT *
    FROM course_structures
    WHERE structure_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_delete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_delete`(
    IN p_structure_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        status = 0,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = p_deleted_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT *
    FROM course_structures
    WHERE structure_id = p_structure_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_get_all`()
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.deleted_at IS NULL
    ORDER BY
        cs.course_id,
        cs.branch_id,
        cs.year_number,
        cs.semester_number;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_get_by_course` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_get_by_course`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.course_id = p_course_id
      AND cs.deleted_at IS NULL
    ORDER BY
        cs.branch_id,
        cs.year_number,
        cs.semester_number;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_get_by_id`(
    IN p_structure_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.structure_id = p_structure_id
      AND cs.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_structure_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_structure_update`(
    IN p_structure_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        course_id = p_course_id,
        branch_id = p_branch_id,
        year_number = p_year_number,
        semester_number = p_semester_number,
        semester_name = p_semester_name,
        status = p_status,
        updated_by = p_updated_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT *
    FROM course_structures
    WHERE structure_id = p_structure_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_update`(
    IN p_course_id BIGINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_code VARCHAR(50),
    IN p_course_name VARCHAR(150),
    IN p_course_short_name VARCHAR(50),
    IN p_course_type VARCHAR(50),
    IN p_duration_years INT,
    IN p_total_semesters INT,
    IN p_eligibility VARCHAR(255),
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND course_id <> p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    UPDATE courses
    SET college_id = p_college_id,
        department_id = p_department_id,
        course_code = UPPER(TRIM(p_course_code)),
        course_name = TRIM(p_course_name),
        course_short_name = p_course_short_name,
        course_type = p_course_type,
        duration_years = p_duration_years,
        total_semesters = p_total_semesters,
        eligibility = p_eligibility,
        description = p_description,
        status = COALESCE(p_status, status),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE course_id = p_course_id
      AND deleted_at IS NULL;

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_course_update_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_course_update_status`(
    IN p_course_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE courses
    SET status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE course_id = p_course_id
      AND deleted_at IS NULL;

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateRole` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateRole`(
    IN p_RoleName VARCHAR(100),
    IN p_RoleCode VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_CreatedBy BIGINT
)
BEGIN
    INSERT INTO roles
    (
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_RoleName,
        p_RoleCode,
        p_Description,
        1,
        CURRENT_TIMESTAMP,
        p_CreatedBy
    );

    SELECT LAST_INSERT_ID() AS role_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateStudentPromotion` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateStudentPromotion`(
    IN p_StudentId BIGINT,
    IN p_BranchId BIGINT,
    IN p_AcademicYearId BIGINT,
    IN p_CurrentSemester INT,
    IN p_NextSemester INT,
    IN p_EligibilityStatus VARCHAR(50),
    IN p_Remarks VARCHAR(500),
    IN p_CreatedBy BIGINT
)
BEGIN

    INSERT INTO student_promotions
    (
        StudentId,
        BranchId,
        AcademicYearId,
        CurrentSemester,
        NextSemester,
        EligibilityStatus,
        PromotionStatus,
        Remarks,
        CreatedAt,
        CreatedBy
    )
    VALUES
    (
        p_StudentId,
        p_BranchId,
        p_AcademicYearId,
        p_CurrentSemester,
        p_NextSemester,
        p_EligibilityStatus,
        'Promoted',
        p_Remarks,
        NOW(),
        p_CreatedBy
    );

    SELECT
        PromotionId,
        StudentId,
        BranchId,
        AcademicYearId,
        CurrentSemester,
        NextSemester,
        EligibilityStatus,
        PromotionStatus,
        Remarks,
        CreatedAt,
        CreatedBy
    FROM student_promotions
    WHERE PromotionId = LAST_INSERT_ID();

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_CreateUserRoleMapping` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CreateUserRoleMapping`(
    IN p_UserId BIGINT,
    IN p_RoleId BIGINT,
    IN p_AssignedBy BIGINT
)
BEGIN
    INSERT INTO user_role_mapping
    (
        user_id,
        role_id,
        assigned_by
    )
    VALUES
    (
        p_UserId,
        p_RoleId,
        p_AssignedBy
    );

    SELECT LAST_INSERT_ID() AS MappingId;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_college_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_college_settings`(

    IN p_college_name VARCHAR(200),

    IN p_college_code VARCHAR(50),

    IN p_college_email VARCHAR(150),

    IN p_phone_number VARCHAR(20),

    IN p_website VARCHAR(200),

    IN p_address_line1 VARCHAR(255),

    IN p_address_line2 VARCHAR(255),

    IN p_city VARCHAR(100),

    IN p_state VARCHAR(100),

    IN p_pincode VARCHAR(10),

    IN p_academic_year VARCHAR(20),

    IN p_semester VARCHAR(50),

    IN p_institution_type VARCHAR(100),

    IN p_date_format VARCHAR(30),

    IN p_time_zone VARCHAR(100),

    IN p_created_by BIGINT

)
BEGIN
 
    INSERT INTO college_settings

    (

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_by

    )

    VALUES

    (

        p_college_name,

        p_college_code,

        p_college_email,

        p_phone_number,

        p_website,

        p_address_line1,

        p_address_line2,

        p_city,

        p_state,

        p_pincode,

        p_academic_year,

        p_semester,

        p_institution_type,

        p_date_format,

        p_time_zone,

        1,

        p_created_by

    );
 
    SELECT LAST_INSERT_ID() AS college_setting_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_course_structure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_course_structure`(
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO course_structures
    (
        course_id,
        branch_id,
        year_number,
        semester_number,
        semester_name,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_branch_id,
        p_year_number,
        p_semester_number,
        p_semester_name,
        COALESCE(p_status, 1),
        UTC_TIMESTAMP(),
        p_created_by
    );

    CALL sp_get_course_structure_by_id(LAST_INSERT_ID());
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_otp` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_otp`(

    IN p_user_id BIGINT,

    IN p_identifier VARCHAR(150),

    IN p_otp_hash VARCHAR(255),

    IN p_otp_type VARCHAR(50),

    IN p_delivery_method VARCHAR(20),

    IN p_expiry_minutes INT,

    IN p_max_attempts INT

)
BEGIN
 
    -- Deactivate previous active OTPs

    UPDATE otp_verifications

    SET

        status = 0

    WHERE identifier = p_identifier

      AND otp_type = p_otp_type

      AND status = 1;
 
    -- Insert new OTP

    INSERT INTO otp_verifications

    (

        user_id,

        identifier,

        otp_hash,

        otp_type,

        delivery_method,

        expires_at,

        attempts,

        max_attempts,

        status

    )

    VALUES

    (

        p_user_id,

        p_identifier,

        p_otp_hash,

        p_otp_type,

        p_delivery_method,

        DATE_ADD(

            CURRENT_TIMESTAMP,

            INTERVAL p_expiry_minutes MINUTE

        ),

        0,

        p_max_attempts,

        1

    );
 
    SELECT LAST_INSERT_ID() AS otp_verification_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_role`(

    IN p_role_name VARCHAR(100),

    IN p_role_code VARCHAR(50),

    IN p_description VARCHAR(255),

    IN p_created_by BIGINT

)
BEGIN
 
    INSERT INTO roles

    (

        role_name,

        role_code,

        description,

        status,

        created_by

    )

    VALUES

    (

        p_role_name,

        p_role_code,

        p_description,

        1,

        p_created_by

    );
 
    SELECT LAST_INSERT_ID() AS role_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_deactivate_college_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_deactivate_college_settings`(

    IN p_college_setting_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE college_settings

    SET

        status = 0,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE college_setting_id = p_college_setting_id;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_deactivate_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_deactivate_role`(

    IN p_role_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE roles

    SET

        status = 0,

        deleted_at = CURRENT_TIMESTAMP,

        deleted_by = p_updated_by,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_course_structure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_course_structure`(
    IN p_structure_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_student_academic_details` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_student_academic_details`(
    IN p_AcademicId INT
)
BEGIN

    DELETE FROM student_academic_details
    WHERE AcademicId = p_AcademicId;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_Add` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_Add`(
    IN p_department_name VARCHAR(100),
    IN p_department_code VARCHAR(50),
    IN p_college_id BIGINT,
    IN p_hod_user_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_department_name IS NULL
       OR TRIM(p_department_name) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department name is required.';
    END IF;

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM departments
        WHERE department_name = TRIM(p_department_name)
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department already exists for this college.';
    END IF;

    INSERT INTO departments
    (
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        TRIM(p_department_name),
        NULLIF(TRIM(p_department_code), ''),
        p_college_id,
        p_hod_user_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM departments
    WHERE department_id = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_AssignHod` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_AssignHod`(
    IN p_department_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_employee_department_id BIGINT DEFAULT NULL;
    DECLARE v_department_exists INT DEFAULT 0;
    DECLARE v_employee_exists INT DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_hod_role_exists INT DEFAULT 0;

    /* =====================================================
       1. Validate Department
       ===================================================== */

    SELECT COUNT(*)
    INTO v_department_exists
    FROM departments
    WHERE department_id = p_department_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_department_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Department not found or inactive.';

    END IF;


    /* =====================================================
       2. Get Employee Profile + User ID
       ===================================================== */

    SELECT
        ep.department_id,
        ep.user_id
    INTO
        v_employee_department_id,
        v_user_id
    FROM employee_profiles ep
    WHERE ep.employee_profile_id = p_employee_profile_id
      AND ep.status = 1
      AND ep.deleted_at IS NULL
    LIMIT 1;


    IF v_user_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee profile not found or inactive.';

    END IF;


    /* =====================================================
       3. Validate Employee Belongs to Department
       ===================================================== */

    IF v_employee_department_id <> p_department_id THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee does not belong to the selected department.';

    END IF;


    /* =====================================================
       4. Validate User
       ===================================================== */

    SELECT COUNT(*)
    INTO v_user_exists
    FROM users u
    WHERE u.user_id = v_user_id
      AND u.status = 1
      AND u.deleted_at IS NULL;

    IF v_user_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee user account is inactive.';

    END IF;


    /* =====================================================
       5. Validate HOD Role
       ===================================================== */

    SELECT COUNT(*)
    INTO v_hod_role_exists
    FROM user_roles ur

    INNER JOIN roles r
        ON r.role_id = ur.role_id

    WHERE ur.user_id = v_user_id
      AND ur.status = 1
      AND r.role_code = 'HOD'
      AND r.status = 1
      AND r.deleted_at IS NULL;


    IF v_hod_role_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Selected employee does not have HOD role.';

    END IF;


    /* =====================================================
       6. Assign HOD
       ===================================================== */

    UPDATE departments
    SET
        hod_user_id = v_user_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;


    /* =====================================================
       7. Return Assigned HOD
       ===================================================== */

    SELECT

        d.department_id AS DepartmentId,

        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS FullName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    INNER JOIN users u
        ON u.user_id = d.hod_user_id

    INNER JOIN employee_profiles ep
        ON ep.user_id = d.hod_user_id

    WHERE d.department_id = p_department_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_Edit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_Edit`(
    IN p_department_id BIGINT,
    IN p_department_name VARCHAR(100),
    IN p_department_code VARCHAR(50),
    IN p_college_id BIGINT,
    IN p_hod_user_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    IF p_department_name IS NULL
       OR TRIM(p_department_name) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department name is required.';
    END IF;

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM departments
        WHERE department_name = TRIM(p_department_name)
          AND college_id = p_college_id
          AND department_id <> p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department already exists for this college.';
    END IF;

    UPDATE departments
    SET
        department_name = TRIM(p_department_name),
        department_code = NULLIF(TRIM(p_department_code), ''),
        college_id = p_college_id,
        hod_user_id = p_hod_user_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;

    CALL sp_Department_GetById(p_department_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_GetById`(
    IN p_department_id BIGINT
)
BEGIN
    SELECT
        department_id,
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM departments
    WHERE department_id = p_department_id
      AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_GetHod` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_GetHod`(
    IN p_department_id BIGINT
)
BEGIN

    SELECT

        d.department_id AS DepartmentId,

        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS HodName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    LEFT JOIN users u
        ON u.user_id = d.hod_user_id

    LEFT JOIN employee_profiles ep
        ON ep.user_id = d.hod_user_id

    WHERE d.department_id = p_department_id
      AND d.status = 1
      AND d.deleted_at IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_GetHodCandidates` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_GetHodCandidates`(
    IN p_department_id BIGINT
)
BEGIN

    SELECT DISTINCT

        ep.employee_profile_id AS EmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS FullName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM employee_profiles ep

    INNER JOIN users u
        ON u.user_id = ep.user_id

    INNER JOIN user_roles ur
        ON ur.user_id = u.user_id

    INNER JOIN roles r
        ON r.role_id = ur.role_id

    WHERE ep.department_id = p_department_id

      AND ep.status = 1
      AND ep.deleted_at IS NULL

      AND u.status = 1
      AND u.deleted_at IS NULL

      AND ur.status = 1

      AND r.role_code = 'HOD'
      AND r.status = 1
      AND r.deleted_at IS NULL

    ORDER BY u.full_name;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_List` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_List`()
BEGIN
    SELECT
        department_id,
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM departments
    WHERE deleted_at IS NULL
    ORDER BY department_name ASC, department_id ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_RemoveHod` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_RemoveHod`(
    IN p_department_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';

    END IF;


    UPDATE departments

    SET
        hod_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE department_id = p_department_id;


    SELECT
        department_id AS DepartmentId,
        department_name AS DepartmentName,
        hod_employee_profile_id AS HodEmployeeProfileId

    FROM departments

    WHERE department_id = p_department_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Department_UpdateStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Department_UpdateStatus`(
    IN p_department_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    UPDATE departments
    SET
        status = p_status,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;

    SELECT *
    FROM departments
    WHERE department_id = p_department_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetAllRoles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetAllRoles`()
BEGIN
    SELECT
        role_id,
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    FROM roles
    ORDER BY role_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetCollegeLogo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetCollegeLogo`()
BEGIN
    SELECT
        Id,
        LogoPath
    FROM Colleges
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetEligibleStudents` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetEligibleStudents`(
    IN p_BranchId BIGINT,
    IN p_AcademicYearId BIGINT,
    IN p_CurrentSemester INT
)
BEGIN

    SELECT
        s.StudentId,
        s.FullName AS StudentName,
        s.BranchId,
        s.AcademicYearId,
        p_CurrentSemester AS CurrentSemester,
        p_CurrentSemester + 1 AS NextSemester,
        'Eligible' AS EligibilityStatus

    FROM students s

    WHERE s.BranchId = p_BranchId
      AND s.AcademicYearId = p_AcademicYearId
      AND s.Status = 1
      AND s.DeletedAt IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetRoleById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetRoleById`(
    IN p_RoleId BIGINT
)
BEGIN
    SELECT
        role_id,
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    FROM roles
    WHERE role_id = p_RoleId;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetStudentEligibility` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetStudentEligibility`(
    IN p_StudentId BIGINT
)
BEGIN

    SELECT
        s.StudentId,
        s.FullName AS StudentName,
        s.BranchId,
        s.AcademicYearId,
        'Eligible' AS EligibilityStatus

    FROM students s

    WHERE s.StudentId = p_StudentId
      AND s.Status = 1
      AND s.DeletedAt IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetUserByEmail` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetUserByEmail`(
    IN p_Email VARCHAR(255)
)
BEGIN
    SELECT
        Id,
        Email
    FROM Users
    WHERE Email = p_Email
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetUserRoles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetUserRoles`(
    IN p_UserId BIGINT
)
BEGIN
    SELECT
        urm.user_id,
        urm.role_id,
        r.role_name,
        r.role_code,
        urm.assigned_by
    FROM user_role_mapping urm
    INNER JOIN roles r
        ON urm.role_id = r.role_id
    WHERE urm.user_id = p_UserId;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_GetValidResetToken` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetValidResetToken`(
    IN p_Token VARCHAR(255)
)
BEGIN
    SELECT
        Id,
        UserId,
        Token,
        Expiry
    FROM PasswordResetTokens
    WHERE Token = p_Token
      AND Expiry > CURRENT_TIMESTAMP
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_active_otp` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_active_otp`(

    IN p_identifier VARCHAR(150),

    IN p_otp_type VARCHAR(50)

)
BEGIN
 
    SELECT

        otp_verification_id,

        user_id,

        identifier,

        otp_hash,

        otp_type,

        delivery_method,

        expires_at,

        verified_at,

        attempts,

        max_attempts,

        status,

        created_at

    FROM otp_verifications

    WHERE identifier = p_identifier

      AND otp_type = p_otp_type

      AND status = 1

      AND verified_at IS NULL

      AND expires_at >= CURRENT_TIMESTAMP

    ORDER BY created_at DESC

    LIMIT 1;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_all_college_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_all_college_settings`()
BEGIN
 
    SELECT

        college_setting_id,

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by

    FROM college_settings

    WHERE status = 1

    ORDER BY college_setting_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_all_college_user_mappings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_all_college_user_mappings`()
BEGIN
    SELECT
        m.college_user_mapping_id,
        m.user_id,
        m.college_setting_id,
        c.college_name,
        c.college_code,
        m.status,
        m.assigned_at,
        m.assigned_by,
        m.updated_at,
        m.updated_by,
        m.removed_at,
        m.removed_by
    FROM college_user_mappings m
    INNER JOIN college_settings c
        ON c.college_setting_id = m.college_setting_id
    ORDER BY m.college_user_mapping_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_all_roles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_all_roles`()
BEGIN
 
    SELECT

        role_id,

        role_name,

        role_code,

        description,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by,

        deleted_at,

        deleted_by

    FROM roles

    WHERE status = 1

      AND deleted_at IS NULL

    ORDER BY role_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_college_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_college_settings`(

    IN p_college_setting_id BIGINT

)
BEGIN
 
    SELECT

        college_setting_id,

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by

    FROM college_settings

    WHERE college_setting_id = p_college_setting_id

      AND status = 1;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_course_structures` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_course_structures`()
BEGIN
    SELECT
        cs.structure_id AS StructureId,
        cs.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        cs.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        cs.year_number AS YearNumber,
        cs.semester_number AS SemesterNumber,
        cs.semester_name AS SemesterName,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.status = 1
      AND cs.deleted_at IS NULL
    ORDER BY
        cs.course_id,
        cs.branch_id,
        cs.year_number,
        cs.semester_number,
        cs.structure_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_course_structure_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_course_structure_by_id`(
    IN p_structure_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id AS StructureId,
        cs.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        cs.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        cs.year_number AS YearNumber,
        cs.semester_number AS SemesterNumber,
        cs.semester_name AS SemesterName,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.structure_id = p_structure_id
      AND cs.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_employee_profile` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_employee_profile`(
    IN p_user_id BIGINT
)
BEGIN

    SELECT
        employee_profile_id AS EmployeeProfileId,
        user_id AS UserId,
        date_of_birth AS DateOfBirth,
        gender AS Gender,
        department_id AS DepartmentId,
        designation AS Designation,
        address AS Address,
        pincode AS Pincode,
        city AS City,
        district AS District,
        state AS State,
        about_me AS AboutMe,
        profile_image_path AS ProfileImagePath,
        status AS Status,
        created_at AS CreatedAt,
        updated_at AS UpdatedAt
    FROM employee_profiles
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
    LIMIT 1;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_role_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_role_by_id`(

    IN p_role_id BIGINT

)
BEGIN
 
    SELECT

        role_id,

        role_name,

        role_code,

        description,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by,

        deleted_at,

        deleted_by

    FROM roles

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_student_academic_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_student_academic_by_id`(
    IN p_AcademicId INT
)
BEGIN

    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_AcademicId;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_student_academic_details` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_student_academic_details`()
BEGIN

    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    ORDER BY AcademicId;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_college_mappings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_college_mappings`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        m.college_user_mapping_id,
        m.user_id,
        m.college_setting_id,
        c.college_name,
        c.college_code,
        m.status,
        m.assigned_at,
        m.assigned_by,
        m.updated_at,
        m.updated_by,
        m.removed_at,
        m.removed_by
    FROM college_user_mappings m
    INNER JOIN college_settings c
        ON c.college_setting_id = m.college_setting_id
    WHERE m.user_id = p_user_id
    ORDER BY m.college_user_mapping_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_password_hash` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_password_hash`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        user_id,
        password_hash,
        status,
        deleted_at
    FROM users
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_increment_otp_attempt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_increment_otp_attempt`(

    IN p_otp_verification_id BIGINT

)
BEGIN
 
    UPDATE otp_verifications

    SET

        attempts = attempts + 1,

        status =

            CASE

                WHEN attempts + 1 >= max_attempts

                THEN 0

                ELSE status

            END

    WHERE otp_verification_id = p_otp_verification_id

      AND status = 1;
 
    SELECT

        otp_verification_id,

        attempts,

        max_attempts,

        status

    FROM otp_verifications

    WHERE otp_verification_id = p_otp_verification_id;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_insert_student_academic_details` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insert_student_academic_details`(
    IN p_RollNumber VARCHAR(20),
    IN p_RegistrationNumber VARCHAR(30),
    IN p_AdmissionNumber VARCHAR(30),
    IN p_Course VARCHAR(100),
    IN p_Branch VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Semester INT,
    IN p_Section VARCHAR(10),
    IN p_AcademicYear VARCHAR(20)
)
BEGIN

    INSERT INTO student_academic_details
    (
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    )
    VALUES
    (
        p_RollNumber,
        p_RegistrationNumber,
        p_AdmissionNumber,
        p_Course,
        p_Branch,
        p_Department,
        p_Semester,
        p_Section,
        p_AcademicYear
    );

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_login_get_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_login_get_user`(
    IN p_login_id VARCHAR(150)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
)
BEGIN

    SELECT
        u.user_id,
        u.employee_user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.password_hash,
        u.status,
        u.deleted_at
    FROM users u
    WHERE u.deleted_at IS NULL
      AND (
            u.employee_user_id = TRIM(p_login_id)
            OR u.email = TRIM(p_login_id)
            OR u.mobile = TRIM(p_login_id)
          )
    LIMIT 1;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_ProfileChangeAudit_Create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ProfileChangeAudit_Create`(
    IN p_user_id BIGINT,
    IN p_changed_by BIGINT,
    IN p_changed_information JSON
)
BEGIN
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid user id is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid changed-by user id is required.';
    END IF;

    IF p_changed_information IS NULL OR JSON_LENGTH(p_changed_information) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Changed information is required.';
    END IF;

    INSERT INTO profile_change_audits
    (
        user_id,
        changed_by,
        changed_at,
        changed_information
    )
    VALUES
    (
        p_user_id,
        p_changed_by,
        UTC_TIMESTAMP(),
        p_changed_information
    );

    SELECT LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_ProfileChangeAudit_GetByUserId` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ProfileChangeAudit_GetByUserId`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        a.profile_change_audit_id,
        a.user_id,
        a.changed_by,
        u.full_name AS changed_by_name,
        a.changed_at,
        a.changed_information
    FROM profile_change_audits a
    LEFT JOIN users u
        ON u.user_id = a.changed_by
    WHERE a.user_id = p_user_id
    ORDER BY a.changed_at DESC, a.profile_change_audit_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_remove_college_from_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_remove_college_from_user`(
    IN p_user_id BIGINT,
    IN p_college_setting_id BIGINT,
    IN p_removed_by BIGINT
)
BEGIN

    UPDATE college_user_mappings
    SET
        status = 0,
        removed_at = CURRENT_TIMESTAMP,
        removed_by = p_removed_by,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_removed_by
    WHERE user_id = p_user_id
      AND college_setting_id = p_college_setting_id
      AND status = 1;

    IF ROW_COUNT() > 0 THEN

        SELECT
            TRUE AS success,
            'College mapping removed successfully.' AS message;

    ELSE

        SELECT
            FALSE AS success,
            'Active college mapping not found.' AS message;

    END IF;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_ResetPassword` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ResetPassword`(
    IN p_UserId BIGINT,
    IN p_PasswordHash VARCHAR(500)
)
BEGIN
    UPDATE Users
    SET PasswordHash = p_PasswordHash
    WHERE Id = p_UserId;

    SELECT ROW_COUNT() AS RowsAffected;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_AssignClassTeacher` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_AssignClassTeacher`(
    IN p_section_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_employee_college_id BIGINT;

    SELECT college_id
      INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT u.college_id
      INTO v_employee_college_id
    FROM employee_profiles ep
    INNER JOIN users u ON u.user_id = ep.user_id
    WHERE ep.employee_profile_id = p_employee_profile_id
      AND ep.deleted_at IS NULL
      AND ep.status = 1
      AND u.deleted_at IS NULL
      AND u.status = 1
    LIMIT 1;

    IF v_employee_college_id IS NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_employee_profile_id
          AND ep.deleted_at IS NULL
          AND ep.status = 1
          AND u.deleted_at IS NULL
          AND u.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active employee profile not found.';
    END IF;

    IF v_employee_college_id IS NOT NULL AND v_employee_college_id <> v_college_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Teacher belongs to a different college.';
    END IF;

    UPDATE sections
    SET class_teacher_employee_profile_id = p_employee_profile_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL;

    CALL sp_Section_GetClassTeacher(p_section_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_AssignStudents` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_AssignStudents`(
    IN p_section_id BIGINT,
    IN p_student_ids_json JSON,
    IN p_assigned_by BIGINT
)
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_current_count INT DEFAULT 0;
    DECLARE v_new_count INT DEFAULT 0;
    DECLARE v_selected_count INT DEFAULT 0;
    DECLARE v_valid_count INT DEFAULT 0;
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
        RESIGNAL;
    END;

    IF p_student_ids_json IS NULL OR JSON_LENGTH(p_student_ids_json) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Select at least one student.';
    END IF;

    START TRANSACTION;

    SELECT capacity, college_id, academic_year_id, course_id, branch_id
      INTO v_capacity, v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1
    FOR UPDATE;

    IF v_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
    CREATE TEMPORARY TABLE tmp_student_ids
    (
        student_id BIGINT NOT NULL PRIMARY KEY
    );

    INSERT IGNORE INTO tmp_student_ids(student_id)
    SELECT jt.student_id
    FROM JSON_TABLE(
        p_student_ids_json,
        '$[*]' COLUMNS(student_id BIGINT PATH '$')
    ) jt
    WHERE jt.student_id > 0;

    SELECT COUNT(*) INTO v_selected_count
    FROM tmp_student_ids;

    IF v_selected_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No valid StudentIds were supplied.';
    END IF;

    SELECT COUNT(*) INTO v_valid_count
    FROM students st
    INNER JOIN tmp_student_ids t ON t.student_id = st.student_id
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id);

    IF v_valid_count <> v_selected_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'One or more students are invalid or do not belong to the section course/branch/academic year.';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM student_section_assignments
    WHERE section_id = p_section_id
      AND status = 1;

    SELECT COUNT(*) INTO v_new_count
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    IF v_current_count + v_new_count > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section capacity exceeded.';
    END IF;

    /* Preserve history when moving a student from another section. */
    UPDATE student_section_assignments ssa
    INNER JOIN tmp_student_ids t ON t.student_id = ssa.student_id
    SET ssa.status = 0,
        ssa.removed_at = UTC_TIMESTAMP(),
        ssa.removed_by = p_assigned_by
    WHERE ssa.status = 1
      AND ssa.section_id <> p_section_id;

    INSERT INTO student_section_assignments
    (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    )
    SELECT
        t.student_id,
        p_section_id,
        v_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_assigned_by
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    COMMIT;

    SELECT
        p_section_id AS SectionId,
        v_capacity AS Capacity,
        v_current_count AS PreviouslyAssigned,
        v_new_count AS NewlyAssigned,
        v_current_count + v_new_count AS TotalAssigned,
        v_capacity - (v_current_count + v_new_count) AS AvailableSeats;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_create`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_section_name VARCHAR(100),
    IN p_capacity INT,
    IN p_created_by BIGINT
)
BEGIN

    /* =====================================================
       BASIC VALIDATION
       ===================================================== */

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College is required.';
    END IF;

    IF p_academic_year_id IS NULL OR p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year is required.';
    END IF;

    IF p_department_id IS NULL OR p_department_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department is required.';
    END IF;

    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is required.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Branch is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester is required.';
    END IF;

    IF p_section_code IS NULL
       OR TRIM(p_section_code) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section code is required.';
    END IF;

    IF p_section_name IS NULL
       OR TRIM(p_section_name) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section name is required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';
    END IF;


    /* =====================================================
       COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND status = 1
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College does not exist or is inactive.';

    END IF;


    /* =====================================================
       ACADEMIC YEAR
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Academic year does not exist or is inactive.';

    END IF;


    /* =====================================================
       DEPARTMENT → COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND college_id = p_college_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Department does not belong to the selected college.';

    END IF;


    /* =====================================================
       COURSE → COLLEGE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Course does not belong to the selected college and department.';

    END IF;


    /* =====================================================
       BRANCH → COURSE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Branch does not belong to the selected course and department.';

    END IF;


    /* =====================================================
       SEMESTER → BRANCH
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM semesters
        WHERE semester_id = p_semester_id
          AND branch_id = p_branch_id
          AND status = 1
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Semester does not belong to the selected branch.';

    END IF;


    /* =====================================================
       DUPLICATE SECTION
       ===================================================== */

    IF EXISTS
    (
        SELECT 1
        FROM sections
        WHERE academic_year_id = p_academic_year_id
          AND department_id = p_department_id
          AND course_id = p_course_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND LOWER(TRIM(section_code))
              = LOWER(TRIM(p_section_code))
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section code already exists for the selected semester.';

    END IF;


    /* =====================================================
       INSERT
       ===================================================== */

    INSERT INTO sections
    (
        college_id,
        academic_year_id,
        department_id,
        course_id,
        branch_id,
        semester_id,
        section_code,
        section_name,
        capacity,
        status,
        is_archived,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        p_academic_year_id,
        p_department_id,
        p_course_id,
        p_branch_id,
        p_semester_id,
        TRIM(p_section_code),
        TRIM(p_section_name),
        p_capacity,
        1,
        0,
        UTC_TIMESTAMP(),
        p_created_by
    );


    SELECT LAST_INSERT_ID() AS SectionId;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_delete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_delete`(
    IN p_section_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN

    DECLARE v_student_count INT DEFAULT 0;


    IF NOT EXISTS
    (
        SELECT 1
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';

    END IF;


    SELECT COUNT(*)
    INTO v_student_count
    FROM student_sections
    WHERE section_id = p_section_id
      AND is_active = 1;


    IF v_student_count > 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section cannot be archived because active students are assigned to it.';

    END IF;


    UPDATE sections

    SET
        is_archived = 1,
        status = 0,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by

    WHERE section_id = p_section_id;


    SELECT ROW_COUNT() AS AffectedRows;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_exists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_exists`(
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_exclude_section_id BIGINT
)
BEGIN

    SELECT
        COUNT(*) AS RecordCount

    FROM sections

    WHERE academic_year_id = p_academic_year_id
      AND department_id = p_department_id
      AND course_id = p_course_id
      AND branch_id = p_branch_id
      AND semester_id = p_semester_id
      AND LOWER(section_code) = LOWER(TRIM(p_section_code))
      AND is_archived = 0
      AND
      (
          p_exclude_section_id IS NULL
          OR section_id <> p_exclude_section_id
      );

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_GetCapacity` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_GetCapacity`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        COUNT(ssa.student_section_assignment_id) AS AssignedStudents,
        GREATEST(s.capacity - COUNT(ssa.student_section_assignment_id), 0) AS AvailableSeats,
        CASE
            WHEN COUNT(ssa.student_section_assignment_id) >= s.capacity THEN TRUE
            ELSE FALSE
        END AS IsFull
    FROM sections s
    LEFT JOIN student_section_assignments ssa
        ON ssa.section_id = s.section_id
       AND ssa.status = 1
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    GROUP BY s.section_id, s.section_name, s.capacity;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_GetClassTeacher` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_GetClassTeacher`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM sections s
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_GetClassTeacherCandidates` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_GetClassTeacherCandidates`(
    IN p_section_id BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;

    SELECT college_id
      INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    SELECT
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM employee_profiles ep
    INNER JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
       AND u.status = 1
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE ep.deleted_at IS NULL
      AND ep.status = 1
      AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ORDER BY u.full_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_GetStudentCandidates` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_GetStudentCandidates`(
    IN p_section_id BIGINT,
    IN p_search VARCHAR(150)
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    SELECT college_id, academic_year_id, course_id, branch_id
      INTO v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        st.college_id AS CollegeId,
        st.course_id AS CourseId,
        st.branch_id AS BranchId,
        st.academic_year_id AS AcademicYearId
    FROM students st
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
            OR st.student_code LIKE CONCAT('%', TRIM(p_search), '%')
            OR st.full_name LIKE CONCAT('%', TRIM(p_search), '%')
          )
      AND NOT EXISTS (
            SELECT 1
            FROM student_section_assignments x
            WHERE x.student_id = st.student_id
              AND x.status = 1
          )
    ORDER BY st.full_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_GetStudents` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_GetStudents`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        ssa.student_section_assignment_id AS AssignmentId,
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        ssa.assigned_at AS AssignedAt,
        ssa.assigned_by AS AssignedBy
    FROM student_section_assignments ssa
    INNER JOIN students st
        ON st.student_id = ssa.student_id
       AND st.deleted_at IS NULL
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1
    ORDER BY st.full_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_get_all`()
BEGIN

    SELECT
        s.section_id AS SectionId,

        s.college_id AS CollegeId,
        col.college_name AS CollegeName,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,

        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,

        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,

        s.semester_id AS SemesterId,
        sem.semester_number AS SemesterNumber,
        sem.semester_name AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Capacity Status */
        CASE

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= s.capacity
            THEN 'FULL'

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= CEIL(s.capacity * 0.90)
            THEN 'NEAR_FULL'

            ELSE 'AVAILABLE'

        END AS CapacityStatus,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    INNER JOIN semesters sem
        ON sem.semester_id = s.semester_id

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.is_archived = 0

    ORDER BY
        d.department_name,
        c.course_name,
        b.branch_name,
        sem.semester_number,
        s.section_code;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_get_by_id`(
    IN p_section_id BIGINT
)
BEGIN

    SELECT
        s.section_id AS SectionId,

        s.college_id AS CollegeId,
        col.college_name AS CollegeName,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,

        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,

        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,

        s.semester_id AS SemesterId,
        sem.semester_number AS SemesterNumber,
        sem.semester_name AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    INNER JOIN semesters sem
        ON sem.semester_id = s.semester_id

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.section_id = p_section_id
      AND s.is_archived = 0;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_get_current_strength` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_get_current_strength`(
    IN p_section_id BIGINT
)
BEGIN

    SELECT COUNT(*) AS CurrentStrength

    FROM student_sections

    WHERE section_id = p_section_id
      AND is_active = 1;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_get_entity_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_get_entity_by_id`(
    IN p_section_id BIGINT
)
BEGIN

    SELECT
        section_id AS SectionId,
        college_id AS CollegeId,
        academic_year_id AS AcademicYearId,
        department_id AS DepartmentId,
        course_id AS CourseId,
        branch_id AS BranchId,
        semester_id AS SemesterId,

        section_code AS SectionCode,
        section_name AS SectionName,

        capacity AS Capacity,

        status AS Status,
        is_archived AS IsArchived,

        created_at AS CreatedAt,
        created_by AS CreatedBy,

        updated_at AS UpdatedAt,
        updated_by AS UpdatedBy

    FROM sections

    WHERE section_id = p_section_id
      AND is_archived = 0;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_get_summary` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_get_summary`()
BEGIN

    SELECT
        COUNT(*) AS TotalSections,

        COALESCE(
            SUM(
                CASE
                    WHEN s.status = 1 THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS ActiveSections,

        COALESCE(
            SUM(s.capacity),
            0
        ) AS TotalCapacity,

        COALESCE(
            SUM(
                CASE
                    WHEN s.class_teacher_employee_profile_id IS NULL
                         OR s.class_teacher_employee_profile_id = 0
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS UnassignedAdvisors

    FROM sections s

    WHERE s.is_archived = 0;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_RemoveClassTeacher` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_RemoveClassTeacher`(
    IN p_section_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE sections
    SET class_teacher_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND class_teacher_employee_profile_id IS NOT NULL;

    SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_Section_RemoveStudent` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_Section_RemoveStudent`(
    IN p_section_id BIGINT,
    IN p_student_id BIGINT,
    IN p_removed_by BIGINT
)
BEGIN
    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_removed_by
    WHERE section_id = p_section_id
      AND student_id = p_student_id
      AND status = 1;

    SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_search` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_search`(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
BEGIN

    SELECT
        s.section_id AS SectionId,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        ay.academic_year_name AS AcademicYearName,

        d.department_name AS DepartmentName,
        c.course_name AS CourseName,
        b.branch_name AS BranchName,
        sem.semester_name AS SemesterName,

        s.capacity AS Capacity,

        (
            SELECT COUNT(*)
            FROM student_sections ss
            WHERE ss.section_id = s.section_id
              AND ss.academic_year_id = s.academic_year_id
              AND ss.is_active = 1
        ) AS CurrentStrength,

        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_sections ss
                WHERE ss.section_id = s.section_id
                  AND ss.academic_year_id = s.academic_year_id
                  AND ss.is_active = 1
            ),
            0
        ) AS AvailableSeats,

        s.status AS Status

    FROM sections s

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    INNER JOIN semesters sem
        ON sem.semester_id = s.semester_id

    WHERE s.is_archived = 0

      AND
      (
          p_search IS NULL
          OR TRIM(p_search) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR d.department_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR c.course_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR b.branch_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR sem.semester_name LIKE CONCAT('%', TRIM(p_search), '%')
      )

      AND
      (
          p_department_id IS NULL
          OR s.department_id = p_department_id
      )

      AND
      (
          p_course_id IS NULL
          OR s.course_id = p_course_id
      )

      AND
      (
          p_branch_id IS NULL
          OR s.branch_id = p_branch_id
      )

      AND
      (
          p_semester_id IS NULL
          OR s.semester_id = p_semester_id
      )

      AND
      (
          p_status IS NULL
          OR s.status = p_status
      )

    ORDER BY s.section_code;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_update`(
    IN p_section_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester BIGINT,
    IN p_section_name VARCHAR(100),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_semester_number INT DEFAULT NULL;

    SELECT s.`college_id`, s.`department_id`
    INTO v_college_id, v_department_id
    FROM `sections` s
    WHERE s.`section_id` = p_section_id
      AND s.`is_archived` = 0
      AND s.`deleted_at` IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;
    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;
    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `courses` c
        WHERE c.`course_id` = p_course_id
          AND c.`college_id` = v_college_id
          AND c.`department_id` = v_department_id
          AND c.`status` = 1 AND c.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not belong to the section college and department.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `branches` b
        WHERE b.`branch_id` = p_branch_id
          AND b.`course_id` = p_course_id
          AND b.`department_id` = v_department_id
          AND b.`status` = 1 AND b.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not belong to the selected course.';
    END IF;

    SELECT sem.`semester_number`
    INTO v_semester_number
    FROM `semesters` sem
    WHERE sem.`semester_id` = p_semester
      AND sem.`course_id` = p_course_id
      AND sem.`branch_id` = p_branch_id
      AND sem.`status` = 1
      AND sem.`is_archived` = 0
    LIMIT 1;

    IF v_semester_number IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester does not match the selected course and branch.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM `employee_profiles` ep
        INNER JOIN `users` u ON u.`user_id` = ep.`user_id`
        WHERE ep.`employee_profile_id` = p_class_teacher_employee_profile_id
          AND ep.`status` = 1
          AND ep.`deleted_at` IS NULL
          AND u.`status` = 1
          AND u.`deleted_at` IS NULL
          AND (u.`college_id` = v_college_id OR u.`college_id` IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    SELECT COUNT(*) INTO v_current_strength
    FROM `student_section_assignments` ssa
    WHERE ssa.`section_id` = p_section_id AND ssa.`status` = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `sections` duplicate_section
        WHERE duplicate_section.`section_id` <> p_section_id
          AND duplicate_section.`academic_year_id` = p_academic_year_id
          AND duplicate_section.`department_id` = v_department_id
          AND duplicate_section.`course_id` = p_course_id
          AND duplicate_section.`branch_id` = p_branch_id
          AND duplicate_section.`semester_id` = p_semester
          AND LOWER(TRIM(duplicate_section.`section_code`)) = LOWER(TRIM(p_section_code))
          AND duplicate_section.`is_archived` = 0
          AND duplicate_section.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE `sections`
    SET `course_id` = p_course_id,
        `branch_id` = p_branch_id,
        `academic_year_id` = p_academic_year_id,
        `semester` = v_semester_number,
        `semester_id` = p_semester,
        `section_name` = TRIM(p_section_name),
        `section_code` = TRIM(p_section_code),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM(p_room), ''),
        `shift` = NULLIF(TRIM(p_shift), ''),
        `section_type` = NULLIF(TRIM(p_section_type), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_update_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_update_status`(
    IN p_section_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN

    IF p_status NOT IN (0,1) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid section status.';

    END IF;


    IF NOT EXISTS
    (
        SELECT 1
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';

    END IF;


    UPDATE sections

    SET
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE section_id = p_section_id
      AND is_archived = 0;


    SELECT ROW_COUNT() AS AffectedRows;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_section_validate_capacity` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_section_validate_capacity`(
    IN p_section_id BIGINT,
    IN p_capacity INT
)
BEGIN

    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_section_exists INT DEFAULT 0;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_error_message VARCHAR(255);


    /* =========================================================
       1. Validate capacity
       ========================================================= */

    IF p_capacity IS NULL OR p_capacity <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';

    END IF;


    /* =========================================================
       2. Validate existing section
       ========================================================= */

    IF p_section_id IS NOT NULL
       AND p_section_id > 0 THEN

        SELECT COUNT(*)
        INTO v_section_exists
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0;


        IF v_section_exists = 0 THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Section not found.';

        END IF;


        /* =====================================================
           3. Get academic year of section
           ===================================================== */

        SELECT academic_year_id
        INTO v_academic_year_id
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
        LIMIT 1;


        /* =====================================================
           4. Get current active student count
           ===================================================== */

        SELECT COUNT(*)
        INTO v_current_strength
        FROM student_sections
        WHERE section_id = p_section_id
          AND academic_year_id = v_academic_year_id
          AND is_active = 1;


        /* =====================================================
           5. Validate proposed capacity
           ===================================================== */

        IF p_capacity < v_current_strength THEN

            SET v_error_message = CONCAT(
                'Section capacity cannot be less than current student count of ',
                v_current_strength,
                '.'
            );

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_error_message;

        END IF;

    END IF;


    /* =========================================================
       6. Return validation result
       ========================================================= */

    SELECT
        TRUE AS IsValid,
        p_capacity AS Capacity,
        v_current_strength AS CurrentStrength,
        GREATEST(
            p_capacity - v_current_strength,
            0
        ) AS AvailableSeats;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAcademicDetails_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAcademicDetails_GetById`(
    IN p_academic_id INT
)
BEGIN
    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_academic_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAcademicDetails_Update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAcademicDetails_Update`(
    IN p_academic_id INT,
    IN p_roll_number VARCHAR(20),
    IN p_registration_number VARCHAR(30),
    IN p_admission_number VARCHAR(30),
    IN p_course VARCHAR(100),
    IN p_branch VARCHAR(100),
    IN p_department VARCHAR(100),
    IN p_semester INT,
    IN p_section VARCHAR(10),
    IN p_academic_year VARCHAR(20)
)
BEGIN
    IF p_academic_id IS NULL OR p_academic_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid academic ID is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AcademicId = p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic information not found.';
    END IF;

    IF p_roll_number IS NULL OR TRIM(p_roll_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Roll number is required.';
    END IF;

    IF p_registration_number IS NULL OR TRIM(p_registration_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number is required.';
    END IF;

    IF p_admission_number IS NULL OR TRIM(p_admission_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_course IS NULL OR TRIM(p_course) = ''
       OR p_branch IS NULL OR TRIM(p_branch) = ''
       OR p_department IS NULL OR TRIM(p_department) = ''
       OR p_section IS NULL OR TRIM(p_section) = ''
       OR p_academic_year IS NULL OR TRIM(p_academic_year) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Course, branch, department, section and academic year are required.';
    END IF;

    IF p_semester IS NULL OR p_semester <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Semester must be greater than 0.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE RegistrationNumber = TRIM(p_registration_number)
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AdmissionNumber = TRIM(p_admission_number)
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    UPDATE student_academic_details
    SET
        RollNumber = TRIM(p_roll_number),
        RegistrationNumber = TRIM(p_registration_number),
        AdmissionNumber = TRIM(p_admission_number),
        Course = TRIM(p_course),
        Branch = TRIM(p_branch),
        Department = TRIM(p_department),
        Semester = p_semester,
        Section = TRIM(p_section),
        AcademicYear = TRIM(p_academic_year)
    WHERE AcademicId = p_academic_id;

    CALL sp_StudentAcademicDetails_GetById(p_academic_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAcademicInformation_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAcademicInformation_GetById`(
    IN p_academic_id INT
)
BEGIN
    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_academic_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAcademicInformation_Update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAcademicInformation_Update`(
    IN p_academic_id INT,
    IN p_roll_number VARCHAR(20),
    IN p_registration_number VARCHAR(30),
    IN p_admission_number VARCHAR(30),
    IN p_course VARCHAR(100),
    IN p_branch VARCHAR(100),
    IN p_department VARCHAR(100),
    IN p_semester INT,
    IN p_section VARCHAR(10),
    IN p_academic_year VARCHAR(20)
)
BEGIN
    IF p_academic_id IS NULL OR p_academic_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid academic ID is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AcademicId = p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic information not found.';
    END IF;

    IF p_roll_number IS NULL OR TRIM(p_roll_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Roll number is required.';
    END IF;

    IF p_registration_number IS NULL OR TRIM(p_registration_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number is required.';
    END IF;

    IF p_admission_number IS NULL OR TRIM(p_admission_number) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_course IS NULL OR TRIM(p_course) = ''
       OR p_branch IS NULL OR TRIM(p_branch) = ''
       OR p_department IS NULL OR TRIM(p_department) = ''
       OR p_section IS NULL OR TRIM(p_section) = ''
       OR p_academic_year IS NULL OR TRIM(p_academic_year) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Course, branch, department, section and academic year are required.';
    END IF;

    IF p_semester IS NULL OR p_semester <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Semester must be greater than 0.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE RegistrationNumber = TRIM(p_registration_number)
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AdmissionNumber = TRIM(p_admission_number)
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    UPDATE student_academic_details
    SET
        RollNumber = TRIM(p_roll_number),
        RegistrationNumber = TRIM(p_registration_number),
        AdmissionNumber = TRIM(p_admission_number),
        Course = TRIM(p_course),
        Branch = TRIM(p_branch),
        Department = TRIM(p_department),
        Semester = p_semester,
        Section = TRIM(p_section),
        AcademicYear = TRIM(p_academic_year)
    WHERE AcademicId = p_academic_id;

    CALL sp_StudentAcademicInformation_GetById(p_academic_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAdmission_Create`(
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First name is required.';
    END IF;

    IF p_gender NOT IN ('Male', 'Female', 'Other') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be Male, Female, or Other.';
    END IF;

    IF p_registration_no IS NOT NULL AND TRIM(p_registration_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM(p_registration_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF p_application_no IS NOT NULL AND TRIM(p_application_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM(p_application_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
    END IF;

    IF p_admission_no IS NOT NULL AND TRIM(p_admission_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM(p_admission_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    INSERT INTO studentadmissions
    (
        RegistrationNo,
        RegistrationDate,
        ApplicationNo,
        ApplicationDate,
        AdmissionNo,
        AdmissionDate,
        AdmissionType,
        AdmissionQuota,
        Medium,
        ScholarshipStatus,
        FirstName,
        LastName,
        Gender,
        DateOfBirth,
        BloodGroup,
        StudentPhoto,
        Email,
        StudentEmail,
        MobileNumber,
        AadhaarNumber,
        Nationality,
        Religion,
        Category,
        FatherName,
        MotherName,
        GuardianName,
        Occupation,
        AnnualIncome,
        MotherEmail,
        GuardianMobile,
        GuardianEmail,
        Address,
        City,
        District,
        State,
        Pincode,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        BirthCertificate,
        TransferCertificate,
        StudyCertificate,
        AadhaarDocument,
        CommunityCertificate,
        IncomeCertificate,
        PassportPhoto,
        MarksMemo,
        CasteCertificate,
        TenthCertificate,
        Status,
        AdmissionStatus,
        InterviewRequired,
        AdmissionFeeAmount,
        Remarks,
        IsActive,
        CreatedBy,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        p_registration_no,
        p_registration_date,
        p_application_no,
        p_application_date,
        p_admission_no,
        p_admission_date,
        p_admission_type,
        p_admission_quota,
        p_medium,
        p_scholarship_status,
        p_first_name,
        p_last_name,
        p_gender,
        p_date_of_birth,
        p_blood_group,
        p_student_photo,
        p_email,
        p_student_email,
        p_mobile_number,
        p_aadhaar_number,
        p_nationality,
        p_religion,
        p_category,
        p_father_name,
        p_mother_name,
        p_guardian_name,
        p_occupation,
        p_annual_income,
        p_mother_email,
        p_guardian_mobile,
        p_guardian_email,
        p_address,
        p_city,
        p_district,
        p_state,
        p_pincode,
        p_board_id,
        p_academic_year_id,
        p_academic_level_id,
        p_group_id,
        p_section_id,
        p_second_language,
        p_previous_school,
        p_previous_board,
        p_previous_year,
        p_previous_percentage,
        p_previous_hall_ticket,
        p_birth_certificate,
        p_transfer_certificate,
        p_study_certificate,
        p_aadhaar_document,
        p_community_certificate,
        p_income_certificate,
        p_passport_photo,
        p_marks_memo,
        p_caste_certificate,
        p_tenth_certificate,
        p_status,
        p_admission_status,
        p_interview_required,
        p_admission_fee_amount,
        p_remarks,
        p_is_active,
        p_created_by,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );

    SELECT * FROM studentadmissions WHERE AdmissionId = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetAcademicDetails` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAdmission_GetAcademicDetails`(
    IN p_admission_id BIGINT
)
BEGIN
    SELECT
        AdmissionId,
        RegistrationNo,
        AdmissionNo,
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))) AS StudentName,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        Medium,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        UpdatedBy,
        UpdatedAt
    FROM studentadmissions
    WHERE AdmissionId = p_admission_id
      AND IsDeleted = 0
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`AdmissionId` = p_admission_id
      AND sa.`IsDeleted` = 0
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAdmission_Update`(
    IN p_admission_id BIGINT,
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM studentadmissions
        WHERE AdmissionId = p_admission_id AND IsDeleted = 0
    ) THEN
        SELECT * FROM studentadmissions WHERE 1 = 0;
    ELSE
        IF p_registration_no IS NOT NULL AND TRIM(p_registration_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM(p_registration_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
        END IF;

        IF p_application_no IS NOT NULL AND TRIM(p_application_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM(p_application_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
        END IF;

        IF p_admission_no IS NOT NULL AND TRIM(p_admission_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM(p_admission_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
        END IF;

        UPDATE studentadmissions
        SET
        RegistrationNo = p_registration_no,
        RegistrationDate = p_registration_date,
        ApplicationNo = p_application_no,
        ApplicationDate = p_application_date,
        AdmissionNo = p_admission_no,
        AdmissionDate = p_admission_date,
        AdmissionType = p_admission_type,
        AdmissionQuota = p_admission_quota,
        Medium = p_medium,
        ScholarshipStatus = p_scholarship_status,
        FirstName = p_first_name,
        LastName = p_last_name,
        Gender = p_gender,
        DateOfBirth = p_date_of_birth,
        BloodGroup = p_blood_group,
        StudentPhoto = p_student_photo,
        Email = p_email,
        StudentEmail = p_student_email,
        MobileNumber = p_mobile_number,
        AadhaarNumber = p_aadhaar_number,
        Nationality = p_nationality,
        Religion = p_religion,
        Category = p_category,
        FatherName = p_father_name,
        MotherName = p_mother_name,
        GuardianName = p_guardian_name,
        Occupation = p_occupation,
        AnnualIncome = p_annual_income,
        MotherEmail = p_mother_email,
        GuardianMobile = p_guardian_mobile,
        GuardianEmail = p_guardian_email,
        Address = p_address,
        City = p_city,
        District = p_district,
        State = p_state,
        Pincode = p_pincode,
        BoardId = p_board_id,
        AcademicYearId = p_academic_year_id,
        AcademicLevelId = p_academic_level_id,
        GroupId = p_group_id,
        SectionId = p_section_id,
        SecondLanguage = p_second_language,
        PreviousSchool = p_previous_school,
        PreviousBoard = p_previous_board,
        PreviousYear = p_previous_year,
        PreviousPercentage = p_previous_percentage,
        PreviousHallTicket = p_previous_hall_ticket,
        BirthCertificate = p_birth_certificate,
        TransferCertificate = p_transfer_certificate,
        StudyCertificate = p_study_certificate,
        AadhaarDocument = p_aadhaar_document,
        CommunityCertificate = p_community_certificate,
        IncomeCertificate = p_income_certificate,
        PassportPhoto = p_passport_photo,
        MarksMemo = p_marks_memo,
        CasteCertificate = p_caste_certificate,
        TenthCertificate = p_tenth_certificate,
        Status = p_status,
        AdmissionStatus = p_admission_status,
        InterviewRequired = p_interview_required,
        AdmissionFeeAmount = p_admission_fee_amount,
        Remarks = p_remarks,
        IsActive = p_is_active,
            UpdatedBy = p_updated_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0;

        SELECT * FROM studentadmissions WHERE AdmissionId = p_admission_id;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_StudentAdmission_UpdateAcademicDetails` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_StudentAdmission_UpdateAcademicDetails`(
    IN p_admission_id BIGINT,
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_medium VARCHAR(50),
    IN p_second_language VARCHAR(100),
    IN p_previous_school VARCHAR(200),
    IN p_previous_board VARCHAR(100),
    IN p_previous_year VARCHAR(20),
    IN p_previous_percentage DECIMAL(5,2),
    IN p_previous_hall_ticket VARCHAR(100),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student admission record not found.';
    END IF;

    IF p_previous_percentage IS NOT NULL
       AND (p_previous_percentage < 0 OR p_previous_percentage > 100) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Previous percentage must be between 0 and 100.';
    END IF;

    IF p_academic_year_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM academicyears
           WHERE academic_year_id = p_academic_year_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_section_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'sections'
       )
       AND NOT EXISTS (
           SELECT 1 FROM sections
           WHERE section_id = p_section_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    UPDATE studentadmissions
       SET BoardId = p_board_id,
           AcademicYearId = p_academic_year_id,
           AcademicLevelId = p_academic_level_id,
           GroupId = p_group_id,
           SectionId = p_section_id,
           Medium = NULLIF(TRIM(p_medium), ''),
           SecondLanguage = NULLIF(TRIM(p_second_language), ''),
           PreviousSchool = NULLIF(TRIM(p_previous_school), ''),
           PreviousBoard = NULLIF(TRIM(p_previous_board), ''),
           PreviousYear = NULLIF(TRIM(p_previous_year), ''),
           PreviousPercentage = p_previous_percentage,
           PreviousHallTicket = NULLIF(TRIM(p_previous_hall_ticket), ''),
           UpdatedBy = p_updated_by,
           UpdatedAt = UTC_TIMESTAMP()
     WHERE AdmissionId = p_admission_id
       AND IsDeleted = 0;

    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_fee_get` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_fee_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00), 0.00
        ) AS `FirstYearTotal`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AmountPaid`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00)
            - COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00), 0.00
        ) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`, 'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`, IF(sa.`AdmissionFeePaid` = 1, 'PAID', 'PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`, sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs
        ON fs.`admission_id` = sa.`AdmissionId`
    WHERE sa.`AdmissionId` = p_admission_id AND sa.`IsDeleted` = 0;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_fee_upsert` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_fee_upsert`(
    IN p_admission_id BIGINT,
    IN p_tuition_fee DECIMAL(12,2),
    IN p_admission_fee DECIMAL(12,2),
    IN p_hostel_fee DECIMAL(12,2),
    IN p_transportation_fee DECIMAL(12,2),
    IN p_scholarship_amount DECIMAL(12,2),
    IN p_payment_plan VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF COALESCE(p_tuition_fee, 0) < 0 OR COALESCE(p_admission_fee, 0) < 0
       OR COALESCE(p_hostel_fee, 0) < 0 OR COALESCE(p_transportation_fee, 0) < 0
       OR COALESCE(p_scholarship_amount, 0) < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee amounts cannot be negative.';
    END IF;

    INSERT INTO `student_admission_fee_structures` (
        `admission_id`, `tuition_fee`, `admission_fee`, `hostel_fee`,
        `transportation_fee`, `scholarship_amount`, `payment_plan`,
        `payment_status`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, COALESCE(p_tuition_fee, 0), COALESCE(p_admission_fee, 0),
        COALESCE(p_hostel_fee, 0), COALESCE(p_transportation_fee, 0),
        COALESCE(p_scholarship_amount, 0), COALESCE(NULLIF(TRIM(p_payment_plan), ''), 'ONE_TIME'),
        COALESCE(NULLIF(UPPER(TRIM(p_payment_status)), ''), 'PENDING'),
        UTC_TIMESTAMP(), p_updated_by, UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `tuition_fee` = VALUES(`tuition_fee`),
        `admission_fee` = VALUES(`admission_fee`),
        `hostel_fee` = VALUES(`hostel_fee`),
        `transportation_fee` = VALUES(`transportation_fee`),
        `scholarship_amount` = VALUES(`scholarship_amount`),
        `payment_plan` = VALUES(`payment_plan`),
        `payment_status` = VALUES(`payment_status`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;

    CALL `sp_student_admission_fee_get`(p_admission_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_form_data_upsert`(
    IN p_admission_id BIGINT,
    IN p_form_data LONGTEXT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF p_form_data IS NULL OR JSON_VALID(p_form_data) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission formData must be valid JSON.';
    END IF;

    INSERT INTO `student_admission_form_data` (
        `admission_id`, `form_data`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, CAST(p_form_data AS JSON), UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `form_data` = VALUES(`form_data`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_list` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_list`(
    IN p_search VARCHAR(255),
    IN p_admission_status VARCHAR(50),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;

    IF p_page_number IS NULL OR p_page_number < 1 THEN
        SET p_page_number = 1;
    END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
        SET p_page_size = 20;
    END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`,
        COUNT(*) OVER() AS `TotalRecords`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`IsDeleted` = 0
      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR sa.`RegistrationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`ApplicationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`AdmissionNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR CONCAT_WS(' ', sa.`FirstName`, sa.`LastName`) LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`StudentEmail` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`MobileNumber` LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
          NULLIF(TRIM(p_admission_status), '') IS NULL
          OR UPPER(sa.`AdmissionStatus`) = UPPER(TRIM(p_admission_status))
      )
    ORDER BY sa.`CreatedAt` DESC, sa.`AdmissionId` DESC
    LIMIT p_page_size OFFSET v_offset;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_get` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_previous_education_get`(IN p_admission_id BIGINT)
BEGIN
    IF EXISTS (
        SELECT 1 FROM `student_admission_previous_education`
        WHERE `admission_id` = p_admission_id
    ) THEN
        SELECT
            pe.`qualification_level` AS `QualificationLevel`,
            pe.`qualification` AS `Qualification`,
            pe.`board_or_university` AS `BoardOrUniversity`,
            pe.`institution` AS `Institution`,
            pe.`roll_number` AS `RollNumber`,
            pe.`passing_year` AS `PassingYear`,
            pe.`stream` AS `Stream`,
            pe.`score` AS `Score`,
            pe.`updated_at` AS `UpdatedAt`
        FROM `student_admission_previous_education` pe
        WHERE pe.`admission_id` = p_admission_id
        ORDER BY FIELD(pe.`qualification_level`, 'TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER'), pe.`previous_education_id`;
    ELSE
        SELECT
            'TENTH' AS `QualificationLevel`,
            'Class 10' AS `Qualification`,
            sa.`PreviousBoard` AS `BoardOrUniversity`,
            sa.`PreviousSchool` AS `Institution`,
            sa.`PreviousHallTicket` AS `RollNumber`,
            sa.`PreviousYear` AS `PassingYear`,
            NULL AS `Stream`,
            sa.`PreviousPercentage` AS `Score`,
            sa.`UpdatedAt` AS `UpdatedAt`
        FROM `studentadmissions` sa
        WHERE sa.`AdmissionId` = p_admission_id
          AND sa.`IsDeleted` = 0
          AND (sa.`PreviousSchool` IS NOT NULL OR sa.`PreviousBoard` IS NOT NULL
               OR sa.`PreviousPercentage` IS NOT NULL);
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_upsert` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_previous_education_upsert`(
    IN p_admission_id BIGINT,
    IN p_qualification_level VARCHAR(30),
    IN p_qualification VARCHAR(100),
    IN p_board_or_university VARCHAR(150),
    IN p_institution VARCHAR(255),
    IN p_roll_number VARCHAR(50),
    IN p_passing_year VARCHAR(20),
    IN p_stream VARCHAR(100),
    IN p_score DECIMAL(5,2),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_level VARCHAR(30);
    SET v_level = UPPER(TRIM(p_qualification_level));

    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_level NOT IN ('TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid qualification level.';
    END IF;
    IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score must be between 0 and 100.';
    END IF;

    INSERT INTO `student_admission_previous_education` (
        `admission_id`, `qualification_level`, `qualification`,
        `board_or_university`, `institution`, `roll_number`, `passing_year`,
        `stream`, `score`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, v_level, NULLIF(TRIM(p_qualification), ''),
        NULLIF(TRIM(p_board_or_university), ''), NULLIF(TRIM(p_institution), ''),
        NULLIF(TRIM(p_roll_number), ''), NULLIF(TRIM(p_passing_year), ''),
        NULLIF(TRIM(p_stream), ''), p_score, UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `qualification` = VALUES(`qualification`),
        `board_or_university` = VALUES(`board_or_university`),
        `institution` = VALUES(`institution`),
        `roll_number` = VALUES(`roll_number`),
        `passing_year` = VALUES(`passing_year`),
        `stream` = VALUES(`stream`),
        `score` = VALUES(`score`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_admission_submit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_admission_submit`(
    IN p_admission_id BIGINT,
    IN p_submitted_by BIGINT
)
BEGIN
    DECLARE v_previous_status VARCHAR(50) DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_submitted_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    SELECT `AdmissionStatus` INTO v_previous_status
    FROM `studentadmissions`
    WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    LIMIT 1;

    IF v_previous_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_previous_status NOT IN ('Draft', 'Registered', 'Application Submitted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a draft or registered admission can be submitted.';
    END IF;

    IF v_previous_status <> 'Application Submitted' THEN
        UPDATE `studentadmissions`
        SET `AdmissionStatus` = 'Application Submitted',
            `SubmittedAt` = UTC_TIMESTAMP(),
            `UpdatedAt` = UTC_TIMESTAMP(),
            `UpdatedBy` = p_submitted_by
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0;

        INSERT INTO `admission_status_history` (
            `AdmissionId`, `PreviousStatus`, `NewStatus`, `ActionType`, `Remarks`,
            `ChangedBy`, `ChangedAt`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
        ) VALUES (
            p_admission_id, v_previous_status, 'Application Submitted', 'SUBMITTED',
            'Admission application submitted through the API.', p_submitted_by,
            UTC_TIMESTAMP(), 1, 0, p_submitted_by, UTC_TIMESTAMP()
        );
    END IF;

    SELECT
        sa.`AdmissionId`, sa.`AdmissionStatus`, sa.`SubmittedAt`
    FROM `studentadmissions` sa
    WHERE sa.`AdmissionId` = p_admission_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_code_exists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_code_exists`(
    IN p_student_code VARCHAR(50),
    IN p_exclude_student_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
          AND (p_exclude_student_id IS NULL OR student_id <> p_exclude_student_id)
    ) AS exists_value;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_create`(
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_student_id BIGINT;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    INSERT INTO students
    (
        college_id,
        student_code,
        full_name,
        gender,
        date_of_birth,
        email,
        mobile,
        blood_group,
        address,
        course_id,
        branch_id,
        academic_year_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        UPPER(TRIM(p_student_code)),
        TRIM(p_full_name),
        NULLIF(TRIM(p_gender), ''),
        p_date_of_birth,
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_mobile), ''),
        NULLIF(TRIM(p_blood_group), ''),
        NULLIF(TRIM(p_address), ''),
        p_course_id,
        p_branch_id,
        p_academic_year_id,
        p_status,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_student_id = LAST_INSERT_ID();
    CALL sp_student_get_by_id(v_student_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_documents_get_by_student_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_documents_get_by_student_id`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        documents.`document_id`, documents.`student_id`,
        documents.`document_type`, documents.`file_name`, documents.`uploaded_date`
    FROM (
        SELECT
            f.`document_id`, f.`student_id`, f.`document_type`,
            f.`file_name`, f.`uploaded_date`, 0 AS `display_order`
        FROM `student_document_files` f
        WHERE f.`student_id` = p_student_id AND f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + 1, sd.`Student_Id`, 'Aadhaar Document', sd.`AadhaarDocument`, sd.`UploadedDate`, 1
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`AadhaarDocument`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 2, sd.`Student_Id`, 'Previous Certificates', sd.`PreviousCertificates`, sd.`UploadedDate`, 2
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PreviousCertificates`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 3, sd.`Student_Id`, 'Transfer Certificate', sd.`TransferCertificate`, sd.`UploadedDate`, 3
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`TransferCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 4, sd.`Student_Id`, 'Passport Photo', sd.`PassportPhoto`, sd.`UploadedDate`, 4
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PassportPhoto`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 5, sd.`Student_Id`, 'Caste Certificate', sd.`CasteCertificate`, sd.`UploadedDate`, 5
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`CasteCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 6, sd.`Student_Id`, 'Income Certificate', sd.`IncomeCertificate`, sd.`UploadedDate`, 6
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`IncomeCertificate`), '') IS NOT NULL
    ) documents
    ORDER BY documents.`uploaded_date` DESC, documents.`display_order`, documents.`document_id` DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_document_create` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_document_create`(
    IN p_student_id BIGINT,
    IN p_document_type VARCHAR(100),
    IN p_file_name VARCHAR(255),
    IN p_file_path VARCHAR(500),
    IN p_content_type VARCHAR(150),
    IN p_file_size BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_document_id BIGINT;

    IF NOT EXISTS (
        SELECT 1 FROM `students`
        WHERE `student_id` = p_student_id AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;
    IF NULLIF(TRIM(p_document_type), '') IS NULL
       OR NULLIF(TRIM(p_file_name), '') IS NULL
       OR NULLIF(TRIM(p_file_path), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Document type, file name and file path are required.';
    END IF;

    INSERT INTO `student_document_files` (
        `student_id`, `document_type`, `file_name`, `file_path`,
        `content_type`, `file_size`, `uploaded_date`, `created_by`
    ) VALUES (
        p_student_id, TRIM(p_document_type), TRIM(p_file_name), TRIM(p_file_path),
        NULLIF(TRIM(p_content_type), ''), p_file_size, UTC_TIMESTAMP(), p_created_by
    );
    SET v_document_id = LAST_INSERT_ID();

    SELECT
        f.`document_id` AS `DocumentId`,
        f.`student_id` AS `StudentId`,
        f.`document_type` AS `DocumentType`,
        f.`file_name` AS `FileName`,
        f.`file_path` AS `FilePath`,
        f.`content_type` AS `ContentType`,
        f.`file_size` AS `FileSize`,
        f.`uploaded_date` AS `UploadedDate`
    FROM `student_document_files` f
    WHERE f.`document_id` = v_document_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_document_delete` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_document_delete`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    DECLARE v_deleted INT DEFAULT 0;
    DECLARE v_legacy_source_id BIGINT DEFAULT 0;
    DECLARE v_legacy_type INT DEFAULT 0;

    UPDATE `student_document_files`
    SET `is_deleted` = 1,
        `deleted_at` = UTC_TIMESTAMP(),
        `deleted_by` = p_deleted_by
    WHERE `document_id` = p_document_id
      AND `student_id` = p_student_id
      AND `is_deleted` = 0;
    SET v_deleted = ROW_COUNT();

    IF v_deleted = 0 AND p_document_id < 1000000000 THEN
        SET v_legacy_source_id = FLOOR(p_document_id / 100);
        SET v_legacy_type = MOD(p_document_id, 100);

        UPDATE `student_documents`
        SET `AadhaarDocument` = IF(v_legacy_type = 1, NULL, `AadhaarDocument`),
            `PreviousCertificates` = IF(v_legacy_type = 2, NULL, `PreviousCertificates`),
            `TransferCertificate` = IF(v_legacy_type = 3, NULL, `TransferCertificate`),
            `PassportPhoto` = IF(v_legacy_type = 4, NULL, `PassportPhoto`),
            `CasteCertificate` = IF(v_legacy_type = 5, NULL, `CasteCertificate`),
            `IncomeCertificate` = IF(v_legacy_type = 6, NULL, `IncomeCertificate`)
        WHERE `DocumentId` = v_legacy_source_id
          AND `Student_Id` = p_student_id
          AND v_legacy_type BETWEEN 1 AND 6;
        SET v_deleted = ROW_COUNT();
    END IF;

    SELECT IF(v_deleted > 0, 1, 0) AS `Deleted`;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_document_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_document_get_by_id`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT
)
BEGIN
    SELECT
        d.`DocumentId`, d.`StudentId`, d.`DocumentType`, d.`FileName`,
        d.`FilePath`, d.`ContentType`, d.`FileSize`, d.`UploadedDate`
    FROM (
        SELECT
            f.`document_id` AS `DocumentId`,
            f.`student_id` AS `StudentId`,
            f.`document_type` AS `DocumentType`,
            f.`file_name` AS `FileName`,
            f.`file_path` AS `FilePath`,
            f.`content_type` AS `ContentType`,
            f.`file_size` AS `FileSize`,
            f.`uploaded_date` AS `UploadedDate`
        FROM `student_document_files` f
        WHERE f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + legacy.`type_number`, sd.`Student_Id`,
            legacy.`document_type`, legacy.`file_name`, legacy.`file_name`,
            NULL, NULL, sd.`UploadedDate`
        FROM `student_documents` sd
        INNER JOIN (
            SELECT 1 AS `type_number`, 'Aadhaar Document' AS `document_type`,
                sd1.`AadhaarDocument` AS `file_name`, sd1.`DocumentId` AS `source_id`
            FROM `student_documents` sd1
            UNION ALL SELECT 2, 'Previous Certificates', sd2.`PreviousCertificates`, sd2.`DocumentId` FROM `student_documents` sd2
            UNION ALL SELECT 3, 'Transfer Certificate', sd3.`TransferCertificate`, sd3.`DocumentId` FROM `student_documents` sd3
            UNION ALL SELECT 4, 'Passport Photo', sd4.`PassportPhoto`, sd4.`DocumentId` FROM `student_documents` sd4
            UNION ALL SELECT 5, 'Caste Certificate', sd5.`CasteCertificate`, sd5.`DocumentId` FROM `student_documents` sd5
            UNION ALL SELECT 6, 'Income Certificate', sd6.`IncomeCertificate`, sd6.`DocumentId` FROM `student_documents` sd6
        ) legacy ON legacy.`source_id` = sd.`DocumentId`
        WHERE NULLIF(TRIM(legacy.`file_name`), '') IS NOT NULL
    ) d
    WHERE d.`StudentId` = p_student_id
      AND d.`DocumentId` = p_document_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_get_all`(
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_get_by_id`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_profile_full_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_profile_full_update`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_father_name VARCHAR(150),
    IN p_father_mobile VARCHAR(20),
    IN p_father_email VARCHAR(150),
    IN p_father_occupation VARCHAR(100),
    IN p_mother_name VARCHAR(150),
    IN p_mother_mobile VARCHAR(20),
    IN p_mother_email VARCHAR(150),
    IN p_mother_occupation VARCHAR(100),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_existing_student_id BIGINT DEFAULT NULL;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0
       OR p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student and college are required.';
    END IF;
    IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;
    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_changed_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    SELECT s.`student_id`
      INTO v_existing_student_id
    FROM `students` s
    WHERE s.`student_id` = p_student_id
      AND s.`college_id` = p_college_id
      AND s.`deleted_at` IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_existing_student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student profile not found for this college.';
    END IF;

    SELECT sp.`StudentProfileId`
      INTO v_profile_id
    FROM `student_profiles` sp
    WHERE sp.`StudentId` = p_student_id AND sp.`IsDeleted` = 0
    LIMIT 1
    FOR UPDATE;

    IF v_profile_id IS NULL THEN
        INSERT INTO `student_profiles` (
            `StudentId`, `BloodGroup`, `Address`, `IsActive`, `IsDeleted`,
            `CreatedBy`, `CreatedAt`, `UpdatedBy`, `UpdatedAt`
        ) VALUES (
            p_student_id, p_blood_group, p_address, 1, 0,
            p_changed_by, UTC_TIMESTAMP(), p_changed_by, UTC_TIMESTAMP()
        );
        SET v_profile_id = LAST_INSERT_ID();
    END IF;

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_old_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    UPDATE `students`
    SET `full_name` = TRIM(p_full_name),
        `gender` = COALESCE(NULLIF(TRIM(p_gender), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM(p_email), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM(p_mobile), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM(p_address), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM(p_address), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM(p_father_name), ''), NULLIF(TRIM(p_father_mobile), ''),
        NULLIF(TRIM(p_father_email), ''), NULLIF(TRIM(p_father_occupation), ''),
        NULLIF(TRIM(p_mother_name), ''), NULLIF(TRIM(p_mother_mobile), ''),
        NULLIF(TRIM(p_mother_email), ''), NULLIF(TRIM(p_mother_occupation), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM(p_father_name), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM(p_father_mobile), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM(p_father_email), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM(p_father_occupation), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM(p_mother_name), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM(p_mother_mobile), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM(p_mother_email), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM(p_mother_occupation), ''), `mother_occupation`),
        `updated_at` = UTC_TIMESTAMP();

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    INSERT INTO `student_profile_updates` (
        `StudentProfileId`, `StudentId`, `ChangeType`, `ChangedFields`,
        `OldValues`, `NewValues`, `ChangeReason`, `ChangeSource`,
        `ChangedBy`, `ChangedAt`, `IpAddress`, `UserAgent`
    ) VALUES (
        v_profile_id, p_student_id, 'ProfileScreenUpdate',
        JSON_ARRAY(
            'FullName', 'Gender', 'DateOfBirth', 'Email', 'Mobile',
            'BloodGroup', 'Address', 'FatherName', 'FatherMobile',
            'FatherEmail', 'FatherOccupation', 'MotherName', 'MotherMobile',
            'MotherEmail', 'MotherOccupation'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_profile_get_all` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_profile_get_all`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(200),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_id BIGINT,
    IN p_status INT
)
BEGIN

    SELECT
        s.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,
        COALESCE(sp.ProfilePhoto, sa.StudentPhoto, sa.PassportPhoto) AS ProfilePhoto,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        -- Admission information
        sa.RegistrationNo AS RegistrationNumber,
        sa.AdmissionNo AS AdmissionNumber,

        -- Academic information
        s.course_id AS CourseId,
        c.course_name AS Course,

        s.branch_id AS BranchId,
        b.branch_name AS Branch,

        b.department_id AS DepartmentId,
        d.department_name AS Department,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,
        sec.section_id AS SectionId,
        sec.section_name AS Section,

        -- Contact
        s.mobile AS Mobile,
        s.email AS Email,

        -- Status
        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.college_id = p_college_id
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            p_search IS NULL
            OR TRIM(p_search) = ''

            OR s.full_name LIKE CONCAT('%', p_search, '%')

            OR s.student_code LIKE CONCAT('%', p_search, '%')

            OR s.mobile LIKE CONCAT('%', p_search, '%')

            OR s.email LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

        -- Department
        AND
        (
            p_department_id IS NULL
            OR b.department_id = p_department_id
        )

        -- Course
        AND
        (
            p_course_id IS NULL
            OR s.course_id = p_course_id
        )

        -- Branch
        AND
        (
            p_branch_id IS NULL
            OR s.branch_id = p_branch_id
        )

        -- Academic Year
        AND
        (
            p_academic_year_id IS NULL
            OR s.academic_year_id = p_academic_year_id
        )

        -- Semester
        AND
        (
            p_semester IS NULL
            OR sec.semester = p_semester
        )

        -- Section
        AND
        (
            p_section_id IS NULL
            OR sec.section_id = p_section_id
        )

        -- Status
        AND
        (
            p_status IS NULL
            OR s.status = p_status
        )

    ORDER BY
        s.student_id DESC;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_profile_get_preview` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_profile_get_preview`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT

        /* =========================
           HEADER
           ========================= */

        s.student_id AS StudentId,

        s.student_code AS StudentCode,

        s.full_name AS StudentName,

        COALESCE(
            sp.ProfilePhoto,
            sa.StudentPhoto,
            sa.PassportPhoto
        ) AS ProfilePhoto,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status,


        /* =========================
           SUMMARY
           ========================= */

        sa.RegistrationNo AS RegistrationNumber,

        sa.AdmissionNo AS AdmissionNumber,

        NULL AS RollNumber,

        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS StudentStatus,


        /* =========================
           FEE STATUS
           ========================= */

        CASE

            WHEN sa.AdmissionFeeAmount IS NULL
                THEN 'Not available'

            WHEN sa.AdmissionFeeAmount = 0
                THEN 'Not available'

            WHEN sa.AdmissionFeePaid = 1
                THEN 'Paid'

            ELSE 'Pending'

        END AS FeeStatus,


        /* =========================
           ATTENDANCE / RESULTS
           ========================= */

        'Not available' AS AttendanceStatus,

        'Not available' AS ResultStatus,


        /* =========================
           ACADEMIC INFORMATION
           ========================= */

        s.course_id AS CourseId,

        c.course_name AS Course,

        b.department_id AS DepartmentId,

        d.department_name AS Department,

        s.branch_id AS BranchId,

        b.branch_name AS Branch,

        s.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,

        sec.section_id AS SectionId,

        sec.section_name AS Section,

        NULL AS AcademicRollNumber,

        sa.RegistrationNo AS AcademicRegistrationNumber,


        /* =========================
           PERSONAL INFORMATION
           ========================= */

        s.full_name AS PersonalFullName,

        s.gender AS Gender,

        s.date_of_birth AS DateOfBirth,

        s.mobile AS Mobile,

        s.email AS Email,

        s.blood_group AS BloodGroup,

        s.address AS Address,


        /* =========================
           PARENT / GUARDIAN
           ========================= */

        COALESCE(spar.father_name, sa.FatherName) AS FatherName,

        COALESCE(spar.mother_name, sa.MotherName) AS MotherName,

        sa.GuardianName AS GuardianName,

        COALESCE(spar.father_mobile, spar.mother_mobile, sa.GuardianMobile) AS ParentMobile,

        COALESCE(spar.father_email, spar.mother_email, sa.GuardianEmail) AS ParentEmail,

        COALESCE(spar.father_occupation, sa.Occupation) AS FatherOccupation,

        spar.mother_occupation AS MotherOccupation


    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN student_parents spar
        ON spar.student_id = s.student_id

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.student_id = p_student_id
        AND s.college_id = p_college_id
        AND s.deleted_at IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_profile_personal_get` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_profile_personal_get`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto AS profile_photo,
        sp.AlternateEmail AS alternate_email,
        sp.AlternateMobile AS alternate_mobile,
        COALESCE(sp.BloodGroup, s.blood_group) AS blood_group,
        sp.Nationality AS nationality,
        sp.Religion AS religion,
        sp.Category AS category,
        COALESCE(sp.Address, s.address) AS address,
        sp.City AS city,
        sp.District AS district,
        sp.State AS state,
        COALESCE(sp.Country, 'India') AS country,
        sp.Pincode AS pincode,
        COALESCE(sp.ProfileStatus, 'Incomplete') AS profile_status,
        COALESCE(sp.IsProfileCompleted, 0) AS is_profile_completed,
        COALESCE(sp.IsVerified, 0) AS is_verified,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS profile_completion_percentage,
        s.college_id,
        s.course_id,
        c.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        COALESCE(
            GREATEST(
                COALESCE(s.updated_at, s.created_at),
                COALESCE(sp.UpdatedAt, sp.CreatedAt)
            ),
            s.updated_at,
            s.created_at
        ) AS updated_at
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    LEFT JOIN courses c
        ON c.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_profile_personal_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_profile_personal_update`(
    IN p_student_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_profile_photo VARCHAR(500),
    IN p_alternate_email VARCHAR(150),
    IN p_alternate_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_nationality VARCHAR(100),
    IN p_religion VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_changed_fields JSON;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE v_old_full_name VARCHAR(150);
    DECLARE v_old_gender VARCHAR(20);
    DECLARE v_old_date_of_birth DATE;
    DECLARE v_old_email VARCHAR(150);
    DECLARE v_old_mobile VARCHAR(20);
    DECLARE v_old_profile_photo VARCHAR(500);
    DECLARE v_old_alternate_email VARCHAR(150);
    DECLARE v_old_alternate_mobile VARCHAR(20);
    DECLARE v_old_blood_group VARCHAR(10);
    DECLARE v_old_nationality VARCHAR(100);
    DECLARE v_old_religion VARCHAR(100);
    DECLARE v_old_category VARCHAR(100);
    DECLARE v_old_address TEXT;
    DECLARE v_old_city VARCHAR(100);
    DECLARE v_old_district VARCHAR(100);
    DECLARE v_old_state VARCHAR(100);
    DECLARE v_old_country VARCHAR(100);
    DECLARE v_old_pincode VARCHAR(10);
    DECLARE v_completion_percentage DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_completed TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_changed_fields = JSON_ARRAY();
    SET v_old_values = JSON_OBJECT();
    SET v_new_values = JSON_OBJECT();

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid logged-in user is required.';
    END IF;

    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_student_exists
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_student_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student profile not found.';
    END IF;

    SELECT
        sp.StudentProfileId,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto,
        sp.AlternateEmail,
        sp.AlternateMobile,
        COALESCE(sp.BloodGroup, s.blood_group),
        sp.Nationality,
        sp.Religion,
        sp.Category,
        COALESCE(sp.Address, s.address),
        sp.City,
        sp.District,
        sp.State,
        COALESCE(sp.Country, 'India'),
        sp.Pincode
    INTO
        v_profile_id,
        v_old_full_name,
        v_old_gender,
        v_old_date_of_birth,
        v_old_email,
        v_old_mobile,
        v_old_profile_photo,
        v_old_alternate_email,
        v_old_alternate_mobile,
        v_old_blood_group,
        v_old_nationality,
        v_old_religion,
        v_old_category,
        v_old_address,
        v_old_city,
        v_old_district,
        v_old_state,
        v_old_country,
        v_old_pincode
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF p_full_name IS NOT NULL AND NOT (p_full_name <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', p_full_name);
    END IF;
    IF p_gender IS NOT NULL AND NOT (p_gender <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', p_gender);
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF p_email IS NOT NULL AND NOT (p_email <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', p_email);
    END IF;
    IF p_mobile IS NOT NULL AND NOT (p_mobile <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', p_mobile);
    END IF;
    IF p_profile_photo IS NOT NULL AND NOT (p_profile_photo <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', p_profile_photo);
    END IF;
    IF p_alternate_email IS NOT NULL AND NOT (p_alternate_email <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', p_alternate_email);
    END IF;
    IF p_alternate_mobile IS NOT NULL AND NOT (p_alternate_mobile <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', p_alternate_mobile);
    END IF;
    IF p_blood_group IS NOT NULL AND NOT (p_blood_group <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', p_blood_group);
    END IF;
    IF p_nationality IS NOT NULL AND NOT (p_nationality <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', p_nationality);
    END IF;
    IF p_religion IS NOT NULL AND NOT (p_religion <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', p_religion);
    END IF;
    IF p_category IS NOT NULL AND NOT (p_category <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', p_category);
    END IF;
    IF p_address IS NOT NULL AND NOT (p_address <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', p_address);
    END IF;
    IF p_city IS NOT NULL AND NOT (p_city <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', p_city);
    END IF;
    IF p_district IS NOT NULL AND NOT (p_district <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', p_district);
    END IF;
    IF p_state IS NOT NULL AND NOT (p_state <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', p_state);
    END IF;
    IF p_country IS NOT NULL AND NOT (p_country <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', p_country);
    END IF;
    IF p_pincode IS NOT NULL AND NOT (p_pincode <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', p_pincode);
    END IF;

    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE(p_full_name, full_name),
        gender = COALESCE(p_gender, gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE(p_email, email),
        mobile = COALESCE(p_mobile, mobile),
        blood_group = COALESCE(p_blood_group, blood_group),
        address = COALESCE(p_address, address),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_changed_by
    WHERE student_id = p_student_id;

    IF v_profile_id IS NULL THEN
        INSERT INTO student_profiles
        (
            StudentId, ProfilePhoto, AlternateEmail, AlternateMobile,
            BloodGroup, Nationality, Religion, Category, Address,
            City, District, State, Country, Pincode,
            IsActive, IsDeleted, CreatedBy, CreatedAt
        )
        VALUES
        (
            p_student_id, p_profile_photo, p_alternate_email, p_alternate_mobile,
            p_blood_group, p_nationality, p_religion, p_category, p_address,
            p_city, p_district, p_state, COALESCE(p_country, 'India'), p_pincode,
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE(p_profile_photo, ProfilePhoto),
            AlternateEmail = COALESCE(p_alternate_email, AlternateEmail),
            AlternateMobile = COALESCE(p_alternate_mobile, AlternateMobile),
            BloodGroup = COALESCE(p_blood_group, BloodGroup),
            Nationality = COALESCE(p_nationality, Nationality),
            Religion = COALESCE(p_religion, Religion),
            Category = COALESCE(p_category, Category),
            Address = COALESCE(p_address, Address),
            City = COALESCE(p_city, City),
            District = COALESCE(p_district, District),
            State = COALESCE(p_state, State),
            Country = COALESCE(p_country, Country),
            Pincode = COALESCE(p_pincode, Pincode),
            UpdatedBy = p_changed_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentProfileId = v_profile_id;
    END IF;

    SELECT
        ROUND(
            (
                (s.full_name IS NOT NULL AND TRIM(s.full_name) <> '') +
                (s.gender IS NOT NULL AND TRIM(s.gender) <> '') +
                (s.date_of_birth IS NOT NULL) +
                (s.email IS NOT NULL AND TRIM(s.email) <> '') +
                (s.mobile IS NOT NULL AND TRIM(s.mobile) <> '') +
                (sp.BloodGroup IS NOT NULL AND TRIM(sp.BloodGroup) <> '') +
                (sp.Nationality IS NOT NULL AND TRIM(sp.Nationality) <> '') +
                (sp.Address IS NOT NULL AND TRIM(sp.Address) <> '') +
                (sp.City IS NOT NULL AND TRIM(sp.City) <> '') +
                (sp.District IS NOT NULL AND TRIM(sp.District) <> '') +
                (sp.State IS NOT NULL AND TRIM(sp.State) <> '') +
                (sp.Country IS NOT NULL AND TRIM(sp.Country) <> '') +
                (sp.Pincode IS NOT NULL AND TRIM(sp.Pincode) <> '')
            ) / 13 * 100,
            2
        )
    INTO v_completion_percentage
    FROM students s
    INNER JOIN student_profiles sp ON sp.StudentId = s.student_id
    WHERE s.student_id = p_student_id;

    SET v_completed = IF(v_completion_percentage = 100.00, 1, 0);

    UPDATE student_profiles
    SET
        ProfileCompletionPercentage = v_completion_percentage,
        IsProfileCompleted = v_completed,
        ProfileStatus = CASE
            WHEN ProfileStatus IN ('Verified', 'Active', 'Inactive', 'Suspended')
                THEN ProfileStatus
            WHEN v_completed = 1 THEN 'Pending Verification'
            ELSE 'Incomplete'
        END,
        UpdatedBy = p_changed_by,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentProfileId = v_profile_id;

    INSERT INTO student_profile_updates
    (
        StudentProfileId,
        StudentId,
        ChangeType,
        ChangedFields,
        OldValues,
        NewValues,
        ChangeReason,
        ChangeSource,
        ChangedBy,
        ChangedAt,
        IpAddress,
        UserAgent
    )
    VALUES
    (
        v_profile_id,
        p_student_id,
        'Update',
        CAST(v_changed_fields AS CHAR),
        CAST(v_old_values AS CHAR),
        CAST(v_new_values AS CHAR),
        NULLIF(TRIM(p_change_reason), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        p_ip_address,
        p_user_agent
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promote` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promote`(
    IN p_student_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_course_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_target_level_number INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    -- Lock the student and its current academic context.
    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.course_type,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_course_type,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student, course, or academic year is unavailable.';
    END IF;

    -- The active assignment is the authoritative semester/section.
    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE ssa.student_id = p_student_id
      AND ssa.academic_year_id = v_from_academic_year_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC,
             ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    IF v_from_semester <= 0 OR v_from_semester >= v_total_semesters THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student is already in the final semester or has an invalid semester.';
    END IF;

    SET v_to_semester = v_from_semester + 1;

    -- Two semesters share an academic year. Crossing an even semester
    -- requires the next configured active academic year.
    IF MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id
        INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.status = 1
          AND ay.is_archived = 0
          AND ay.deleted_at IS NULL
        ORDER BY ay.start_date ASC, ay.academic_year_id ASC
        LIMIT 1
        FOR UPDATE;

        IF v_to_academic_year_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Activate the next academic year before cross-year promotion.';
        END IF;
    END IF;

    SET v_target_level_number = CEIL(v_to_semester / 2.0);

    IF NOT EXISTS (
        SELECT 1
        FROM academic_levels al
        WHERE al.academic_year_id = v_to_academic_year_id
          AND al.level_number = v_target_level_number
          AND al.level_type = v_course_type
          AND al.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The target academic level is not configured.';
    END IF;

    -- Choose an active target section with capacity and lock it.
    SELECT sec.section_id
    INTO v_to_section_id
    FROM sections sec
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE sec.college_id = v_college_id
      AND sec.academic_year_id = v_to_academic_year_id
      AND sec.course_id = v_course_id
      AND sec.branch_id <=> v_branch_id
      AND COALESCE(sec.semester, sem.semester_number) = v_to_semester
      AND sec.status = 1
      AND sec.is_archived = 0
      AND sec.deleted_at IS NULL
      AND (
          SELECT COUNT(*)
          FROM student_section_assignments target_ssa
          WHERE target_ssa.section_id = sec.section_id
            AND target_ssa.status = 1
      ) < sec.capacity
    ORDER BY
        (
            SELECT COUNT(*)
            FROM student_section_assignments target_ssa
            WHERE target_ssa.section_id = sec.section_id
              AND target_ssa.status = 1
        ) ASC,
        sec.section_id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_to_section_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No active target-semester section with capacity is configured.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.to_academic_year_id = v_to_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.to_semester = v_to_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This semester promotion is already recorded.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    -- History, assignment movement, and student context are one unit.
    INSERT INTO student_promotions (
        student_id,
        college_id,
        from_academic_year_id,
        to_academic_year_id,
        from_course_id,
        to_course_id,
        from_branch_id,
        to_branch_id,
        from_section_id,
        to_section_id,
        from_semester,
        to_semester,
        promotion_status,
        decision,
        decision_date,
        decision_by,
        remarks,
        promotion_eligibility,
        eligibility_remarks,
        promotion_type,
        promotion_date,
        effective_date,
        promotion_reason,
        approved_at,
        is_final,
        promotion_order,
        is_active,
        created_at,
        created_by
    ) VALUES (
        p_student_id,
        v_college_id,
        v_from_academic_year_id,
        v_to_academic_year_id,
        v_course_id,
        v_course_id,
        v_branch_id,
        v_branch_id,
        v_from_section_id,
        v_to_section_id,
        v_from_semester,
        v_to_semester,
        'APPROVED',
        'APPROVE',
        UTC_TIMESTAMP(),
        p_created_by,
        'Student academic progression completed.',
        'ELIGIBLE',
        'Approved by an authorized user.',
        CASE
            WHEN v_to_academic_year_id = v_from_academic_year_id
                THEN 'SEMESTER'
            ELSE 'ACADEMIC_YEAR'
        END,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP(),
        'Academic progression.',
        UTC_TIMESTAMP(),
        IF(v_to_semester = v_total_semesters, 1, 0),
        v_promotion_order,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    INSERT INTO student_section_assignments (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    ) VALUES (
        p_student_id,
        v_to_section_id,
        v_to_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic progression could not be updated.';
    END IF;

    COMMIT;

    -- PascalCase columns support Dapper; snake_case aliases preserve the
    -- older StudentRepository reader contract. No existing caller is removed.
    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,

        sp.promotion_id AS promotion_id,
        sp.student_id AS student_id,
        sp.from_academic_year_id AS from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        sp.to_academic_year_id AS to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        sp.from_course_id AS from_course_id,
        sp.to_course_id AS to_course_id,
        sp.from_branch_id AS from_branch_id,
        sp.to_branch_id AS to_branch_id,
        sp.promotion_status AS promotion_status,
        sp.decision AS decision,
        sp.promotion_eligibility AS promotion_eligibility,
        sp.promotion_type AS promotion_type,
        sp.promotion_date AS promotion_date,
        sp.effective_date AS effective_date,
        sp.remarks AS remarks
    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_dashboard` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_dashboard`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        COUNT(*) AS `TotalStudents`,
        SUM(IF(latest.`promotion_id` IS NULL OR latest.`promotion_status` = 'PENDING', 1, 0)) AS `PendingReview`,
        SUM(IF(latest.`promotion_eligibility` = 'ELIGIBLE', 1, 0)) AS `Eligible`,
        SUM(IF(latest.`promotion_status` = 'APPROVED', 1, 0)) AS `Promoted`,
        SUM(IF(latest.`promotion_status` = 'REJECTED', 1, 0)) AS `Rejected`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Failed`,
        SUM(IF(latest.`promotion_eligibility` = 'DETAINED', 1, 0)) AS `Detained`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Backlogs`,
        0 AS `PrerequisiteIssues`
    FROM `students` s
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_directory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        s.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        s.`email` AS `Email`,
        s.`mobile` AS `Mobile`,
        d.`department_name` AS `DepartmentName`,
        s.`course_id` AS `CourseId`,
        COALESCE(NULLIF(c.`course_short_name`, ''), c.`course_name`) AS `CourseName`,
        s.`branch_id` AS `BranchId`,
        b.`branch_name` AS `BranchName`,
        s.`academic_year_id` AS `AcademicYearId`,
        ay.`academic_year_name` AS `AcademicYearName`,
        COALESCE(sec.`semester`, sem.`semester_number`) AS `CurrentSemester`,
        CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`)) AS `CurrentSemesterName`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN COALESCE(sec.`semester`, sem.`semester_number`) + 1 ELSE NULL END AS `TargetSemester`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`) + 1)
             ELSE 'Degree Completion Review' END AS `TargetSemesterName`,
        sec.`section_name` AS `SectionName`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CAST(NULL AS DECIMAL(5,2)) AS `Sgpa`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS SIGNED) AS `FailedSubjectCount`,
        CAST(NULL AS SIGNED) AS `PrerequisiteIssueCount`,
        0 AS `ResultsAvailable`,
        'PENDING_MODULE' AS `ExamIntegrationStatus`,
        COALESCE(latest.`promotion_status`, 'PENDING') AS `PromotionStatus`,
        COALESCE(latest.`promotion_eligibility`, 'PENDING_RESULTS') AS `EligibilityStatus`
    FROM `students` s
    LEFT JOIN `courses` c ON c.`course_id` = s.`course_id`
    LEFT JOIN `branches` b ON b.`branch_id` = s.`branch_id`
    LEFT JOIN `departments` d ON d.`department_id` = b.`department_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    INNER JOIN `academicyears` ay ON ay.`academic_year_id` = s.`academic_year_id`
    LEFT JOIN `student_section_assignments` ssa
        ON ssa.`student_section_assignment_id` = (
            SELECT MAX(ssa2.`student_section_assignment_id`)
            FROM `student_section_assignments` ssa2
            WHERE ssa2.`student_id` = s.`student_id` AND ssa2.`status` = 1
        )
    LEFT JOIN `sections` sec ON sec.`section_id` = ssa.`section_id`
    LEFT JOIN `semesters` sem ON sem.`semester_id` = sec.`semester_id`
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
    ORDER BY s.`full_name`, s.`student_id`
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `students` s
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_get_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_get_by_id`(
    IN p_promotion_id BIGINT
)
BEGIN
    SELECT
        p.promotion_id,
        p.student_id,
        s.student_code,
        s.full_name AS student_name,
        COALESCE(p.college_id, s.college_id) AS college_id,
        p.from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        p.to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        p.from_course_id,
        fc.course_name AS from_course_name,
        p.to_course_id,
        tc.course_name AS to_course_name,
        p.from_branch_id,
        fb.branch_name AS from_branch_name,
        p.to_branch_id,
        tb.branch_name AS to_branch_name,
        p.from_semester,
        p.to_semester,
        p.from_section_id,
        fs.section_name AS from_section_name,
        p.to_section_id,
        ts.section_name AS to_section_name,
        p.promotion_status,
        p.decision,
        p.decision_date,
        p.decision_by,
        u.full_name AS decision_by_name,
        p.promotion_type,
        p.promotion_date,
        p.effective_date,
        p.promotion_reason,
        p.remarks,
        p.is_final,
        p.promotion_order,
        p.created_at,
        p.created_by
    FROM student_promotions p
    INNER JOIN students s
        ON s.student_id = p.student_id
    INNER JOIN academicyears fay
        ON fay.academic_year_id = p.from_academic_year_id
    INNER JOIN academicyears tay
        ON tay.academic_year_id = p.to_academic_year_id
    LEFT JOIN courses fc
        ON fc.course_id = p.from_course_id
    LEFT JOIN courses tc
        ON tc.course_id = p.to_course_id
    LEFT JOIN branches fb
        ON fb.branch_id = p.from_branch_id
    LEFT JOIN branches tb
        ON tb.branch_id = p.to_branch_id
    LEFT JOIN sections fs
        ON fs.section_id = p.from_section_id
    LEFT JOIN sections ts
        ON ts.section_id = p.to_section_id
    LEFT JOIN users u
        ON u.user_id = p.decision_by
    WHERE p.promotion_id = p_promotion_id
      AND p.deleted_at IS NULL
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_get_eligible` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_get_eligible`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester INT,
    IN p_search VARCHAR(150)
)
BEGIN

    /*
        =========================================================
        VALIDATE ACADEMIC YEAR
        =========================================================
    */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears ay
        WHERE ay.academic_year_id = p_academic_year_id
          AND ay.deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year does not exist.';

    END IF;


    /*
        =========================================================
        GET ELIGIBLE STUDENTS
        =========================================================
    */

    SELECT

        st.student_id AS StudentId,

        st.student_code AS StudentCode,

        st.full_name AS StudentName,

        NULL AS RollNumber,

        sa.RegistrationNo AS RegistrationNumber,

        st.email AS Email,

        st.mobile AS Mobile,

        st.college_id AS CollegeId,

        c.course_id AS CourseId,

        c.course_code AS CourseCode,

        c.course_name AS CourseName,

        b.branch_id AS BranchId,

        b.branch_code AS BranchCode,

        b.branch_name AS BranchName,

        st.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYearName,

        sec.section_id AS SectionId,

        sec.section_name AS SectionName,

        COALESCE(sec.semester, sem.semester_number) AS CurrentSemester,

        c.total_semesters AS TotalSemesters,

        COALESCE(sec.semester, sem.semester_number) + 1 AS NextSemester,

        'PENDING_REVIEW' AS EligibilityStatus,

        NULL AS PromotionStatus,

        0 AS ResultsAvailable,

        NULL AS Sgpa,

        NULL AS Cgpa,

        NULL AS CreditsEarned

    FROM students st

    INNER JOIN academicyears ay
        ON ay.academic_year_id = st.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = st.admission_id
       AND sa.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = st.course_id
       AND c.deleted_at IS NULL

    LEFT JOIN branches b
        ON b.branch_id = st.branch_id
       AND b.deleted_at IS NULL

    /*
        Get the student's current active section
    */

    INNER JOIN student_section_assignments ssa
        ON ssa.student_id = st.student_id
       AND ssa.academic_year_id = st.academic_year_id
       AND ssa.status = 1

    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.deleted_at IS NULL
       AND sec.status = 1

    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0

    WHERE

        /*
            Student must be active
        */
        st.status = 1

        AND st.deleted_at IS NULL

        /*
            College isolation
        */
        AND st.college_id = p_college_id

        /*
            Academic year
        */
        AND st.academic_year_id = p_academic_year_id

        /*
            Optional course filter
        */
        AND
        (
            p_course_id IS NULL
            OR st.course_id = p_course_id
        )

        /*
            Optional branch filter
        */
        AND
        (
            p_branch_id IS NULL
            OR st.branch_id = p_branch_id
        )

        /*
            Optional semester filter
        */
        AND
        (
            p_semester IS NULL
            OR COALESCE(sec.semester, sem.semester_number) = p_semester
        )

        /*
            Student must not be in final semester.
        */
        AND
        (
            c.total_semesters IS NULL
            OR COALESCE(sec.semester, sem.semester_number) < c.total_semesters
        )

        /*
            Don't show students who already have an active
            promotion evaluation for this academic year.
        */
        AND NOT EXISTS
        (
            SELECT 1
            FROM student_promotions sp
            WHERE sp.student_id = st.student_id

              AND sp.from_academic_year_id = st.academic_year_id

              AND sp.from_semester = COALESCE(sec.semester, sem.semester_number)

              AND sp.deleted_at IS NULL

              AND sp.promotion_status IN
              (
                  'PENDING',
                  'APPROVED'
              )
        )

        /*
            Search
        */
        AND
        (
            p_search IS NULL
            OR p_search = ''

            OR st.student_code LIKE CONCAT('%', p_search, '%')

            OR st.full_name LIKE CONCAT('%', p_search, '%')

            OR st.email LIKE CONCAT('%', p_search, '%')

            OR st.mobile LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

    ORDER BY
        st.full_name ASC;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_get_failed_detained` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_get_failed_detained`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester INT,
    IN p_search VARCHAR(150),
    IN p_outcome VARCHAR(20)
)
BEGIN

    /*
        Validate outcome
    */

    IF p_outcome NOT IN
    (
        'FAILED',
        'DETAINED'
    )
    THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Invalid outcome.';

    END IF;


    /*
        Validate academic year
    */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears ay
        WHERE ay.academic_year_id =
              p_academic_year_id

          AND ay.deleted_at IS NULL
    )
    THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Academic year does not exist.';

    END IF;


    /*
        Get failed / detained students
    */

    SELECT

        sp.promotion_id
            AS PromotionId,

        st.student_id
            AS StudentId,

        st.student_code
            AS StudentCode,

        st.full_name
            AS StudentName,

        st.email
            AS Email,

        st.mobile
            AS Mobile,

        st.college_id
            AS CollegeId,

        sp.from_academic_year_id
            AS AcademicYearId,

        ay.academic_year_name
            AS AcademicYearName,

        sp.from_course_id
            AS CourseId,

        c.course_code
            AS CourseCode,

        c.course_name
            AS CourseName,

        sp.from_branch_id
            AS BranchId,

        b.branch_code
            AS BranchCode,

        b.branch_name
            AS BranchName,

        sp.from_section_id
            AS SectionId,

        sec.section_name
            AS SectionName,

        sp.from_semester
            AS Semester,

        sp.attendance_percentage
            AS AttendancePercentage,

        sp.total_marks
            AS TotalMarks,

        sp.obtained_marks
            AS ObtainedMarks,

        sp.marks_percentage
            AS MarksPercentage,

        sp.passed_subjects
            AS PassedSubjects,

        sp.failed_subjects
            AS FailedSubjects,

        sp.backlog_count
            AS BacklogCount,

        sp.promotion_eligibility
            AS PromotionEligibility,

        sp.promotion_type
            AS PromotionType,

        sp.eligibility_remarks
            AS EligibilityRemarks,

        sp.remarks
            AS Remarks,

        p_outcome
            AS Outcome

    FROM student_promotions sp

    INNER JOIN students st
        ON st.student_id =
           sp.student_id

       AND st.deleted_at IS NULL

       AND st.status = 1

    INNER JOIN academicyears ay
        ON ay.academic_year_id =
           sp.from_academic_year_id

       AND ay.deleted_at IS NULL

    LEFT JOIN courses c
        ON c.course_id =
           sp.from_course_id

       AND c.deleted_at IS NULL

    LEFT JOIN branches b
        ON b.branch_id =
           sp.from_branch_id

       AND b.deleted_at IS NULL

    LEFT JOIN sections sec
        ON sec.section_id =
           sp.from_section_id

       AND sec.deleted_at IS NULL

    WHERE

        /*
            College isolation
        */

        sp.college_id =
            p_college_id

        /*
            Academic year
        */

        AND sp.from_academic_year_id =
            p_academic_year_id

        /*
            Ignore deleted promotion records
        */

        AND sp.deleted_at IS NULL

        /*
            Active promotion record
        */

        AND sp.is_active = 1

        /*
            Optional course
        */

        AND
        (
            p_course_id IS NULL

            OR sp.from_course_id =
               p_course_id
        )

        /*
            Optional branch
        */

        AND
        (
            p_branch_id IS NULL

            OR sp.from_branch_id =
               p_branch_id
        )

        /*
            Optional semester
        */

        AND
        (
            p_semester IS NULL

            OR sp.from_semester =
               p_semester
        )

        /*
            Search
        */

        AND
        (
            p_search IS NULL

            OR p_search = ''

            OR st.student_code LIKE
               CONCAT('%', p_search, '%')

            OR st.full_name LIKE
               CONCAT('%', p_search, '%')

            OR st.email LIKE
               CONCAT('%', p_search, '%')

            OR st.mobile LIKE
               CONCAT('%', p_search, '%')
        )

        /*
            FAILED
        */

        AND
        (
            (
                p_outcome = 'FAILED'

                AND
                (
                    UPPER(
                        COALESCE(
                            sp.promotion_eligibility,
                            ''
                        )
                    ) = 'FAILED'

                    OR COALESCE(
                        sp.failed_subjects,
                        0
                    ) > 0
                )
            )

            OR

            /*
                DETAINED
            */

            (
                p_outcome = 'DETAINED'

                AND
                (
                    UPPER(
                        COALESCE(
                            sp.promotion_eligibility,
                            ''
                        )
                    ) = 'DETAINED'

                    OR UPPER(
                        COALESCE(
                            sp.promotion_type,
                            ''
                        )
                    ) = 'DETAINED'
                )
            )
        )

    ORDER BY
        st.full_name ASC,
        sp.promotion_id DESC;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_get_history` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_get_history`(
    IN p_student_id BIGINT
)
BEGIN
    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    SELECT
        sp.promotion_id                  AS PromotionId,
        sp.student_id                    AS StudentId,
        st.student_code                  AS StudentCode,
        st.full_name                     AS StudentName,
        COALESCE(sp.college_id, st.college_id) AS CollegeId,

        sp.from_academic_year_id         AS FromAcademicYearId,
        fay.academic_year_name           AS FromAcademicYearName,
        sp.to_academic_year_id           AS ToAcademicYearId,
        tay.academic_year_name           AS ToAcademicYearName,

        sp.from_course_id                AS FromCourseId,
        fc.course_name                   AS FromCourseName,
        sp.to_course_id                  AS ToCourseId,
        tc.course_name                   AS ToCourseName,

        sp.from_branch_id                AS FromBranchId,
        fb.branch_name                   AS FromBranchName,
        sp.to_branch_id                  AS ToBranchId,
        tb.branch_name                   AS ToBranchName,

        sp.from_section_id               AS FromSectionId,
        fs.section_name                  AS FromSectionName,
        sp.to_section_id                 AS ToSectionId,
        ts.section_name                  AS ToSectionName,

        sp.from_semester                 AS FromSemester,
        sp.to_semester                   AS ToSemester,

        sp.promotion_status              AS PromotionStatus,
        sp.decision                      AS Decision,
        sp.decision_date                 AS DecisionDate,
        sp.decision_by                   AS DecisionBy,
        du.full_name                     AS DecisionByName,
        sp.remarks                       AS Remarks,

        sp.attendance_percentage         AS AttendancePercentage,
        sp.total_marks                   AS TotalMarks,
        sp.obtained_marks                AS ObtainedMarks,
        sp.marks_percentage              AS MarksPercentage,
        sp.passed_subjects               AS PassedSubjects,
        sp.failed_subjects               AS FailedSubjects,
        sp.backlog_count                 AS BacklogCount,

        sp.promotion_eligibility         AS PromotionEligibility,
        sp.eligibility_remarks           AS EligibilityRemarks,
        sp.promotion_type                AS PromotionType,
        sp.promotion_date                AS PromotionDate,
        sp.effective_date                AS EffectiveDate,
        sp.promotion_reason              AS PromotionReason,
        sp.rejection_reason              AS RejectionReason,
        sp.approved_at                   AS ApprovedAt,
        sp.is_final                      AS IsFinal,
        sp.promotion_order               AS PromotionOrder,
        sp.is_active                     AS IsActive,

        sp.created_at                    AS CreatedAt,
        sp.created_by                    AS CreatedBy,
        cu.full_name                     AS CreatedByName,
        sp.updated_at                    AS UpdatedAt,
        sp.updated_by                    AS UpdatedBy,
        uu.full_name                     AS UpdatedByName

    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    LEFT JOIN courses fc
        ON fc.course_id = sp.from_course_id
    LEFT JOIN courses tc
        ON tc.course_id = sp.to_course_id
    LEFT JOIN branches fb
        ON fb.branch_id = sp.from_branch_id
    LEFT JOIN branches tb
        ON tb.branch_id = sp.to_branch_id
    LEFT JOIN sections fs
        ON fs.section_id = sp.from_section_id
    LEFT JOIN sections ts
        ON ts.section_id = sp.to_section_id
    LEFT JOIN users du
        ON du.user_id = sp.decision_by
    LEFT JOIN users cu
        ON cu.user_id = sp.created_by
    LEFT JOIN users uu
        ON uu.user_id = sp.updated_by
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL
    ORDER BY
        COALESCE(sp.promotion_date, sp.decision_date, sp.created_at) DESC,
        COALESCE(sp.promotion_order, 0) DESC,
        sp.promotion_id DESC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_promotion_history_directory` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_promotion_history_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(30),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        sp.`promotion_id` AS `PromotionId`,
        sp.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        fay.`academic_year_name` AS `FromAcademicYearName`,
        tay.`academic_year_name` AS `ToAcademicYearName`,
        COALESCE(NULLIF(fc.`course_short_name`, ''), fc.`course_name`) AS `FromCourseName`,
        COALESCE(NULLIF(tc.`course_short_name`, ''), tc.`course_name`) AS `ToCourseName`,
        fb.`branch_name` AS `FromBranchName`,
        tb.`branch_name` AS `ToBranchName`,
        sp.`from_semester` AS `FromSemester`,
        sp.`to_semester` AS `ToSemester`,
        sp.`promotion_status` AS `PromotionStatus`,
        sp.`promotion_eligibility` AS `PromotionEligibility`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CASE WHEN sp.`decision_by` IS NULL THEN 'System' ELSE 'Individual' END AS `PromotionMode`,
        actor.`full_name` AS `PromotedBy`,
        COALESCE(sp.`decision_date`, sp.`created_at`) AS `PromotionDate`,
        sp.`remarks` AS `Remarks`,
        sp.`created_at` AS `CreatedAt`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    LEFT JOIN `users` actor ON actor.`user_id` = COALESCE(sp.`decision_by`, sp.`created_by`)
    LEFT JOIN `academicyears` fay ON fay.`academic_year_id` = sp.`from_academic_year_id`
    LEFT JOIN `academicyears` tay ON tay.`academic_year_id` = sp.`to_academic_year_id`
    LEFT JOIN `courses` fc ON fc.`course_id` = sp.`from_course_id`
    LEFT JOIN `courses` tc ON tc.`course_id` = sp.`to_course_id`
    LEFT JOIN `branches` fb ON fb.`branch_id` = sp.`from_branch_id`
    LEFT JOIN `branches` tb ON tb.`branch_id` = sp.`to_branch_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)))
    ORDER BY sp.`created_at` DESC, sp.`promotion_id` DESC
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_search` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_search`(
    IN p_query VARCHAR(150),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_search VARCHAR(160);

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;
    SET v_search = CONCAT('%', TRIM(IFNULL(p_query, '')), '%');

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (
          s.student_code LIKE v_search
          OR s.full_name LIKE v_search
          OR s.email LIKE v_search
          OR s.mobile LIKE v_search
      )
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_update` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_update`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND student_id <> p_student_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    UPDATE students
    SET college_id = p_college_id,
        student_code = UPPER(TRIM(p_student_code)),
        full_name = TRIM(p_full_name),
        gender = NULLIF(TRIM(p_gender), ''),
        date_of_birth = p_date_of_birth,
        email = NULLIF(TRIM(p_email), ''),
        mobile = NULLIF(TRIM(p_mobile), ''),
        blood_group = NULLIF(TRIM(p_blood_group), ''),
        address = NULLIF(TRIM(p_address), ''),
        course_id = p_course_id,
        branch_id = p_branch_id,
        academic_year_id = p_academic_year_id,
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    CALL sp_student_get_by_id(p_student_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_update_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_update_status`(
    IN p_student_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SELECT
            s.student_id,
            s.college_id,
            c.college_name,
            s.student_code,
            s.full_name,
            s.gender,
            s.date_of_birth,
            s.email,
            s.mobile,
            s.blood_group,
            s.address,
            s.course_id,
            co.course_name,
            s.branch_id,
            b.branch_name,
            s.academic_year_id,
            ay.academic_year_name,
            s.status,
            s.created_at,
            s.created_by,
            s.updated_at,
            s.updated_by,
            s.deleted_at,
            s.deleted_by
        FROM students s
        INNER JOIN colleges c ON c.college_id = s.college_id
        INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
        LEFT JOIN courses co ON co.course_id = s.course_id
        LEFT JOIN branches b ON b.branch_id = s.branch_id
        WHERE 1 = 0;
    ELSE
        UPDATE students
        SET status = p_status,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE student_id = p_student_id
          AND deleted_at IS NULL;

        CALL sp_student_get_by_id(p_student_id);
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_student_validate_references` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_student_validate_references`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        EXISTS(
            SELECT 1 FROM colleges
            WHERE college_id = p_college_id AND deleted_at IS NULL
        ) AS college_exists,
        EXISTS(
            SELECT 1 FROM academicyears
            WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
        ) AS academic_year_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id AND deleted_at IS NULL
        )) AS course_exists,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id AND deleted_at IS NULL
        )) AS branch_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id
              AND college_id = p_college_id
              AND deleted_at IS NULL
        )) AS course_belongs_to_college,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id
              AND (p_course_id IS NULL OR course_id = p_course_id)
              AND deleted_at IS NULL
        )) AS branch_belongs_to_course;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_Add` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SubjectAssignment_Add`(
    IN p_subject_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_subject_id IS NULL OR p_subject_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_id = p_subject_id
          AND semester_id = p_semester_id
          AND status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Subject is already assigned to this semester.';
    END IF;

    INSERT INTO subject_semester_assignments
    (
        subject_id,
        semester_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_subject_id,
        p_semester_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_Edit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SubjectAssignment_Edit`(
    IN p_subject_semester_assignment_id BIGINT,
    IN p_subject_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_semester_assignment_id =
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject assignment not found.';
    END IF;

    IF p_subject_id IS NULL OR p_subject_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_id = p_subject_id
          AND semester_id = p_semester_id
          AND subject_semester_assignment_id <>
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Subject is already assigned to this semester.';
    END IF;

    UPDATE subject_semester_assignments
    SET
        subject_id = p_subject_id,
        semester_id = p_semester_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;

    CALL sp_SubjectAssignment_GetById(
        p_subject_semester_assignment_id
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SubjectAssignment_GetById`(
    IN p_subject_semester_assignment_id BIGINT
)
BEGIN
    SELECT
        subject_semester_assignment_id,
        subject_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_List` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SubjectAssignment_List`()
BEGIN
    SELECT
        subject_semester_assignment_id,
        subject_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM subject_semester_assignments
    ORDER BY subject_id ASC, semester_id ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_UpdateStatus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_SubjectAssignment_UpdateStatus`(
    IN p_subject_semester_assignment_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_semester_assignment_id =
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject assignment not found.';
    END IF;

    UPDATE subject_semester_assignments
    SET
        status = p_status,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;

    SELECT *
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateCollegeLogo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateCollegeLogo`(
    IN p_Id BIGINT,
    IN p_LogoPath VARCHAR(500)
)
BEGIN
    UPDATE Colleges
    SET LogoPath = p_LogoPath
    WHERE Id = p_Id;

    SELECT ROW_COUNT() AS RowsAffected;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_UpdateRole` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_UpdateRole`(
    IN p_RoleId BIGINT,
    IN p_RoleName VARCHAR(100),
    IN p_RoleCode VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_Status TINYINT
)
BEGIN
    UPDATE roles
    SET
        role_name = p_RoleName,
        role_code = p_RoleCode,
        description = p_Description,
        status = p_Status
    WHERE role_id = p_RoleId;

    SELECT ROW_COUNT() AS RowsAffected;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_college_settings` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_college_settings`(

    IN p_college_setting_id BIGINT,

    IN p_college_name VARCHAR(200),

    IN p_college_code VARCHAR(50),

    IN p_college_email VARCHAR(150),

    IN p_phone_number VARCHAR(20),

    IN p_website VARCHAR(200),

    IN p_address_line1 VARCHAR(255),

    IN p_address_line2 VARCHAR(255),

    IN p_city VARCHAR(100),

    IN p_state VARCHAR(100),

    IN p_pincode VARCHAR(10),

    IN p_academic_year VARCHAR(20),

    IN p_semester VARCHAR(50),

    IN p_institution_type VARCHAR(100),

    IN p_date_format VARCHAR(30),

    IN p_time_zone VARCHAR(100),

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE college_settings

    SET

        college_name = p_college_name,

        college_code = p_college_code,

        college_email = p_college_email,

        phone_number = p_phone_number,

        website = p_website,

        address_line1 = p_address_line1,

        address_line2 = p_address_line2,

        city = p_city,

        state = p_state,

        pincode = p_pincode,

        academic_year = p_academic_year,

        semester = p_semester,

        institution_type = p_institution_type,

        date_format = p_date_format,

        time_zone = p_time_zone,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE college_setting_id = p_college_setting_id;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_course_structure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_course_structure`(
    IN p_structure_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        course_id = p_course_id,
        branch_id = p_branch_id,
        year_number = p_year_number,
        semester_number = p_semester_number,
        semester_name = p_semester_name,
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    CALL sp_get_course_structure_by_id(p_structure_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_employee_profile` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_employee_profile`(
    IN p_user_id BIGINT,
    IN p_date_of_birth DATE,
    IN p_gender VARCHAR(20),
    IN p_department_id BIGINT,
    IN p_designation VARCHAR(150),
    IN p_address VARCHAR(500),
    IN p_pincode VARCHAR(10),
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_about_me VARCHAR(1000)
)
BEGIN

    UPDATE employee_profiles
    SET
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = COALESCE(p_gender, gender),
        department_id = COALESCE(p_department_id, department_id),
        designation = COALESCE(p_designation, designation),
        address = COALESCE(p_address, address),
        pincode = COALESCE(p_pincode, pincode),
        city = COALESCE(p_city, city),
        district = COALESCE(p_district, district),
        state = COALESCE(p_state, state),
        about_me = COALESCE(p_about_me, about_me),
        updated_at = UTC_TIMESTAMP()
    WHERE user_id = p_user_id
      AND deleted_at IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_role`(

    IN p_role_id BIGINT,

    IN p_role_name VARCHAR(100),

    IN p_role_code VARCHAR(50),

    IN p_description VARCHAR(255),

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE roles

    SET

        role_name = p_role_name,

        role_code = p_role_code,

        description = p_description,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_student_academic_details` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_student_academic_details`(
    IN p_AcademicId INT,
    IN p_RollNumber VARCHAR(20),
    IN p_RegistrationNumber VARCHAR(30),
    IN p_AdmissionNumber VARCHAR(30),
    IN p_Course VARCHAR(100),
    IN p_Branch VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Semester INT,
    IN p_Section VARCHAR(10),
    IN p_AcademicYear VARCHAR(20)
)
BEGIN

    UPDATE student_academic_details
    SET
        RollNumber = p_RollNumber,
        RegistrationNumber = p_RegistrationNumber,
        AdmissionNumber = p_AdmissionNumber,
        Course = p_Course,
        Branch = p_Branch,
        Department = p_Department,
        Semester = p_Semester,
        Section = p_Section,
        AcademicYear = p_AcademicYear
    WHERE AcademicId = p_AcademicId;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_user_find_for_password_reset` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_find_for_password_reset`(
    IN p_identifier VARCHAR(150)
)
BEGIN
    -- Explicit COLLATE prevents Error 1267 when an imported database mixes
    -- utf8mb4_unicode_ci with utf8mb4_0900_ai_ci.
    SELECT
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        u.email AS Email,
        u.mobile AS Mobile,
        u.status AS Status,
        GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code) AS Roles
    FROM users u
    LEFT JOIN user_roles ur
        ON ur.user_id = u.user_id
       AND ur.status = 1
       AND ur.removed_at IS NULL
    LEFT JOIN roles r
        ON r.role_id = ur.role_id
       AND r.status = 1
       AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
      AND (
            u.employee_user_id COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
         OR u.email COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
         OR u.mobile COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
      )
    GROUP BY
        u.user_id,
        u.employee_user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.status
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_user_update_password_hash` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_user_update_password_hash`(
    IN p_user_id BIGINT,
    IN p_password_hash VARCHAR(255),
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE users
    SET password_hash = p_password_hash,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_verify_otp` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_verify_otp`(

    IN p_otp_verification_id BIGINT

)
BEGIN
 
    UPDATE otp_verifications

    SET

        verified_at = CURRENT_TIMESTAMP,

        status = 0

    WHERE otp_verification_id = p_otp_verification_id

      AND status = 1

      AND verified_at IS NULL

      AND expires_at >= CURRENT_TIMESTAMP

      AND attempts < max_attempts;
 
    IF ROW_COUNT() > 0 THEN
 
        SELECT

            TRUE AS success,

            'OTP verified successfully' AS message;
 
    ELSE
 
        SELECT

            FALSE AS success,

            'OTP is invalid, expired, or maximum attempts exceeded'

            AS message;
 
    END IF;
 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vw_users_with_roles`
--

/*!50001 DROP VIEW IF EXISTS `vw_users_with_roles`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_users_with_roles` AS select `u`.`user_id` AS `user_id`,`u`.`college_id` AS `college_id`,`u`.`employee_user_id` AS `employee_user_id`,`u`.`full_name` AS `full_name`,`u`.`email` AS `email`,`u`.`mobile` AS `mobile`,`u`.`password_hash` AS `password_hash`,group_concat(distinct `r`.`role_code` order by `r`.`role_code` ASC separator ',') AS `role`,`u`.`status` AS `status`,`u`.`last_login_at` AS `last_login_at`,`u`.`created_at` AS `created_at`,`u`.`created_by` AS `created_by`,`u`.`updated_at` AS `updated_at`,`u`.`updated_by` AS `updated_by`,`u`.`deleted_at` AS `deleted_at`,`u`.`deleted_by` AS `deleted_by` from ((`users` `u` left join `user_roles` `ur` on(((`ur`.`user_id` = `u`.`user_id`) and (`ur`.`status` = 1) and (`ur`.`removed_at` is null)))) left join `roles` `r` on(((`r`.`role_id` = `ur`.`role_id`) and (`r`.`status` = 1) and (`r`.`deleted_at` is null)))) group by `u`.`user_id`,`u`.`college_id`,`u`.`employee_user_id`,`u`.`full_name`,`u`.`email`,`u`.`mobile`,`u`.`password_hash`,`u`.`status`,`u`.`last_login_at`,`u`.`created_at`,`u`.`created_by`,`u`.`updated_at`,`u`.`updated_by`,`u`.`deleted_at`,`u`.`deleted_by` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-04  5:06:03

-- =============================================================
-- CMS BTECH BACKEND INTEGRATION UPDATE
-- Generated: 2026-09-03
-- Target: MySQL 8.x / cms_btech
--
-- Run after importing the supplied cms_btech database dump.
-- Existing APIs, tables and data are preserved. Procedures in this
-- file are replaced with their integration-ready definitions.
-- =============================================================

USE `cms_btech`;


-- BEGIN Database/Semester/SemesterCourseIntegration.sql
-- =============================================================
-- SEMESTER COURSE RELATIONSHIP FIX
-- Direct-run MySQL 8.x update; no EF migration is required.
-- Existing semester rows are backfilled from their branch.
-- =============================================================

USE `cms_btech`;

SET @has_semester_course_id = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND COLUMN_NAME = 'course_id'
);
SET @semester_course_column_sql = IF(
    @has_semester_course_id = 0,
    'ALTER TABLE `semesters` ADD COLUMN `course_id` BIGINT NULL AFTER `semester_id`',
    'SELECT 1'
);
PREPARE semester_course_column_stmt FROM @semester_course_column_sql;
EXECUTE semester_course_column_stmt;
DEALLOCATE PREPARE semester_course_column_stmt;

SET @has_semester_year_number = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND COLUMN_NAME = 'year_number'
);
SET @semester_year_column_sql = IF(
    @has_semester_year_number = 0,
    'ALTER TABLE `semesters` ADD COLUMN `year_number` INT NULL AFTER `semester_number`',
    'SELECT 1'
);
PREPARE semester_year_column_stmt FROM @semester_year_column_sql;
EXECUTE semester_year_column_stmt;
DEALLOCATE PREPARE semester_year_column_stmt;

-- The branch-to-course relationship is authoritative for existing rows.
UPDATE `semesters` semester_record
INNER JOIN `branches` branch_record
    ON branch_record.`branch_id` = semester_record.`branch_id`
SET semester_record.`course_id` = branch_record.`course_id`
WHERE semester_record.`course_id` IS NULL
   OR semester_record.`course_id` <> branch_record.`course_id`;

UPDATE `semesters`
SET `year_number` = CEIL(`semester_number` / 2.0)
WHERE `year_number` IS NULL OR `year_number` <= 0;

ALTER TABLE `semesters`
    MODIFY COLUMN `course_id` BIGINT NOT NULL,
    MODIFY COLUMN `year_number` INT NOT NULL;

SET @has_semester_course_index = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND INDEX_NAME = 'idx_semesters_course'
);
SET @semester_course_index_sql = IF(
    @has_semester_course_index = 0,
    'CREATE INDEX `idx_semesters_course` ON `semesters` (`course_id`)',
    'SELECT 1'
);
PREPARE semester_course_index_stmt FROM @semester_course_index_sql;
EXECUTE semester_course_index_stmt;
DEALLOCATE PREPARE semester_course_index_stmt;

SET @has_semester_course_fk = (
    SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND CONSTRAINT_NAME = 'fk_semesters_course'
);
SET @semester_course_fk_sql = IF(
    @has_semester_course_fk = 0,
    'ALTER TABLE `semesters` ADD CONSTRAINT `fk_semesters_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE semester_course_fk_stmt FROM @semester_course_fk_sql;
EXECUTE semester_course_fk_stmt;
DEALLOCATE PREPARE semester_course_fk_stmt;

-- Verification query: CourseId/CourseName must be populated for every row.
SELECT
    semester_record.`semester_id` AS `SemesterId`,
    semester_record.`semester_name` AS `SemesterName`,
    semester_record.`course_id` AS `CourseId`,
    course_record.`course_name` AS `CourseName`,
    semester_record.`branch_id` AS `BranchId`,
    branch_record.`branch_name` AS `BranchName`,
    semester_record.`academic_year_id` AS `AcademicYearId`,
    semester_record.`year_number` AS `YearNumber`
FROM `semesters` semester_record
INNER JOIN `courses` course_record
    ON course_record.`course_id` = semester_record.`course_id`
INNER JOIN `branches` branch_record
    ON branch_record.`branch_id` = semester_record.`branch_id`
ORDER BY semester_record.`semester_number`, semester_record.`semester_id`;
-- END Database/Semester/SemesterCourseIntegration.sql


-- BEGIN Database/Sections/SectionUpdateStoredProcedure.sql
-- =============================================================
-- MISSING SECTION UPDATE PROCEDURE
-- Required by SectionRepository.UpdateAsync; absent from dump3even.sql.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_section_update`;
DELIMITER $$

CREATE PROCEDURE `sp_section_update`(
    IN p_section_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester BIGINT,
    IN p_section_name VARCHAR(100),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_semester_number INT DEFAULT NULL;

    SELECT s.`college_id`, s.`department_id`
    INTO v_college_id, v_department_id
    FROM `sections` s
    WHERE s.`section_id` = p_section_id
      AND s.`is_archived` = 0
      AND s.`deleted_at` IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;
    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;
    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `courses` c
        WHERE c.`course_id` = p_course_id
          AND c.`college_id` = v_college_id
          AND c.`department_id` = v_department_id
          AND c.`status` = 1 AND c.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not belong to the section college and department.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `branches` b
        WHERE b.`branch_id` = p_branch_id
          AND b.`course_id` = p_course_id
          AND b.`department_id` = v_department_id
          AND b.`status` = 1 AND b.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not belong to the selected course.';
    END IF;

    SELECT sem.`semester_number`
    INTO v_semester_number
    FROM `semesters` sem
    WHERE sem.`semester_id` = p_semester
      AND sem.`course_id` = p_course_id
      AND sem.`branch_id` = p_branch_id
      AND sem.`status` = 1
      AND sem.`is_archived` = 0
    LIMIT 1;

    IF v_semester_number IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester does not match the selected course and branch.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM `employee_profiles` ep
        INNER JOIN `users` u ON u.`user_id` = ep.`user_id`
        WHERE ep.`employee_profile_id` = p_class_teacher_employee_profile_id
          AND ep.`status` = 1
          AND ep.`deleted_at` IS NULL
          AND u.`status` = 1
          AND u.`deleted_at` IS NULL
          AND (u.`college_id` = v_college_id OR u.`college_id` IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    SELECT COUNT(*) INTO v_current_strength
    FROM `student_section_assignments` ssa
    WHERE ssa.`section_id` = p_section_id AND ssa.`status` = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `sections` duplicate_section
        WHERE duplicate_section.`section_id` <> p_section_id
          AND duplicate_section.`academic_year_id` = p_academic_year_id
          AND duplicate_section.`department_id` = v_department_id
          AND duplicate_section.`course_id` = p_course_id
          AND duplicate_section.`branch_id` = p_branch_id
          AND duplicate_section.`semester_id` = p_semester
          AND LOWER(TRIM(duplicate_section.`section_code`)) = LOWER(TRIM(p_section_code))
          AND duplicate_section.`is_archived` = 0
          AND duplicate_section.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE `sections`
    SET `course_id` = p_course_id,
        `branch_id` = p_branch_id,
        `academic_year_id` = p_academic_year_id,
        `semester` = v_semester_number,
        `semester_id` = p_semester,
        `section_name` = TRIM(p_section_name),
        `section_code` = TRIM(p_section_code),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM(p_room), ''),
        `shift` = NULLIF(TRIM(p_shift), ''),
        `section_type` = NULLIF(TRIM(p_section_type), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END$$

DELIMITER ;
-- END Database/Sections/SectionUpdateStoredProcedure.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_get_all.sql
DROP PROCEDURE IF EXISTS sp_section_get_all;

DELIMITER $$

CREATE DEFINER=`root`@`localhost`
PROCEDURE `sp_section_get_all`()
BEGIN

    SELECT
        s.section_id AS SectionId,

        s.college_id AS CollegeId,
        col.college_name AS CollegeName,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,

        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,

        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,

        sem.semester_id AS SemesterId,
        COALESCE(sem.semester_number, s.semester) AS SemesterNumber,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Capacity Status */
        CASE

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= s.capacity
            THEN 'FULL'

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= CEIL(s.capacity * 0.90)
            THEN 'NEAR_FULL'

            ELSE 'AVAILABLE'

        END AS CapacityStatus,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.is_archived = 0

    ORDER BY
        d.department_name,
        c.course_name,
        b.branch_name,
        COALESCE(sem.semester_number, s.semester),
        s.section_code;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_get_all.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_get_by_id.sql
DROP PROCEDURE IF EXISTS sp_section_get_by_id;

DELIMITER $$

CREATE DEFINER=`root`@`localhost`
PROCEDURE `sp_section_get_by_id`
(
    IN p_section_id BIGINT
)
BEGIN

    SELECT
        s.section_id AS SectionId,

        s.college_id AS CollegeId,
        col.college_name AS CollegeName,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,

        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,

        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,

        sem.semester_id AS SemesterId,
        COALESCE(sem.semester_number, s.semester) AS SemesterNumber,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.section_id = p_section_id
      AND s.is_archived = 0;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_get_by_id.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_search.sql
DROP PROCEDURE IF EXISTS sp_section_search;

DELIMITER $$

CREATE PROCEDURE sp_section_search
(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
BEGIN

    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        sem.semester_id AS SemesterId,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,

        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.is_archived = 0

      AND
      (
          p_search IS NULL
          OR TRIM(p_search) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR d.department_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR c.course_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR b.branch_name LIKE CONCAT('%', TRIM(p_search), '%')
          OR COALESCE(
                sem.semester_name,
                CONCAT('Semester ', s.semester)
             ) LIKE CONCAT('%', TRIM(p_search), '%')
      )

      AND
      (
          p_department_id IS NULL
          OR s.department_id = p_department_id
      )

      AND
      (
          p_course_id IS NULL
          OR s.course_id = p_course_id
      )

      AND
      (
          p_branch_id IS NULL
          OR s.branch_id = p_branch_id
      )

      AND
      (
          p_semester_id IS NULL
          OR s.semester_id = p_semester_id
      )

      AND
      (
          p_status IS NULL
          OR s.status = p_status
      )

    ORDER BY s.section_code;

END $$

DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_search.sql


-- BEGIN Database/StudentIntegration/StudentIntegrationOperations.sql
-- =============================================================
-- STUDENT ADMISSION / DOCUMENT / PROMOTION INTEGRATION
-- Direct-run MySQL 8.x update; no migration runner is required.
-- Existing tables, document columns, procedures and APIs are kept.
-- =============================================================

USE `cms_btech`;

CREATE TABLE IF NOT EXISTS `student_document_files` (
    `document_id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT NOT NULL,
    `document_type` VARCHAR(100) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `content_type` VARCHAR(150) DEFAULT NULL,
    `file_size` BIGINT DEFAULT NULL,
    `uploaded_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    `deleted_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`document_id`),
    KEY `idx_student_document_files_student` (`student_id`, `is_deleted`),
    CONSTRAINT `fk_student_document_files_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1000000000 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_fee_structures` (
    `fee_structure_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `tuition_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `admission_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `hostel_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `transportation_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `scholarship_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_plan` VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME',
    `payment_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`fee_structure_id`),
    UNIQUE KEY `uq_student_admission_fee_admission` (`admission_id`),
    CONSTRAINT `fk_student_admission_fee_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_student_admission_fee_nonnegative`
        CHECK (`tuition_fee` >= 0 AND `admission_fee` >= 0
            AND `hostel_fee` >= 0 AND `transportation_fee` >= 0
            AND `scholarship_amount` >= 0 AND `amount_paid` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_previous_education` (
    `previous_education_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `qualification_level` VARCHAR(30) NOT NULL,
    `qualification` VARCHAR(100) DEFAULT NULL,
    `board_or_university` VARCHAR(150) DEFAULT NULL,
    `institution` VARCHAR(255) DEFAULT NULL,
    `roll_number` VARCHAR(50) DEFAULT NULL,
    `passing_year` VARCHAR(20) DEFAULT NULL,
    `stream` VARCHAR(100) DEFAULT NULL,
    `score` DECIMAL(5,2) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`previous_education_id`),
    UNIQUE KEY `uq_admission_previous_education_level`
        (`admission_id`, `qualification_level`),
    CONSTRAINT `fk_admission_previous_education_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_admission_previous_education_score`
        CHECK (`score` IS NULL OR (`score` >= 0 AND `score` <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_form_data` (
    `admission_id` BIGINT NOT NULL,
    `form_data` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`admission_id`),
    CONSTRAINT `fk_student_admission_form_data_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_form_data_upsert`(
    IN p_admission_id BIGINT,
    IN p_form_data LONGTEXT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF p_form_data IS NULL OR JSON_VALID(p_form_data) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission formData must be valid JSON.';
    END IF;

    INSERT INTO `student_admission_form_data` (
        `admission_id`, `form_data`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, CAST(p_form_data AS JSON), UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `form_data` = VALUES(`form_data`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

-- Return all normalized columns plus the complete frontend form payload.
DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById`;
DELIMITER $$
CREATE PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`AdmissionId` = p_admission_id
      AND sa.`IsDeleted` = 0
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_list`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_list`(
    IN p_search VARCHAR(255),
    IN p_admission_status VARCHAR(50),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;

    IF p_page_number IS NULL OR p_page_number < 1 THEN
        SET p_page_number = 1;
    END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
        SET p_page_size = 20;
    END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`,
        COUNT(*) OVER() AS `TotalRecords`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`IsDeleted` = 0
      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR sa.`RegistrationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`ApplicationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`AdmissionNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR CONCAT_WS(' ', sa.`FirstName`, sa.`LastName`) LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`StudentEmail` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`MobileNumber` LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
          NULLIF(TRIM(p_admission_status), '') IS NULL
          OR UPPER(sa.`AdmissionStatus`) = UPPER(TRIM(p_admission_status))
      )
    ORDER BY sa.`CreatedAt` DESC, sa.`AdmissionId` DESC
    LIMIT p_page_size OFFSET v_offset;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_create`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_create`(
    IN p_student_id BIGINT,
    IN p_document_type VARCHAR(100),
    IN p_file_name VARCHAR(255),
    IN p_file_path VARCHAR(500),
    IN p_content_type VARCHAR(150),
    IN p_file_size BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_document_id BIGINT;

    IF NOT EXISTS (
        SELECT 1 FROM `students`
        WHERE `student_id` = p_student_id AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;
    IF NULLIF(TRIM(p_document_type), '') IS NULL
       OR NULLIF(TRIM(p_file_name), '') IS NULL
       OR NULLIF(TRIM(p_file_path), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Document type, file name and file path are required.';
    END IF;

    INSERT INTO `student_document_files` (
        `student_id`, `document_type`, `file_name`, `file_path`,
        `content_type`, `file_size`, `uploaded_date`, `created_by`
    ) VALUES (
        p_student_id, TRIM(p_document_type), TRIM(p_file_name), TRIM(p_file_path),
        NULLIF(TRIM(p_content_type), ''), p_file_size, UTC_TIMESTAMP(), p_created_by
    );
    SET v_document_id = LAST_INSERT_ID();

    SELECT
        f.`document_id` AS `DocumentId`,
        f.`student_id` AS `StudentId`,
        f.`document_type` AS `DocumentType`,
        f.`file_name` AS `FileName`,
        f.`file_path` AS `FilePath`,
        f.`content_type` AS `ContentType`,
        f.`file_size` AS `FileSize`,
        f.`uploaded_date` AS `UploadedDate`
    FROM `student_document_files` f
    WHERE f.`document_id` = v_document_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_get_by_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_get_by_id`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT
)
BEGIN
    SELECT
        d.`DocumentId`, d.`StudentId`, d.`DocumentType`, d.`FileName`,
        d.`FilePath`, d.`ContentType`, d.`FileSize`, d.`UploadedDate`
    FROM (
        SELECT
            f.`document_id` AS `DocumentId`,
            f.`student_id` AS `StudentId`,
            f.`document_type` AS `DocumentType`,
            f.`file_name` AS `FileName`,
            f.`file_path` AS `FilePath`,
            f.`content_type` AS `ContentType`,
            f.`file_size` AS `FileSize`,
            f.`uploaded_date` AS `UploadedDate`
        FROM `student_document_files` f
        WHERE f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + legacy.`type_number`, sd.`Student_Id`,
            legacy.`document_type`, legacy.`file_name`, legacy.`file_name`,
            NULL, NULL, sd.`UploadedDate`
        FROM `student_documents` sd
        INNER JOIN (
            SELECT 1 AS `type_number`, 'Aadhaar Document' AS `document_type`,
                sd1.`AadhaarDocument` AS `file_name`, sd1.`DocumentId` AS `source_id`
            FROM `student_documents` sd1
            UNION ALL SELECT 2, 'Previous Certificates', sd2.`PreviousCertificates`, sd2.`DocumentId` FROM `student_documents` sd2
            UNION ALL SELECT 3, 'Transfer Certificate', sd3.`TransferCertificate`, sd3.`DocumentId` FROM `student_documents` sd3
            UNION ALL SELECT 4, 'Passport Photo', sd4.`PassportPhoto`, sd4.`DocumentId` FROM `student_documents` sd4
            UNION ALL SELECT 5, 'Caste Certificate', sd5.`CasteCertificate`, sd5.`DocumentId` FROM `student_documents` sd5
            UNION ALL SELECT 6, 'Income Certificate', sd6.`IncomeCertificate`, sd6.`DocumentId` FROM `student_documents` sd6
        ) legacy ON legacy.`source_id` = sd.`DocumentId`
        WHERE NULLIF(TRIM(legacy.`file_name`), '') IS NOT NULL
    ) d
    WHERE d.`StudentId` = p_student_id
      AND d.`DocumentId` = p_document_id
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_delete`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_delete`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    DECLARE v_deleted INT DEFAULT 0;
    DECLARE v_legacy_source_id BIGINT DEFAULT 0;
    DECLARE v_legacy_type INT DEFAULT 0;

    UPDATE `student_document_files`
    SET `is_deleted` = 1,
        `deleted_at` = UTC_TIMESTAMP(),
        `deleted_by` = p_deleted_by
    WHERE `document_id` = p_document_id
      AND `student_id` = p_student_id
      AND `is_deleted` = 0;
    SET v_deleted = ROW_COUNT();

    IF v_deleted = 0 AND p_document_id < 1000000000 THEN
        SET v_legacy_source_id = FLOOR(p_document_id / 100);
        SET v_legacy_type = MOD(p_document_id, 100);

        UPDATE `student_documents`
        SET `AadhaarDocument` = IF(v_legacy_type = 1, NULL, `AadhaarDocument`),
            `PreviousCertificates` = IF(v_legacy_type = 2, NULL, `PreviousCertificates`),
            `TransferCertificate` = IF(v_legacy_type = 3, NULL, `TransferCertificate`),
            `PassportPhoto` = IF(v_legacy_type = 4, NULL, `PassportPhoto`),
            `CasteCertificate` = IF(v_legacy_type = 5, NULL, `CasteCertificate`),
            `IncomeCertificate` = IF(v_legacy_type = 6, NULL, `IncomeCertificate`)
        WHERE `DocumentId` = v_legacy_source_id
          AND `Student_Id` = p_student_id
          AND v_legacy_type BETWEEN 1 AND 6;
        SET v_deleted = ROW_COUNT();
    END IF;

    SELECT IF(v_deleted > 0, 1, 0) AS `Deleted`;
END$$
DELIMITER ;

-- Replace the existing list procedure with a backward-compatible union.
DROP PROCEDURE IF EXISTS `sp_student_documents_get_by_student_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_documents_get_by_student_id`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        documents.`document_id`, documents.`student_id`,
        documents.`document_type`, documents.`file_name`, documents.`uploaded_date`
    FROM (
        SELECT
            f.`document_id`, f.`student_id`, f.`document_type`,
            f.`file_name`, f.`uploaded_date`, 0 AS `display_order`
        FROM `student_document_files` f
        WHERE f.`student_id` = p_student_id AND f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + 1, sd.`Student_Id`, 'Aadhaar Document', sd.`AadhaarDocument`, sd.`UploadedDate`, 1
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`AadhaarDocument`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 2, sd.`Student_Id`, 'Previous Certificates', sd.`PreviousCertificates`, sd.`UploadedDate`, 2
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PreviousCertificates`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 3, sd.`Student_Id`, 'Transfer Certificate', sd.`TransferCertificate`, sd.`UploadedDate`, 3
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`TransferCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 4, sd.`Student_Id`, 'Passport Photo', sd.`PassportPhoto`, sd.`UploadedDate`, 4
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PassportPhoto`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 5, sd.`Student_Id`, 'Caste Certificate', sd.`CasteCertificate`, sd.`UploadedDate`, 5
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`CasteCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 6, sd.`Student_Id`, 'Income Certificate', sd.`IncomeCertificate`, sd.`UploadedDate`, 6
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`IncomeCertificate`), '') IS NOT NULL
    ) documents
    ORDER BY documents.`uploaded_date` DESC, documents.`display_order`, documents.`document_id` DESC;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_submit`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_submit`(
    IN p_admission_id BIGINT,
    IN p_submitted_by BIGINT
)
BEGIN
    DECLARE v_previous_status VARCHAR(50) DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_submitted_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    SELECT `AdmissionStatus` INTO v_previous_status
    FROM `studentadmissions`
    WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    LIMIT 1;

    IF v_previous_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_previous_status NOT IN ('Draft', 'Registered', 'Application Submitted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a draft or registered admission can be submitted.';
    END IF;

    IF v_previous_status <> 'Application Submitted' THEN
        UPDATE `studentadmissions`
        SET `AdmissionStatus` = 'Application Submitted',
            `SubmittedAt` = UTC_TIMESTAMP(),
            `UpdatedAt` = UTC_TIMESTAMP(),
            `UpdatedBy` = p_submitted_by
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0;

        INSERT INTO `admission_status_history` (
            `AdmissionId`, `PreviousStatus`, `NewStatus`, `ActionType`, `Remarks`,
            `ChangedBy`, `ChangedAt`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
        ) VALUES (
            p_admission_id, v_previous_status, 'Application Submitted', 'SUBMITTED',
            'Admission application submitted through the API.', p_submitted_by,
            UTC_TIMESTAMP(), 1, 0, p_submitted_by, UTC_TIMESTAMP()
        );
    END IF;

    SELECT
        sa.`AdmissionId`, sa.`AdmissionStatus`, sa.`SubmittedAt`
    FROM `studentadmissions` sa
    WHERE sa.`AdmissionId` = p_admission_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00), 0.00
        ) AS `FirstYearTotal`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AmountPaid`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00)
            - COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00), 0.00
        ) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`, 'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`, IF(sa.`AdmissionFeePaid` = 1, 'PAID', 'PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`, sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs
        ON fs.`admission_id` = sa.`AdmissionId`
    WHERE sa.`AdmissionId` = p_admission_id AND sa.`IsDeleted` = 0;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_upsert`(
    IN p_admission_id BIGINT,
    IN p_tuition_fee DECIMAL(12,2),
    IN p_admission_fee DECIMAL(12,2),
    IN p_hostel_fee DECIMAL(12,2),
    IN p_transportation_fee DECIMAL(12,2),
    IN p_scholarship_amount DECIMAL(12,2),
    IN p_payment_plan VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF COALESCE(p_tuition_fee, 0) < 0 OR COALESCE(p_admission_fee, 0) < 0
       OR COALESCE(p_hostel_fee, 0) < 0 OR COALESCE(p_transportation_fee, 0) < 0
       OR COALESCE(p_scholarship_amount, 0) < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee amounts cannot be negative.';
    END IF;

    INSERT INTO `student_admission_fee_structures` (
        `admission_id`, `tuition_fee`, `admission_fee`, `hostel_fee`,
        `transportation_fee`, `scholarship_amount`, `payment_plan`,
        `payment_status`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, COALESCE(p_tuition_fee, 0), COALESCE(p_admission_fee, 0),
        COALESCE(p_hostel_fee, 0), COALESCE(p_transportation_fee, 0),
        COALESCE(p_scholarship_amount, 0), COALESCE(NULLIF(TRIM(p_payment_plan), ''), 'ONE_TIME'),
        COALESCE(NULLIF(UPPER(TRIM(p_payment_status)), ''), 'PENDING'),
        UTC_TIMESTAMP(), p_updated_by, UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `tuition_fee` = VALUES(`tuition_fee`),
        `admission_fee` = VALUES(`admission_fee`),
        `hostel_fee` = VALUES(`hostel_fee`),
        `transportation_fee` = VALUES(`transportation_fee`),
        `scholarship_amount` = VALUES(`scholarship_amount`),
        `payment_plan` = VALUES(`payment_plan`),
        `payment_status` = VALUES(`payment_status`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;

    CALL `sp_student_admission_fee_get`(p_admission_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_get`(IN p_admission_id BIGINT)
BEGIN
    IF EXISTS (
        SELECT 1 FROM `student_admission_previous_education`
        WHERE `admission_id` = p_admission_id
    ) THEN
        SELECT
            pe.`qualification_level` AS `QualificationLevel`,
            pe.`qualification` AS `Qualification`,
            pe.`board_or_university` AS `BoardOrUniversity`,
            pe.`institution` AS `Institution`,
            pe.`roll_number` AS `RollNumber`,
            pe.`passing_year` AS `PassingYear`,
            pe.`stream` AS `Stream`,
            pe.`score` AS `Score`,
            pe.`updated_at` AS `UpdatedAt`
        FROM `student_admission_previous_education` pe
        WHERE pe.`admission_id` = p_admission_id
        ORDER BY FIELD(pe.`qualification_level`, 'TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER'), pe.`previous_education_id`;
    ELSE
        SELECT
            'TENTH' AS `QualificationLevel`,
            'Class 10' AS `Qualification`,
            sa.`PreviousBoard` AS `BoardOrUniversity`,
            sa.`PreviousSchool` AS `Institution`,
            sa.`PreviousHallTicket` AS `RollNumber`,
            sa.`PreviousYear` AS `PassingYear`,
            NULL AS `Stream`,
            sa.`PreviousPercentage` AS `Score`,
            sa.`UpdatedAt` AS `UpdatedAt`
        FROM `studentadmissions` sa
        WHERE sa.`AdmissionId` = p_admission_id
          AND sa.`IsDeleted` = 0
          AND (sa.`PreviousSchool` IS NOT NULL OR sa.`PreviousBoard` IS NOT NULL
               OR sa.`PreviousPercentage` IS NOT NULL);
    END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_upsert`(
    IN p_admission_id BIGINT,
    IN p_qualification_level VARCHAR(30),
    IN p_qualification VARCHAR(100),
    IN p_board_or_university VARCHAR(150),
    IN p_institution VARCHAR(255),
    IN p_roll_number VARCHAR(50),
    IN p_passing_year VARCHAR(20),
    IN p_stream VARCHAR(100),
    IN p_score DECIMAL(5,2),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_level VARCHAR(30);
    SET v_level = UPPER(TRIM(p_qualification_level));

    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_level NOT IN ('TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid qualification level.';
    END IF;
    IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score must be between 0 and 100.';
    END IF;

    INSERT INTO `student_admission_previous_education` (
        `admission_id`, `qualification_level`, `qualification`,
        `board_or_university`, `institution`, `roll_number`, `passing_year`,
        `stream`, `score`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, v_level, NULLIF(TRIM(p_qualification), ''),
        NULLIF(TRIM(p_board_or_university), ''), NULLIF(TRIM(p_institution), ''),
        NULLIF(TRIM(p_roll_number), ''), NULLIF(TRIM(p_passing_year), ''),
        NULLIF(TRIM(p_stream), ''), p_score, UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `qualification` = VALUES(`qualification`),
        `board_or_university` = VALUES(`board_or_university`),
        `institution` = VALUES(`institution`),
        `roll_number` = VALUES(`roll_number`),
        `passing_year` = VALUES(`passing_year`),
        `stream` = VALUES(`stream`),
        `score` = VALUES(`score`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_dashboard`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_dashboard`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        COUNT(*) AS `TotalStudents`,
        SUM(IF(latest.`promotion_id` IS NULL OR latest.`promotion_status` = 'PENDING', 1, 0)) AS `PendingReview`,
        SUM(IF(latest.`promotion_eligibility` = 'ELIGIBLE', 1, 0)) AS `Eligible`,
        SUM(IF(latest.`promotion_status` = 'APPROVED', 1, 0)) AS `Promoted`,
        SUM(IF(latest.`promotion_status` = 'REJECTED', 1, 0)) AS `Rejected`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Failed`,
        SUM(IF(latest.`promotion_eligibility` = 'DETAINED', 1, 0)) AS `Detained`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Backlogs`,
        0 AS `PrerequisiteIssues`
    FROM `students` s
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        s.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        s.`email` AS `Email`,
        s.`mobile` AS `Mobile`,
        d.`department_name` AS `DepartmentName`,
        s.`course_id` AS `CourseId`,
        COALESCE(NULLIF(c.`course_short_name`, ''), c.`course_name`) AS `CourseName`,
        s.`branch_id` AS `BranchId`,
        b.`branch_name` AS `BranchName`,
        s.`academic_year_id` AS `AcademicYearId`,
        ay.`academic_year_name` AS `AcademicYearName`,
        COALESCE(sec.`semester`, sem.`semester_number`) AS `CurrentSemester`,
        CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`)) AS `CurrentSemesterName`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN COALESCE(sec.`semester`, sem.`semester_number`) + 1 ELSE NULL END AS `TargetSemester`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`) + 1)
             ELSE 'Degree Completion Review' END AS `TargetSemesterName`,
        sec.`section_name` AS `SectionName`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CAST(NULL AS DECIMAL(5,2)) AS `Sgpa`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS SIGNED) AS `FailedSubjectCount`,
        CAST(NULL AS SIGNED) AS `PrerequisiteIssueCount`,
        0 AS `ResultsAvailable`,
        'PENDING_MODULE' AS `ExamIntegrationStatus`,
        COALESCE(latest.`promotion_status`, 'PENDING') AS `PromotionStatus`,
        COALESCE(latest.`promotion_eligibility`, 'PENDING_RESULTS') AS `EligibilityStatus`
    FROM `students` s
    LEFT JOIN `courses` c ON c.`course_id` = s.`course_id`
    LEFT JOIN `branches` b ON b.`branch_id` = s.`branch_id`
    LEFT JOIN `departments` d ON d.`department_id` = b.`department_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    INNER JOIN `academicyears` ay ON ay.`academic_year_id` = s.`academic_year_id`
    LEFT JOIN `student_section_assignments` ssa
        ON ssa.`student_section_assignment_id` = (
            SELECT MAX(ssa2.`student_section_assignment_id`)
            FROM `student_section_assignments` ssa2
            WHERE ssa2.`student_id` = s.`student_id` AND ssa2.`status` = 1
        )
    LEFT JOIN `sections` sec ON sec.`section_id` = ssa.`section_id`
    LEFT JOIN `semesters` sem ON sem.`semester_id` = sec.`semester_id`
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
    ORDER BY s.`full_name`, s.`student_id`
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `students` s
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'));
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_history_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_history_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(30),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        sp.`promotion_id` AS `PromotionId`,
        sp.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        fay.`academic_year_name` AS `FromAcademicYearName`,
        tay.`academic_year_name` AS `ToAcademicYearName`,
        COALESCE(NULLIF(fc.`course_short_name`, ''), fc.`course_name`) AS `FromCourseName`,
        COALESCE(NULLIF(tc.`course_short_name`, ''), tc.`course_name`) AS `ToCourseName`,
        fb.`branch_name` AS `FromBranchName`,
        tb.`branch_name` AS `ToBranchName`,
        sp.`from_semester` AS `FromSemester`,
        sp.`to_semester` AS `ToSemester`,
        sp.`promotion_status` AS `PromotionStatus`,
        sp.`promotion_eligibility` AS `PromotionEligibility`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CASE WHEN sp.`decision_by` IS NULL THEN 'System' ELSE 'Individual' END AS `PromotionMode`,
        actor.`full_name` AS `PromotedBy`,
        COALESCE(sp.`decision_date`, sp.`created_at`) AS `PromotionDate`,
        sp.`remarks` AS `Remarks`,
        sp.`created_at` AS `CreatedAt`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    LEFT JOIN `users` actor ON actor.`user_id` = COALESCE(sp.`decision_by`, sp.`created_by`)
    LEFT JOIN `academicyears` fay ON fay.`academic_year_id` = sp.`from_academic_year_id`
    LEFT JOIN `academicyears` tay ON tay.`academic_year_id` = sp.`to_academic_year_id`
    LEFT JOIN `courses` fc ON fc.`course_id` = sp.`from_course_id`
    LEFT JOIN `courses` tc ON tc.`course_id` = sp.`to_course_id`
    LEFT JOIN `branches` fb ON fb.`branch_id` = sp.`from_branch_id`
    LEFT JOIN `branches` tb ON tb.`branch_id` = sp.`to_branch_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)))
    ORDER BY sp.`created_at` DESC, sp.`promotion_id` DESC
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)));
END$$
DELIMITER ;

-- Smoke-test examples (execute after applying this file):
-- CALL sp_student_admission_list(NULL, NULL, 1, 20);
-- CALL sp_student_admission_fee_get(1);
-- CALL sp_student_admission_previous_education_get(1);
-- CALL sp_student_promotion_dashboard(NULL, NULL, NULL, NULL);
-- CALL sp_student_promotion_directory(NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_promotion_history_directory(NULL, NULL, NULL, 1, 20);
-- END Database/StudentIntegration/StudentIntegrationOperations.sql


-- BEGIN Database/StudentProfile/StudentProfileUpdatesTable.sql
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
-- END Database/StudentProfile/StudentProfileUpdatesTable.sql


-- BEGIN Database/StudentProfile/StudentProfileFullUpdateStoredProcedure.sql
-- =============================================================
-- STUDENT PROFILE SCREEN: PERSONAL + PARENT UPDATE
-- MySQL 8.x. Updates the editable profile-screen fields and the
-- immutable student_profile_updates history in one transaction.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_profile_full_update`;
DELIMITER $$
CREATE PROCEDURE `sp_student_profile_full_update`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_father_name VARCHAR(150),
    IN p_father_mobile VARCHAR(20),
    IN p_father_email VARCHAR(150),
    IN p_father_occupation VARCHAR(100),
    IN p_mother_name VARCHAR(150),
    IN p_mother_mobile VARCHAR(20),
    IN p_mother_email VARCHAR(150),
    IN p_mother_occupation VARCHAR(100),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_existing_student_id BIGINT DEFAULT NULL;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0
       OR p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student and college are required.';
    END IF;
    IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;
    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_changed_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    SELECT s.`student_id`
      INTO v_existing_student_id
    FROM `students` s
    WHERE s.`student_id` = p_student_id
      AND s.`college_id` = p_college_id
      AND s.`deleted_at` IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_existing_student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student profile not found for this college.';
    END IF;

    SELECT sp.`StudentProfileId`
      INTO v_profile_id
    FROM `student_profiles` sp
    WHERE sp.`StudentId` = p_student_id AND sp.`IsDeleted` = 0
    LIMIT 1
    FOR UPDATE;

    IF v_profile_id IS NULL THEN
        INSERT INTO `student_profiles` (
            `StudentId`, `BloodGroup`, `Address`, `IsActive`, `IsDeleted`,
            `CreatedBy`, `CreatedAt`, `UpdatedBy`, `UpdatedAt`
        ) VALUES (
            p_student_id, p_blood_group, p_address, 1, 0,
            p_changed_by, UTC_TIMESTAMP(), p_changed_by, UTC_TIMESTAMP()
        );
        SET v_profile_id = LAST_INSERT_ID();
    END IF;

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_old_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    UPDATE `students`
    SET `full_name` = TRIM(p_full_name),
        `gender` = COALESCE(NULLIF(TRIM(p_gender), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM(p_email), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM(p_mobile), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM(p_address), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM(p_address), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM(p_father_name), ''), NULLIF(TRIM(p_father_mobile), ''),
        NULLIF(TRIM(p_father_email), ''), NULLIF(TRIM(p_father_occupation), ''),
        NULLIF(TRIM(p_mother_name), ''), NULLIF(TRIM(p_mother_mobile), ''),
        NULLIF(TRIM(p_mother_email), ''), NULLIF(TRIM(p_mother_occupation), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM(p_father_name), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM(p_father_mobile), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM(p_father_email), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM(p_father_occupation), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM(p_mother_name), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM(p_mother_mobile), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM(p_mother_email), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM(p_mother_occupation), ''), `mother_occupation`),
        `updated_at` = UTC_TIMESTAMP();

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    INSERT INTO `student_profile_updates` (
        `StudentProfileId`, `StudentId`, `ChangeType`, `ChangedFields`,
        `OldValues`, `NewValues`, `ChangeReason`, `ChangeSource`,
        `ChangedBy`, `ChangedAt`, `IpAddress`, `UserAgent`
    ) VALUES (
        v_profile_id, p_student_id, 'ProfileScreenUpdate',
        JSON_ARRAY(
            'FullName', 'Gender', 'DateOfBirth', 'Email', 'Mobile',
            'BloodGroup', 'Address', 'FatherName', 'FatherMobile',
            'FatherEmail', 'FatherOccupation', 'MotherName', 'MotherMobile',
            'MotherEmail', 'MotherOccupation'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$
DELIMITER ;
-- END Database/StudentProfile/StudentProfileFullUpdateStoredProcedure.sql


-- BEGIN Database/StudentManagement/StudentManagementStoredProcedures.sql
-- Student Management API database objects
-- No EF Core migration is required. Run this file manually after importing
-- the supplied cms_btech database dump.

USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_get_all;
DROP PROCEDURE IF EXISTS sp_student_search;
DROP PROCEDURE IF EXISTS sp_student_get_by_id;
DROP PROCEDURE IF EXISTS sp_student_code_exists;
DROP PROCEDURE IF EXISTS sp_student_validate_references;
DROP PROCEDURE IF EXISTS sp_student_create;
DROP PROCEDURE IF EXISTS sp_student_update;
DROP PROCEDURE IF EXISTS sp_student_update_status;

DELIMITER $$

CREATE PROCEDURE sp_student_get_all(
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END$$

CREATE PROCEDURE sp_student_search(
    IN p_query VARCHAR(150),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_search VARCHAR(160);

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;
    SET v_search = CONCAT('%', TRIM(IFNULL(p_query, '')), '%');

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (
          s.student_code LIKE v_search
          OR s.full_name LIKE v_search
          OR s.email LIKE v_search
          OR s.mobile LIKE v_search
      )
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END$$

CREATE PROCEDURE sp_student_get_by_id(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_student_code_exists(
    IN p_student_code VARCHAR(50),
    IN p_exclude_student_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
          AND (p_exclude_student_id IS NULL OR student_id <> p_exclude_student_id)
    ) AS exists_value;
END$$

CREATE PROCEDURE sp_student_validate_references(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        EXISTS(
            SELECT 1 FROM colleges
            WHERE college_id = p_college_id AND deleted_at IS NULL
        ) AS college_exists,
        EXISTS(
            SELECT 1 FROM academicyears
            WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
        ) AS academic_year_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id AND deleted_at IS NULL
        )) AS course_exists,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id AND deleted_at IS NULL
        )) AS branch_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id
              AND college_id = p_college_id
              AND deleted_at IS NULL
        )) AS course_belongs_to_college,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id
              AND (p_course_id IS NULL OR course_id = p_course_id)
              AND deleted_at IS NULL
        )) AS branch_belongs_to_course;
END$$

CREATE PROCEDURE sp_student_create(
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_student_id BIGINT;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    INSERT INTO students
    (
        college_id,
        student_code,
        full_name,
        gender,
        date_of_birth,
        email,
        mobile,
        blood_group,
        address,
        course_id,
        branch_id,
        academic_year_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        UPPER(TRIM(p_student_code)),
        TRIM(p_full_name),
        NULLIF(TRIM(p_gender), ''),
        p_date_of_birth,
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_mobile), ''),
        NULLIF(TRIM(p_blood_group), ''),
        NULLIF(TRIM(p_address), ''),
        p_course_id,
        p_branch_id,
        p_academic_year_id,
        p_status,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_student_id = LAST_INSERT_ID();
    CALL sp_student_get_by_id(v_student_id);
END$$

CREATE PROCEDURE sp_student_update(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND student_id <> p_student_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    UPDATE students
    SET college_id = p_college_id,
        student_code = UPPER(TRIM(p_student_code)),
        full_name = TRIM(p_full_name),
        gender = NULLIF(TRIM(p_gender), ''),
        date_of_birth = p_date_of_birth,
        email = NULLIF(TRIM(p_email), ''),
        mobile = NULLIF(TRIM(p_mobile), ''),
        blood_group = NULLIF(TRIM(p_blood_group), ''),
        address = NULLIF(TRIM(p_address), ''),
        course_id = p_course_id,
        branch_id = p_branch_id,
        academic_year_id = p_academic_year_id,
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    CALL sp_student_get_by_id(p_student_id);
END$$

CREATE PROCEDURE sp_student_update_status(
    IN p_student_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SELECT
            s.student_id,
            s.college_id,
            c.college_name,
            s.student_code,
            s.full_name,
            s.gender,
            s.date_of_birth,
            s.email,
            s.mobile,
            s.blood_group,
            s.address,
            s.course_id,
            co.course_name,
            s.branch_id,
            b.branch_name,
            s.academic_year_id,
            ay.academic_year_name,
            s.status,
            s.created_at,
            s.created_by,
            s.updated_at,
            s.updated_by,
            s.deleted_at,
            s.deleted_by
        FROM students s
        INNER JOIN colleges c ON c.college_id = s.college_id
        INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
        LEFT JOIN courses co ON co.course_id = s.course_id
        LEFT JOIN branches b ON b.branch_id = s.branch_id
        WHERE 1 = 0;
    ELSE
        UPDATE students
        SET status = p_status,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE student_id = p_student_id
          AND deleted_at IS NULL;

        CALL sp_student_get_by_id(p_student_id);
    END IF;
END$$

DELIMITER ;

-- Optional verification commands:
-- CALL sp_student_get_all(NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_search('STU', NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_get_by_id(1);
-- CALL sp_student_validate_references(1, 2, 1, 1);
-- CALL sp_student_code_exists('STU004', NULL);
-- END Database/StudentManagement/StudentManagementStoredProcedures.sql


-- BEGIN Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql
-- =============================================================
-- STUDENT PROFILE: PERSONAL INFORMATION + AUDIT
-- MySQL 8.x
-- Prerequisites already present in the supplied database:
--   students, student_profiles, student_profile_updates,
--   courses, branches, academicyears, users
-- =============================================================

USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_profile_personal_get;
DROP PROCEDURE IF EXISTS sp_student_profile_personal_update;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_personal_get(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto AS profile_photo,
        sp.AlternateEmail AS alternate_email,
        sp.AlternateMobile AS alternate_mobile,
        COALESCE(sp.BloodGroup, s.blood_group) AS blood_group,
        sp.Nationality AS nationality,
        sp.Religion AS religion,
        sp.Category AS category,
        COALESCE(sp.Address, s.address) AS address,
        sp.City AS city,
        sp.District AS district,
        sp.State AS state,
        COALESCE(sp.Country, 'India') AS country,
        sp.Pincode AS pincode,
        COALESCE(sp.ProfileStatus, 'Incomplete') AS profile_status,
        COALESCE(sp.IsProfileCompleted, 0) AS is_profile_completed,
        COALESCE(sp.IsVerified, 0) AS is_verified,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS profile_completion_percentage,
        s.college_id,
        s.course_id,
        c.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        COALESCE(
            GREATEST(
                COALESCE(s.updated_at, s.created_at),
                COALESCE(sp.UpdatedAt, sp.CreatedAt)
            ),
            s.updated_at,
            s.created_at
        ) AS updated_at
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    LEFT JOIN courses c
        ON c.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_student_profile_personal_update(
    IN p_student_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_profile_photo VARCHAR(500),
    IN p_alternate_email VARCHAR(150),
    IN p_alternate_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_nationality VARCHAR(100),
    IN p_religion VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_changed_fields JSON;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE v_old_full_name VARCHAR(150);
    DECLARE v_old_gender VARCHAR(20);
    DECLARE v_old_date_of_birth DATE;
    DECLARE v_old_email VARCHAR(150);
    DECLARE v_old_mobile VARCHAR(20);
    DECLARE v_old_profile_photo VARCHAR(500);
    DECLARE v_old_alternate_email VARCHAR(150);
    DECLARE v_old_alternate_mobile VARCHAR(20);
    DECLARE v_old_blood_group VARCHAR(10);
    DECLARE v_old_nationality VARCHAR(100);
    DECLARE v_old_religion VARCHAR(100);
    DECLARE v_old_category VARCHAR(100);
    DECLARE v_old_address TEXT;
    DECLARE v_old_city VARCHAR(100);
    DECLARE v_old_district VARCHAR(100);
    DECLARE v_old_state VARCHAR(100);
    DECLARE v_old_country VARCHAR(100);
    DECLARE v_old_pincode VARCHAR(10);
    DECLARE v_completion_percentage DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_completed TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_changed_fields = JSON_ARRAY();
    SET v_old_values = JSON_OBJECT();
    SET v_new_values = JSON_OBJECT();

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid logged-in user is required.';
    END IF;

    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_student_exists
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_student_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student profile not found.';
    END IF;

    SELECT
        sp.StudentProfileId,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto,
        sp.AlternateEmail,
        sp.AlternateMobile,
        COALESCE(sp.BloodGroup, s.blood_group),
        sp.Nationality,
        sp.Religion,
        sp.Category,
        COALESCE(sp.Address, s.address),
        sp.City,
        sp.District,
        sp.State,
        COALESCE(sp.Country, 'India'),
        sp.Pincode
    INTO
        v_profile_id,
        v_old_full_name,
        v_old_gender,
        v_old_date_of_birth,
        v_old_email,
        v_old_mobile,
        v_old_profile_photo,
        v_old_alternate_email,
        v_old_alternate_mobile,
        v_old_blood_group,
        v_old_nationality,
        v_old_religion,
        v_old_category,
        v_old_address,
        v_old_city,
        v_old_district,
        v_old_state,
        v_old_country,
        v_old_pincode
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF p_full_name IS NOT NULL AND NOT (p_full_name <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', p_full_name);
    END IF;
    IF p_gender IS NOT NULL AND NOT (p_gender <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', p_gender);
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF p_email IS NOT NULL AND NOT (p_email <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', p_email);
    END IF;
    IF p_mobile IS NOT NULL AND NOT (p_mobile <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', p_mobile);
    END IF;
    IF p_profile_photo IS NOT NULL AND NOT (p_profile_photo <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', p_profile_photo);
    END IF;
    IF p_alternate_email IS NOT NULL AND NOT (p_alternate_email <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', p_alternate_email);
    END IF;
    IF p_alternate_mobile IS NOT NULL AND NOT (p_alternate_mobile <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', p_alternate_mobile);
    END IF;
    IF p_blood_group IS NOT NULL AND NOT (p_blood_group <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', p_blood_group);
    END IF;
    IF p_nationality IS NOT NULL AND NOT (p_nationality <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', p_nationality);
    END IF;
    IF p_religion IS NOT NULL AND NOT (p_religion <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', p_religion);
    END IF;
    IF p_category IS NOT NULL AND NOT (p_category <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', p_category);
    END IF;
    IF p_address IS NOT NULL AND NOT (p_address <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', p_address);
    END IF;
    IF p_city IS NOT NULL AND NOT (p_city <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', p_city);
    END IF;
    IF p_district IS NOT NULL AND NOT (p_district <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', p_district);
    END IF;
    IF p_state IS NOT NULL AND NOT (p_state <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', p_state);
    END IF;
    IF p_country IS NOT NULL AND NOT (p_country <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', p_country);
    END IF;
    IF p_pincode IS NOT NULL AND NOT (p_pincode <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', p_pincode);
    END IF;

    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE(p_full_name, full_name),
        gender = COALESCE(p_gender, gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE(p_email, email),
        mobile = COALESCE(p_mobile, mobile),
        blood_group = COALESCE(p_blood_group, blood_group),
        address = COALESCE(p_address, address),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_changed_by
    WHERE student_id = p_student_id;

    IF v_profile_id IS NULL THEN
        INSERT INTO student_profiles
        (
            StudentId, ProfilePhoto, AlternateEmail, AlternateMobile,
            BloodGroup, Nationality, Religion, Category, Address,
            City, District, State, Country, Pincode,
            IsActive, IsDeleted, CreatedBy, CreatedAt
        )
        VALUES
        (
            p_student_id, p_profile_photo, p_alternate_email, p_alternate_mobile,
            p_blood_group, p_nationality, p_religion, p_category, p_address,
            p_city, p_district, p_state, COALESCE(p_country, 'India'), p_pincode,
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE(p_profile_photo, ProfilePhoto),
            AlternateEmail = COALESCE(p_alternate_email, AlternateEmail),
            AlternateMobile = COALESCE(p_alternate_mobile, AlternateMobile),
            BloodGroup = COALESCE(p_blood_group, BloodGroup),
            Nationality = COALESCE(p_nationality, Nationality),
            Religion = COALESCE(p_religion, Religion),
            Category = COALESCE(p_category, Category),
            Address = COALESCE(p_address, Address),
            City = COALESCE(p_city, City),
            District = COALESCE(p_district, District),
            State = COALESCE(p_state, State),
            Country = COALESCE(p_country, Country),
            Pincode = COALESCE(p_pincode, Pincode),
            UpdatedBy = p_changed_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentProfileId = v_profile_id;
    END IF;

    SELECT
        ROUND(
            (
                (s.full_name IS NOT NULL AND TRIM(s.full_name) <> '') +
                (s.gender IS NOT NULL AND TRIM(s.gender) <> '') +
                (s.date_of_birth IS NOT NULL) +
                (s.email IS NOT NULL AND TRIM(s.email) <> '') +
                (s.mobile IS NOT NULL AND TRIM(s.mobile) <> '') +
                (sp.BloodGroup IS NOT NULL AND TRIM(sp.BloodGroup) <> '') +
                (sp.Nationality IS NOT NULL AND TRIM(sp.Nationality) <> '') +
                (sp.Address IS NOT NULL AND TRIM(sp.Address) <> '') +
                (sp.City IS NOT NULL AND TRIM(sp.City) <> '') +
                (sp.District IS NOT NULL AND TRIM(sp.District) <> '') +
                (sp.State IS NOT NULL AND TRIM(sp.State) <> '') +
                (sp.Country IS NOT NULL AND TRIM(sp.Country) <> '') +
                (sp.Pincode IS NOT NULL AND TRIM(sp.Pincode) <> '')
            ) / 13 * 100,
            2
        )
    INTO v_completion_percentage
    FROM students s
    INNER JOIN student_profiles sp ON sp.StudentId = s.student_id
    WHERE s.student_id = p_student_id;

    SET v_completed = IF(v_completion_percentage = 100.00, 1, 0);

    UPDATE student_profiles
    SET
        ProfileCompletionPercentage = v_completion_percentage,
        IsProfileCompleted = v_completed,
        ProfileStatus = CASE
            WHEN ProfileStatus IN ('Verified', 'Active', 'Inactive', 'Suspended')
                THEN ProfileStatus
            WHEN v_completed = 1 THEN 'Pending Verification'
            ELSE 'Incomplete'
        END,
        UpdatedBy = p_changed_by,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentProfileId = v_profile_id;

    INSERT INTO student_profile_updates
    (
        StudentProfileId,
        StudentId,
        ChangeType,
        ChangedFields,
        OldValues,
        NewValues,
        ChangeReason,
        ChangeSource,
        ChangedBy,
        ChangedAt,
        IpAddress,
        UserAgent
    )
    VALUES
    (
        v_profile_id,
        p_student_id,
        'Update',
        CAST(v_changed_fields AS CHAR),
        CAST(v_old_values AS CHAR),
        CAST(v_new_values AS CHAR),
        NULLIF(TRIM(p_change_reason), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        p_ip_address,
        p_user_agent
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END$$

DELIMITER ;

-- Verification commands:
-- CALL sp_student_profile_personal_get(1);
-- CALL sp_student_profile_personal_update(
--   1, NULL, NULL, NULL, NULL, NULL, NULL,
--   'student.personal@example.com', '9000000099', NULL,
--   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
--   'Updated alternate contact details', 1, '127.0.0.1', 'MySQL Workbench'
-- );
-- END Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql


-- BEGIN Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_all.sql
DROP PROCEDURE IF EXISTS sp_student_profile_get_all;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_get_all
(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(200),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_id BIGINT,
    IN p_status INT
)
BEGIN

    SELECT
        s.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,
        COALESCE(sp.ProfilePhoto, sa.StudentPhoto, sa.PassportPhoto) AS ProfilePhoto,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        -- Admission information
        sa.RegistrationNo AS RegistrationNumber,
        sa.AdmissionNo AS AdmissionNumber,

        -- Academic information
        s.course_id AS CourseId,
        c.course_name AS Course,

        s.branch_id AS BranchId,
        b.branch_name AS Branch,

        b.department_id AS DepartmentId,
        d.department_name AS Department,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,
        sec.section_id AS SectionId,
        sec.section_name AS Section,

        -- Contact
        s.mobile AS Mobile,
        s.email AS Email,

        -- Status
        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.college_id = p_college_id
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            p_search IS NULL
            OR TRIM(p_search) = ''

            OR s.full_name LIKE CONCAT('%', p_search, '%')

            OR s.student_code LIKE CONCAT('%', p_search, '%')

            OR s.mobile LIKE CONCAT('%', p_search, '%')

            OR s.email LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

        -- Department
        AND
        (
            p_department_id IS NULL
            OR b.department_id = p_department_id
        )

        -- Course
        AND
        (
            p_course_id IS NULL
            OR s.course_id = p_course_id
        )

        -- Branch
        AND
        (
            p_branch_id IS NULL
            OR s.branch_id = p_branch_id
        )

        -- Academic Year
        AND
        (
            p_academic_year_id IS NULL
            OR s.academic_year_id = p_academic_year_id
        )

        -- Semester
        AND
        (
            p_semester IS NULL
            OR sec.semester = p_semester
        )

        -- Section
        AND
        (
            p_section_id IS NULL
            OR sec.section_id = p_section_id
        )

        -- Status
        AND
        (
            p_status IS NULL
            OR s.status = p_status
        )

    ORDER BY
        s.student_id DESC;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_all.sql


-- BEGIN Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_preview.sql
DROP PROCEDURE IF EXISTS sp_student_profile_get_preview;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_get_preview
(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT

        /* =========================
           HEADER
           ========================= */

        s.student_id AS StudentId,

        s.student_code AS StudentCode,

        s.full_name AS StudentName,

        COALESCE(
            sp.ProfilePhoto,
            sa.StudentPhoto,
            sa.PassportPhoto
        ) AS ProfilePhoto,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status,


        /* =========================
           SUMMARY
           ========================= */

        sa.RegistrationNo AS RegistrationNumber,

        sa.AdmissionNo AS AdmissionNumber,

        NULL AS RollNumber,

        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS StudentStatus,


        /* =========================
           FEE STATUS
           ========================= */

        CASE

            WHEN sa.AdmissionFeeAmount IS NULL
                THEN 'Not available'

            WHEN sa.AdmissionFeeAmount = 0
                THEN 'Not available'

            WHEN sa.AdmissionFeePaid = 1
                THEN 'Paid'

            ELSE 'Pending'

        END AS FeeStatus,


        /* =========================
           ATTENDANCE / RESULTS
           ========================= */

        'Not available' AS AttendanceStatus,

        'Not available' AS ResultStatus,


        /* =========================
           ACADEMIC INFORMATION
           ========================= */

        s.course_id AS CourseId,

        c.course_name AS Course,

        b.department_id AS DepartmentId,

        d.department_name AS Department,

        s.branch_id AS BranchId,

        b.branch_name AS Branch,

        s.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,

        sec.section_id AS SectionId,

        sec.section_name AS Section,

        NULL AS AcademicRollNumber,

        sa.RegistrationNo AS AcademicRegistrationNumber,


        /* =========================
           PERSONAL INFORMATION
           ========================= */

        s.full_name AS PersonalFullName,

        s.gender AS Gender,

        s.date_of_birth AS DateOfBirth,

        s.mobile AS Mobile,

        s.email AS Email,

        s.blood_group AS BloodGroup,

        s.address AS Address,


        /* =========================
           PARENT / GUARDIAN
           ========================= */

        COALESCE(spar.father_name, sa.FatherName) AS FatherName,

        COALESCE(spar.mother_name, sa.MotherName) AS MotherName,

        sa.GuardianName AS GuardianName,

        COALESCE(spar.father_mobile, spar.mother_mobile, sa.GuardianMobile) AS ParentMobile,

        COALESCE(spar.father_email, spar.mother_email, sa.GuardianEmail) AS ParentEmail,

        COALESCE(spar.father_occupation, sa.Occupation) AS FatherOccupation,

        spar.mother_occupation AS MotherOccupation


    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN student_parents spar
        ON spar.student_id = s.student_id

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.student_id = p_student_id
        AND s.college_id = p_college_id
        AND s.deleted_at IS NULL;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_preview.sql


-- BEGIN Database/Sql/Stored Procedures/StudentPromotionEligible/sp_student_promotion_get_eligible.sql
DROP PROCEDURE IF EXISTS sp_student_promotion_get_eligible;

DELIMITER $$

CREATE PROCEDURE sp_student_promotion_get_eligible
(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester INT,
    IN p_search VARCHAR(150)
)
BEGIN

    /*
        =========================================================
        VALIDATE ACADEMIC YEAR
        =========================================================
    */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears ay
        WHERE ay.academic_year_id = p_academic_year_id
          AND ay.deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year does not exist.';

    END IF;


    /*
        =========================================================
        GET ELIGIBLE STUDENTS
        =========================================================
    */

    SELECT

        st.student_id AS StudentId,

        st.student_code AS StudentCode,

        st.full_name AS StudentName,

        NULL AS RollNumber,

        sa.RegistrationNo AS RegistrationNumber,

        st.email AS Email,

        st.mobile AS Mobile,

        st.college_id AS CollegeId,

        c.course_id AS CourseId,

        c.course_code AS CourseCode,

        c.course_name AS CourseName,

        b.branch_id AS BranchId,

        b.branch_code AS BranchCode,

        b.branch_name AS BranchName,

        st.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYearName,

        sec.section_id AS SectionId,

        sec.section_name AS SectionName,

        COALESCE(sec.semester, sem.semester_number) AS CurrentSemester,

        c.total_semesters AS TotalSemesters,

        COALESCE(sec.semester, sem.semester_number) + 1 AS NextSemester,

        'PENDING_REVIEW' AS EligibilityStatus,

        NULL AS PromotionStatus,

        0 AS ResultsAvailable,

        NULL AS Sgpa,

        NULL AS Cgpa,

        NULL AS CreditsEarned

    FROM students st

    INNER JOIN academicyears ay
        ON ay.academic_year_id = st.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = st.admission_id
       AND sa.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = st.course_id
       AND c.deleted_at IS NULL

    LEFT JOIN branches b
        ON b.branch_id = st.branch_id
       AND b.deleted_at IS NULL

    /*
        Get the student's current active section
    */

    INNER JOIN student_section_assignments ssa
        ON ssa.student_id = st.student_id
       AND ssa.academic_year_id = st.academic_year_id
       AND ssa.status = 1

    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.deleted_at IS NULL
       AND sec.status = 1

    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0

    WHERE

        /*
            Student must be active
        */
        st.status = 1

        AND st.deleted_at IS NULL

        /*
            College isolation
        */
        AND st.college_id = p_college_id

        /*
            Academic year
        */
        AND st.academic_year_id = p_academic_year_id

        /*
            Optional course filter
        */
        AND
        (
            p_course_id IS NULL
            OR st.course_id = p_course_id
        )

        /*
            Optional branch filter
        */
        AND
        (
            p_branch_id IS NULL
            OR st.branch_id = p_branch_id
        )

        /*
            Optional semester filter
        */
        AND
        (
            p_semester IS NULL
            OR COALESCE(sec.semester, sem.semester_number) = p_semester
        )

        /*
            Student must not be in final semester.
        */
        AND
        (
            c.total_semesters IS NULL
            OR COALESCE(sec.semester, sem.semester_number) < c.total_semesters
        )

        /*
            Don't show students who already have an active
            promotion evaluation for this academic year.
        */
        AND NOT EXISTS
        (
            SELECT 1
            FROM student_promotions sp
            WHERE sp.student_id = st.student_id

              AND sp.from_academic_year_id = st.academic_year_id

              AND sp.from_semester = COALESCE(sec.semester, sem.semester_number)

              AND sp.deleted_at IS NULL

              AND sp.promotion_status IN
              (
                  'PENDING',
                  'APPROVED'
              )
        )

        /*
            Search
        */
        AND
        (
            p_search IS NULL
            OR p_search = ''

            OR st.student_code LIKE CONCAT('%', p_search, '%')

            OR st.full_name LIKE CONCAT('%', p_search, '%')

            OR st.email LIKE CONCAT('%', p_search, '%')

            OR st.mobile LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

    ORDER BY
        st.full_name ASC;

END $$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentPromotionEligible/sp_student_promotion_get_eligible.sql


-- BEGIN Database/StudentPromotion/StudentPromotionAtomicStoredProcedure.sql
-- =============================================================
-- ATOMIC STUDENT ACADEMIC PROGRESSION + PROMOTION HISTORY
-- MySQL 8.x / database: cms_btech
--
-- The student row, active section assignment and promotion history
-- are changed in one transaction. Any validation/database failure
-- rolls back every change.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_promote`;
DELIMITER $$

CREATE PROCEDURE `sp_student_promote`(
    IN p_student_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_course_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_target_level_number INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    -- Lock the student and its current academic context.
    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.course_type,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_course_type,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student, course, or academic year is unavailable.';
    END IF;

    -- The active assignment is the authoritative semester/section.
    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE ssa.student_id = p_student_id
      AND ssa.academic_year_id = v_from_academic_year_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC,
             ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    IF v_from_semester <= 0 OR v_from_semester >= v_total_semesters THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student is already in the final semester or has an invalid semester.';
    END IF;

    SET v_to_semester = v_from_semester + 1;

    -- Two semesters share an academic year. Crossing an even semester
    -- requires the next configured active academic year.
    IF MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id
        INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.status = 1
          AND ay.is_archived = 0
          AND ay.deleted_at IS NULL
        ORDER BY ay.start_date ASC, ay.academic_year_id ASC
        LIMIT 1
        FOR UPDATE;

        IF v_to_academic_year_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Activate the next academic year before cross-year promotion.';
        END IF;
    END IF;

    SET v_target_level_number = CEIL(v_to_semester / 2.0);

    IF NOT EXISTS (
        SELECT 1
        FROM academic_levels al
        WHERE al.academic_year_id = v_to_academic_year_id
          AND al.level_number = v_target_level_number
          AND al.level_type = v_course_type
          AND al.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The target academic level is not configured.';
    END IF;

    -- Choose an active target section with capacity and lock it.
    SELECT sec.section_id
    INTO v_to_section_id
    FROM sections sec
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE sec.college_id = v_college_id
      AND sec.academic_year_id = v_to_academic_year_id
      AND sec.course_id = v_course_id
      AND sec.branch_id <=> v_branch_id
      AND COALESCE(sec.semester, sem.semester_number) = v_to_semester
      AND sec.status = 1
      AND sec.is_archived = 0
      AND sec.deleted_at IS NULL
      AND (
          SELECT COUNT(*)
          FROM student_section_assignments target_ssa
          WHERE target_ssa.section_id = sec.section_id
            AND target_ssa.status = 1
      ) < sec.capacity
    ORDER BY
        (
            SELECT COUNT(*)
            FROM student_section_assignments target_ssa
            WHERE target_ssa.section_id = sec.section_id
              AND target_ssa.status = 1
        ) ASC,
        sec.section_id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_to_section_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No active target-semester section with capacity is configured.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.to_academic_year_id = v_to_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.to_semester = v_to_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This semester promotion is already recorded.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    -- History, assignment movement, and student context are one unit.
    INSERT INTO student_promotions (
        student_id,
        college_id,
        from_academic_year_id,
        to_academic_year_id,
        from_course_id,
        to_course_id,
        from_branch_id,
        to_branch_id,
        from_section_id,
        to_section_id,
        from_semester,
        to_semester,
        promotion_status,
        decision,
        decision_date,
        decision_by,
        remarks,
        promotion_eligibility,
        eligibility_remarks,
        promotion_type,
        promotion_date,
        effective_date,
        promotion_reason,
        approved_at,
        is_final,
        promotion_order,
        is_active,
        created_at,
        created_by
    ) VALUES (
        p_student_id,
        v_college_id,
        v_from_academic_year_id,
        v_to_academic_year_id,
        v_course_id,
        v_course_id,
        v_branch_id,
        v_branch_id,
        v_from_section_id,
        v_to_section_id,
        v_from_semester,
        v_to_semester,
        'APPROVED',
        'APPROVE',
        UTC_TIMESTAMP(),
        p_created_by,
        'Student academic progression completed.',
        'ELIGIBLE',
        'Approved by an authorized user.',
        CASE
            WHEN v_to_academic_year_id = v_from_academic_year_id
                THEN 'SEMESTER'
            ELSE 'ACADEMIC_YEAR'
        END,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP(),
        'Academic progression.',
        UTC_TIMESTAMP(),
        IF(v_to_semester = v_total_semesters, 1, 0),
        v_promotion_order,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    INSERT INTO student_section_assignments (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    ) VALUES (
        p_student_id,
        v_to_section_id,
        v_to_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic progression could not be updated.';
    END IF;

    COMMIT;

    -- PascalCase columns support Dapper; snake_case aliases preserve the
    -- older StudentRepository reader contract. No existing caller is removed.
    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,

        sp.promotion_id AS promotion_id,
        sp.student_id AS student_id,
        sp.from_academic_year_id AS from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        sp.to_academic_year_id AS to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        sp.from_course_id AS from_course_id,
        sp.to_course_id AS to_course_id,
        sp.from_branch_id AS from_branch_id,
        sp.to_branch_id AS to_branch_id,
        sp.promotion_status AS promotion_status,
        sp.decision AS decision,
        sp.promotion_eligibility AS promotion_eligibility,
        sp.promotion_type AS promotion_type,
        sp.promotion_date AS promotion_date,
        sp.effective_date AS effective_date,
        sp.remarks AS remarks
    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$

DELIMITER ;

-- Configuration prerequisites for a successful call:
-- 1. The target academic level exists and is active.
-- 2. An active target-semester section with available capacity exists.
-- 3. For even-to-odd semester progression, the next academic year is active.
-- CALL sp_student_promote(1, 1);
-- END Database/StudentPromotion/StudentPromotionAtomicStoredProcedure.sql


-- BEGIN Database/Sql/Stored Procedures/StudentPromotionHistory/sp_student_promotion_get_history.sql
-- ============================================================
-- Task: Develop API to retrieve a student's complete promotion history
-- Database: cms_btech
-- New stored procedure only. Existing tables/procedures are not dropped.
-- ============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_history`;
DELIMITER $$

CREATE PROCEDURE `sp_student_promotion_get_history`(
    IN p_student_id BIGINT
)
BEGIN
    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    SELECT
        sp.promotion_id                  AS PromotionId,
        sp.student_id                    AS StudentId,
        st.student_code                  AS StudentCode,
        st.full_name                     AS StudentName,
        COALESCE(sp.college_id, st.college_id) AS CollegeId,

        sp.from_academic_year_id         AS FromAcademicYearId,
        fay.academic_year_name           AS FromAcademicYearName,
        sp.to_academic_year_id           AS ToAcademicYearId,
        tay.academic_year_name           AS ToAcademicYearName,

        sp.from_course_id                AS FromCourseId,
        fc.course_name                   AS FromCourseName,
        sp.to_course_id                  AS ToCourseId,
        tc.course_name                   AS ToCourseName,

        sp.from_branch_id                AS FromBranchId,
        fb.branch_name                   AS FromBranchName,
        sp.to_branch_id                  AS ToBranchId,
        tb.branch_name                   AS ToBranchName,

        sp.from_section_id               AS FromSectionId,
        fs.section_name                  AS FromSectionName,
        sp.to_section_id                 AS ToSectionId,
        ts.section_name                  AS ToSectionName,

        sp.from_semester                 AS FromSemester,
        sp.to_semester                   AS ToSemester,

        sp.promotion_status              AS PromotionStatus,
        sp.decision                      AS Decision,
        sp.decision_date                 AS DecisionDate,
        sp.decision_by                   AS DecisionBy,
        du.full_name                     AS DecisionByName,
        sp.remarks                       AS Remarks,

        sp.attendance_percentage         AS AttendancePercentage,
        sp.total_marks                   AS TotalMarks,
        sp.obtained_marks                AS ObtainedMarks,
        sp.marks_percentage              AS MarksPercentage,
        sp.passed_subjects               AS PassedSubjects,
        sp.failed_subjects               AS FailedSubjects,
        sp.backlog_count                 AS BacklogCount,

        sp.promotion_eligibility         AS PromotionEligibility,
        sp.eligibility_remarks           AS EligibilityRemarks,
        sp.promotion_type                AS PromotionType,
        sp.promotion_date                AS PromotionDate,
        sp.effective_date                AS EffectiveDate,
        sp.promotion_reason              AS PromotionReason,
        sp.rejection_reason              AS RejectionReason,
        sp.approved_at                   AS ApprovedAt,
        sp.is_final                      AS IsFinal,
        sp.promotion_order               AS PromotionOrder,
        sp.is_active                     AS IsActive,

        sp.created_at                    AS CreatedAt,
        sp.created_by                    AS CreatedBy,
        cu.full_name                     AS CreatedByName,
        sp.updated_at                    AS UpdatedAt,
        sp.updated_by                    AS UpdatedBy,
        uu.full_name                     AS UpdatedByName

    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    LEFT JOIN courses fc
        ON fc.course_id = sp.from_course_id
    LEFT JOIN courses tc
        ON tc.course_id = sp.to_course_id
    LEFT JOIN branches fb
        ON fb.branch_id = sp.from_branch_id
    LEFT JOIN branches tb
        ON tb.branch_id = sp.to_branch_id
    LEFT JOIN sections fs
        ON fs.section_id = sp.from_section_id
    LEFT JOIN sections ts
        ON ts.section_id = sp.to_section_id
    LEFT JOIN users du
        ON du.user_id = sp.decision_by
    LEFT JOIN users cu
        ON cu.user_id = sp.created_by
    LEFT JOIN users uu
        ON uu.user_id = sp.updated_by
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL
    ORDER BY
        COALESCE(sp.promotion_date, sp.decision_date, sp.created_at) DESC,
        COALESCE(sp.promotion_order, 0) DESC,
        sp.promotion_id DESC;
END$$

DELIMITER ;

-- Test after running this script:
-- CALL sp_student_promotion_get_history(1);
-- END Database/Sql/Stored Procedures/StudentPromotionHistory/sp_student_promotion_get_history.sql
