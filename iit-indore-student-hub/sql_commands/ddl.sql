-- ==========================================
-- 1. FOUNDATION & INFRASTRUCTURE
-- ==========================================

CREATE TABLE Department (
    department_id VARCHAR(50) PRIMARY KEY,
    dept_name VARCHAR(255) NOT NULL,
    head_of_department_id VARCHAR(50) -- FK added at the end to prevent circular dependency
);

CREATE TABLE Facility (
    venue_id VARCHAR(50) PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    room_name VARCHAR(100),
    capacity INT NOT NULL CHECK (capacity > 0),
    department_id VARCHAR(50),
    FOREIGN KEY (department_id) REFERENCES Department(department_id) ON DELETE SET NULL
);

CREATE TABLE Venue_Equipment (
    venue_id VARCHAR(50) NOT NULL,
    equipment_name VARCHAR(100) NOT NULL, 
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (venue_id, equipment_name),
    FOREIGN KEY (venue_id) REFERENCES Facility(venue_id) ON DELETE CASCADE
);

CREATE TABLE Academic_Term (
    term_id VARCHAR(50) PRIMARY KEY,
    term_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CHECK (end_date > start_date)
);

-- ==========================================
-- 2. IDENTITIES & ACADEMIC STRUCTURE
-- ==========================================

CREATE TABLE Professor_Profile (
    employee_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    designation VARCHAR(100),
    department_id VARCHAR(50),
    office_venue_id VARCHAR(50),
    FOREIGN KEY (department_id) REFERENCES Department(department_id),
    FOREIGN KEY (office_venue_id) REFERENCES Facility(venue_id) ON DELETE SET NULL
);

CREATE TABLE Program (
    program_id VARCHAR(50) PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    department_id VARCHAR(50) NOT NULL,
    total_credits_required INT NOT NULL CHECK (total_credits_required > 0),
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

CREATE TABLE Student_Profile (
    roll_no VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    program_id VARCHAR(50) NOT NULL,
    batch_year INT NOT NULL,
    credits_obtained DECIMAL(5,2) DEFAULT 0.00,
    credits_registered DECIMAL(5,2) DEFAULT 0.00,
    FOREIGN KEY (program_id) REFERENCES Program(program_id)
);

-- ==========================================
-- 3. CURRICULUM CATALOG
-- ==========================================

CREATE TABLE Course (
    course_code VARCHAR(50) PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    syllabus TEXT,
    credits INT NOT NULL CHECK (credits >= 0),
    department_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

CREATE TABLE Course_Prerequisite (
    course_code VARCHAR(50),
    prerequisite_course_code VARCHAR(50),
    PRIMARY KEY (course_code, prerequisite_course_code),
    FOREIGN KEY (course_code) REFERENCES Course(course_code) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_course_code) REFERENCES Course(course_code) ON DELETE CASCADE
);

-- ==========================================
-- 4. SEMESTER OPERATIONS (THE HUB)
-- ==========================================

CREATE TABLE Course_Section (
    section_id VARCHAR(50) PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    term_id VARCHAR(50) NOT NULL,
    section_name VARCHAR(20) NOT NULL, 
    primary_professor_id VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    FOREIGN KEY (course_code) REFERENCES Course(course_code),
    FOREIGN KEY (term_id) REFERENCES Academic_Term(term_id),
    FOREIGN KEY (primary_professor_id) REFERENCES Professor_Profile(employee_id)
);

CREATE TABLE Enrollment (   
    roll_no VARCHAR(50) NOT NULL,
    section_id VARCHAR(50) NOT NULL,
    enrollment_status VARCHAR(20) DEFAULT 'Active'
        CHECK (enrollment_status IN ('Active', 'Waitlisted', 'Dropped', 'Completed')),
    final_grade VARCHAR(5), 
    grade_points DECIMAL(3,2), 
    PRIMARY KEY (roll_no, section_id),
    FOREIGN KEY (roll_no) REFERENCES Student_Profile(roll_no) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES Course_Section(section_id)
);

CREATE TABLE Timetable_Slot (
    slot_id VARCHAR(50) PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    venue_id VARCHAR(50) NOT NULL,
    day_of_week VARCHAR(15) NOT NULL 
        CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (end_time > start_time),
    FOREIGN KEY (section_id) REFERENCES Course_Section(section_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Facility(venue_id)
);

CREATE TABLE Attendance_Record (
    roll_no VARCHAR(50) NOT NULL,
    slot_id VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL 
        CHECK (status IN ('Present', 'Absent', 'Excused', 'Late')),
    PRIMARY KEY (roll_no, slot_id, attendance_date),    
    FOREIGN KEY (roll_no) REFERENCES Student_Profile(roll_no) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES Timetable_Slot(slot_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. GRADING & FINANCE
-- ==========================================

CREATE TABLE Assessment_Definition (
    assessment_id VARCHAR(50) PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL CHECK (max_marks > 0),
    date_and_time TIMESTAMP,
    venue_id VARCHAR(50),
    FOREIGN KEY (section_id) REFERENCES Course_Section(section_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Facility(venue_id) ON DELETE SET NULL
);

CREATE TABLE Student_Assessment_Result (
    result_id VARCHAR(50) UNIQUE,
    assessment_id VARCHAR(50) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    completion_status VARCHAR(20) DEFAULT 'Pending' 
        CHECK (completion_status IN ('Submitted', 'Pending', 'Missed')),
    grade_achieved DECIMAL(6,2) CHECK (grade_achieved >= 0),
    PRIMARY KEY (assessment_id, roll_no),
    FOREIGN KEY (assessment_id) REFERENCES Assessment_Definition(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (roll_no) REFERENCES Student_Profile(roll_no) ON DELETE CASCADE
);

CREATE TABLE Fee_Ledger (
    ledger_id VARCHAR(50) PRIMARY KEY,
    roll_no VARCHAR(50) NOT NULL,
    term_id VARCHAR(50) NOT NULL,
    fee_type VARCHAR(100) NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL CHECK (amount_due >= 0),
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'Pending' 
        CHECK (payment_status IN ('Paid', 'Pending', 'Overdue', 'Waived', 'Partial')),
    FOREIGN KEY (roll_no) REFERENCES Student_Profile(roll_no) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES Academic_Term(term_id)
);

CREATE TABLE Fee_Payment (
    payment_id VARCHAR(50) PRIMARY KEY,
    ledger_id VARCHAR(50) NOT NULL, 
    amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL, 
    transaction_reference VARCHAR(255), 
    FOREIGN KEY (ledger_id) REFERENCES Fee_Ledger(ledger_id) ON DELETE CASCADE
);

-- ==========================================
-- 6. CIRCULAR DEPENDENCY RESOLUTION
-- ==========================================

ALTER TABLE Department
ADD CONSTRAINT fk_head_of_department
FOREIGN KEY (head_of_department_id) REFERENCES Professor_Profile(employee_id) ON DELETE SET NULL;