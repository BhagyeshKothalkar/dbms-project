from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from firebase_admin import auth as fb_auth

router = APIRouter(prefix="/api")

class LoginRequest(BaseModel):
    role: str
    idToken: str

@router.post("/login")
async def login(req: LoginRequest):
    try:
        decoded_token = fb_auth.verify_id_token(req.idToken)
        email = decoded_token.get("email")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")

    if req.role == "student":
        student = await db.pool.fetchrow(
            "SELECT roll_no FROM Student_Profile WHERE email = $1", email
        )
        if not student:
            raise HTTPException(status_code=401, detail="Student email not found in records")
        return {"success": True, "userId": student["roll_no"], "role": "student"}
    elif req.role == "professor":
        prof = await db.pool.fetchrow(
            "SELECT employee_id FROM Professor_Profile WHERE email = $1", email
        )
        if not prof:
            raise HTTPException(status_code=401, detail="Professor email not found in records")
        return {"success": True, "userId": prof["employee_id"], "role": "professor"}
    elif req.role == "admin":
        if email != "admin@example.com":
            raise HTTPException(status_code=401, detail="Invalid Admin credentials")
        return {"success": True, "userId": "admin", "role": "admin"}
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
