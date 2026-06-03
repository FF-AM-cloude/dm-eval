import sqlite3
import json
import os
import threading
from contextlib import contextmanager

DB_PATH = os.environ.get("DM_EVAL_DB", "dm_eval.db")

_conn = None
_conn_init_lock = threading.Lock()
_write_lock = threading.Lock()


def get_db():
    """全局单连接，所有线程共享"""
    global _conn
    if _conn is None:
        with _conn_init_lock:
            if _conn is None:
                _conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
                _conn.row_factory = sqlite3.Row
                _conn.execute("PRAGMA journal_mode=WAL")
                _conn.execute("PRAGMA busy_timeout=5000")
                _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


@contextmanager
def write_transaction():
    """写事务上下文管理器：串行化所有写操作"""
    with _write_lock:
        conn = get_db()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def init_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            candidate_name TEXT NOT NULL,
            candidate_email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            phase1_start_at TIMESTAMP,
            phase1_end_at TIMESTAMP,
            phase2_start_at TIMESTAMP,
            phase2_end_at TIMESTAMP,
            submitted_at TIMESTAMP,
            status TEXT DEFAULT 'created',
            phase1_score REAL,
            phase2_score REAL,
            total_score REAL,
            report_json TEXT
        );

        CREATE TABLE IF NOT EXISTS quiz_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            answer TEXT,
            correct INTEGER,
            time_spent_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS event_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            phase INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_data TEXT,
            timestamp_ms BIGINT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS ai_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT,
            prompt TEXT NOT NULL,
            response TEXT,
            tokens_used INTEGER,
            latency_ms INTEGER,
            success INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            phase INTEGER NOT NULL,
            category TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            content_json TEXT NOT NULL,
            correct_answer TEXT,
            answer_count INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            avg_time_ms INTEGER,
            discrimination REAL
        );
    """)
    # migration: add token columns if not exist
    for col in ["token TEXT", "token_used INTEGER DEFAULT 0"]:
        try:
            conn.execute(f"ALTER TABLE sessions ADD COLUMN {col}")
        except:
            pass
    conn.commit()
    conn.close()
