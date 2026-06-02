import uuid
from fastapi import APIRouter, HTTPException
from models.database import get_db
from models.schemas import CreateSessionRequest, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("")
async def create_session(req: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, candidate_name, candidate_email, status) VALUES (?, ?, ?, ?)",
        [session_id, req.candidate_name, req.candidate_email, "created"],
    )
    conn.commit()
    conn.close()
    return {"session_id": session_id}


@router.get("")
async def list_sessions():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, candidate_name, candidate_email, created_at, status, total_score FROM sessions ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{session_id}")
async def get_session(session_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Session not found")
    return dict(row)
