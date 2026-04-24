from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from utils import (
    fetch_available_section_rows,
    fetch_student_registration_locked,
    parse_student_identity,
    fetch_department_semester_limits
)

router = APIRouter(prefix="/api/courses")

@router.get("/available")
async def get_available_courses(student_id: str):
    records = await fetch_available_section_rows(student_id)
    out = []
    for r in records:
        out.append(
            {
                "id": r["section_id"],
                "code": r["course_code"],
                "name": r["course_name"],
                "instructor": r["instructor_name"],
                "schedule": r["schedule"],
                "credits": r["credits"],
                "type": r["course_type"],
                "mode": "graded",
                "seats": r["capacity"],
                "registered": r["active_registrations"],
                "department": r["department_id"],
                "semester": r["semester_code"] or 6,
            }
        )
    return {"courses": out}

@router.get("/registered")
async def get_registered_courses(student_id: str):
    records = await db.pool.fetch(
        "SELECT section_id FROM Enrollment WHERE roll_no = $1 AND enrollment_status = 'Active'",
        student_id,
    )
    return {
        "registeredCourseIds": [r["section_id"] for r in records],
        "locked": await fetch_student_registration_locked(student_id),
    }

class AutoEnrollRequest(BaseModel):
    student_id: str

@router.post("/auto_enroll_core")
async def auto_enroll_core(req: AutoEnrollRequest):
    await db.pool.execute("CALL sp_auto_enroll_core($1)", req.student_id)
    return {"success": True}

class RegisterRequest(BaseModel):
    student_id: str
    section_id: str

@router.post("/register")
async def register_course(req: RegisterRequest):
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")

    cap = await db.pool.fetchval(
        "SELECT capacity FROM Course_Section WHERE section_id = $1", req.section_id
    )
    reg = await db.pool.fetchval(
        "SELECT COUNT(*) FROM Enrollment WHERE section_id = $1 AND enrollment_status = 'Active'",
        req.section_id,
    )
    if reg and cap and reg >= cap:
        raise HTTPException(status_code=400, detail="Capacity Full! You missed the slot.")

    req_course = await db.pool.fetchrow(
        """
        SELECT c.course_code, c.course_type, c.credits 
        FROM Course_Section cs JOIN Course c ON cs.course_code = c.course_code 
        WHERE cs.section_id = $1
    """,
        req.section_id,
    )

    course_code = req_course["course_code"]

    prereq_query = """
    WITH RECURSIVE Prereq_CTE AS (
        SELECT prerequisite_course_code AS code FROM Course_Prerequisite WHERE course_code = $1
        UNION
        SELECT cp.prerequisite_course_code FROM Course_Prerequisite cp
        INNER JOIN Prereq_CTE p ON cp.course_code = p.code
    )
    SELECT code FROM Prereq_CTE;
    """
    prereqs = await db.pool.fetch(prereq_query, course_code)

    if prereqs:
        completed = await db.pool.fetch(
            """
            SELECT c.course_code FROM Enrollment e 
            JOIN Course_Section cs ON e.section_id = cs.section_id
            JOIN Course c ON cs.course_code = c.course_code
            WHERE e.roll_no = $1 AND e.enrollment_status = 'Completed'
        """,
            req.student_id,
        )

        completed_codes = {r["course_code"] for r in completed}
        for p in prereqs:
            if p["code"] not in completed_codes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Prerequisite DAG constraint failed: Missing {p['code']}",
                )

    target_slots = await db.pool.fetch(
        "SELECT day_of_week, start_time, end_time FROM Timetable_Slot WHERE section_id = $1",
        req.section_id,
    )
    active_slots = await db.pool.fetch(
        """
        SELECT t.day_of_week, t.start_time, t.end_time, cs.course_code 
        FROM Enrollment e
        JOIN Timetable_Slot t ON e.section_id = t.section_id
        JOIN Course_Section cs ON t.section_id = cs.section_id
        WHERE e.roll_no = $1 AND e.enrollment_status = 'Active'
    """,
        req.student_id,
    )

    for ts in target_slots:
        for asc in active_slots:
            if ts["day_of_week"] == asc["day_of_week"]:
                if max(ts["start_time"], asc["start_time"]) < min(
                    ts["end_time"], asc["end_time"]
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Timetable Clash! Overlaps with {asc['course_code']} on {ts['day_of_week']}",
                    )

    dept, _ = parse_student_identity(req.student_id)
    struct = await fetch_department_semester_limits(dept, 6)
    if struct:
        reg_courses_active = await db.pool.fetch(
            """
            SELECT c.course_type, SUM(c.credits) as sum_cr 
            FROM Enrollment e JOIN Course_Section cs on e.section_id = cs.section_id
            JOIN Course c on cs.course_code = c.course_code
            WHERE e.roll_no = $1 AND e.enrollment_status = 'Active'
            GROUP BY c.course_type
        """,
            req.student_id,
        )

        sums = {r["course_type"]: r["sum_cr"] for r in reg_courses_active}
        ctype = req_course["course_type"]

        current_type_cr = sums.get(ctype, 0)
        proposed_cr = current_type_cr + req_course["credits"]

        if ctype == "Core" and proposed_cr > struct["core_credits_required"]:
            raise HTTPException(
                status_code=400,
                detail=f"Exceeds Core Credits limit ({struct['core_credits_required']} cr)",
            )
        elif (
            ctype == "Department Elective"
            and proposed_cr > struct["dept_elective_credits_required"]
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Exceeds Dept Elective limit ({struct['dept_elective_credits_required']} cr)",
            )
        elif (
            ctype == "Institute Elective"
            and proposed_cr > struct["inst_elective_credits_required"]
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Exceeds Inst Elective limit ({struct['inst_elective_credits_required']} cr)",
            )

    try:
        await db.pool.execute(
            "CALL sp_Register_Course($1, $2)", req.student_id, req.section_id
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DropRequest(BaseModel):
    student_id: str
    section_id: str

@router.delete("/drop")
async def drop_course(req: DropRequest):
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")
    await db.pool.execute("CALL sp_drop_course($1, $2)", req.student_id, req.section_id)
    return {"success": True}

class LockRequest(BaseModel):
    student_id: str

@router.post("/lock")
async def lock_registration(req: LockRequest):
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        return {"success": True}

    dept, _ = parse_student_identity(req.student_id)
    struct = await fetch_department_semester_limits(dept, 6)
    tgt_dept = struct["dept_elective_credits_required"] if struct else 0

    dept_electives = await db.pool.fetch(
        """
        SELECT c.credits FROM Enrollment e 
        JOIN Course_Section cs ON e.section_id = cs.section_id
        JOIN Course c ON cs.course_code = c.course_code 
        WHERE e.roll_no = $1 AND e.enrollment_status = 'Active' AND c.course_type = 'Department Elective'
    """,
        req.student_id,
    )

    credits_array = [r["credits"] for r in dept_electives]

    if tgt_dept > 0 and len(credits_array) > 0:
        total_sum = sum(credits_array)
        if total_sum % tgt_dept != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot Lock! Your Department Electives sum ({total_sum}) is not a multiple of the strict target ({tgt_dept}).",
            )

        k = int(total_sum / tgt_dept)
        credits_array.sort(reverse=True)
        buckets = [0] * k

        def backtrack(index):
            if index == len(credits_array):
                return True
            for i in range(k):
                if buckets[i] + credits_array[index] <= tgt_dept:
                    buckets[i] += credits_array[index]
                    if backtrack(index + 1):
                        return True
                    buckets[i] -= credits_array[index]
                if buckets[i] == 0:
                    break
            return False

        if not backtrack(0):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot Lock! Your selected Department Electives cannot partition linearly into target structures of {tgt_dept} cr.",
            )

    elif tgt_dept > 0 and len(credits_array) == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot Lock! You must select Department Electives before locking.",
        )

    await db.pool.execute(
        "CALL sp_lock_registration($1, $2, $3)", req.student_id, dept, 6
    )
    return {"success": True}
