-- Schema Expansion for Overhaul

-- Add Course_Type
ALTER TABLE Course ADD COLUMN course_type VARCHAR(50) DEFAULT 'Core' 
    CHECK (course_type IN ('Core', 'Department Elective', 'Institute Elective'));

-- Course Restrictions configuration
CREATE TABLE Semester_Structure (
    structure_id SERIAL PRIMARY KEY,
    term_id VARCHAR(50) NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    semester_code INT NOT NULL,  -- e.g. semester 6
    core_credits_required INT NOT NULL DEFAULT 0,
    dept_elective_credits_required INT NOT NULL DEFAULT 0,
    inst_elective_credits_required INT NOT NULL DEFAULT 0,
    UNIQUE (term_id, department_id, semester_code),
    FOREIGN KEY (term_id) REFERENCES Academic_Term(term_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES Department(department_id) ON DELETE CASCADE
);

CREATE TABLE Course_Access_Constraint (
    constraint_id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    allowed_department VARCHAR(50) DEFAULT 'ALL', -- e.g., 'CSE', 'EE', 'ALL'
    allowed_batch_year INT,  -- e.g., 2021
    allowed_roll_no_prefix VARCHAR(50), -- e.g., 'CSE2021'
    FOREIGN KEY (course_code) REFERENCES Course(course_code) ON DELETE CASCADE
);

-- Delete constraints currently tying down for fresh insert
DELETE FROM Enrollment;
DELETE FROM Course_Section;
DELETE FROM Course_Prerequisite;
DELETE FROM Course;

-- Core CS DAG
INSERT INTO Course (course_code, course_name, credits, department_id, course_type) VALUES 
('CS101', 'Intro to Programming', 4, 'CSE', 'Core'),
('CS201', 'Data Structures', 4, 'CSE', 'Core'),
('CS301', 'Database Systems', 3, 'CSE', 'Core'),
('CS401', 'AI', 3, 'CSE', 'Department Elective'),
('CS402', 'Cryptography', 3, 'CSE', 'Department Elective');

INSERT INTO Course_Prerequisite (course_code, prerequisite_course_code) VALUES 
('CS201', 'CS101'),
('CS301', 'CS201'),
('CS401', 'CS201'),
('CS402', 'CS301');

-- EE Courses
INSERT INTO Course (course_code, course_name, credits, department_id, course_type) VALUES 
('EE101', 'Basic Electronics', 4, 'EE', 'Core'),
('EE201', 'Signals', 4, 'EE', 'Core');

-- Institute Electives
INSERT INTO Course (course_code, course_name, credits, department_id, course_type) VALUES 
('HSS101', 'Communication Skills', 2, 'MATH', 'Institute Elective'),
('ECO201', 'Economics', 2, 'MATH', 'Institute Elective');

-- Structures for Fall-2026 Batch 2021 CSE (Which implies it's semester 6 for example) 
INSERT INTO Semester_Structure (term_id, department_id, semester_code, core_credits_required, dept_elective_credits_required, inst_elective_credits_required) VALUES
('FALL-2026', 'CSE', 6, 7, 3, 2);

-- Constraints
-- CS401 specific to batch 2021 CSE
INSERT INTO Course_Access_Constraint (course_code, allowed_roll_no_prefix) VALUES ('CS401', 'CSE2021');
INSERT INTO Course_Access_Constraint (course_code, allowed_roll_no_prefix) VALUES ('CS402', 'CSE2021');
INSERT INTO Course_Access_Constraint (course_code, allowed_department) VALUES ('CS301', 'CSE');
INSERT INTO Course_Access_Constraint (course_code, allowed_department) VALUES ('CS201', 'ALL'); -- Open core

-- Some prior completions so studentCSE2021045 can take CS301 (Needs CS201 and CS101)
-- Wait we need sections to enroll. We don't have to populate prior enrollments if we just allow mock DB override, 
-- but actually let's give the student past term enrollments.
INSERT INTO Academic_Term (term_id, term_name, start_date, end_date) VALUES 
('SPRING-2025', 'Spring 2025', '2025-01-01', '2025-05-01'),
('FALL-2025', 'Fall 2025', '2025-08-01', '2025-12-01');

INSERT INTO Course_Section (section_id, course_code, term_id, section_name, primary_professor_id, capacity) VALUES 
('SEC-CS101-PAST', 'CS101', 'SPRING-2025', 'P', 'FAC-CSE-017', 100),
('SEC-CS201-PAST', 'CS201', 'FALL-2025', 'P', 'FAC-CSE-017', 100);

-- Award credits via past enrollments
INSERT INTO Enrollment (roll_no, section_id, enrollment_status, final_grade) VALUES
('CSE2021045', 'SEC-CS101-PAST', 'Completed', 'A'),
('CSE2021045', 'SEC-CS201-PAST', 'Completed', 'B');

-- Current Active Sections for Registration
INSERT INTO Course_Section (section_id, course_code, term_id, section_name, primary_professor_id, capacity) VALUES 
('SEC-CS301-A', 'CS301', 'FALL-2026', 'A', 'FAC-CSE-017', 50),
('SEC-CS401-A', 'CS401', 'FALL-2026', 'A', 'FAC-CSE-017', 2),  -- Low capacity to show fill up
('SEC-CS402-A', 'CS402', 'FALL-2026', 'A', 'FAC-CSE-017', 20),
('SEC-HSS101-A', 'HSS101', 'FALL-2026', 'A', 'FAC-EE-005', 100);

-- Slot timings! Inducing a clash:
-- CS301 runs Monday 10:00 to 11:30
INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time) VALUES 
('T-CS301-1', 'SEC-CS301-A', 'VEN-101', 'Monday', '10:00:00', '11:30:00');

-- CS401 runs exactly the same time
INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time) VALUES 
('T-CS401-1', 'SEC-CS401-A', 'VEN-102', 'Monday', '10:00:00', '11:30:00');

-- HSS101 runs purely afternoon
INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time) VALUES 
('T-HSS101-1', 'SEC-HSS101-A', 'VEN-101', 'Wednesday', '14:00:00', '16:00:00');
