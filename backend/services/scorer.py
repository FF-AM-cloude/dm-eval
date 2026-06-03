import json
import time
from datetime import datetime
from models.database import get_db, write_transaction
from services.ai_reviewer import review_code_quality


async def score_session(session_id: str) -> dict:
    conn = get_db()
    report = {}
    session = conn.execute("SELECT * FROM sessions WHERE id=?", [session_id]).fetchone()
    if not session:
        return {"error": "session not found"}

    # ========== 维度1：编程基本功 ==========
    answers = conn.execute(
        "SELECT * FROM quiz_answers WHERE session_id=?", [session_id]
    ).fetchall()

    if not answers:
        return {"error": "no quiz answers found"}

    correct_count = sum(1 for a in answers if a["correct"])
    total_count = len(answers)
    avg_time_ms = sum(a["time_spent_ms"] for a in answers) / total_count

    base_score = (correct_count / total_count) * 100
    if avg_time_ms <= 10000:
        speed_mult = 1.3
    elif avg_time_ms <= 15000:
        speed_mult = 1.2
    elif avg_time_ms <= 20000:
        speed_mult = 1.1
    else:
        speed_mult = 1.0
    fundamentals_score = min(100, base_score * speed_mult)

    report["fundamentals"] = {
        "score": round(fundamentals_score, 1),
        "correct": correct_count,
        "total": total_count,
        "avg_time_ms": int(avg_time_ms),
        "speed_multiplier": speed_mult,
    }

    if fundamentals_score < 40:
        report["eliminated"] = True
        report["elimination_reason"] = "基本功分数低于门槛（40分）"
        report["total_score"] = round(fundamentals_score * 0.2, 1)
        _save_report(session_id, report)
        return report

    # ========== 维度2：AI杠杆力 ==========
    ai_calls = conn.execute(
        "SELECT * FROM ai_calls WHERE session_id=? ORDER BY created_at", [session_id]
    ).fetchall()

    nav_score = 0
    nav_time_sec = 0
    if ai_calls and session["phase2_start_at"]:
        try:
            p2_start = datetime.fromisoformat(session["phase2_start_at"])
            first_success = None
            for c in ai_calls:
                if c["success"]:
                    first_success = datetime.fromisoformat(c["created_at"])
                    break
            if first_success:
                nav_time_sec = (first_success - p2_start).total_seconds()
                if nav_time_sec <= 120:
                    nav_score = 100
                elif nav_time_sec <= 300:
                    nav_score = 80
                elif nav_time_sec <= 600:
                    nav_score = 60
                else:
                    nav_score = 40
        except:
            nav_score = 50

    decomp_score = 50
    if ai_calls:
        first_prompt = ai_calls[0]["prompt"]
        decomp_score = await _review_prompt_quality_llm(first_prompt)

    total_prompts = len(ai_calls)
    effective_prompts = 0
    if ai_calls:
        events = conn.execute(
            "SELECT * FROM event_log WHERE session_id=? AND phase=2 ORDER BY timestamp_ms",
            [session_id]
        ).fetchall()
        code_change_times = [e["timestamp_ms"] for e in events if e["event_type"] in ("code_change", "code_snapshot")]

        for c in ai_calls:
            call_time_ms = int(datetime.fromisoformat(c["created_at"]).timestamp() * 1000)
            has_effect = any(
                call_time_ms < ct < call_time_ms + 120000
                for ct in code_change_times
            )
            if has_effect:
                effective_prompts += 1

    efficiency = (effective_prompts / total_prompts * 100) if total_prompts > 0 else 0

    critical_score = await _check_trap_detection(session_id)

    providers_used = set(c["provider"] for c in ai_calls) if ai_calls else set()
    switch_bonus = 10 if len(providers_used) > 1 else 0

    ai_leverage_score = (
        nav_score * 0.15 +
        decomp_score * 0.25 +
        efficiency * 0.20 +
        critical_score * 0.35 +
        switch_bonus * 0.05
    )

    report["ai_leverage"] = {
        "score": round(ai_leverage_score, 1),
        "nav_time_sec": round(nav_time_sec, 1),
        "nav_score": nav_score,
        "decomp_score": decomp_score,
        "efficiency": round(efficiency, 1),
        "effective_prompts": effective_prompts,
        "total_prompts": total_prompts,
        "critical_judgment": critical_score > 0,
        "critical_score": critical_score,
        "providers_used": list(providers_used),
    }

    # ========== 维度3：工具链熟练度 ==========
    events = conn.execute(
        "SELECT * FROM event_log WHERE session_id=? AND phase=2 ORDER BY timestamp_ms",
        [session_id]
    ).fetchall()

    git_events = [e for e in events if e["event_type"] == "git_op"]
    git_time = _calc_operation_time(git_events)

    run_events = [e for e in events if e["event_type"] == "code_run"]

    toolchain_score = 70
    if git_events:
        if git_time < 120:
            toolchain_score += 15
        elif git_time < 300:
            toolchain_score += 10
    else:
        toolchain_score -= 20

    if len(run_events) >= 3:
        toolchain_score += 15

    toolchain_score = max(0, min(100, toolchain_score))

    report["toolchain"] = {
        "score": toolchain_score,
        "git_time_sec": round(git_time, 1),
        "git_operations": len(git_events),
        "code_runs": len(run_events),
    }

    # ========== 维度4：工程交付力 ==========
    # 基于git push事件和代码快照评估
    delivery_score = 0

    git_events_delivery = [e for e in events if e["event_type"] == "git_op"]
    code_snapshots = [e for e in events if e["event_type"] == "code_snapshot"]
    seed_copied = any(e["event_type"] == "seed_code_copied" for e in events)
    submission = any(e["event_type"] == "submission" for e in events)

    if submission:
        delivery_score += 30  # 完成了提交流程
    if git_events_delivery:
        delivery_score += 30  # 做了git操作
    if seed_copied:
        delivery_score += 10  # 至少拿到了代码开始做
    if len(code_snapshots) > 0:
        delivery_score += 10  # 有代码改动
    # AI对话中是否讨论了修复方案
    if ai_calls and len(ai_calls) >= 3:
        delivery_score += 20  # 有实质性的AI交互

    delivery_score = min(100, delivery_score)

    report["delivery"] = {
        "score": delivery_score,
        "submitted": submission,
        "git_operations": len(git_events_delivery),
        "code_snapshots": len(code_snapshots),
        "seed_copied": seed_copied,
    }

    # 一票否决改为：没有任何操作
    if not submission and not git_events_delivery and not seed_copied and len(ai_calls) == 0:
        report["eliminated"] = True
        report["elimination_reason"] = "未进行任何实质性操作"
        report["total_score"] = round(fundamentals_score * 0.20, 1)
        _save_report(session_id, report)
        return report

    # ========== 维度5：学习适应力 ==========
    adaptability_score = 50
    spec_opened = None
    first_action = None
    for e in events:
        if e["event_type"] == "spec_opened" and not spec_opened:
            spec_opened = e["timestamp_ms"]
        if e["event_type"] in ("code_change", "code_snapshot", "ai_call") and not first_action:
            first_action = e["timestamp_ms"]

    if spec_opened and first_action:
        comprehension_sec = (first_action - spec_opened) / 1000
        if comprehension_sec < 60:
            adaptability_score = 90
        elif comprehension_sec < 180:
            adaptability_score = 70
        elif comprehension_sec < 300:
            adaptability_score = 50
        else:
            adaptability_score = 30
    else:
        comprehension_sec = 0

    idle_events = [e for e in events if e["event_type"] == "idle_start"]
    if len(idle_events) <= 2:
        adaptability_score = min(100, adaptability_score + 10)
    elif len(idle_events) > 5:
        adaptability_score = max(0, adaptability_score - 10)

    report["adaptability"] = {
        "score": adaptability_score,
        "comprehension_time_sec": round(comprehension_sec, 1),
        "idle_count": len(idle_events),
    }

    # ========== 综合评分 ==========
    total = (
        fundamentals_score * 0.20 +
        ai_leverage_score * 0.30 +
        toolchain_score * 0.15 +
        delivery_score * 0.20 +
        adaptability_score * 0.15
    )

    report["total_score"] = round(total, 1)
    report["eliminated"] = False
    report["coordinates"] = {
        "x": round(fundamentals_score, 1),
        "y": round(ai_leverage_score, 1),
    }

    _save_report(session_id, report)
    return report


async def _review_prompt_quality_llm(prompt_json: str) -> float:
    try:
        messages = json.loads(prompt_json)
        prompt_text = " ".join(m.get("content", "") for m in messages if isinstance(m, dict))

        score = 40
        length = len(prompt_text)
        if 100 < length < 500:
            score += 15
        elif 50 < length <= 100:
            score += 10
        elif length > 2000:
            score -= 10

        if any(kw in prompt_text.lower() for kw in ["step", "首先", "然后", "第一", "1.", "1、"]):
            score += 15
        if any(kw in prompt_text.lower() for kw in ["example", "例如", "格式", "format", "输出"]):
            score += 10
        if any(kw in prompt_text.lower() for kw in ["bug", "修复", "fix", "错误", "问题"]):
            score += 10
        if any(kw in prompt_text.lower() for kw in ["为什么", "why", "原因", "分析"]):
            score += 10

        return max(0, min(100, score))
    except:
        return 30


async def _check_trap_detection(session_id: str) -> float:
    conn = get_db()

    task = conn.execute(
        "SELECT content_json FROM questions WHERE phase=2 AND content_json LIKE ?",
        [f'%"assigned_session":"{session_id}"%']
    ).fetchone()

    if not task:
        return 0

    try:
        task_data = json.loads(task["content_json"])
        trap = task_data.get("trap", {})
        trap_desc = trap.get("description", "").lower()
    except:
        return 0

    ai_calls = conn.execute(
        "SELECT prompt, response FROM ai_calls WHERE session_id=?", [session_id]
    ).fetchall()

    trap_mentioned = False
    for c in ai_calls:
        combined = (c["prompt"] + " " + (c["response"] or "")).lower()
        if any(kw in combined for kw in ["中文日期", "2024年", "march", "特殊格式", "边界", "edge case"]):
            trap_mentioned = True
            break

    code_events = conn.execute(
        "SELECT event_data FROM event_log WHERE session_id=? AND event_type='code_snapshot' ORDER BY timestamp_ms DESC LIMIT 1",
        [session_id]
    ).fetchone()

    trap_in_code = False
    if code_events:
        try:
            code_data = json.loads(code_events["event_data"])
            code = code_data.get("code", "")
            if any(kw in code for kw in ["年", "月", "日", "March", "strptime", "dateparser", "parse"]):
                trap_in_code = True
        except:
            pass

    if trap_mentioned and trap_in_code:
        return 100
    elif trap_in_code:
        return 70
    elif trap_mentioned:
        return 40
    else:
        return 0


def _calc_operation_time(events) -> float:
    if not events:
        return 0
    if len(events) == 1:
        return 0
    first = events[0]["timestamp_ms"]
    last = events[-1]["timestamp_ms"]
    return (last - first) / 1000


def _save_report(session_id: str, report: dict):
    with write_transaction() as conn:
        conn.execute(
            "UPDATE sessions SET total_score=?, phase1_score=?, phase2_score=?, report_json=?, status='scored' WHERE id=?",
            [
                report.get("total_score", 0),
                report.get("fundamentals", {}).get("score", 0),
                report.get("ai_leverage", {}).get("score", 0),
                json.dumps(report, ensure_ascii=False),
                session_id,
            ],
        )
