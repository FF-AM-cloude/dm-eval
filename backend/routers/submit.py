import json
import httpx
from fastapi import APIRouter, HTTPException
from models.database import get_db
from models.schemas import GitConfig

router = APIRouter(prefix="/api/submit", tags=["submit"])


@router.post("")
async def submit_session(session_id: str):
    conn = get_db()
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        conn.close()
        raise HTTPException(404, "Session not found")

    conn.execute(
        "UPDATE sessions SET submitted_at=CURRENT_TIMESTAMP, status='submitted' WHERE id=?",
        [session_id],
    )
    conn.commit()

    # 触发自动评分
    from services.scorer import score_session
    report = await score_session(session_id)

    conn.close()
    return {"status": "submitted", "report": report}


@router.post("/git-push")
async def git_push(req: GitConfig):
    from services.github_push import push_to_git
    try:
        result = await push_to_git(
            repo_url=req.repo_url,
            token=req.token,
            branch=req.branch,
            session_id=req.session_id,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
