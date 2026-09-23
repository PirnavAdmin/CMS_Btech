USE cms_btech;

CREATE TABLE IF NOT EXISTS college_settings
(
    college_setting_id BIGINT NOT NULL AUTO_INCREMENT,
    college_name VARCHAR(200) NOT NULL,
    college_code VARCHAR(50) NOT NULL,
    college_email VARCHAR(150) NULL,
    phone_number VARCHAR(20) NULL,
    website VARCHAR(200) NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    academic_year VARCHAR(20) NULL,
    semester VARCHAR(50) NULL,
    institution_type VARCHAR(100) NULL,
    date_format VARCHAR(30) NULL DEFAULT 'dd-MM-yyyy',
    time_zone VARCHAR(100) NULL DEFAULT 'Asia/Kolkata',
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (college_setting_id),
    UNIQUE KEY uq_college_settings_code (college_code),
    KEY idx_college_settings_status (status)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT INTO college_settings
(
    college_name, college_code, college_email, phone_number, website,
    address_line1, address_line2, city, state, pincode,
    academic_year, semester, institution_type, date_format, time_zone,
    status, created_at, updated_at
)
VALUES
('B.Tech Engineering College', 'BTECH001', 'admin@btechcollege.edu.in', '9876543210', 'https://btechcollege.edu.in', 'Main Road', 'College Campus', 'Hyderabad', 'Telangana', '500001', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('CMR College of Engineering and Technology', 'CMR001', 'admin@cmrcet.edu.in', '9876500001', 'https://cmrcet.edu.in', 'Kandlakoya', 'Medchal Road', 'Hyderabad', 'Telangana', '501401', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('VNR Vignana Jyothi Institute of Engineering and Technology', 'VNR002', 'admin@vnrvjiet.in', '9876500002', 'https://vnrvjiet.ac.in', 'Bachupally', 'Pragathi Nagar Road', 'Hyderabad', 'Telangana', '500090', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Malla Reddy Engineering College', 'MREC003', 'admin@mrec.ac.in', '9876500003', 'https://mrec.ac.in', 'Maisammaguda', 'Dhulapally', 'Hyderabad', 'Telangana', '500100', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('BITS Pilani Hyderabad Campus', 'BITS004', 'admin@hyderabad.bits-pilani.ac.in', '9876500004', 'https://www.bits-pilani.ac.in', 'Shameerpet', 'Jawahar Nagar', 'Hyderabad', 'Telangana', '500078', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Vasavi College of Engineering', 'VCE005', 'admin@vce.ac.in', '9876500005', 'https://www.vce.ac.in', 'Ibrahimbagh', 'Near Taramati Baradari', 'Hyderabad', 'Telangana', '500031', '2026-27', 'Semester 2', 'Engineering College', 'dd-MM-yyyy', 'Asia/Kolkata', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
AS new
ON DUPLICATE KEY UPDATE
    college_name = new.college_name,
    college_email = new.college_email,
    phone_number = new.phone_number,
    website = new.website,
    address_line1 = new.address_line1,
    address_line2 = new.address_line2,
    city = new.city,
    state = new.state,
    pincode = new.pincode,
    academic_year = new.academic_year,
    semester = new.semester,
    institution_type = new.institution_type,
    date_format = new.date_format,
    time_zone = new.time_zone,
    status = new.status,
    updated_at = UTC_TIMESTAMP();

SELECT
    college_setting_id, college_code, college_name, academic_year,
    semester, city, state, status
FROM college_settings
ORDER BY college_setting_id;
