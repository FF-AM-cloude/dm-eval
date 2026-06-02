import json
from models.database import get_db


async def score_session(session_id: str) -> dict:
    conn = get_db()
    report = {}

    # === 维度1：编程基本功 ===
    answers = conn.execute(
        "SELECT * FROM quiz_answers WHERE session_id=?", [session_id]
    ).fetchall()

    if not answers:
        conn.close()
        return {"error": "no answers found"}

    correct_count = sum(1 for a in answers if a["correct"])
    total_count = len(answers)
    avg_time_ms = sum(a["time_spent_ms"] for a in answers) / total_count

    base_score = (correct_count / total_count) * 100
    if avg_time_ms <= 15000:
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
        _save_report(conn, session_id, report)
        conn.close()
        return report

    # === 维度2：AI杠杆力 ===
    ai_calls = conn.execute(
        "SELECT * FROM ai_calls WHERE session_id=?", [session_id]
    ).fetchall()

    if ai_calls:
        nav_score = 80  # 默认中等
        first_prompt = ai_calls[0]["prompt"] if ai_calls else ""
        decomp_score = _review_prompt_quality(first_prompt)
        effective_prompts = sum(1 for c in ai_calls if c["success"])
        efficiency = (effective_prompts / len(ai_calls) * 100) if ai_calls else 0
        providers_used = set(c["provider"] for c in ai_calls)
        switch_bonus = 10 if len(providers_used) > 1 else 0
    else:
        nav_score = 0
        decomp_score = 0
        efficiency = 0
        switch_bonus = 0
        providers_used = set()

    ai_leverage_score = (
        nav_score * 0.15 +
        decomp_score * 0.25 +
        efficiency * 0.20 +
        switch_bonus * 0.05
    )

    report["ai_leverage"] = {
        "score": round(ai_leverage_score, 1),
        "nav_score": nav_score,
        "decomp_score": decomp_score,
        "efficiency": round(efficiency, 1),
        "effective_prompts": effective_prompts if ai_calls else 0,
        "total_prompts": len(ai_calls),
        "providers_used": list(providers_used),
    }

    # === 维度3：工具链（简化版） ===
    report["toolchain"] = {
        "score": 0,
        "git_time_sec": 0,
    }

    # === 维度4：工程交付力 ===
    report["delivery"] = {
        "score": 0,
        "test_pass_rate": 0,
        "code_quality_grade": "N/A",
    }

    # === 维度5：学习适应力 ===
    report["adaptability"] = {
        "score": 0,
        "comprehension_time_sec": 0,
    }

    # === 综合评分 ===
    total = (
        fundamentals_score * 0.20 +
        ai_leverage_score * 0.30 +
        0 * 0.15 +
        0 * 0.20 +
        0 * 0.15
    )

    report["total_score"] = round(total, 1)
    report["eliminated"] = False
    report["coordinates"] = {
        "x": round(fundamentals_score, 1),
        "y": round(ai_leverage_score, 1),
    }

    _save_report(conn, session_id, report)
    conn.close()
    return report


def _review_prompt_quality(prompt_json: str) -> float:
    """简化版prompt质量评估"""
    try:
        messages = json.loads(prompt_json)
        prompt_text = " ".join(m.get("content", "") for m in messages)

        score = 50  # 基础分
        if len(prompt_text) > 100:
            score += 10
        if any(kw in prompt_text.lower() for kw in ["step", "首先", "然后", "first", "then"]):
            score += 10
        if any(kw in prompt_text.lower() for kw in ["example", "例如", "格式", "format"]):
            score += 10
        if any(kw in prompt_text.lower() for kw in ["error", "bug", "修复", "fix"]):
            score += 10
        return min(100, score)
    except:
        return 30


def _save_report(conn, session_id: str, report: dict):
    conn.execute(
        "UPDATE sessions SET total_score=?, report_json=?, status='scored' WHERE id=?",
        [report.get("total_score", 0), json.dumps(report, ensure_ascii=False), session_id],
    )
    conn.commit()
