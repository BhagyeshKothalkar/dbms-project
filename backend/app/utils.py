import re
from database import db

async def fetch_student_registration_locked(student_id: str) -> bool:
    locked = await db.pool.fetchval(
        "SELECT registration_locked FROM Student_Profile WHERE roll_no = $1",
        student_id,
    )
    return bool(locked)

def parse_student_identity(student_id: str) -> tuple[str, int | None]:
    match = re.match(r"^([A-Z]+)(\d{4})", student_id.upper())
    dept = match.group(1) if match else "ALL"
    year = int(match.group(2)) if match else None
    return dept, year

async def fetch_department_semester_limits(department_id: str, semester_code: int = 6):
    return await db.pool.fetchrow(
        """
        SELECT
            core_credits_required,
            dept_elective_credits_required,
            inst_elective_credits_required
        FROM Semester_Structure
        WHERE department_id = $1 AND semester_code = $2
        ORDER BY term_id DESC
        LIMIT 1
    """,
        department_id,
        semester_code,
    )

async def fetch_course_prerequisite_map(
    course_codes: list[str] | None = None,
) -> dict[str, list[str]]:
    if course_codes:
        prereqs = await db.pool.fetch(
            """
            SELECT course_code, prerequisite_course_code
            FROM Course_Prerequisite
            WHERE course_code = ANY($1::varchar[])
        """,
            course_codes,
        )
    else:
        prereqs = await db.pool.fetch(
            "SELECT course_code, prerequisite_course_code FROM Course_Prerequisite"
        )

    prereq_map: dict[str, list[str]] = {}
    for prereq in prereqs:
        prereq_map.setdefault(prereq["course_code"], []).append(
            prereq["prerequisite_course_code"]
        )
    return prereq_map

async def fetch_available_section_rows(student_id: str):
    return await db.pool.fetch(
        """
        SELECT
            section_id,
            course_code,
            course_name,
            instructor_name,
            capacity,
            credits,
            department_id,
            course_type,
            schedule,
            active_registrations,
            semester_code
        FROM vw_available_course_sections
        WHERE fn_course_access_allowed(course_code, $1)
    """,
        student_id,
    )
