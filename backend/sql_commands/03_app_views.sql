-- Reusable views consumed by backend/main.py query flows

CREATE OR REPLACE VIEW vw_section_catalog AS
SELECT
    cs.section_id,
    cs.term_id,
    cs.section_name,
    cs.primary_professor_id,
    cs.capacity,
    c.course_code,
    c.course_name,
    c.credits,
    c.department_id,
    c.course_type,
    c.ltp,
    c.semester_code,
    p.name AS instructor_name
FROM Course_Section cs
JOIN Course c ON c.course_code = cs.course_code
JOIN Professor_Profile p ON p.employee_id = cs.primary_professor_id;

CREATE OR REPLACE VIEW vw_section_schedule AS
SELECT
    t.section_id,
    STRING_AGG(
        t.day_of_week || ' ' || t.start_time::TEXT || '-' || t.end_time::TEXT,
        ', ' ORDER BY
            CASE t.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
                ELSE 8
            END,
            t.start_time
    ) AS schedule_text
FROM Timetable_Slot t
GROUP BY t.section_id;

CREATE OR REPLACE VIEW vw_active_enrollment_counts AS
SELECT
    e.section_id,
    COUNT(*)::INT AS active_registrations
FROM Enrollment e
WHERE e.enrollment_status = 'Active'
GROUP BY e.section_id;

CREATE OR REPLACE VIEW vw_available_course_sections AS
SELECT
    sc.section_id,
    sc.term_id,
    sc.course_code,
    sc.course_name,
    sc.instructor_name,
    sc.capacity,
    sc.credits,
    sc.department_id,
    sc.course_type,
    sc.ltp,
    sc.semester_code,
    COALESCE(ss.schedule_text, 'TBD') AS schedule,
    COALESCE(aec.active_registrations, 0) AS active_registrations
FROM vw_section_catalog sc
LEFT JOIN vw_section_schedule ss ON ss.section_id = sc.section_id
LEFT JOIN vw_active_enrollment_counts aec ON aec.section_id = sc.section_id;

CREATE OR REPLACE VIEW vw_student_completed_courses AS
SELECT
    e.roll_no,
    cs.section_id,
    c.course_code,
    c.course_name,
    e.final_grade,
    e.grade_points
FROM Enrollment e
JOIN Course_Section cs ON cs.section_id = e.section_id
JOIN Course c ON c.course_code = cs.course_code
WHERE e.enrollment_status = 'Completed';

CREATE OR REPLACE VIEW vw_student_active_schedule AS
SELECT
    e.roll_no,
    e.section_id,
    cs.course_code,
    t.slot_id,
    t.day_of_week,
    t.start_time,
    t.end_time
FROM Enrollment e
JOIN Course_Section cs ON cs.section_id = e.section_id
JOIN Timetable_Slot t ON t.section_id = e.section_id
WHERE e.enrollment_status = 'Active';

CREATE OR REPLACE VIEW vw_student_credit_totals AS
SELECT
    e.roll_no,
    c.course_type,
    COALESCE(SUM(c.credits), 0)::INT AS total_credits
FROM Enrollment e
JOIN Course_Section cs ON cs.section_id = e.section_id
JOIN Course c ON c.course_code = cs.course_code
WHERE e.enrollment_status = 'Active'
GROUP BY e.roll_no, c.course_type;

CREATE OR REPLACE VIEW vw_student_profile_details AS
SELECT
    sp.roll_no,
    sp.name,
    sp.email,
    sp.batch_year,
    sp.credits_obtained,
    sp.credits_registered,
    sp.registration_locked,
    p.program_id,
    p.program_name,
    p.specialization,
    p.total_credits_required,
    d.department_id,
    d.dept_name
FROM Student_Profile sp
JOIN Program p ON p.program_id = sp.program_id
JOIN Department d ON d.department_id = p.department_id;

CREATE OR REPLACE VIEW vw_term_sections AS
SELECT
    sc.section_id,
    sc.term_id,
    sc.course_code,
    sc.course_name,
    sc.credits,
    sc.course_type,
    sc.ltp,
    sc.department_id
FROM vw_section_catalog sc;

CREATE OR REPLACE VIEW vw_course_prerequisites AS
SELECT
    cp.course_code,
    ARRAY_AGG(cp.prerequisite_course_code ORDER BY cp.prerequisite_course_code) AS prerequisites
FROM Course_Prerequisite cp
GROUP BY cp.course_code;

CREATE OR REPLACE VIEW vw_professor_sections AS
SELECT
    cs.primary_professor_id AS employee_id,
    cs.section_id,
    c.course_code,
    c.course_name,
    c.ltp,
    cs.additional_info
FROM Course_Section cs
JOIN Course c ON c.course_code = cs.course_code;
