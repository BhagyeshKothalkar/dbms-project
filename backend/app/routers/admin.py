from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from database import db
from utils import fetch_course_prerequisite_map

router = APIRouter(prefix="/api/admin")

@router.get("/departments")
async def get_departments():
    records = await db.pool.fetch(
        "SELECT department_id, dept_name FROM Department ORDER BY department_id"
    )
    return {"departments": [dict(r) for r in records]}

class DeptDef(BaseModel):
    department_id: str
    dept_name: str

@router.post("/departments")
async def create_department(req: DeptDef):
    await db.pool.execute(
        "CALL sp_create_department($1, $2)", req.department_id, req.dept_name
    )
    return {"success": True}

@router.get("/terms")
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

@router.post("/terms")
async def create_term(req: TermDef):
    await db.pool.execute(
        "CALL sp_create_term($1, $2, $3, $4)",
        req.term_id,
        req.term_name,
        req.start_date,
        req.end_date,
    )
    return {"success": True}

@router.get("/venues")
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

@router.post("/venues")
async def create_venue(req: VenueDef):
    await db.pool.execute(
        "CALL sp_create_venue($1, $2, $3, $4)",
        req.venue_id,
        req.building_name,
        req.room_number,
        req.capacity,
    )
    return {"success": True}

class ProgramDef(BaseModel):
    program_id: str
    program_name: str
    specialization: str
    department_id: str
    total_credits: int

@router.get("/programs")
async def get_programs():
    records = await db.pool.fetch(
        "SELECT program_id, program_name, department_id FROM Program ORDER BY program_id"
    )
    return {"programs": [dict(r) for r in records]}

@router.post("/programs")
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

@router.post("/professors")
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

@router.post("/students")
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

@router.get("/term_sections")
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

@router.post("/publish_semester")
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

@router.post("/courses")
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

@router.get("/prerequisites")
async def get_prerequisites(course_code: str):
    prereq_map = await fetch_course_prerequisite_map([course_code])
    return {"prerequisites": prereq_map.get(course_code, [])}

class PrerequisiteDef(BaseModel):
    course_code: str
    prerequisite_course_code: str

@router.post("/prerequisites")
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

@router.delete("/prerequisites")
async def remove_prerequisite(course_code: str, prerequisite_course_code: str):
    await db.pool.execute(
        "CALL sp_remove_prerequisite($1, $2)",
        course_code,
        prerequisite_course_code,
    )
    return {"success": True}
