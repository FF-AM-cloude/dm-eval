import json
import httpx
from fastapi import APIRouter, HTTPException
from models.database import get_db, write_transaction
from models.schemas import GitConfig

router = APIRouter(prefix="/api/submit", tags=["submit"])


@router.post("")
async def submit_session(session_id: str):
    conn = get_db()
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        raise HTTPException(404, "Session not found")

    with write_transaction() as wc:
        wc.execute(
            "UPDATE sessions SET submitted_at=CURRENT_TIMESTAMP, status='submitted' WHERE id=?",
            [session_id],
        )

    # 触发自动评分
    from services.scorer import score_session
    report = await score_session(session_id)

    return {"status": "submitted", "report": report}


@router.post("/git-push")
async def git_push(req: GitConfig, code: str = ""):
    from services.github_push import push_to_git
    try:
        result = await push_to_git(
            repo_url=req.repo_url,
            token=req.token,
            branch=req.branch,
            session_id=req.session_id,
            code=code,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
