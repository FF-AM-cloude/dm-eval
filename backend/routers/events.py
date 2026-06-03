from typing import List
from fastapi import APIRouter
from models.database import write_transaction
from models.schemas import EventLogRequest

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("")
async def log_event(req: EventLogRequest):
    with write_transaction() as conn:
        conn.execute(
            "INSERT INTO event_log (session_id, phase, event_type, event_data, timestamp_ms) VALUES (?,?,?,?,?)",
            [req.session_id, req.phase, req.event_type,
             req.event_data if isinstance(req.event_data, str) else str(req.event_data),
             req.timestamp_ms],
        )
    return {"status": "ok"}


@router.post("/batch")
async def batch_log_events(events: List[EventLogRequest]):
    with write_transaction() as conn:
        for e in events:
            conn.execute(
                "INSERT INTO event_log (session_id, phase, event_type, event_data, timestamp_ms) VALUES (?,?,?,?,?)",
                [e.session_id, e.phase, e.event_type,
                 e.event_data if isinstance(e.event_data, str) else str(e.event_data),
                 e.timestamp_ms],
            )
    return {"status": "ok", "count": len(events)}
