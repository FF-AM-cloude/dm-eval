import sqlite3
import json
import os

DB_PATH = os.environ.get("DM_EVAL_DB", "dm_eval.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
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
    conn.commit()
    conn.close()
