from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_db

app = FastAPI(title="DM-Eval API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


from routers import session, quiz, ai_proxy, submit, events, report

app.include_router(session.router)
app.include_router(quiz.router)
app.include_router(ai_proxy.router)
app.include_router(submit.router)
app.include_router(events.router)
app.include_router(report.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
