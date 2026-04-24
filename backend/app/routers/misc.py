from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from datetime import time

router = APIRouter(prefix="/api")

@router.get("/professors/all")
async def get_all_professors():
    records = await db.pool.fetch(
        "SELECT employee_id, name FROM Professor_Profile ORDER BY employee_id"
    )
    return {"professors": [dict(r) for r in records]}

@router.get("/courses/all")
async def get_all_courses():
    records = await db.pool.fetch(
        "SELECT course_code, course_name FROM Course ORDER BY course_code"
    )
    return {"courses": [dict(r) for r in records]}

@router.get("/venues/all")
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
    capacity: int

@router.post("/admin/course_sections")
async def create_course_section(req: CourseSectionDef):
    section_id = f"{req.course_code}-{req.section_name}"
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
        req.venue_id,
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

@router.post("/admin/timetable_slots")
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

@router.get("/prof/my_sections")
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

@router.put("/prof/section_info")
async def update_section_info(req: SectionInfoDef):
    await db.pool.execute(
        "CALL sp_update_section_info($1, $2)",
        req.section_id,
        req.additional_info,
    )
    return {"success": True}
