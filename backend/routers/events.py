from fastapi import APIRouter, Body
from models.database import get_db, write_transaction

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("")
async def log_event(session_id: str, phase: int, event_type: str, event_data: str, timestamp_ms: int):
    with write_transaction() as conn:
        conn.execute(
            "INSERT INTO event_log (session_id, phase, event_type, event_data, timestamp_ms) VALUES (?,?,?,?,?)",
            [session_id, phase, event_type, event_data, timestamp_ms],
        )
    return {"status": "ok"}


@router.post("/batch")
async def batch_log_events(events: list = Body()):
    with write_transaction() as conn:
        for e in events:
            conn.execute(
                "INSERT INTO event_log (session_id, phase, event_type, event_data, timestamp_ms) VALUES (?,?,?,?,?)",
                [e["session_id"], e["phase"], e["event_type"], e["event_data"], e["timestamp_ms"]],
            )
    return {"status": "ok", "count": len(events)}
