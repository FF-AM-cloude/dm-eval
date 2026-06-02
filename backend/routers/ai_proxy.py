import json
import time
import httpx
from fastapi import APIRouter
from models.database import get_db
from models.schemas import AIChatRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat")
async def proxy_ai_call(req: AIChatRequest):
    start_time = time.time()

    headers = {"Authorization": f"Bearer {req.api_key}"}
    payload = {
        "model": req.model,
        "messages": req.messages,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{req.base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=60.0,
            )
        result = resp.json()
        success = 1 if resp.status_code == 200 else 0
    except Exception as e:
        result = {"error": str(e)}
        success = 0

    latency_ms = int((time.time() - start_time) * 1000)

    # 记录到数据库
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO ai_calls (session_id, provider, model, prompt, response, latency_ms, success) VALUES (?,?,?,?,?,?,?)",
            [
                req.session_id,
                req.provider,
                req.model,
                json.dumps(req.messages, ensure_ascii=False),
                json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result),
                latency_ms,
                success,
            ],
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return result
