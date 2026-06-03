import json
import random
from fastapi import APIRouter, HTTPException
from models.database import get_db, write_transaction
from models.schemas import QuizAnswerRequest

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


@router.get("/questions")
async def get_questions(session_id: str):
    """获取第一段题目（随机15-20道，按难度分布）"""
    conn = get_db()
    # 确认session存在
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        raise HTTPException(404, "Session not found")

    # 加载所有题目
    rows = conn.execute("SELECT * FROM questions WHERE phase=1").fetchall()
    if not rows:
        # 如果数据库空，从JSON文件加载
        return await load_questions_from_files(session_id)

    # 按难度分组
    by_diff = {"L1": [], "L2": [], "L3": []}
    for r in rows:
        by_diff[r["difficulty"]].append(dict(r))

    # 按 40% L1 + 40% L2 + 20% L3 采样，总数16-20
    total = min(20, len(rows))
    l1_count = max(1, int(total * 0.4))
    l2_count = max(1, int(total * 0.4))
    l3_count = total - l1_count - l2_count

    selected = []
    selected += random.sample(by_diff["L1"], min(l1_count, len(by_diff["L1"])))
    selected += random.sample(by_diff["L2"], min(l2_count, len(by_diff["L2"])))
    selected += random.sample(by_diff["L3"], min(l3_count, len(by_diff["L3"])))
    random.shuffle(selected)

    # 记录开始时间
    conn.execute(
        "UPDATE sessions SET phase1_start_at=CURRENT_TIMESTAMP, status='phase1' WHERE id=? AND status='created'",
        [session_id],
    )
    conn.commit()

    result = []
    for q in selected:
        content = json.loads(q["content_json"])
        result.append({
            "id": q["id"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "question": content["question"],
            "code": content.get("code", ""),
            "options": content["options"],
            "time_limit_sec": content.get("time_limit_sec", 30),
        })

    return {"questions": result, "total": len(result)}


async def load_questions_from_files(session_id: str):
    """从JSON文件加载题库（首次运行时）"""
    import os
    import glob

    phase1_dir = os.path.join(os.path.dirname(__file__), "..", "question_bank", "phase1")
    all_questions = []

    # 写入操作串行化
    with write_transaction() as conn:
        for fpath in glob.glob(os.path.join(phase1_dir, "*.json")):
            with open(fpath) as f:
                data = json.load(f)
                for q in data:
                    content = {
                        "question": q["question"],
                        "code": q.get("code", ""),
                        "options": q["options"],
                        "time_limit_sec": q.get("time_limit_sec", 30),
                    }
                    conn.execute(
                        "INSERT OR IGNORE INTO questions (id, phase, category, difficulty, content_json, correct_answer) VALUES (?,?,?,?,?,?)",
                        [q["id"], 1, q["category"], q["difficulty"], json.dumps(content, ensure_ascii=False), q["correct"]],
                    )
                    all_questions.append(q)

        conn.execute(
            "UPDATE sessions SET phase1_start_at=CURRENT_TIMESTAMP, status='phase1' WHERE id=? AND status='created'",
            [session_id],
        )

    # 重新查询（只读）
    conn = get_db()
    rows = conn.execute("SELECT * FROM questions WHERE phase=1").fetchall()
    by_diff = {"L1": [], "L2": [], "L3": []}
    for r in rows:
        by_diff[r["difficulty"]].append(dict(r))

    total = min(20, len(rows))
    l1_count = max(1, int(total * 0.4))
    l2_count = max(1, int(total * 0.4))
    l3_count = total - l1_count - l2_count

    selected = []
    selected += random.sample(by_diff["L1"], min(l1_count, len(by_diff["L1"])))
    selected += random.sample(by_diff["L2"], min(l2_count, len(by_diff["L2"])))
    selected += random.sample(by_diff["L3"], min(l3_count, len(by_diff["L3"])))
    random.shuffle(selected)

    result = []
    for q in selected:
        content = json.loads(q["content_json"])
        result.append({
            "id": q["id"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "question": content["question"],
            "code": content.get("code", ""),
            "options": content["options"],
            "time_limit_sec": content.get("time_limit_sec", 30),
        })

    return {"questions": result, "total": len(result)}


@router.post("/answer")
async def submit_answer(req: QuizAnswerRequest):
    # 获取正确答案（只读）
    conn = get_db()
    q = conn.execute("SELECT * FROM questions WHERE id=?", [req.question_id]).fetchone()
    if not q:
        raise HTTPException(404, "Question not found")

    correct_answer = int(q["correct_answer"])
    is_correct = 1 if int(req.answer) == correct_answer else 0

    content = json.loads(q["content_json"])
    time_limit = content.get("time_limit_sec", 30)
    time_spent = min(req.time_spent_ms, time_limit * 1000)

    # 写入操作串行化
    with write_transaction() as wc:
        wc.execute(
            "INSERT INTO quiz_answers (session_id, question_id, answer, correct, time_spent_ms) VALUES (?,?,?,?,?)",
            [req.session_id, req.question_id, req.answer, is_correct, time_spent],
        )
        wc.execute(
            "UPDATE questions SET answer_count=answer_count+1, correct_count=correct_count+?, avg_time_ms=CASE WHEN answer_count=0 THEN ? ELSE (avg_time_ms*answer_count+?)/(answer_count+1) END WHERE id=?",
            [is_correct, time_spent, time_spent, req.question_id],
        )

    return {"correct": is_correct, "correct_answer": correct_answer}


@router.get("/phase2-task")
async def get_phase2_task(session_id: str):
    """分配一个随机Phase2任务并返回spec"""
    import os
    import glob

    # 检查是否已分配（只读）
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM questions WHERE phase=2 AND content_json LIKE ?",
        [f'%"assigned_session":"{session_id}"%'],
    ).fetchone()
    if row:
        task = json.loads(row["content_json"])
        _load_seed_code(task, os.path.join(os.path.dirname(__file__), "..", "question_bank", "phase2"))
        return task

    # 从JSON文件加载并随机选一个
    phase2_dir = os.path.join(os.path.dirname(__file__), "..", "question_bank", "phase2")
    tasks = []
    for fpath in glob.glob(os.path.join(phase2_dir, "*.json")):
        with open(fpath) as f:
            tasks.append(json.load(f))

    if not tasks:
        raise HTTPException(404, "No tasks available")

    selected = random.choice(tasks)
    selected["assigned_session"] = session_id

    # 加载seed代码
    _load_seed_code(selected, phase2_dir)

    # 写入操作串行化
    content_json = json.dumps(selected, ensure_ascii=False)
    with write_transaction() as wc:
        wc.execute(
            "INSERT OR REPLACE INTO questions (id, phase, category, difficulty, content_json) VALUES (?,?,?,?,?)",
            [selected["id"], 2, "phase2_task", selected.get("difficulty", "medium"), content_json],
        )

    return selected


@router.post("/complete")
async def complete_phase1(session_id: str):
    with write_transaction() as conn:
        conn.execute(
            "UPDATE sessions SET phase1_end_at=CURRENT_TIMESTAMP, status='phase2', phase2_start_at=CURRENT_TIMESTAMP WHERE id=?",
            [session_id],
        )
    return {"status": "phase2"}


def _load_seed_code(task: dict, phase2_dir: str):
    """如果任务有seed_code_file字段，加载种子代码到task中"""
    import os
    if "seed_code_file" in task:
        seed_path = os.path.join(phase2_dir, task["seed_code_file"])
        if os.path.exists(seed_path):
            with open(seed_path) as f:
                task["seed_code"] = f.read()
