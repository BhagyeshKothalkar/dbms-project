import re
from contextlib import asynccontextmanager
from datetime import date, time

from database import db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class LoginRequest(BaseModel):
    role: str
    userId: str
    password: str


@app.post("/api/login")
async def login(req: LoginRequest):
    if req.role == "student":
        student = await db.pool.fetchrow(
            "SELECT * FROM Student_Profile WHERE roll_no = $1", req.userId
        )
        if not student:
            raise HTTPException(status_code=401, detail="Invalid Student ID")
        return {"success": True, "userId": req.userId, "role": "student"}
    elif req.role == "professor":
        prof = await db.pool.fetchrow(
            "SELECT * FROM Professor_Profile WHERE employee_id = $1", req.userId
        )
        if not prof:
            raise HTTPException(status_code=401, detail="Invalid Professor ID")
        return {"success": True, "userId": req.userId, "role": "professor"}
    elif req.role == "admin":
        if req.userId != "admin":  # hardcoded admin for simplicity
            raise HTTPException(status_code=401, detail="Invalid Admin credentials")
        return {"success": True, "userId": "admin", "role": "admin"}
    else:
        raise HTTPException(status_code=400, detail="Invalid role")


@app.get("/api/courses/available")
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


@app.get("/api/courses/registered")
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


@app.post("/api/courses/auto_enroll_core")
async def auto_enroll_core(req: AutoEnrollRequest):
    await db.pool.execute("CALL sp_auto_enroll_core($1)", req.student_id)
    return {"success": True}


class RegisterRequest(BaseModel):
    student_id: str
    section_id: str


@app.post("/api/courses/register")
async def register_course(req: RegisterRequest):
    # 0. Check Lock Security
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")

    # 1. Capacity Check
    cap = await db.pool.fetchval(
        "SELECT capacity FROM Course_Section WHERE section_id = $1", req.section_id
    )
    reg = await db.pool.fetchval(
        "SELECT COUNT(*) FROM Enrollment WHERE section_id = $1 AND enrollment_status = 'Active'",
        req.section_id,
    )
    if reg and cap and reg >= cap:
        raise HTTPException(
            status_code=400, detail="Capacity Full! You missed the slot."
        )

    # Get course details
    req_course = await db.pool.fetchrow(
        """
        SELECT c.course_code, c.course_type, c.credits 
        FROM Course_Section cs JOIN Course c ON cs.course_code = c.course_code 
        WHERE cs.section_id = $1
    """,
        req.section_id,
    )

    course_code = req_course["course_code"]

    # 2. Prerequisites DAG validation (Recursive CTE)
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

    # 3. Timetable slot clash validation
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

    # 4. Credit constraints based on Semester Structure
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

    # Execute insert natively
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


@app.delete("/api/courses/drop")
async def drop_course(req: DropRequest):
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")
    await db.pool.execute("CALL sp_drop_course($1, $2)", req.student_id, req.section_id)
    return {"success": True}


class LockRequest(BaseModel):
    student_id: str


@app.post("/api/courses/lock")
async def lock_registration(req: LockRequest):
    # 1. Check if already locked
    is_locked = await fetch_student_registration_locked(req.student_id)
    if is_locked:
        return {"success": True}

    # 2. Fetch the target Department Elective constraints
    dept, _ = parse_student_identity(req.student_id)
    struct = await fetch_department_semester_limits(dept, 6)
    tgt_dept = struct["dept_elective_credits_required"] if struct else 0

    # 3. Pull active Dept Electives dynamically
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

    # NP-Hard Constraint Subsumption Partition Check (Python Layer)
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

    # Apply rigid lock explicitly
    await db.pool.execute(
        "CALL sp_lock_registration($1, $2, $3)", req.student_id, dept, 6
    )
    return {"success": True}


# --- ADMIN INFRASTRUCTURE API ---
# Departments
@app.get("/api/admin/departments")
async def get_departments():
    records = await db.pool.fetch(
        "SELECT department_id, dept_name FROM Department ORDER BY department_id"
    )
    return {"departments": [dict(r) for r in records]}


class DeptDef(BaseModel):
    department_id: str
    dept_name: str


@app.post("/api/admin/departments")
async def create_department(req: DeptDef):
    await db.pool.execute(
        "CALL sp_create_department($1, $2)", req.department_id, req.dept_name
    )
    return {"success": True}


# Terms
@app.get("/api/admin/terms")
async def get_terms():
    records = await db.pool.fetch(
        "SELECT term_id, term_name FROM Academic_Term ORDER BY start_date, term_id"
    )
    return {"terms": [dict(r) for r in records]}


class TermDef(BaseModel):
    term_id: str
    term_name: str
    start_date: date
    end_date: date


@app.post("/api/admin/terms")
async def create_term(req: TermDef):
    await db.pool.execute(
        "CALL sp_create_term($1, $2, $3, $4)",
        req.term_id,
        req.term_name,
        req.start_date,
        req.end_date,
    )
    return {"success": True}


# Venues
@app.get("/api/admin/venues")
async def get_venues():
    records = await db.pool.fetch(
        "SELECT venue_id, building_name, room_number, capacity FROM Facility ORDER BY venue_id"
    )
    return {"venues": [dict(r) for r in records]}


class VenueDef(BaseModel):
    venue_id: str
    building_name: str
    room_number: str
    capacity: int


@app.post("/api/admin/venues")
async def create_venue(req: VenueDef):
    await db.pool.execute(
        "CALL sp_create_venue($1, $2, $3, $4)",
        req.venue_id,
        req.building_name,
        req.room_number,
        req.capacity,
    )
    return {"success": True}


# Programs & Identities
class ProgramDef(BaseModel):
    program_id: str
    program_name: str
    specialization: str
    department_id: str
    total_credits: int


@app.get("/api/admin/programs")
async def get_programs():
    records = await db.pool.fetch(
        "SELECT program_id, program_name, department_id FROM Program ORDER BY program_id"
    )
    return {"programs": [dict(r) for r in records]}


@app.post("/api/admin/programs")
async def create_program(req: ProgramDef):
    try:
        await db.pool.execute(
            "CALL sp_create_program($1, $2, $3, $4, $5)",
            req.program_id,
            req.program_name,
            req.specialization,
            req.department_id,
            req.total_credits,
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ProfessorDef(BaseModel):
    employee_id: str
    name: str
    email: str
    department_id: str
    designation: str


@app.post("/api/admin/professors")
async def create_professor(req: ProfessorDef):
    try:
        await db.pool.execute(
            "CALL sp_create_professor($1, $2, $3, $4, $5)",
            req.employee_id,
            req.name,
            req.email,
            req.department_id,
            req.designation,
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class StudentDef(BaseModel):
    roll_no: str
    name: str
    email: str
    program_id: str
    batch_year: int


@app.post("/api/admin/students")
async def create_student(req: StudentDef):
    try:
        await db.pool.execute(
            "CALL sp_create_student($1, $2, $3, $4, $5)",
            req.roll_no,
            req.name,
            req.email,
            req.program_id,
            req.batch_year,
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/student/profile")
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
    # Cast Decimal to float so JSON serialization is clean
    data["credits_obtained"] = float(data["credits_obtained"] or 0)
    data["credits_registered"] = float(data["credits_registered"] or 0)
    return data


@app.get("/api/professor/profile")
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


@app.get("/api/timetable")
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


# --- ADMIN API ---
@app.get("/api/admin/term_sections")
async def get_term_sections(term_id: str):
    records = await db.pool.fetch(
        """
        SELECT section_id, course_code, course_name, credits, course_type, ltp, department_id
        FROM vw_term_sections
        WHERE term_id = $1
    """,
        term_id,
    )

    prereq_map = await fetch_course_prerequisite_map(
        [record["course_code"] for record in records]
    )
    sections = []
    for r in records:
        sec = dict(r)
        sec["prerequisites"] = prereq_map.get(sec["course_code"], [])
        sections.append(sec)

    return {"sections": sections}


class PublishSemesterDef(BaseModel):
    term_id: str
    department_id: str
    semester_code: int
    batch_year: int
    core_credits: int
    dept_elective_credits: int
    inst_elective_credits: int
    section_ids: list[str]
    common_branches: list[str] = []

@app.post("/api/admin/publish_semester")
async def publish_semester(req: PublishSemesterDef):
    await db.pool.execute(
        "CALL sp_publish_semester($1, $2, $3, $4, $5, $6, $7, $8::varchar[], $9::varchar[])",
        req.term_id,
        req.department_id,
        req.semester_code,
        req.batch_year,
        req.core_credits,
        req.dept_elective_credits,
        req.inst_elective_credits,
        req.section_ids,
        req.common_branches,
    )
    return {"success": True}


class CourseDef(BaseModel):
    course_code: str
    course_name: str
    credits: int
    department_id: str
    course_type: str
    ltp: str
    semester_code: int


@app.post("/api/admin/courses")
async def create_course(req: CourseDef):
    await db.pool.execute(
        "CALL sp_create_course($1, $2, $3, $4, $5, $6, $7)",
        req.course_code,
        req.course_name,
        req.credits,
        req.department_id,
        req.course_type,
        req.ltp,
        req.semester_code,
    )
    return {"success": True}


@app.get("/api/admin/prerequisites")
async def get_prerequisites(course_code: str):
    prereq_map = await fetch_course_prerequisite_map([course_code])
    return {"prerequisites": prereq_map.get(course_code, [])}


class PrerequisiteDef(BaseModel):
    course_code: str
    prerequisite_course_code: str


@app.post("/api/admin/prerequisites")
async def add_prerequisite(req: PrerequisiteDef):
    try:
        await db.pool.execute(
            "CALL sp_add_prerequisite($1, $2)",
            req.course_code,
            req.prerequisite_course_code,
        )
        return {"success": True}
    except Exception as e:
        detail = str(e)
        if req.course_code == req.prerequisite_course_code:
            detail = "A course cannot be a prerequisite of itself."
        elif "Circular dependency block!" in detail:
            detail = (
                f"Circular dependency block! Course {req.prerequisite_course_code} "
                f"inherently depends on {req.course_code} downwards in its tree."
            )
        raise HTTPException(status_code=400, detail=detail)


@app.delete("/api/admin/prerequisites")
async def remove_prerequisite(course_code: str, prerequisite_course_code: str):
    await db.pool.execute(
        "CALL sp_remove_prerequisite($1, $2)",
        course_code,
        prerequisite_course_code,
    )
    return {"success": True}


@app.get("/api/professors/all")
async def get_all_professors():
    records = await db.pool.fetch(
        "SELECT employee_id, name FROM Professor_Profile ORDER BY employee_id"
    )
    return {"professors": [dict(r) for r in records]}


@app.get("/api/courses/all")
async def get_all_courses():
    records = await db.pool.fetch(
        "SELECT course_code, course_name FROM Course ORDER BY course_code"
    )
    return {"courses": [dict(r) for r in records]}


@app.get("/api/venues/all")
async def get_all_venues():
    records = await db.pool.fetch(
        "SELECT venue_id, building_name, room_number, capacity FROM Facility ORDER BY venue_id"
    )
    return {"venues": [dict(r) for r in records]}


class CourseSectionDef(BaseModel):
    course_code: str
    term_id: str
    section_name: str
    primary_professor_id: str
    venue_id: str
    capacity: int  # Section enrollment capacity (separate from venue capacity)


@app.post("/api/admin/course_sections")
async def create_course_section(req: CourseSectionDef):
    # Auto-generate section_id as <course_code>-<section_name>
    section_id = f"{req.course_code}-{req.section_name}"

    # Validate venue exists and check capacity constraint
    venue_capacity = await db.pool.fetchval(
        "SELECT capacity FROM Facility WHERE venue_id = $1", req.venue_id
    )
    if not venue_capacity:
        raise HTTPException(status_code=400, detail="Invalid venue")
    if req.capacity > venue_capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Section capacity ({req.capacity}) exceeds venue capacity ({venue_capacity})",
        )

    await db.pool.execute(
        "CALL sp_create_course_section($1, $2, $3, $4, $5, $6)",
        req.course_code,
        req.term_id,
        req.section_name,
        req.primary_professor_id,
        req.venue_id,  # This was missing
        req.capacity,
    )

    return {
        "success": True,
        "section_id": section_id,
        "capacity": req.capacity,
        "venue_capacity": venue_capacity,
    }


class TimetableSlotDef(BaseModel):
    slot_id: str
    section_id: str
    venue_id: str
    day_of_week: str
    start_time: time
    end_time: time


@app.post("/api/admin/timetable_slots")
async def create_timetable_slot(req: TimetableSlotDef):
    await db.pool.execute(
        "CALL sp_create_timetable_slot($1, $2, $3, $4, $5::time, $6::time)",
        req.slot_id,
        req.section_id,
        req.venue_id,
        req.day_of_week,
        req.start_time,
        req.end_time,
    )
    return {"success": True}


# --- PROFESSOR API ---


@app.get("/api/prof/my_sections")
async def get_prof_sections(prof_id: str):
    records = await db.pool.fetch(
        """
        SELECT section_id, course_code, course_name, ltp, additional_info
        FROM vw_professor_sections
        WHERE employee_id = $1
    """,
        prof_id,
    )
    return {"sections": [dict(r) for r in records]}


class SectionInfoDef(BaseModel):
    section_id: str
    additional_info: str


@app.put("/api/prof/section_info")
async def update_section_info(req: SectionInfoDef):
    await db.pool.execute(
        "CALL sp_update_section_info($1, $2)",
        req.section_id,
        req.additional_info,
    )
    return {"success": True}
