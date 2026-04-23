-- Stored routines for admin and professor workflows used by backend/main.py

CREATE OR REPLACE PROCEDURE sp_create_department(
    p_department_id VARCHAR(50),
    p_dept_name VARCHAR(255)
)
LANGUAGE SQL
AS $$
    INSERT INTO Department (department_id, dept_name)
    VALUES (p_department_id, p_dept_name)
    ON CONFLICT (department_id) DO NOTHING;
$$;

CREATE OR REPLACE PROCEDURE sp_create_term(
    p_term_id VARCHAR(50),
    p_term_name VARCHAR(100),
    p_start_date DATE,
    p_end_date DATE
)
LANGUAGE SQL
AS $$
    INSERT INTO Academic_Term (term_id, term_name, start_date, end_date)
    VALUES (p_term_id, p_term_name, p_start_date, p_end_date)
    ON CONFLICT (term_id) DO NOTHING;
$$;

CREATE OR REPLACE PROCEDURE sp_create_venue(
    p_venue_id VARCHAR(50),
    p_building_name VARCHAR(100),
    p_room_number VARCHAR(50),
    p_capacity INT
)
LANGUAGE SQL
AS $$
    INSERT INTO Facility (venue_id, building_name, room_number, capacity)
    VALUES (p_venue_id, p_building_name, p_room_number, p_capacity)
    ON CONFLICT (venue_id) DO NOTHING;
$$;

CREATE OR REPLACE PROCEDURE sp_create_program(
    p_program_id VARCHAR(50),
    p_program_name VARCHAR(255),
    p_specialization VARCHAR(255),
    p_department_id VARCHAR(50),
    p_total_credits_required INT
)
LANGUAGE SQL
AS $$
    INSERT INTO Program (program_id, program_name, specialization, department_id, total_credits_required)
    VALUES (p_program_id, p_program_name, p_specialization, p_department_id, p_total_credits_required);
$$;

CREATE OR REPLACE PROCEDURE sp_create_professor(
    p_employee_id VARCHAR(50),
    p_name VARCHAR(255),
    p_email VARCHAR(255),
    p_department_id VARCHAR(50),
    p_designation VARCHAR(100)
)
LANGUAGE SQL
AS $$
    INSERT INTO Professor_Profile (employee_id, name, email, department_id, designation)
    VALUES (p_employee_id, p_name, p_email, p_department_id, p_designation);
$$;

CREATE OR REPLACE PROCEDURE sp_create_student(
    p_roll_no VARCHAR(50),
    p_name VARCHAR(255),
    p_email VARCHAR(255),
    p_program_id VARCHAR(50),
    p_batch_year INT
)
LANGUAGE SQL
AS $$
    INSERT INTO Student_Profile (roll_no, name, email, program_id, batch_year)
    VALUES (p_roll_no, p_name, p_email, p_program_id, p_batch_year);
$$;

CREATE OR REPLACE PROCEDURE sp_create_course(
    p_course_code VARCHAR(50),
    p_course_name VARCHAR(255),
    p_credits INT,
    p_department_id VARCHAR(50),
    p_course_type VARCHAR(50),
    p_ltp VARCHAR(20),
    p_semester_code INT
)
LANGUAGE SQL
AS $$
    INSERT INTO Course (course_code, course_name, credits, department_id, course_type, ltp, semester_code)
    VALUES (p_course_code, p_course_name, p_credits, p_department_id, p_course_type, p_ltp, p_semester_code)
    ON CONFLICT (course_code) DO NOTHING;
$$;

CREATE OR REPLACE PROCEDURE sp_add_prerequisite(
    p_course_code VARCHAR(50),
    p_prerequisite_course_code VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cycle VARCHAR(50);
BEGIN
    IF p_course_code = p_prerequisite_course_code THEN
        RAISE EXCEPTION 'A course cannot be a prerequisite of itself.';
    END IF;

    WITH RECURSIVE prereq_cte AS (
        SELECT prerequisite_course_code AS code
        FROM Course_Prerequisite
        WHERE course_code = p_prerequisite_course_code
        UNION
        SELECT cp.prerequisite_course_code
        FROM Course_Prerequisite cp
        JOIN prereq_cte pc ON cp.course_code = pc.code
    )
    SELECT code
    INTO v_cycle
    FROM prereq_cte
    WHERE code = p_course_code
    LIMIT 1;

    IF v_cycle IS NOT NULL THEN
        RAISE EXCEPTION 'Circular dependency block!';
    END IF;

    INSERT INTO Course_Prerequisite (course_code, prerequisite_course_code)
    VALUES (p_course_code, p_prerequisite_course_code);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_remove_prerequisite(
    p_course_code VARCHAR(50),
    p_prerequisite_course_code VARCHAR(50)
)
LANGUAGE SQL
AS $$
    DELETE FROM Course_Prerequisite
    WHERE course_code = p_course_code
      AND prerequisite_course_code = p_prerequisite_course_code;
$$;

CREATE OR REPLACE PROCEDURE sp_publish_semester(
    p_term_id VARCHAR(50),
    p_department_id VARCHAR(50),
    p_semester_code INT,
    p_batch_year INT,
    p_core_credits INT,
    p_dept_elective_credits INT,
    p_inst_elective_credits INT,
    p_section_ids VARCHAR(50)[],
    p_common_branches VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_branch VARCHAR(50);
    v_course_code VARCHAR(50);
    v_all_branches VARCHAR(50)[];
BEGIN
    INSERT INTO Semester_Structure (
        term_id,
        department_id,
        semester_code,
        core_credits_required,
        dept_elective_credits_required,
        inst_elective_credits_required
    )
    VALUES (
        p_term_id,
        p_department_id,
        p_semester_code,
        p_core_credits,
        p_dept_elective_credits,
        p_inst_elective_credits
    )
    ON CONFLICT (term_id, department_id, semester_code) DO UPDATE
    SET core_credits_required = EXCLUDED.core_credits_required,
        dept_elective_credits_required = EXCLUDED.dept_elective_credits_required,
        inst_elective_credits_required = EXCLUDED.inst_elective_credits_required;

    IF COALESCE(array_length(p_section_ids, 1), 0) = 0 THEN
        RETURN;
    END IF;

    v_all_branches := array_append(COALESCE(p_common_branches, ARRAY[]::VARCHAR(50)[]), UPPER(p_department_id) || p_batch_year::TEXT);

    FOREACH v_branch IN ARRAY v_all_branches LOOP
        DELETE FROM Course_Access_Constraint
        WHERE allowed_roll_no_prefix = v_branch;

        UPDATE Student_Profile
        SET registration_locked = FALSE
        WHERE roll_no LIKE v_branch || '%';

        FOR v_course_code IN
            SELECT DISTINCT course_code
            FROM Course_Section
            WHERE section_id = ANY(p_section_ids)
        LOOP
            INSERT INTO Course_Access_Constraint (course_code, allowed_roll_no_prefix)
            VALUES (v_course_code, v_branch)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_create_course_section(
    p_course_code VARCHAR(50),
    p_term_id VARCHAR(50),
    p_section_name VARCHAR(20),
    p_primary_professor_id VARCHAR(50),
    p_venue_id VARCHAR(50),
    p_capacity INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_section_id VARCHAR(80);
    v_venue_capacity INT;
BEGIN
    v_section_id := p_course_code || '-' || p_section_name;

    SELECT capacity
    INTO v_venue_capacity
    FROM Facility
    WHERE venue_id = p_venue_id;

    IF v_venue_capacity IS NULL THEN
        RAISE EXCEPTION 'Invalid venue';
    END IF;

    IF p_capacity > v_venue_capacity THEN
        RAISE EXCEPTION 'Section capacity (%) exceeds venue capacity (%)', p_capacity, v_venue_capacity;
    END IF;

    INSERT INTO Course_Section (
        section_id,
        course_code,
        term_id,
        section_name,
        primary_professor_id,
        capacity
    )
    VALUES (
        v_section_id,
        p_course_code,
        p_term_id,
        p_section_name,
        p_primary_professor_id,
        p_capacity
    );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_create_timetable_slot(
    p_slot_id VARCHAR(50),
    p_section_id VARCHAR(50),
    p_venue_id VARCHAR(50),
    p_day_of_week VARCHAR(15),
    p_start_time TIME,
    p_end_time TIME
)
LANGUAGE SQL
AS $$
    INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time)
    VALUES (p_slot_id, p_section_id, p_venue_id, p_day_of_week, p_start_time, p_end_time);
$$;

CREATE OR REPLACE PROCEDURE sp_update_section_info(
    p_section_id VARCHAR(50),
    p_additional_info TEXT
)
LANGUAGE SQL
AS $$
    UPDATE Course_Section
    SET additional_info = p_additional_info
    WHERE section_id = p_section_id;
$$;
