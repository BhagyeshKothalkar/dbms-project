from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import db
from contextlib import asynccontextmanager
import re

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

class LoginRequest(BaseModel):
    role: str
    userId: str
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    if req.role == "student":
        student = await db.pool.fetchrow("SELECT * FROM Student_Profile WHERE roll_no = $1", req.userId)
        if not student:
            raise HTTPException(status_code=401, detail="Invalid Student ID")
        return {"success": True, "userId": req.userId, "role": "student"}
    elif req.role == "professor":
        prof = await db.pool.fetchrow("SELECT * FROM Professor_Profile WHERE employee_id = $1", req.userId)
        if not prof:
            raise HTTPException(status_code=401, detail="Invalid Professor ID")
        return {"success": True, "userId": req.userId, "role": "professor"}
    elif req.role == "admin":
        if req.userId != "admin": # hardcoded admin for simplicity
            raise HTTPException(status_code=401, detail="Invalid Admin credentials")
        return {"success": True, "userId": "admin", "role": "admin"}
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

@app.get("/api/courses/available")
async def get_available_courses(student_id: str):
    # Parse roll_no e.g. CSE2021045 -> dept 'CSE', year '2021'
    match = re.match(r"^([A-Z]+)(\d{4})", student_id.upper())
    dept = match.group(1) if match else "ALL"
    year = int(match.group(2)) if match else None

    # Fetch courses checking access constraint
    query = """
    SELECT cs.section_id AS id, c.course_code AS code, c.course_name AS name,
           p.name AS instructor, cs.capacity as seats, c.credits as credits,
           c.department_id as department, c.course_type as type,
           COALESCE(t.day_of_week || ' ' || t.start_time || '-' || t.end_time, 'TBD') AS schedule
    FROM Course_Section cs
    JOIN Course c ON cs.course_code = c.course_code
    JOIN Professor_Profile p ON cs.primary_professor_id = p.employee_id
    LEFT JOIN Timetable_Slot t ON cs.section_id = t.section_id
    WHERE NOT EXISTS (
        SELECT 1 FROM Course_Access_Constraint cac 
        WHERE cac.course_code = c.course_code
        AND (
            (cac.allowed_department IS NOT NULL AND cac.allowed_department != 'ALL' AND cac.allowed_department != $1) OR
            (cac.allowed_batch_year IS NOT NULL AND cac.allowed_batch_year != $2) OR
            (cac.allowed_roll_no_prefix IS NOT NULL AND $3 NOT LIKE cac.allowed_roll_no_prefix || '%')
        )
    )
    """
    records = await db.pool.fetch(query, dept, year, student_id)
    
    counts = await db.pool.fetch("SELECT section_id, COUNT(*) as reg FROM Enrollment WHERE enrollment_status='Active' GROUP BY section_id")
    reg_counts = {r['section_id']: r['reg'] for r in counts}
    
    out = []
    for r in records:
        out.append({
            "id": r['id'], "code": r['code'], "name": r['name'],
            "instructor": r['instructor'], "schedule": r['schedule'],
            "credits": r['credits'], "type": r['type'], "mode": "graded",
            "seats": r['seats'], "registered": reg_counts.get(r['id'], 0),
            "department": r['department'], "semester": 6
        })
    return {"courses": out}

@app.get("/api/courses/registered")
async def get_registered_courses(student_id: str):
    query = "SELECT section_id FROM Enrollment WHERE roll_no = $1 AND enrollment_status = 'Active'"
    records = await db.pool.fetch(query, student_id)
    locked = await db.pool.fetchval("SELECT registration_locked FROM Student_Profile WHERE roll_no = $1", student_id)
    return {
        "registeredCourseIds": [r['section_id'] for r in records],
        "locked": bool(locked)
    }

class AutoEnrollRequest(BaseModel):
    student_id: str

@app.post("/api/courses/auto_enroll_core")
async def auto_enroll_core(req: AutoEnrollRequest):
    match = re.match(r"^([A-Z]+)(\d{4})", req.student_id.upper())
    dept = match.group(1) if match else "ALL"
    year = int(match.group(2)) if match else None

    # Fetch all Core sections available to this exact student constraint
    query = """
    SELECT cs.section_id
    FROM Course_Section cs
    JOIN Course c ON cs.course_code = c.course_code
    WHERE c.course_type = 'Core'
    AND NOT EXISTS (
        SELECT 1 FROM Course_Access_Constraint cac 
        WHERE cac.course_code = c.course_code
        AND (
            (cac.allowed_department IS NOT NULL AND cac.allowed_department != 'ALL' AND cac.allowed_department != $1) OR
            (cac.allowed_batch_year IS NOT NULL AND cac.allowed_batch_year != $2) OR
            (cac.allowed_roll_no_prefix IS NOT NULL AND $3 NOT LIKE cac.allowed_roll_no_prefix || '%')
        )
    )
    """
    sections = await db.pool.fetch(query, dept, year, req.student_id)
    
    # Bulk insert natively
    for s in sections:
        await db.pool.execute("""
            INSERT INTO Enrollment (roll_no, section_id, enrollment_status)
            VALUES ($1, $2, 'Active')
            ON CONFLICT DO NOTHING
        """, req.student_id, s['section_id'])
    
    return {"success": True}

class RegisterRequest(BaseModel):
    student_id: str
    section_id: str

@app.post("/api/courses/register")
async def register_course(req: RegisterRequest):
    # 0. Check Lock Security
    is_locked = await db.pool.fetchval("SELECT registration_locked FROM Student_Profile WHERE roll_no = $1", req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")

    # 1. Capacity Check
    cap = await db.pool.fetchval("SELECT capacity FROM Course_Section WHERE section_id = $1", req.section_id)
    reg = await db.pool.fetchval("SELECT COUNT(*) FROM Enrollment WHERE section_id = $1 AND enrollment_status = 'Active'", req.section_id)
    if reg and cap and reg >= cap:
        raise HTTPException(status_code=400, detail="Capacity Full! You missed the slot.")

    # Get course details
    req_course = await db.pool.fetchrow("""
        SELECT c.course_code, c.course_type, c.credits 
        FROM Course_Section cs JOIN Course c ON cs.course_code = c.course_code 
        WHERE cs.section_id = $1
    """, req.section_id)
    
    course_code = req_course['course_code']

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
        completed = await db.pool.fetch("""
            SELECT c.course_code FROM Enrollment e 
            JOIN Course_Section cs ON e.section_id = cs.section_id
            JOIN Course c ON cs.course_code = c.course_code
            WHERE e.roll_no = $1 AND e.enrollment_status = 'Completed'
        """, req.student_id)
        
        completed_codes = {r['course_code'] for r in completed}
        for p in prereqs:
            if p['code'] not in completed_codes:
                raise HTTPException(status_code=400, detail=f"Prerequisite DAG constraint failed: Missing {p['code']}")

    # 3. Timetable slot clash validation
    target_slots = await db.pool.fetch("SELECT day_of_week, start_time, end_time FROM Timetable_Slot WHERE section_id = $1", req.section_id)
    active_slots = await db.pool.fetch("""
        SELECT t.day_of_week, t.start_time, t.end_time, cs.course_code 
        FROM Enrollment e
        JOIN Timetable_Slot t ON e.section_id = t.section_id
        JOIN Course_Section cs ON t.section_id = cs.section_id
        WHERE e.roll_no = $1 AND e.enrollment_status = 'Active'
    """, req.student_id)

    for ts in target_slots:
        for asc in active_slots:
            if ts['day_of_week'] == asc['day_of_week']:
                if max(ts['start_time'], asc['start_time']) < min(ts['end_time'], asc['end_time']):
                    raise HTTPException(status_code=400, detail=f"Timetable Clash! Overlaps with {asc['course_code']} on {ts['day_of_week']}")

    # 4. Credit constraints based on Semester Structure
    # Assuming semester 6 for CSE2021045
    struct = await db.pool.fetchrow("SELECT core_credits_required, dept_elective_credits_required, inst_elective_credits_required FROM Semester_Structure WHERE department_id = 'CSE' AND semester_code = 6")
    if struct:
        reg_courses_active = await db.pool.fetch("""
            SELECT c.course_type, SUM(c.credits) as sum_cr 
            FROM Enrollment e JOIN Course_Section cs on e.section_id = cs.section_id
            JOIN Course c on cs.course_code = c.course_code
            WHERE e.roll_no = $1 AND e.enrollment_status = 'Active'
            GROUP BY c.course_type
        """, req.student_id)
        
        sums = {r['course_type']: r['sum_cr'] for r in reg_courses_active}
        ctype = req_course['course_type']
        
        current_type_cr = sums.get(ctype, 0)
        proposed_cr = current_type_cr + req_course['credits']
        
        if ctype == 'Core' and proposed_cr > struct['core_credits_required']:
             raise HTTPException(status_code=400, detail=f"Exceeds Core Credits limit ({struct['core_credits_required']} cr)")
        elif ctype == 'Department Elective' and proposed_cr > struct['dept_elective_credits_required']:
             raise HTTPException(status_code=400, detail=f"Exceeds Dept Elective limit ({struct['dept_elective_credits_required']} cr)")
        elif ctype == 'Institute Elective' and proposed_cr > struct['inst_elective_credits_required']:
             raise HTTPException(status_code=400, detail=f"Exceeds Inst Elective limit ({struct['inst_elective_credits_required']} cr)")

    # Execute insert natively
    try:
        await db.pool.execute("CALL sp_Register_Course($1, $2)", req.student_id, req.section_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DropRequest(BaseModel):
    student_id: str
    section_id: str

@app.delete("/api/courses/drop")
async def drop_course(req: DropRequest):
    is_locked = await db.pool.fetchval("SELECT registration_locked FROM Student_Profile WHERE roll_no = $1", req.student_id)
    if is_locked:
        raise HTTPException(status_code=400, detail="Registration is locked!")
    await db.pool.execute("DELETE FROM Enrollment WHERE roll_no = $1 AND section_id = $2", req.student_id, req.section_id)
    return {"success": True}

class LockRequest(BaseModel):
    student_id: str

@app.post("/api/courses/lock")
async def lock_registration(req: LockRequest):
    # 1. Check if already locked
    is_locked = await db.pool.fetchval("SELECT registration_locked FROM Student_Profile WHERE roll_no = $1", req.student_id)
    if is_locked:
        return {"success": True}

    # 2. Fetch the target Department Elective constraints
    match = re.match(r"^([A-Z]+)(\d{4})", req.student_id.upper())
    dept = match.group(1) if match else "ALL"
    
    struct = await db.pool.fetchrow("SELECT dept_elective_credits_required FROM Semester_Structure WHERE department_id = $1 AND semester_code = 6", dept)
    tgt_dept = struct['dept_elective_credits_required'] if struct else 0

    # 3. Pull active Dept Electives dynamically
    dept_electives = await db.pool.fetch("""
        SELECT c.credits FROM Enrollment e 
        JOIN Course_Section cs ON e.section_id = cs.section_id
        JOIN Course c ON cs.course_code = c.course_code 
        WHERE e.roll_no = $1 AND e.enrollment_status = 'Active' AND c.course_type = 'Department Elective'
    """, req.student_id)
    
    credits_array = [r['credits'] for r in dept_electives]
    
    # NP-Hard Constraint Subsumption Partition Check (Python Layer)
    if tgt_dept > 0 and len(credits_array) > 0:
        total_sum = sum(credits_array)
        if total_sum % tgt_dept != 0:
            raise HTTPException(status_code=400, detail=f"Cannot Lock! Your Department Electives sum ({total_sum}) is not a multiple of the strict target ({tgt_dept}).")
        
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
            raise HTTPException(status_code=400, detail=f"Cannot Lock! Your selected Department Electives cannot partition linearly into target structures of {tgt_dept} cr.")
            
    elif tgt_dept > 0 and len(credits_array) == 0:
         raise HTTPException(status_code=400, detail="Cannot Lock! You must select Department Electives before locking.")

    # Apply rigid lock explicitly
    await db.pool.execute("UPDATE Student_Profile SET registration_locked = TRUE WHERE roll_no = $1", req.student_id)
    return {"success": True}

# --- ADMIN INFRASTRUCTURE API ---
from datetime import date

# Departments
@app.get("/api/admin/departments")
async def get_departments():
    records = await db.pool.fetch("SELECT department_id, dept_name FROM Department")
    return {"departments": [dict(r) for r in records]}

class DeptDef(BaseModel):
    department_id: str
    dept_name: str

@app.post("/api/admin/departments")
async def create_department(req: DeptDef):
    await db.pool.execute("INSERT INTO Department (department_id, dept_name) VALUES ($1, $2) ON CONFLICT DO NOTHING", req.department_id, req.dept_name)
    return {"success": True}

# Terms
@app.get("/api/admin/terms")
async def get_terms():
    records = await db.pool.fetch("SELECT term_id, term_name FROM Academic_Term")
    return {"terms": [dict(r) for r in records]}

class TermDef(BaseModel):
    term_id: str
    term_name: str
    start_date: date
    end_date: date

@app.post("/api/admin/terms")
async def create_term(req: TermDef):
    await db.pool.execute("INSERT INTO Academic_Term (term_id, term_name, start_date, end_date) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", 
                          req.term_id, req.term_name, req.start_date, req.end_date)
    return {"success": True}

# Venues
@app.get("/api/admin/venues")
async def get_venues():
    records = await db.pool.fetch("SELECT venue_id, building_name, room_number, capacity FROM Facility")
    return {"venues": [dict(r) for r in records]}

class VenueDef(BaseModel):
    venue_id: str
    building_name: str
    room_number: str
    capacity: int

@app.post("/api/admin/venues")
async def create_venue(req: VenueDef):
    await db.pool.execute("INSERT INTO Facility (venue_id, building_name, room_number, capacity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", 
                          req.venue_id, req.building_name, req.room_number, req.capacity)
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
    records = await db.pool.fetch("SELECT program_id, program_name, department_id FROM Program")
    return {"programs": [dict(r) for r in records]}

@app.post("/api/admin/programs")
async def create_program(req: ProgramDef):
    try:
        await db.pool.execute("INSERT INTO Program (program_id, program_name, specialization, department_id, total_credits_required) VALUES ($1, $2, $3, $4, $5)", req.program_id, req.program_name, req.specialization, req.department_id, req.total_credits)
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
        await db.pool.execute("INSERT INTO Professor_Profile (employee_id, name, email, department_id, designation) VALUES ($1, $2, $3, $4, $5)", req.employee_id, req.name, req.email, req.department_id, req.designation)
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
        await db.pool.execute("INSERT INTO Student_Profile (roll_no, name, email, program_id, batch_year) VALUES ($1, $2, $3, $4, $5)", req.roll_no, req.name, req.email, req.program_id, req.batch_year)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/student/profile")
async def get_student_profile(roll_no: str):
    record = await db.pool.fetchrow("""
        SELECT sp.roll_no, sp.name, sp.email, sp.batch_year,
               sp.credits_obtained, sp.credits_registered,
               p.program_id, p.program_name, p.specialization, p.total_credits_required,
               d.department_id, d.dept_name
        FROM Student_Profile sp
        JOIN Program p ON sp.program_id = p.program_id
        JOIN Department d ON p.department_id = d.department_id
        WHERE sp.roll_no = $1
    """, roll_no)
    if not record:
        raise HTTPException(status_code=404, detail="Student not found")
    data = dict(record)
    # Cast Decimal to float so JSON serialization is clean
    data["credits_obtained"] = float(data["credits_obtained"] or 0)
    data["credits_registered"] = float(data["credits_registered"] or 0)
    return data

# --- ADMIN API ---
@app.get("/api/admin/term_sections")
async def get_term_sections(term_id: str):
    records = await db.pool.fetch("""
        SELECT cs.section_id, c.course_code, c.course_name, c.credits, c.course_type, c.ltp, c.department_id
        FROM Course_Section cs
        JOIN Course c ON cs.course_code = c.course_code
        WHERE cs.term_id = $1
    """, term_id)
    
    # Fetch prerequisites for all courses
    prereqs = await db.pool.fetch(
        "SELECT course_code, prerequisite_course_code FROM Course_Prerequisite"
    )
    prereq_map = {}
    for p in prereqs:
        if p['course_code'] not in prereq_map:
            prereq_map[p['course_code']] = []
        prereq_map[p['course_code']].append(p['prerequisite_course_code'])
    
    sections = []
    for r in records:
        sec = dict(r)
        sec['prerequisites'] = prereq_map.get(sec['course_code'], [])
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
    common_branches: list[str] = []  # e.g., ["EE2021", "ME2021"] for cross-branch courses

@app.post("/api/admin/publish_semester")
async def publish_semester(req: PublishSemesterDef):
    # 1. Write Structure
    await db.pool.execute("""
        INSERT INTO Semester_Structure (term_id, department_id, semester_code, core_credits_required, dept_elective_credits_required, inst_elective_credits_required)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (term_id, department_id, semester_code) DO UPDATE SET
        core_credits_required = EXCLUDED.core_credits_required,
        dept_elective_credits_required = EXCLUDED.dept_elective_credits_required,
        inst_elective_credits_required = EXCLUDED.inst_elective_credits_required
    """, req.term_id, req.department_id, req.semester_code, req.core_credits, req.dept_elective_credits, req.inst_elective_credits)

    # 2. Assign Course Constraints for primary branch + common branches
    batch_prefix = f"{req.department_id.upper()}{req.batch_year}"
    all_branches = [batch_prefix] + req.common_branches
    
    # Grab the course codes belonging to the sections
    if not req.section_ids:
        return {"success": True}
        
    codes_records = await db.pool.fetch("""
        SELECT DISTINCT course_code FROM Course_Section
        WHERE section_id = ANY($1::varchar[])
    """, req.section_ids)
    
    codes = [r['course_code'] for r in codes_records]
    
    # For idempotency, clear existing constraints for all these branches
    for branch in all_branches:
        await db.pool.execute("DELETE FROM Course_Access_Constraint WHERE allowed_roll_no_prefix = $1", branch)

    # Insert constraints for each branch
    for branch in all_branches:
        # Unlock all active registrations for this branch batch so they can adjust
        await db.pool.execute("UPDATE Student_Profile SET registration_locked = FALSE WHERE roll_no LIKE $1 || '%'", branch)
        
        for code in codes:
            await db.pool.execute("""
                INSERT INTO Course_Access_Constraint (course_code, allowed_roll_no_prefix)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            """, code, branch)

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
    await db.pool.execute("""
        INSERT INTO Course (course_code, course_name, credits, department_id, course_type, ltp, semester_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
    """, req.course_code, req.course_name, req.credits, req.department_id, req.course_type, req.ltp, req.semester_code)
    return {"success": True}

@app.get("/api/admin/prerequisites")
async def get_prerequisites(course_code: str):
    records = await db.pool.fetch(
        "SELECT prerequisite_course_code FROM Course_Prerequisite WHERE course_code = $1",
        course_code
    )
    return {"prerequisites": [r['prerequisite_course_code'] for r in records]}

class PrerequisiteDef(BaseModel):
    course_code: str
    prerequisite_course_code: str

@app.post("/api/admin/prerequisites")
async def add_prerequisite(req: PrerequisiteDef):
    if req.course_code == req.prerequisite_course_code:
        raise HTTPException(status_code=400, detail="A course cannot be a prerequisite of itself.")

    # Check for Circular Dependency DAG property
    # If req.prerequisite_course_code implicitly depends on req.course_code anywhere down the tree:
    cycle_query = """
    WITH RECURSIVE Prereq_CTE AS (
        SELECT prerequisite_course_code AS code 
        FROM Course_Prerequisite 
        WHERE course_code = $1
        UNION
        SELECT cp.prerequisite_course_code 
        FROM Course_Prerequisite cp
        INNER JOIN Prereq_CTE p ON cp.course_code = p.code
    )
    SELECT code FROM Prereq_CTE WHERE code = $2;
    """
    cycle = await db.pool.fetchval(cycle_query, req.prerequisite_course_code, req.course_code)
    
    if cycle:
        raise HTTPException(status_code=400, detail=f"Circular dependency block! Course {req.prerequisite_course_code} inherently depends on {req.course_code} downwards in its tree.")

    try:
        await db.pool.execute(
            "INSERT INTO Course_Prerequisite (course_code, prerequisite_course_code) VALUES ($1, $2)",
            req.course_code, req.prerequisite_course_code
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/admin/prerequisites")
async def remove_prerequisite(course_code: str, prerequisite_course_code: str):
    await db.pool.execute(
        "DELETE FROM Course_Prerequisite WHERE course_code = $1 AND prerequisite_course_code = $2",
        course_code, prerequisite_course_code
    )
    return {"success": True}

@app.get("/api/professors/all")
async def get_all_professors():
    records = await db.pool.fetch("SELECT employee_id, name FROM Professor_Profile")
    return {"professors": [dict(r) for r in records]}

@app.get("/api/courses/all")
async def get_all_courses():
    records = await db.pool.fetch("SELECT course_code, course_name FROM Course")
    return {"courses": [dict(r) for r in records]}

@app.get("/api/venues/all")
async def get_all_venues():
    records = await db.pool.fetch("SELECT venue_id, building_name, room_number, capacity FROM Facility ORDER BY venue_id")
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
        raise HTTPException(status_code=400, detail=f"Section capacity ({req.capacity}) exceeds venue capacity ({venue_capacity})")
    
    await db.pool.execute("""
        INSERT INTO Course_Section (section_id, course_code, term_id, section_name, primary_professor_id, capacity)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, section_id, req.course_code, req.term_id, req.section_name, req.primary_professor_id, req.capacity)
    
    return {"success": True, "section_id": section_id, "capacity": req.capacity, "venue_capacity": venue_capacity}

class TimetableSlotDef(BaseModel):
    slot_id: str
    section_id: str
    venue_id: str
    day_of_week: str
    start_time: str
    end_time: str

@app.post("/api/admin/timetable_slots")
async def create_timetable_slot(req: TimetableSlotDef):
    await db.pool.execute("""
        INSERT INTO Timetable_Slot (slot_id, section_id, venue_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5::time, $6::time)
    """, req.slot_id, req.section_id, req.venue_id, req.day_of_week, req.start_time, req.end_time)
    return {"success": True}

# --- PROFESSOR API ---

@app.get("/api/prof/my_sections")
async def get_prof_sections(prof_id: str):
    records = await db.pool.fetch("""
        SELECT cs.section_id, c.course_code, c.course_name, c.ltp, cs.additional_info
        FROM Course_Section cs
        JOIN Course c ON cs.course_code = c.course_code
        WHERE cs.primary_professor_id = $1
    """, prof_id)
    return {"sections": [dict(r) for r in records]}

class SectionInfoDef(BaseModel):
    section_id: str
    additional_info: str

@app.put("/api/prof/section_info")
async def update_section_info(req: SectionInfoDef):
    await db.pool.execute("""
        UPDATE Course_Section SET additional_info = $1 WHERE section_id = $2
    """, req.additional_info, req.section_id)
    return {"success": True}
