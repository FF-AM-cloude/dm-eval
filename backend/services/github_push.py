import os
import tempfile
import subprocess


async def push_to_git(repo_url: str, token: str, branch: str, session_id: str) -> dict:
    """
    后端执行 git push：
    1. clone 指定仓库
    2. 创建候选人的 branch
    3. 写入代码文件
    4. commit + push
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # 添加 token 到 URL 进行认证
        auth_url = repo_url.replace("https://", f"https://{token}@")

        # clone
        result = subprocess.run(
            ["git", "clone", auth_url, tmpdir],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            return {"success": False, "error": result.stderr}

        # checkout new branch
        subprocess.run(
            ["git", "checkout", "-b", branch],
            cwd=tmpdir, capture_output=True, timeout=10,
        )

        # 创建候选人目录并写入示例代码
        candidate_dir = os.path.join(tmpdir, session_id)
        os.makedirs(candidate_dir, exist_ok=True)
        readme_path = os.path.join(candidate_dir, "README.md")
        with open(readme_path, "w") as f:
            f.write(f"# Candidate Submission: {session_id}\n\nSubmitted via DM-Eval\n")

        # add, commit, push
        subprocess.run(["git", "add", "."], cwd=tmpdir, capture_output=True, timeout=10)
        subprocess.run(
            ["git", "commit", "-m", f"Submission: {session_id}"],
            cwd=tmpdir, capture_output=True, timeout=10,
        )
        push_result = subprocess.run(
            ["git", "push", "origin", branch],
            cwd=tmpdir, capture_output=True, timeout=60,
        )

        return {
            "success": push_result.returncode == 0,
            "branch": branch,
            "error": push_result.stderr if push_result.returncode != 0 else None,
        }
