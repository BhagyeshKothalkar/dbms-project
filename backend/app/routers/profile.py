from fastapi import APIRouter, HTTPException
from database import db

router = APIRouter(prefix="/api")

@router.get("/student/profile")
async def get_student_profile(roll_no: str):
    record = await db.pool.fetchrow(
        """
        SELECT
            roll_no,
            name,
            email,
            batch_year,
            credits_obtained,
            credits_registered,
            program_id,
            program_name,
            specialization,
            total_credits_required,
            department_id,
            dept_name
        FROM vw_student_profile_details
        WHERE roll_no = $1
    """,
        roll_no,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Student not found")
    data = dict(record)
    data["credits_obtained"] = float(data["credits_obtained"] or 0)
    data["credits_registered"] = float(data["credits_registered"] or 0)
    return data

@router.get("/professor/profile")
async def get_professor_profile(employee_id: str):
    record = await db.pool.fetchrow(
        """
        SELECT
            p.employee_id,
            p.name,
            p.email,
            p.department_id,
            p.designation,
            d.dept_name,
            f.room_name as office
        FROM Professor_Profile p
        LEFT JOIN Department d ON p.department_id = d.department_id
        LEFT JOIN Facility f ON p.office_venue_id = f.venue_id
        WHERE p.employee_id = $1
    """,
        employee_id,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Professor not found")
    data = dict(record)
    data["phone"] = "N/A"
    data["specialization"] = "N/A"
    return data

@router.get("/timetable")
async def get_timetable(user_id: str, role: str):
    if role == "student":
        records = await db.pool.fetch(
            """
            SELECT 
                ts.day_of_week as day,
                CONCAT(TO_CHAR(ts.start_time, 'HH24:MI'), ' - ', TO_CHAR(ts.end_time, 'HH24:MI')) as slot,
                c.course_name as title,
                f.room_number as venue
            FROM Enrollment e
            JOIN Timetable_Slot ts ON e.section_id = ts.section_id
            JOIN Course_Section cs ON e.section_id = cs.section_id
            JOIN Course c ON cs.course_code = c.course_code
            LEFT JOIN Facility f ON ts.venue_id = f.venue_id
            WHERE e.roll_no = $1 AND e.enrollment_status = 'Active'
            ORDER BY ts.day_of_week, ts.start_time
        """,
            user_id,
        )
    elif role == "professor":
        records = await db.pool.fetch(
            """
            SELECT 
                ts.day_of_week as day,
                CONCAT(TO_CHAR(ts.start_time, 'HH24:MI'), ' - ', TO_CHAR(ts.end_time, 'HH24:MI')) as slot,
                c.course_name as title,
                f.room_number as venue
            FROM Course_Section cs
            JOIN Timetable_Slot ts ON cs.section_id = ts.section_id
            JOIN Course c ON cs.course_code = c.course_code
            LEFT JOIN Facility f ON ts.venue_id = f.venue_id
            WHERE cs.primary_professor_id = $1
            ORDER BY ts.day_of_week, ts.start_time
        """,
            user_id,
        )
    else:
        records = []
        
    return {"timetable": [dict(r) for r in records]}
