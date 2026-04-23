-- Mock Data for DBMS Testing

-- 1. Departments
INSERT INTO Department (department_id, dept_name, head_of_department_id) VALUES
('CSE', 'Computer Science & Engineering', NULL),
('EE', 'Electrical Engineering', NULL),
('MATH', 'Mathematics', NULL);

-- 2. Academic Terms
INSERT INTO Academic_Term (term_id, term_name, start_date, end_date) VALUES
('SPRING-2025', 'Spring 2025', '2025-01-01', '2025-05-01'),
('FALL-2025', 'Fall 2025', '2025-08-01', '2025-12-01'),
('FALL-2026', 'Autumn Semester 2026', '2026-08-01', '2026-12-15');

-- 3. Facilities
INSERT INTO Facility (venue_id, building_name, room_number, room_name, capacity, department_id) VALUES
('VEN-101', 'Lecture Hall Complex', '101', 'LHC 101', 120, 'CSE'),
('VEN-102', 'Lecture Hall Complex', '102', 'LHC 102', 150, 'EE');

-- 4. Professors
INSERT INTO Professor_Profile (employee_id, name, email, designation, department_id, office_venue_id) VALUES
('FAC-CSE-017', 'Dr. Alan Turing', 'alan@iiti.ac.in', 'Professor', 'CSE', 'VEN-101'),
('FAC-EE-005', 'Dr. Nikola Tesla', 'tesla@iiti.ac.in', 'Associate Professor', 'EE', 'VEN-102');

-- 5. Department Heads
UPDATE Department SET head_of_department_id = 'FAC-CSE-017' WHERE department_id = 'CSE';
UPDATE Department SET head_of_department_id = 'FAC-EE-005' WHERE department_id = 'EE';

-- 6. Programs
INSERT INTO Program (program_id, program_name, specialization, department_id, total_credits_required) VALUES
('BTECH-CSE', 'B.Tech', 'Computer Science', 'CSE', 160),
('BTECH-EE', 'B.Tech', 'Electrical', 'EE', 160);

-- 7. Students
INSERT INTO Student_Profile (roll_no, name, email, program_id, batch_year, credits_obtained, credits_registered) VALUES
('CSE2021045', 'Yash Student', 'yash@student.iiti.ac.in', 'BTECH-CSE', 2021, 100.00, 0.00),
('EE2021001', 'John Doe', 'john@student.iiti.ac.in', 'BTECH-EE', 2021, 95.00, 0.00);

-- 8. Courses
INSERT INTO Course (course_code, course_name, syllabus, credits, department_id, course_type) VALUES
('CS101', 'Intro to Programming', NULL, 4, 'CSE', 'Core'),
('CS201', 'Data Structures', NULL, 4, 'CSE', 'Core'),
('CS301', 'Database Systems', 'RDBMS, Normalization, SQL', 3, 'CSE', 'Core'),
('CS401', 'AI', NULL, 3, 'CSE', 'Department Elective'),
('CS402', 'Cryptography', NULL, 3, 'CSE', 'Department Elective'),
('EE101', 'Basic Electronics', NULL, 4, 'EE', 'Core'),
('EE201', 'Signals', NULL, 4, 'EE', 'Core'),
('HSS101', 'Communication Skills', NULL, 2, 'MATH', 'Institute Elective'),
('ECO201', 'Economics', NULL, 2, 'MATH', 'Institute Elective');

-- 9. Course Prerequisites
INSERT INTO Course_Prerequisite (course_code, prerequisite_course_code) VALUES
('CS201', 'CS101'),
('CS301', 'CS201'),
('CS401', 'CS201'),
('CS402', 'CS301');

-- 10. Semester Structure
INSERT INTO Semester_Structure (
    term_id,
    department_id,
    semester_code,
    core_credits_required,
    dept_elective_credits_required,
    inst_elective_credits_required
) VALUES
('FALL-2026', 'CSE', 6, 7, 3, 2);

-- 11. Course Access Constraints
INSERT INTO Course_Access_Constraint (course_code, allowed_roll_no_prefix) VALUES
('CS401', 'CSE2021'),
('CS402', 'CSE2021');

INSERT INTO Course_Access_Constraint (course_code, allowed_department) VALUES
('CS301', 'CSE'),
('CS201', 'ALL');

-- 12. Course Sections
INSERT INTO Course_Section (section_id, course_code, term_id, section_name, primary_professor_id, capacity) VALUES
('SEC-CS101-PAST', 'CS101', 'SPRING-2025', 'P', 'FAC-CSE-017', 100),
('SEC-CS201-PAST', 'CS201', 'FALL-2025', 'P', 'FAC-CSE-017', 100),
('SEC-CS301-A', 'CS301', 'FALL-2026', 'A', 'FAC-CSE-017', 50),
('SEC-CS401-A', 'CS401', 'FALL-2026', 'A', 'FAC-CSE-017', 2),
('SEC-CS402-A', 'CS402', 'FALL-2026', 'A', 'FAC-CSE-017', 20),
('SEC-HSS101-A', 'HSS101', 'FALL-2026', 'A', 'FAC-EE-005', 100),
('SEC-EE101-A', 'EE101', 'FALL-2026', 'A', 'FAC-EE-005', 80);

-- 13. Enrollments
INSERT INTO Enrollment (roll_no, section_id, enrollment_status, final_grade) VALUES
('CSE2021045', 'SEC-CS101-PAST', 'Completed', 'A'),
('CSE2021045', 'SEC-CS201-PAST', 'Completed', 'B');

-- 14. Timetable Slots
INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time) VALUES
('T-CS301-1', 'SEC-CS301-A', 'VEN-101', 'Monday', '10:00:00', '11:30:00'),
('T-CS401-1', 'SEC-CS401-A', 'VEN-102', 'Monday', '10:00:00', '11:30:00'),
('T-HSS101-1', 'SEC-HSS101-A', 'VEN-101', 'Wednesday', '14:00:00', '16:00:00'),
('T-EE101-1', 'SEC-EE101-A', 'VEN-102', 'Tuesday', '11:00:00', '12:00:00');
