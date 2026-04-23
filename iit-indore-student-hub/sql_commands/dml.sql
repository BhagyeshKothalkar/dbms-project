-- ==========================================
--  views and aliases
-- ==========================================

CREATE VIEW vw_Student_Profile AS
SELECT 
    s.roll_no AS Student_ID, 
    s.name AS Full_Name, 
    s.email AS Contact_Email, 
    s.batch_year AS Batch_Year, 
    p.program_name AS Degree_Program, 
    d.dept_name AS Department_Name
FROM Student_Profile s
JOIN Program p ON s.program_id = p.program_id
JOIN Department d ON p.department_id = d.department_id;

-- How your backend calls it:
-- SELECT * FROM vw_Student_Profile WHERE Student_ID = 'STU-1001';

CREATE VIEW vw_Student_Timetable AS
SELECT 
    e.roll_no AS Student_ID,
    cs.term_id AS Academic_Term,
    t.day_of_week AS Class_Day,
    c.course_name AS Course_Name, 
    cs.section_name AS Section_Name, 
    t.start_time AS Start_Time, 
    t.end_time AS End_Time, 
    f.room_number AS Room_Number
FROM Enrollment e
JOIN Course_Section cs ON e.section_id = cs.section_id
JOIN Course c ON cs.course_code = c.course_code
JOIN Timetable_Slot t ON cs.section_id = t.section_id
JOIN Facility f ON t.venue_id = f.venue_id;

-- How your backend calls it (e.g., for Monday's schedule):
-- SELECT * FROM vw_Student_Timetable 
-- WHERE Student_ID = 'STU-1001' AND Class_Day = 'Monday' AND Academic_Term = 'FALL-2026'
-- ORDER BY Start_Time ASC;

CREATE VIEW vw_Student_Gradesheet AS
SELECT 
    sar.roll_no AS Student_ID,
    cs.course_code AS Course_Code,
    cs.term_id AS Academic_Term,
    ad.title AS Assessment_Title, 
    ad.max_marks AS Max_Marks, 
    sar.grade_achieved AS Marks_Obtained, 
    sar.completion_status AS Grading_Status,
    ad.date_and_time AS Assessment_Date
FROM Student_Assessment_Result sar
JOIN Assessment_Definition ad ON sar.assessment_id = ad.assessment_id
JOIN Course_Section cs ON ad.section_id = cs.section_id;

-- How your backend calls it:
-- SELECT * FROM vw_Student_Gradesheet WHERE Student_ID = 'STU-1001' AND Course_Code = 'CS101';



-- proff facing

CREATE VIEW vw_Course_Roster AS
SELECT 
    e.section_id AS Section_ID,
    s.roll_no AS Student_ID, 
    s.name AS Student_Name, 
    s.email AS Student_Email, 
    e.enrollment_status AS Enrollment_Status
FROM Enrollment e
JOIN Student_Profile s ON e.roll_no = s.roll_no;

-- How your backend calls it:
-- SELECT * FROM vw_Course_Roster WHERE Section_ID = 'SEC-CS101-A';

CREATE VIEW vw_Pending_Assessments AS
SELECT 
    sar.assessment_id AS Assessment_ID,
    sar.result_id AS Result_Record_ID, 
    s.roll_no AS Student_ID, 
    s.name AS Student_Name, 
    sar.completion_status AS Grading_Status
FROM Student_Assessment_Result sar
JOIN Student_Profile s ON sar.roll_no = s.roll_no
WHERE sar.completion_status = 'Pending';

-- How your backend calls it:
-- SELECT * FROM vw_Pending_Assessments WHERE Assessment_ID = 'ASSESS-MIDTERM-1';


-- updating ops
CREATE PROCEDURE sp_Update_Student_Grade (
    p_Result_ID VARCHAR(50),
    p_Student_ID VARCHAR(50),
    p_Grade_Achieved DECIMAL(6,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Student_Assessment_Result
    SET 
        grade_achieved = p_Grade_Achieved, 
        completion_status = 'Submitted'
    WHERE result_id = p_Result_ID 
      AND roll_no = p_Student_ID;
END;
$$;

-- How your backend calls it:
-- CALL sp_Update_Student_Grade('RES-9928', 'STU-1001', 88.5);

CREATE VIEW vw_Professor_Timetable AS
SELECT 
    p.employee_id AS Professor_ID,
    p.name AS Professor_Name,
    cs.term_id AS Academic_Term,
    t.day_of_week AS Class_Day,
    t.start_time AS Start_Time,
    t.end_time AS End_Time,
    c.course_name AS Course_Name,
    cs.section_name AS Section_Name,
    f.building_name AS Building,
    f.room_number AS Room_Number
FROM Timetable_Slot t
JOIN Course_Section cs ON t.section_id = cs.section_id
JOIN Course c ON cs.course_code = c.course_code
JOIN Professor_Profile p ON cs.primary_professor_id = p.employee_id
JOIN Facility f ON t.venue_id = f.venue_id;

-- Application Call Example:
-- SELECT * FROM vw_Professor_Timetable WHERE Professor_ID = 'PROF-505' AND Class_Day = 'Tuesday' ORDER BY Start_Time;

CREATE VIEW vw_Venue_Timetable AS
SELECT 
    f.venue_id AS Venue_ID,
    f.building_name AS Building,
    f.room_number AS Room_Number,
    cs.term_id AS Academic_Term,
    t.day_of_week AS Class_Day,
    t.start_time AS Start_Time,
    t.end_time AS End_Time,
    c.course_name AS Course_Name,
    cs.section_name AS Section_Name,
    p.name AS Professor_Name
FROM Timetable_Slot t
JOIN Facility f ON t.venue_id = f.venue_id
JOIN Course_Section cs ON t.section_id = cs.section_id
JOIN Course c ON cs.course_code = c.course_code
JOIN Professor_Profile p ON cs.primary_professor_id = p.employee_id;

-- Application Call Example (Checking room availability/schedule):
-- SELECT * FROM vw_Venue_Timetable WHERE Venue_ID = 'VEN-101' AND Class_Day = 'Wednesday' ORDER BY Start_Time;


CREATE PROCEDURE sp_Register_Course (
    p_Roll_No VARCHAR(50),
    p_Section_ID VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Enrollment (roll_no, section_id, enrollment_status)
    VALUES (p_Roll_No, p_Section_ID, 'Active');
END;
$$;

CREATE PROCEDURE sp_Create_Assessment (
    p_Assessment_ID VARCHAR(50),
    p_Section_ID VARCHAR(50),
    p_Title VARCHAR(255),
    p_Max_Marks DECIMAL(6,2),
    p_Date_Time TIMESTAMP,
    p_Venue_ID VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Step 1: Create the actual exam event
    INSERT INTO Assessment_Definition (assessment_id, section_id, title, max_marks, date_and_time, venue_id)
    VALUES (p_Assessment_ID, p_Section_ID, p_Title, p_Max_Marks, p_Date_Time, p_Venue_ID);

    -- Step 2: Automatically populate the grading sheet for all active students in this section
    -- (Uses a SELECT statement to dynamically grab the right students)
    INSERT INTO Student_Assessment_Result (result_id, assessment_id, roll_no, completion_status)
    SELECT 
        CONCAT('RES-', p_Assessment_ID, '-', roll_no), -- Generates a unique Result ID
        p_Assessment_ID, 
        roll_no, 
        'Pending'
    FROM Enrollment 
    WHERE section_id = p_Section_ID AND enrollment_status = 'Active';
END;
$$;

CREATE PROCEDURE sp_Finalize_Semester_Grade (
    p_Roll_No VARCHAR(50),
    p_Section_ID VARCHAR(50),
    p_Final_Grade VARCHAR(5),
    p_Grade_Points DECIMAL(3,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Enrollment
    SET 
        final_grade = p_Final_Grade,
        grade_points = p_Grade_Points,
        enrollment_status = 'Completed'
    WHERE roll_no = p_Roll_No AND section_id = p_Section_ID;
END;
$$;