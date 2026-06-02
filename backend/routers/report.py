from fastapi import APIRouter
from models.database import get_db

router = APIRouter(prefix="/api/report", tags=["report"])


@router.get("/{session_id}")
async def get_report(session_id: str):
    conn = get_db()
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        conn.close()
        return {"error": "Session not found"}
    conn.close()
    return dict(session)


@router.get("")
async def list_reports():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, candidate_name, total_score, status, report_json FROM sessions WHERE status IN ('submitted','scored') ORDER BY total_score DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
