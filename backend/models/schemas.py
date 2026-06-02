from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class CreateSessionRequest(BaseModel):
    candidate_name: str
    candidate_email: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    candidate_name: str
    candidate_email: Optional[str] = None
    created_at: str
    status: str
    phase1_start_at: Optional[str] = None
    phase1_end_at: Optional[str] = None
    phase2_start_at: Optional[str] = None
    phase2_end_at: Optional[str] = None
    submitted_at: Optional[str] = None
    total_score: Optional[float] = None


class QuizAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str
    time_spent_ms: int


class EventLogRequest(BaseModel):
    session_id: str
    phase: int
    event_type: str
    event_data: Any
    timestamp_ms: int


class AIChatRequest(BaseModel):
    session_id: str
    provider: str
    model: str
    api_key: str
    base_url: str
    messages: list


class ExecuteRequest(BaseModel):
    session_id: str
    code: str
    language_id: int = 71
    stdin: str = ""


class GitConfig(BaseModel):
    session_id: str
    platform: str
    token: str
    repo_url: str
    branch: str
