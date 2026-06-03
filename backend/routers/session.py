import uuid
from fastapi import APIRouter, HTTPException
from models.database import get_db, write_transaction
from models.schemas import CreateSessionRequest, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("")
async def create_session(req: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    with write_transaction() as conn:
        conn.execute(
            "INSERT INTO sessions (id, candidate_name, candidate_email, status) VALUES (?, ?, ?, ?)",
            [session_id, req.candidate_name, req.candidate_email, "created"],
        )
    return {"session_id": session_id}


@router.get("")
async def list_sessions():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, candidate_name, candidate_email, created_at, status, total_score FROM sessions ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/verify-token")
async def verify_token(token: str):
    """验证token是否有效"""
    conn = get_db()
    row = conn.execute(
        "SELECT id, candidate_name, candidate_email, token_used, status FROM sessions WHERE token=?",
        [token],
    ).fetchone()

    if not row:
        return {"valid": False, "error": "链接无效或已过期"}

    if row["token_used"]:
        return {"valid": False, "error": "此链接已使用过"}

    return {
        "valid": True,
        "session_id": row["id"],
        "candidate_name": row["candidate_name"],
    }


@router.post("/activate-token")
async def activate_token(token: str):
    """激活token，标记为已使用，开始考试"""
    conn = get_db()
    row = conn.execute(
        "SELECT id, candidate_name, token_used FROM sessions WHERE token=?",
        [token],
    ).fetchone()

    if not row:
        raise HTTPException(404, "链接无效")
    if row["token_used"]:
        raise HTTPException(400, "链接已使用，如需重试请联系管理员")

    with write_transaction() as wc:
        wc.execute(
            "UPDATE sessions SET token_used=1, status='phase1', phase1_start_at=CURRENT_TIMESTAMP WHERE token=?",
            [token],
        )

    return {
        "session_id": row["id"],
        "candidate_name": row["candidate_name"],
    }


@router.get("/{session_id}")
async def get_session(session_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return dict(row)
