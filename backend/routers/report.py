import json
import uuid
from fastapi import APIRouter, HTTPException
from models.database import get_db, write_transaction

router = APIRouter(prefix="/api/report", tags=["report"])

ADMIN_PASSWORD = "dm-eval-2026"


@router.get("")
async def list_reports(password: str = ""):
    if password != ADMIN_PASSWORD:
        raise HTTPException(403, "Unauthorized")
    conn = get_db()
    rows = conn.execute(
        "SELECT id, candidate_name, candidate_email, created_at, status, "
        "phase1_score, phase2_score, total_score "
        "FROM sessions ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{session_id}")
async def get_report(session_id: str, password: str = ""):
    if password != ADMIN_PASSWORD:
        raise HTTPException(403, "Unauthorized")
    conn = get_db()
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        raise HTTPException(404, "Session not found")

    result = dict(session)

    answers = conn.execute(
        "SELECT * FROM quiz_answers WHERE session_id=? ORDER BY created_at", [session_id]
    ).fetchall()
    result["quiz_answers"] = [dict(a) for a in answers]

    ai_calls = conn.execute(
        "SELECT id, provider, model, prompt, response, latency_ms, success, created_at "
        "FROM ai_calls WHERE session_id=? ORDER BY created_at", [session_id]
    ).fetchall()
    result["ai_calls"] = [dict(c) for c in ai_calls]

    events = conn.execute(
        "SELECT * FROM event_log WHERE session_id=? ORDER BY timestamp_ms", [session_id]
    ).fetchall()
    result["events"] = [dict(e) for e in events]

    return result


@router.post("/invite")
async def create_invite(
    candidate_name: str,
    candidate_email: str = "",
    password: str = "",
):
    """管理员创建候选人邀请链接"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(403, "Unauthorized")

    token = uuid.uuid4().hex[:12]
    session_id = str(uuid.uuid4())

    with write_transaction() as conn:
        conn.execute(
            "INSERT INTO sessions (id, candidate_name, candidate_email, token, status) VALUES (?,?,?,?,?)",
            [session_id, candidate_name, candidate_email, token, "invited"],
        )

    return {
        "session_id": session_id,
        "token": token,
        "candidate_name": candidate_name,
        "url": f"//?token={token}",
        "message": f"将此链接发给候选人（需在前面加上域名）",
    }


@router.get("/invites")
async def list_invites(password: str = ""):
    """查看所有邀请"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(403, "Unauthorized")
    conn = get_db()
    rows = conn.execute(
        "SELECT id, candidate_name, candidate_email, token, token_used, status, created_at "
        "FROM sessions WHERE token IS NOT NULL ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]
