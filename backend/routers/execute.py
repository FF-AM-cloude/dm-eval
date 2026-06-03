import httpx
from fastapi import APIRouter, HTTPException
from models.schemas import ExecuteRequest
from models.database import get_db, write_transaction

JUDGE0_URL = "http://localhost:2358"

router = APIRouter(prefix="/api/execute", tags=["execute"])


@router.post("")
async def execute_code(req: ExecuteRequest):
    payload = {
        "source_code": req.code,
        "language_id": req.language_id,
        "stdin": req.stdin,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{JUDGE0_URL}/submissions?wait=true",
                json=payload,
                timeout=30.0,
            )
        result = resp.json()
    except Exception as e:
        return {
            "status": {"description": "Execution Error"},
            "stdout": "",
            "stderr": f"Judge0 connection failed: {str(e)}",
            "time": "0",
        }

    # 记录事件
    try:
        with write_transaction() as conn:
            conn.execute(
                "INSERT INTO event_log (session_id, phase, event_type, event_data, timestamp_ms) VALUES (?,?,?,?,?)",
                [req.session_id, 2, "code_run", str({
                    "status": result.get("status", {}).get("description"),
                    "time": result.get("time"),
                }), result.get("created_at", 0) * 1000 or 0],
            )
    except Exception:
        pass

    return result
