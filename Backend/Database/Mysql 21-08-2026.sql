-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: cms_btech
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
  PRIMARY KEY (`academic_year_id`),
  UNIQUE KEY `uq_academic_year_name` (`academic_year_name`),
  CONSTRAINT `chk_academic_year_dates` CHECK ((`end_date` >= `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academicyears`
--

LOCK TABLES `academicyears` WRITE;
/*!40000 ALTER TABLE `academicyears` DISABLE KEYS */;
INSERT INTO `academicyears` VALUES (1,'2025-26','2025-06-01','2026-05-31',0,1,'2026-08-21 11:54:42',NULL,'2026-08-21 11:54:42',NULL,NULL,NULL),(2,'2026-27','2026-06-01','2027-05-31',1,0,'2026-08-21 11:54:42',NULL,'2026-08-21 12:45:26',1,NULL,NULL),(3,'2027-2028','2027-06-10','2028-05-31',0,0,'2026-08-21 11:54:42',NULL,'2026-08-21 12:46:28',1,NULL,NULL),(4,'2028-29','2028-06-01','2029-05-31',1,0,'2026-08-21 12:41:31',1,'2026-08-21 12:41:31',NULL,NULL,NULL);
/*!40000 ALTER TABLE `academicyears` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `college_settings`
--

DROP TABLE IF EXISTS `college_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `college_settings` (
  `college_setting_id` bigint NOT NULL AUTO_INCREMENT,
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
  UNIQUE KEY `college_code` (`college_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `college_settings`
--

LOCK TABLES `college_settings` WRITE;
/*!40000 ALTER TABLE `college_settings` DISABLE KEYS */;
INSERT INTO `college_settings` VALUES (1,'B.Tech Engineering College','BTECH001','admin@btechcollege.edu.in','9876543210','https://btechcollege.edu.in','Main Road','College Campus','Hyderabad','Telangana','500001','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL),(2,'CMR College of Engineering and Technology','CMR001','admin@cmrcet.edu.in','9876500001','https://cmrcet.edu.in','Kandlakoya','Medchal Road','Hyderabad','Telangana','501401','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL),(3,'VNR VJIET','VNR002','admin@vnrvjiet.in','9876500002','https://vnrvjiet.ac.in','Bachupally','Pragathi Nagar Road','Hyderabad','Telangana','500090','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL),(4,'Malla Reddy Engineering College','MREC003','admin@mrec.ac.in','9876500003','https://mrec.ac.in','Maisammaguda','Dhulapally','Hyderabad','Telangana','500100','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL),(5,'BITS Pilani Hyderabad Campus','BITS004','admin@hyderabad.bits-pilani.ac.in','9876500004','https://www.bits-pilani.ac.in','Shameerpet','Jawahar Nagar','Hyderabad','Telangana','500078','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL),(6,'VCE','VCE005','admin@vce.ac.in','9876500005','https://www.vce.ac.in','Osmania University Campus','VCE Campus','Hyderabad','Telangana','500007','2026-27','Semester 2','Engineering College','dd-MM-yyyy','Asia/Kolkata',1,'2026-08-21 16:58:22',NULL,'2026-08-21 16:58:22',NULL);
/*!40000 ALTER TABLE `college_settings` ENABLE KEYS */;
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
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `colleges`
--

LOCK TABLES `colleges` WRITE;
/*!40000 ALTER TABLE `colleges` DISABLE KEYS */;
INSERT INTO `colleges` VALUES (1,'BTECH001','BTech College of Engineering','Engineering College','Jawaharlal Nehru Technological University','info@btechcollege.edu.in','9876501001','040-24561001','Main Road, Madhapur','Near Metro Station','Hyderabad','Telangana','India','500081','https://www.btechcollege.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech001.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(2,'BTECH002','Sri Venkateswara Institute of Technology','Engineering College','Jawaharlal Nehru Technological University Anantapur','info@svit.edu.in','9876501002','08518-221001','College Road','Near Bus Stand','Anantapur','Andhra Pradesh','India','515001','https://www.svit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech002.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(3,'BTECH003','Andhra Institute of Technology','Engineering College','Andhra University','info@ait.edu.in','9876501003','0891-2561003','Beach Road','Madhurawada','Visakhapatnam','Andhra Pradesh','India','530048','https://www.ait.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech003.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(4,'BTECH004','Krishna Engineering College','Engineering College','Jawaharlal Nehru Technological University Kakinada','info@kec.edu.in','9876501004','0866-2571004','NH-16 Highway','Near Gannavaram','Vijayawada','Andhra Pradesh','India','520008','https://www.kec.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech004.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(5,'BTECH005','Green Valley College of Engineering','Engineering College','Osmania University','info@gvce.edu.in','9876501005','040-27861005','Medchal Road','Kompally','Hyderabad','Telangana','India','500014','https://www.gvce.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech005.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(6,'BTECH006','Narayana Institute of Technology','Engineering College','JNTU Hyderabad','info@nit.edu.in','9876501006','040-26961006','Warangal Highway','Near Uppal','Hyderabad','Telangana','India','500039','https://www.nit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech006.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(7,'BTECH007','Coastal Engineering College','Engineering College','Andhra University','info@cec.edu.in','9876501007','0891-2761007','NH-16','Anandapuram','Visakhapatnam','Andhra Pradesh','India','531173','https://www.cec.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech007.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(8,'BTECH008','Rayalaseema Institute of Technology','Engineering College','JNTU Anantapur','info@rit.edu.in','9876501008','08562-231008','Tadipatri Road','Near Industrial Area','Kadapa','Andhra Pradesh','India','516003','https://www.rit.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech008.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(9,'BTECH009','Deccan College of Technology','Engineering College','Osmania University','info@dct.edu.in','9876501009','040-24561009','Mehdipatnam Road','Near NMDC','Hyderabad','Telangana','India','500028','https://www.dct.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech009.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL),(10,'BTECH010','Eastern Valley Institute of Engineering','Engineering College','JNTU Kakinada','info@evie.edu.in','9876501010','0884-2361010','Kakinada Road','Near Main Campus','Rajahmundry','Andhra Pradesh','India','533101','https://www.evie.edu.in',NULL,'Asia/Kolkata','INR','/uploads/colleges/btech010.png',1,'2026-08-20 19:49:10',NULL,'2026-08-20 19:49:10',NULL,NULL,NULL);
/*!40000 ALTER TABLE `colleges` ENABLE KEYS */;
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
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_department_college_code` (`college_id`,`department_code`),
  KEY `idx_departments_college_id` (`college_id`),
  KEY `idx_departments_status` (`status`),
  CONSTRAINT `fk_departments_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,1,'CSE','Computer Science and Engineering','Department of Computer Science and Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:34',NULL,NULL,NULL),(2,1,'ECE','Electronics and Communication Engineering','Department of Electronics and Communication Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL),(3,1,'EEE','Electrical and Electronics Engineering','Department of Electrical and Electronics Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL),(4,1,'MECH','Mechanical Engineering','Department of Mechanical Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL),(5,1,'CIVIL','Civil Engineering','Department of Civil Engineering',1,'2026-08-21 16:28:54',NULL,'2026-08-21 16:30:35',NULL,NULL,NULL);
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
INSERT INTO `employee_profiles` VALUES (1,1,'1978-05-15','Male',NULL,'President','Banjara Hills, Hyderabad','500034','Hyderabad','Hyderabad','Telangana','President responsible for institutional leadership, strategic planning, governance and overall administration of the college.',NULL,1,'2026-08-21 16:30:34',1,'2026-08-21 16:30:35',1,NULL,NULL),(2,2,'1985-08-20','Male',1,'Administrator','Kukatpally, Hyderabad','500072','Hyderabad','Hyderabad','Telangana','Administrative staff responsible for institutional operations and management.',NULL,1,'2026-08-21 16:30:34',2,'2026-08-21 16:30:34',NULL,NULL,NULL),(3,3,'1982-03-10','Female',2,'Professor','Miyapur, Hyderabad','500049','Hyderabad','Hyderabad','Telangana','Professor involved in teaching, research and academic activities.',NULL,1,'2026-08-21 16:30:34',3,'2026-08-21 16:30:34',NULL,NULL,NULL),(4,4,'1979-11-25','Male',1,'Head of Department','Gachibowli, Hyderabad','500032','Hyderabad','Rangareddy','Telangana','Head of Department responsible for academic planning and departmental administration.',NULL,1,'2026-08-21 16:30:34',4,'2026-08-21 16:30:34',NULL,NULL,NULL),(5,5,'1990-06-18','Female',1,'Assistant Professor','Manikonda, Hyderabad','500089','Hyderabad','Rangareddy','Telangana','Assistant Professor involved in undergraduate teaching and student mentoring.',NULL,1,'2026-08-21 16:30:34',5,'2026-08-21 16:30:34',NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_audits`
--

LOCK TABLES `login_audits` WRITE;
/*!40000 ALTER TABLE `login_audits` DISABLE KEYS */;
INSERT INTO `login_audits` VALUES (1,1,'ADM001','LOGIN','SUCCESS','192.168.1.10','Chrome / Windows 11',NULL,'2026-08-19 08:45:00','2026-08-19 17:30:00','2026-08-19 08:45:00'),(2,2,'ADM002','LOGIN','SUCCESS','192.168.1.11','Chrome / Windows 11',NULL,'2026-08-19 08:50:00','2026-08-19 17:15:00','2026-08-19 08:50:00'),(3,3,'PRN001','LOGIN','SUCCESS','192.168.1.20','Edge / Windows 11',NULL,'2026-08-19 09:00:00','2026-08-19 16:45:00','2026-08-19 09:00:00'),(4,4,'HOD001','LOGIN','SUCCESS','192.168.1.30','Chrome / Windows 11',NULL,'2026-08-19 09:05:00','2026-08-19 16:30:00','2026-08-19 09:05:00'),(5,5,'FAC001','LOGIN','FAILED','192.168.1.40','Chrome / Windows 11','Invalid password','2026-08-19 09:10:00',NULL,'2026-08-19 09:10:00'),(6,5,'FAC001','LOGIN','SUCCESS','192.168.1.40','Chrome / Windows 11',NULL,'2026-08-19 09:12:00','2026-08-19 16:00:00','2026-08-19 09:12:00'),(7,6,'STU2026001','LOGIN','SUCCESS','192.168.1.101','Chrome / Android',NULL,'2026-08-19 09:20:00','2026-08-19 14:30:00','2026-08-19 09:20:00'),(8,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:07:02',NULL,'2026-08-19 16:07:02'),(9,NULL,'EMP001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-19 16:26:45',NULL,'2026-08-19 16:26:45'),(10,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:39:25',NULL,'2026-08-19 16:39:25'),(11,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-19 16:39:54',NULL,'2026-08-19 16:39:54'),(12,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:14:24',NULL,'2026-08-19 17:14:24'),(13,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:14:57',NULL,'2026-08-19 17:14:57'),(14,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:15:53',NULL,'2026-08-19 17:15:53'),(15,2,'ADM002','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:16:13',NULL,'2026-08-19 17:16:13'),(16,1,'rajesh.kumar@btechcollege.edu.in','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:20:01',NULL,'2026-08-19 17:20:01'),(17,2,'ADM002','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-19 17:30:56',NULL,'2026-08-19 17:30:56'),(18,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:16:36',NULL,'2026-08-20 05:16:36'),(19,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:21:56',NULL,'2026-08-20 05:21:56'),(20,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 05:25:18',NULL,'2026-08-20 05:25:18'),(21,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:33:39',NULL,'2026-08-20 11:33:39'),(22,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:51:46',NULL,'2026-08-20 11:51:46'),(23,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:52:51',NULL,'2026-08-20 11:52:51'),(24,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-20 11:53:26',NULL,'2026-08-20 11:53:26'),(25,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:55:32',NULL,'2026-08-20 11:55:32'),(26,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:57:25',NULL,'2026-08-20 11:57:25'),(27,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 11:59:20',NULL,'2026-08-20 11:59:20'),(28,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:17:28',NULL,'2026-08-20 12:17:28'),(29,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:19:11',NULL,'2026-08-20 12:19:11'),(30,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 12:37:17',NULL,'2026-08-20 12:37:17'),(31,NULL,'AD001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-20 13:38:37',NULL,'2026-08-20 13:38:37'),(32,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:38:50',NULL,'2026-08-20 13:38:50'),(33,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:39:45',NULL,'2026-08-20 13:39:45'),(34,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:55:34',NULL,'2026-08-20 13:55:34'),(35,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:58:27',NULL,'2026-08-20 13:58:27'),(36,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 13:59:54',NULL,'2026-08-20 13:59:54'),(37,2,'ADM002','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 14:06:10',NULL,'2026-08-20 14:06:10'),(38,5,'FAC001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-20 14:07:47',NULL,'2026-08-20 14:07:47'),(39,1,'ADM001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','Invalid password','2026-08-21 07:06:03',NULL,'2026-08-21 07:06:03'),(40,NULL,'ADMN001','LOGIN','FAILED','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0','User not found','2026-08-21 07:06:13',NULL,'2026-08-21 07:06:13'),(41,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 07:06:49',NULL,'2026-08-21 07:06:49'),(42,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 08:57:19',NULL,'2026-08-21 08:57:19'),(43,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 09:05:18',NULL,'2026-08-21 09:05:18'),(44,1,'ADM001','LOGIN','SUCCESS','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',NULL,'2026-08-21 11:07:26',NULL,'2026-08-21 11:07:26');
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_verifications`
--

LOCK TABLES `otp_verifications` WRITE;
/*!40000 ALTER TABLE `otp_verifications` DISABLE KEYS */;
INSERT INTO `otp_verifications` VALUES (1,5,'priya.nair@btechcollege.edu.in','DEMO_OTP_HASH_100001','PASSWORD_RESET','EMAIL','2026-08-19 10:20:00','2026-08-19 10:16:00',1,5,0,'2026-08-19 10:10:00'),(2,6,'9876502001','DEMO_OTP_HASH_100002','MOBILE_VERIFICATION','SMS','2026-08-19 10:30:00','2026-08-19 10:25:00',1,5,0,'2026-08-19 10:20:00'),(3,7,'sneha.rao@student.btechcollege.edu.in','DEMO_OTP_HASH_100003','PASSWORD_RESET','EMAIL','2026-08-19 11:00:00',NULL,2,5,1,'2026-08-19 10:50:00'),(4,8,'9876502003','DEMO_OTP_HASH_100004','MOBILE_VERIFICATION','SMS','2026-08-19 11:30:00','2026-08-19 11:25:00',1,5,0,'2026-08-19 11:20:00'),(5,3,'anitha.sharma@btechcollege.edu.in','DEMO_OTP_HASH_100005','PASSWORD_RESET','EMAIL','2026-08-19 12:00:00','2026-08-19 11:55:00',1,5,0,'2026-08-19 11:50:00');
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (1,5,'ZVcF1lypYelzxMJhzkM7ih/VsJts31ZitXWKjreIVTU=','2026-08-27 11:33:39','2026-08-20 11:33:39',NULL,NULL,'::1'),(2,5,'4fjEsiv3IdH9VSKG9HCHrWM1ONiq+9bMTpYvfXVZLOg=','2026-08-27 11:55:32','2026-08-20 11:55:32',NULL,NULL,'::1'),(3,1,'NeLbABEmZPXbsZmOO6OsnVk2au4Ex7p+wr7s2TuDHMU=','2026-08-27 11:57:24','2026-08-20 11:57:24',NULL,NULL,'::1'),(4,2,'9htG+2OZd9yAoZZ1AgVVoN9vKdad26DWEXVJXWbs8fg=','2026-08-27 11:59:19','2026-08-20 11:59:19',NULL,NULL,'::1'),(5,1,'RSpZYJg6/p5Qx3/09Odt8HWc4a4DJ0ZegCoAFBEeaQo=','2026-08-27 12:17:27','2026-08-20 12:17:27',NULL,NULL,'::1'),(6,2,'fJBbQJe/5Hlwh1M2RYgefxCl3Dc2/GQYPswyw3w56wk=','2026-08-27 12:19:11','2026-08-20 12:19:11',NULL,NULL,'::1'),(7,5,'Sh9Rhl5dnNkBYL8oZQXc2pFLthP22P6grWPSdTT2cOI=','2026-08-27 12:37:17','2026-08-20 12:37:17',NULL,NULL,'::1'),(8,1,'AvT1PnkB64a56jQlVck3HJVEQrqdKDfCVdQ1LN+UIlY=','2026-08-27 13:38:50','2026-08-20 13:38:50',NULL,NULL,'::1'),(9,2,'Lx5MmpenBstmmdRS79+I4LPyfm8E4Hqk9BL5gF5QKRQ=','2026-08-27 13:39:45','2026-08-20 13:39:45',NULL,NULL,'::1'),(10,1,'KXuh/NMzHLYCLNHUFLN9aIdRBXITRF4jSSvl5abGcYc=','2026-08-27 13:55:34','2026-08-20 13:55:34',NULL,NULL,'::1'),(11,2,'aRtS0/h4Jlwy/0OARCw1OxN22hIPtAHhOVMFip7K/Ns=','2026-08-27 13:58:27','2026-08-20 13:58:27',NULL,NULL,'::1'),(12,2,'gV5/joFZDZS9Iajx9KyTjmQbzeP3Mg9GmC5URVZDuH0=','2026-08-27 13:59:54','2026-08-20 13:59:54',NULL,NULL,'::1'),(13,2,'oyO3rAhm+MEQtarUlU9QOqqRT9tQSCYWulhJ/SQwpZ0=','2026-08-27 14:06:09','2026-08-20 14:06:09',NULL,NULL,'::1'),(14,5,'Zkt5RxBXb/60Cdn0GyxWTL+y4tgpWc0u0TSYASHw/n4=','2026-08-27 14:07:47','2026-08-20 14:07:47',NULL,NULL,'::1'),(15,1,'xqlSur+z++PEt/uDSgpt+JC7GUH8girLfSRE8Y4TR9M=','2026-08-28 07:06:49','2026-08-21 07:06:49',NULL,NULL,'::1'),(16,1,'/F3K9OZpGmslQzNl/m14hWMemfBp21Zk3XGG9UhpPxU=','2026-08-28 08:57:19','2026-08-21 08:57:19',NULL,NULL,'::1'),(17,1,'p1baOuollvRgVaCFag5HZnTT0i/UGV0Apmsx68tRPKU=','2026-08-28 09:05:17','2026-08-21 09:05:17',NULL,NULL,'::1'),(18,1,'zJaVJAPtW8hHhowdki60JIWfVrTLdPzsd2K81K+/ZFQ=','2026-08-28 11:07:26','2026-08-21 11:07:26',NULL,NULL,'::1');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
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
INSERT INTO `users` VALUES (1,1,'ADM001','Dr. Rajesh Kumar','rajesh.kumar@btechcollege.edu.in','9876501001','$2a$11$139CbSkcVImuhTpUgzGgmeFy3u9cYrGLlJ.qtwzi.clUJNJogwhrG',1,'2026-08-21 11:07:26','2026-06-01 09:30:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(2,1,'ADM002','Suresh Reddy','suresh.reddy@btechcollege.edu.in','9876501002','$2a$11$tUoAVhLuDMVtIwB15hnErOd7CzAZp4DOwaXmaCKG9A63Wsk332Ggq',1,'2026-08-20 14:06:10','2026-06-01 09:35:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(3,1,'PRN001','Dr. Anitha Sharma','anitha.sharma@btechcollege.edu.in','9876501003','DEMO_HASH_PRINCIPAL_001',1,'2026-08-19 09:00:00','2026-06-01 09:40:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(4,1,'HOD001','Dr. Ravi Kumar','ravi.kumar@btechcollege.edu.in','9876501004','DEMO_HASH_HOD_001',1,'2026-08-19 09:05:00','2026-06-01 09:45:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(5,1,'FAC001','Priya Nair','priya.nair@btechcollege.edu.in','9876501005','$2a$11$rrx688SgHdQcOgYFq0l5eeMyJmreObd4jgOh.k26ApEb7JpUgt0pq',1,'2026-08-20 14:07:47','2026-06-01 09:50:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(6,1,'STU2026001','Arjun Reddy','arjun.reddy@student.btechcollege.edu.in','9876502001','DEMO_HASH_STUDENT_001',1,'2026-08-19 09:20:00','2026-06-01 10:00:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(7,1,'STU2026002','Sneha Rao','sneha.rao@student.btechcollege.edu.in','9876502002','DEMO_HASH_STUDENT_002',1,NULL,'2026-06-01 10:05:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL),(8,1,'STU2026003','Kiran Kumar','kiran.kumar@student.btechcollege.edu.in','9876502003','DEMO_HASH_STUDENT_003',1,NULL,'2026-06-01 10:10:00',NULL,'2026-08-21 16:43:31',NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'cms_btech'
--

--
-- Dumping routines for database 'cms_btech'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_Activate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_Activate`(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 1,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0;

    IF ROW_COUNT() = 0 AND NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
    DECLARE v_id BIGINT;

    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    INSERT INTO academicyears
        (academic_year_name, start_date, end_date, status, is_archived, created_at, created_by)
    VALUES
        (TRIM(p_academic_year_name), p_start_date, p_end_date, 1, 0, NOW(), p_created_by);

    SET v_id = LAST_INSERT_ID();

    SELECT * FROM academicyears WHERE academic_year_id = v_id;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0;

    IF ROW_COUNT() = 0 AND NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
    END IF;
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
/*!50003 DROP PROCEDURE IF EXISTS `sp_AcademicYear_GetById` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_GetById`(IN p_academic_year_id BIGINT)
BEGIN
    SELECT *
    FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AcademicYear_List`()
BEGIN
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND is_archived = 0
    ORDER BY start_date DESC, academic_year_id DESC;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
          AND (
                p_exclude_id IS NULL
                OR college_id <> p_exclude_id
              )
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
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
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
    DECLARE v_college_id BIGINT;

    IF EXISTS(
        SELECT 1
        FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College code already exists.';
    END IF;

    INSERT INTO colleges
    (
        college_code,
        college_name,
        college_type,
        university_name,
        email,
        mobile,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        country,
        pincode,
        website,
        academic_year_id,
        timezone,
        currency_code,
        logo_path,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        TRIM(p_college_code),
        TRIM(p_college_name),
        p_college_type,
        p_university_name,
        p_email,
        p_mobile,
        p_phone,
        p_address_line1,
        p_address_line2,
        p_city,
        p_state,
        p_country,
        p_pincode,
        p_website,
        p_academic_year_id,
        COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Kolkata'),
        COALESCE(NULLIF(TRIM(p_currency_code), ''), 'INR'),
        p_logo_path,
        COALESCE(p_status, 1),
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_college_id = LAST_INSERT_ID();

    SELECT *
    FROM colleges
    WHERE college_id = v_college_id;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
            p_search IS NULL
            OR TRIM(p_search) = ''
            OR college_name LIKE CONCAT('%', TRIM(p_search), '%')
            OR college_code LIKE CONCAT('%', TRIM(p_search), '%')
            OR city LIKE CONCAT('%', TRIM(p_search), '%')
          )
    ORDER BY college_id DESC;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
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
    IN p_sort_by VARCHAR(30),
    IN p_sort_direction VARCHAR(4)
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;

    SET p_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET p_page_size = IFNULL(NULLIF(p_page_size, 0), 10);

    SET p_sort_by =
        COALESCE(NULLIF(TRIM(p_sort_by), ''), 'CollegeName');

    SET p_sort_direction =
        COALESCE(NULLIF(LOWER(TRIM(p_sort_direction)), ''), 'asc');

    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL

      AND (
            p_query IS NULL
            OR TRIM(p_query) = ''
            OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
            OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
            OR email LIKE CONCAT('%', TRIM(p_query), '%')
            OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
          )

      AND (
            p_college_type IS NULL
            OR TRIM(p_college_type) = ''
            OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%')
          )

      AND (
            p_university_name IS NULL
            OR TRIM(p_university_name) = ''
            OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%')
          )

      AND (
            p_city IS NULL
            OR TRIM(p_city) = ''
            OR city LIKE CONCAT('%', TRIM(p_city), '%')
          )

      AND (
            p_state IS NULL
            OR TRIM(p_state) = ''
            OR state LIKE CONCAT('%', TRIM(p_state), '%')
          )

      AND (p_status IS NULL OR status = p_status)

    ORDER BY
        CASE
            WHEN LOWER(p_sort_direction) = 'asc'
             AND LOWER(p_sort_by) = 'collegecode'
            THEN college_code
        END ASC,

        CASE
            WHEN LOWER(p_sort_direction) = 'desc'
             AND LOWER(p_sort_by) = 'collegecode'
            THEN college_code
        END DESC,

        CASE
            WHEN LOWER(p_sort_direction) = 'asc'
             AND LOWER(p_sort_by) = 'city'
            THEN city
        END ASC,

        CASE
            WHEN LOWER(p_sort_direction) = 'desc'
             AND LOWER(p_sort_by) = 'city'
            THEN city
        END DESC,

        CASE
            WHEN LOWER(p_sort_direction) = 'asc'
             AND LOWER(p_sort_by) = 'status'
            THEN status
        END ASC,

        CASE
            WHEN LOWER(p_sort_direction) = 'desc'
             AND LOWER(p_sort_by) = 'status'
            THEN status
        END DESC,

        CASE
            WHEN LOWER(p_sort_direction) = 'asc'
             AND LOWER(p_sort_by) = 'createdat'
            THEN created_at
        END ASC,

        CASE
            WHEN LOWER(p_sort_direction) = 'desc'
             AND LOWER(p_sort_by) = 'createdat'
            THEN created_at
        END DESC,

        CASE
            WHEN LOWER(p_sort_direction) <> 'desc'
             AND LOWER(p_sort_by) = 'collegename'
            THEN college_name
        END ASC,

        CASE
            WHEN LOWER(p_sort_direction) = 'desc'
             AND LOWER(p_sort_by) = 'collegename'
            THEN college_name
        END DESC,

        college_id DESC

    LIMIT v_offset, p_page_size;


    SELECT COUNT(*) AS total_count
    FROM colleges
    WHERE deleted_at IS NULL

      AND (
            p_query IS NULL
            OR TRIM(p_query) = ''
            OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
            OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
            OR email LIKE CONCAT('%', TRIM(p_query), '%')
            OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
          )

      AND (
            p_college_type IS NULL
            OR TRIM(p_college_type) = ''
            OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%')
          )

      AND (
            p_university_name IS NULL
            OR TRIM(p_university_name) = ''
            OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%')
          )

      AND (
            p_city IS NULL
            OR TRIM(p_city) = ''
            OR city LIKE CONCAT('%', TRIM(p_city), '%')
          )

      AND (
            p_state IS NULL
            OR TRIM(p_state) = ''
            OR state LIKE CONCAT('%', TRIM(p_state), '%')
          )

      AND (p_status IS NULL OR status = p_status);
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
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
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
    IF NOT EXISTS(
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN

        SELECT *
        FROM colleges
        WHERE 1 = 0;

    ELSE

        IF EXISTS(
            SELECT 1
            FROM colleges
            WHERE college_code = TRIM(p_college_code)
              AND college_id <> p_college_id
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code already exists.';
        END IF;

        UPDATE colleges
        SET
            college_code = TRIM(p_college_code),
            college_name = TRIM(p_college_name),
            college_type = p_college_type,
            university_name = p_university_name,
            email = p_email,
            mobile = p_mobile,
            phone = p_phone,
            address_line1 = p_address_line1,
            address_line2 = p_address_line2,
            city = p_city,
            state = p_state,
            country = p_country,
            pincode = p_pincode,
            website = p_website,
            academic_year_id = p_academic_year_id,
            timezone =
                COALESCE(
                    NULLIF(TRIM(p_timezone), ''),
                    'Asia/Kolkata'
                ),
            currency_code =
                COALESCE(
                    NULLIF(TRIM(p_currency_code), ''),
                    'INR'
                ),
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-21 17:56:39
