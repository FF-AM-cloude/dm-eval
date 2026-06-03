import os
import json
import tempfile
import subprocess
from models.database import get_db


async def push_to_git(repo_url: str, token: str, branch: str, session_id: str, code: str = "") -> dict:
    """
    推送候选人的实际代码到git仓库。
    code参数：候选人编辑器中的代码内容。
    """
    if not code:
        conn = get_db()
        row = conn.execute(
            "SELECT event_data FROM event_log WHERE session_id=? AND event_type='code_snapshot' "
            "ORDER BY timestamp_ms DESC LIMIT 1", [session_id]
        ).fetchone()
        if row:
            try:
                data = json.loads(row["event_data"])
                code = data.get("code", "")
            except:
                pass

    with tempfile.TemporaryDirectory() as tmpdir:
        auth_url = repo_url.replace("https://", f"https://{token}@")

        result = subprocess.run(
            ["git", "clone", "--depth", "1", auth_url, tmpdir],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            return {"success": False, "error": f"Clone failed: {result.stderr}"}

        subprocess.run(["git", "config", "user.email", "eval@darkmatter.ai"], cwd=tmpdir, capture_output=True)
        subprocess.run(["git", "config", "user.name", "DM-Eval"], cwd=tmpdir, capture_output=True)

        branch_name = f"candidate_{session_id[:8]}"
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=tmpdir, capture_output=True, timeout=10,
        )

        candidate_dir = os.path.join(tmpdir, f"submission_{session_id[:8]}")
        os.makedirs(candidate_dir, exist_ok=True)

        with open(os.path.join(candidate_dir, "main.py"), "w") as f:
            f.write(code)

        with open(os.path.join(candidate_dir, "README.md"), "w") as f:
            f.write(f"# Candidate Submission\n\n- Session: {session_id}\n- Submitted via DM-Eval\n")

        subprocess.run(["git", "add", "."], cwd=tmpdir, capture_output=True, timeout=10)
        commit_result = subprocess.run(
            ["git", "commit", "-m", f"Submission: {session_id[:8]}"],
            cwd=tmpdir, capture_output=True, text=True, timeout=10,
        )
        push_result = subprocess.run(
            ["git", "push", "origin", branch_name],
            cwd=tmpdir, capture_output=True, text=True, timeout=60,
        )

        return {
            "success": push_result.returncode == 0,
            "branch": branch_name,
            "error": push_result.stderr if push_result.returncode != 0 else None,
        }
