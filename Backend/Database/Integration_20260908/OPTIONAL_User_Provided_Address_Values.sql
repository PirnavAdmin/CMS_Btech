-- Optional: the exact address values supplied by the user.

-- Run only if these values are intended for these IDs and are not already loaded.

USE cms_btech;

UPDATE employee_profiles SET house_number='1-98/12', permanent_house_number='12-45', permanent_address='Ram Nagar, Near Main Road', permanent_pincode='500020', permanent_city='Hyderabad', permanent_district='Hyderabad', permanent_state='Telangana', permanent_country='India' WHERE employee_profile_id=1;

UPDATE employee_profiles SET house_number='2-45/8', permanent_house_number='10-22', permanent_address='Ashok Nagar, Main Street', permanent_pincode='500020', permanent_city='Hyderabad', permanent_district='Hyderabad', permanent_state='Telangana', permanent_country='India' WHERE employee_profile_id=2;

UPDATE employee_profiles SET house_number='3-112', permanent_house_number='7-88', permanent_address='Kukatpally Housing Board Colony', permanent_pincode='500072', permanent_city='Hyderabad', permanent_district='Hyderabad', permanent_state='Telangana', permanent_country='India' WHERE employee_profile_id=3;

UPDATE employee_profiles SET house_number='4-56/2', permanent_house_number='15-90', permanent_address='Manikonda Village Road', permanent_pincode='500089', permanent_city='Hyderabad', permanent_district='Rangareddy', permanent_state='Telangana', permanent_country='India' WHERE employee_profile_id=4;

UPDATE employee_profiles SET house_number='5-77', permanent_house_number='8-34', permanent_address='Narsingi Main Road', permanent_pincode='500075', permanent_city='Hyderabad', permanent_district='Rangareddy', permanent_state='Telangana', permanent_country='India' WHERE employee_profile_id=5;

UPDATE student_profiles SET HouseNumber='12-34', PermanentHouseNumber='10-25', PermanentAddress='Benz Circle, Vijayawada', PermanentCity='Vijayawada', PermanentDistrict='NTR', PermanentState='Andhra Pradesh', PermanentCountry='India', PermanentPincode='520010' WHERE StudentId=2;

UPDATE student_profiles SET HouseNumber='5-67', PermanentHouseNumber='3-45', PermanentAddress='Lakshmipuram, Guntur', PermanentCity='Guntur', PermanentDistrict='Guntur', PermanentState='Andhra Pradesh', PermanentCountry='India', PermanentPincode='522007' WHERE StudentId=3;
