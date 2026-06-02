import json
import httpx


async def review_code_quality(session_id: str, code: str, api_key: str = "") -> dict:
    """用DeepSeek审查代码质量"""
    if not api_key:
        return {
            "score": 50,
            "feedback": "No API key configured for AI code review",
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "system",
                            "content": "你是一个代码审查专家。请从以下维度评分（0-100）："
                                       "1. 代码正确性 2. 代码质量/可读性 3. 性能考虑 "
                                       "4. 错误处理 5. 测试覆盖率。返回JSON格式。",
                        },
                        {"role": "user", "content": f"审查以下代码：\n\n```python\n{code}\n```"},
                    ],
                },
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
        return resp.json()
    except Exception as e:
        return {"score": 50, "feedback": str(e)}
