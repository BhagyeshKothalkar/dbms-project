-- Mock Data for DBMS Testing

-- 1. Departments
INSERT INTO Department (department_id, dept_name, head_of_department_id) VALUES 
('CSE', 'Computer Science & Engineering', NULL),
('EE', 'Electrical Engineering', NULL),
('MATH', 'Mathematics', NULL);

-- 2. Term
INSERT INTO Academic_Term (term_id, term_name, start_date, end_date) VALUES 
('FALL-2026', 'Autumn Semester 2026', '2026-08-01', '2026-12-15');

-- 3. Facilities
INSERT INTO Facility (venue_id, building_name, room_number, room_name, capacity, department_id) VALUES 
('VEN-101', 'Lecture Hall Complex', '101', 'LHC 101', 120, 'CSE'),
('VEN-102', 'Lecture Hall Complex', '102', 'LHC 102', 150, 'EE');

-- 4. Professors
INSERT INTO Professor_Profile (employee_id, name, email, designation, department_id, office_venue_id) VALUES 
('FAC-CSE-017', 'Dr. Alan Turing', 'alan@iiti.ac.in', 'Professor', 'CSE', 'VEN-101'),
('FAC-EE-005', 'Dr. Nikola Tesla', 'tesla@iiti.ac.in', 'Associate Professor', 'EE', 'VEN-102');

-- Update Department heads safely now
ALTER TABLE Department DISABLE TRIGGER ALL;
UPDATE Department SET head_of_department_id = 'FAC-CSE-017' WHERE department_id = 'CSE';
UPDATE Department SET head_of_department_id = 'FAC-EE-005' WHERE department_id = 'EE';
ALTER TABLE Department ENABLE TRIGGER ALL;

-- 5. Programs
INSERT INTO Program (program_id, program_name, specialization, department_id, total_credits_required) VALUES 
('BTECH-CSE', 'B.Tech', 'Computer Science', 'CSE', 160),
('BTECH-EE', 'B.Tech', 'Electrical', 'EE', 160);

-- 6. Students
INSERT INTO Student_Profile (roll_no, name, email, program_id, batch_year, credits_obtained, credits_registered) VALUES 
('CSE2021045', 'Yash Student', 'yash@student.iiti.ac.in', 'BTECH-CSE', 2021, 100, 0),
('EE2021001', 'John Doe', 'john@student.iiti.ac.in', 'BTECH-EE', 2021, 95, 0);

-- 7. Courses
INSERT INTO Course (course_code, course_name, syllabus, credits, department_id) VALUES 
('CS301', 'Database Management Systems', 'RDBMS, Normalization, SQL', 3, 'CSE'),
('CS302', 'Operating Systems', 'Process, Memory, File Systems', 4, 'CSE'),
('EE301', 'Signals and Systems', 'Fourier, Laplace transforms', 4, 'EE');

-- 8. Course Sections
INSERT INTO Course_Section (section_id, course_code, term_id, section_name, primary_professor_id, capacity) VALUES 
('SEC-CS301-A', 'CS301', 'FALL-2026', 'A', 'FAC-CSE-017', 60),
('SEC-CS302-A', 'CS302', 'FALL-2026', 'A', 'FAC-CSE-017', 50),
('SEC-EE301-A', 'EE301', 'FALL-2026', 'A', 'FAC-EE-005', 80);

-- 9. Timetable Slots
INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time) VALUES 
('SLOT-1', 'SEC-CS301-A', 'VEN-101', 'Monday', '10:00:00', '11:00:00'),
('SLOT-2', 'SEC-CS302-A', 'VEN-102', 'Tuesday', '11:00:00', '12:00:00');
