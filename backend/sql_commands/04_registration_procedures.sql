-- Stored routines for student registration workflows used by backend/main.py

CREATE OR REPLACE FUNCTION fn_roll_prefix_department(p_roll_no VARCHAR(50))
RETURNS VARCHAR(50)
LANGUAGE SQL
AS $$
    SELECT COALESCE((regexp_match(UPPER(p_roll_no), '^([A-Z]+)(\d{4})'))[1], 'ALL');
$$;

CREATE OR REPLACE FUNCTION fn_roll_prefix_batch_year(p_roll_no VARCHAR(50))
RETURNS INT
LANGUAGE SQL
AS $$
    SELECT COALESCE(((regexp_match(UPPER(p_roll_no), '^([A-Z]+)(\d{4})'))[2])::INT, NULL);
$$;

CREATE OR REPLACE FUNCTION fn_course_access_allowed(
    p_course_code VARCHAR(50),
    p_student_id VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM Course_Access_Constraint cac
        WHERE cac.course_code = p_course_code
          AND (
              (cac.allowed_department IS NOT NULL
               AND cac.allowed_department <> 'ALL'
               AND cac.allowed_department <> fn_roll_prefix_department(p_student_id))
              OR (cac.allowed_batch_year IS NOT NULL
                  AND cac.allowed_batch_year <> fn_roll_prefix_batch_year(p_student_id))
              OR (cac.allowed_roll_no_prefix IS NOT NULL
                  AND p_student_id NOT LIKE cac.allowed_roll_no_prefix || '%')
          )
    );
$$;

CREATE OR REPLACE FUNCTION fn_has_completed_prerequisites(
    p_student_id VARCHAR(50),
    p_course_code VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
    WITH RECURSIVE prereq_cte AS (
        SELECT prerequisite_course_code AS code
        FROM Course_Prerequisite
        WHERE course_code = p_course_code
        UNION
        SELECT cp.prerequisite_course_code
        FROM Course_Prerequisite cp
        JOIN prereq_cte pc ON cp.course_code = pc.code
    )
    SELECT NOT EXISTS (
        SELECT 1
        FROM prereq_cte pc
        WHERE pc.code NOT IN (
            SELECT v.course_code
            FROM vw_student_completed_courses v
            WHERE v.roll_no = p_student_id
        )
    );
$$;

CREATE OR REPLACE FUNCTION fn_has_schedule_conflict(
    p_student_id VARCHAR(50),
    p_section_id VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM Timetable_Slot target_slot
        JOIN vw_student_active_schedule active_slot
          ON active_slot.roll_no = p_student_id
         AND active_slot.day_of_week = target_slot.day_of_week
         AND GREATEST(active_slot.start_time, target_slot.start_time) < LEAST(active_slot.end_time, target_slot.end_time)
        WHERE target_slot.section_id = p_section_id
    );
$$;

CREATE OR REPLACE FUNCTION fn_within_credit_limit(
    p_student_id VARCHAR(50),
    p_section_id VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_department_id VARCHAR(50);
    v_semester_code INT;
    v_course_type VARCHAR(50);
    v_course_credits INT;
    v_current_credits INT;
    v_core_limit INT;
    v_dept_limit INT;
    v_inst_limit INT;
BEGIN
    SELECT c.department_id, c.semester_code, c.course_type, c.credits
    INTO v_department_id, v_semester_code, v_course_type, v_course_credits
    FROM Course_Section cs
    JOIN Course c ON c.course_code = cs.course_code
    WHERE cs.section_id = p_section_id;

    IF v_course_type IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT
        core_credits_required,
        dept_elective_credits_required,
        inst_elective_credits_required
    INTO v_core_limit, v_dept_limit, v_inst_limit
    FROM Semester_Structure
    WHERE department_id = v_department_id
      AND semester_code = v_semester_code
    ORDER BY term_id DESC
    LIMIT 1;

    IF v_core_limit IS NULL AND v_dept_limit IS NULL AND v_inst_limit IS NULL THEN
        RETURN TRUE;
    END IF;

    SELECT COALESCE(total_credits, 0)
    INTO v_current_credits
    FROM vw_student_credit_totals
    WHERE roll_no = p_student_id
      AND course_type = v_course_type;

    IF v_course_type = 'Core' THEN
        RETURN v_current_credits + v_course_credits <= COALESCE(v_core_limit, 2147483647);
    ELSIF v_course_type = 'Department Elective' THEN
        RETURN v_current_credits + v_course_credits <= COALESCE(v_dept_limit, 2147483647);
    ELSIF v_course_type = 'Institute Elective' THEN
        RETURN v_current_credits + v_course_credits <= COALESCE(v_inst_limit, 2147483647);
    END IF;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_register_course(
    p_student_id VARCHAR(50),
    p_section_id VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_locked BOOLEAN;
    v_capacity INT;
    v_registered INT;
    v_course_code VARCHAR(50);
BEGIN
    SELECT registration_locked
    INTO v_is_locked
    FROM Student_Profile
    WHERE roll_no = p_student_id;

    IF COALESCE(v_is_locked, FALSE) THEN
        RAISE EXCEPTION 'Registration is locked';
    END IF;

    SELECT cs.capacity, cs.course_code
    INTO v_capacity, v_course_code
    FROM Course_Section cs
    WHERE cs.section_id = p_section_id;

    IF v_capacity IS NULL THEN
        RAISE EXCEPTION 'Invalid section_id: %', p_section_id;
    END IF;

    SELECT COUNT(*)::INT
    INTO v_registered
    FROM Enrollment
    WHERE section_id = p_section_id
      AND enrollment_status = 'Active';

    IF v_registered >= v_capacity THEN
        RAISE EXCEPTION 'Capacity Full! You missed the slot.';
    END IF;

    IF NOT fn_course_access_allowed(v_course_code, p_student_id) THEN
        RAISE EXCEPTION 'Access constraint failed for course %', v_course_code;
    END IF;

    IF NOT fn_has_completed_prerequisites(p_student_id, v_course_code) THEN
        RAISE EXCEPTION 'Prerequisite DAG constraint failed for course %', v_course_code;
    END IF;

    IF fn_has_schedule_conflict(p_student_id, p_section_id) THEN
        RAISE EXCEPTION 'Timetable clash detected for section %', p_section_id;
    END IF;

    IF NOT fn_within_credit_limit(p_student_id, p_section_id) THEN
        RAISE EXCEPTION 'Credit limit exceeded for section %', p_section_id;
    END IF;

    INSERT INTO Enrollment (roll_no, section_id, enrollment_status)
    VALUES (p_student_id, p_section_id, 'Active')
    ON CONFLICT (roll_no, section_id) DO UPDATE
    SET enrollment_status = EXCLUDED.enrollment_status;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_auto_enroll_core(
    p_student_id VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_section RECORD;
BEGIN
    FOR v_section IN
        SELECT sc.section_id
        FROM vw_section_catalog sc
        WHERE sc.course_type = 'Core'
          AND fn_course_access_allowed(sc.course_code, p_student_id)
    LOOP
        BEGIN
            CALL sp_register_course(p_student_id, v_section.section_id);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_drop_course(
    p_student_id VARCHAR(50),
    p_section_id VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_locked BOOLEAN;
BEGIN
    SELECT registration_locked
    INTO v_is_locked
    FROM Student_Profile
    WHERE roll_no = p_student_id;

    IF COALESCE(v_is_locked, FALSE) THEN
        RAISE EXCEPTION 'Registration is locked';
    END IF;

    DELETE FROM Enrollment
    WHERE roll_no = p_student_id
      AND section_id = p_section_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_lock_registration(
    p_student_id VARCHAR(50),
    p_department_id VARCHAR(50),
    p_semester_code INT DEFAULT 6
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_locked BOOLEAN;
    v_target_dept_credits INT;
BEGIN
    SELECT registration_locked
    INTO v_is_locked
    FROM Student_Profile
    WHERE roll_no = p_student_id;

    IF COALESCE(v_is_locked, FALSE) THEN
        RETURN;
    END IF;

    SELECT dept_elective_credits_required
    INTO v_target_dept_credits
    FROM Semester_Structure
    WHERE department_id = p_department_id
      AND semester_code = p_semester_code
    ORDER BY term_id DESC
    LIMIT 1;

    IF COALESCE(v_target_dept_credits, 0) > 0 AND NOT EXISTS (
        SELECT 1
        FROM Enrollment e
        JOIN Course_Section cs ON cs.section_id = e.section_id
        JOIN Course c ON c.course_code = cs.course_code
        WHERE e.roll_no = p_student_id
          AND e.enrollment_status = 'Active'
          AND c.course_type = 'Department Elective'
    ) THEN
        RAISE EXCEPTION 'Cannot Lock! You must select Department Electives before locking.';
    END IF;

    UPDATE Student_Profile
    SET registration_locked = TRUE
    WHERE roll_no = p_student_id;
END;
$$;
