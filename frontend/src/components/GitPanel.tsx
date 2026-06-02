import { useState } from 'react';

interface GitPanelProps {
  sessionId: string;
  repoUrl?: string;
}

export default function GitPanel({ sessionId, repoUrl = '' }: GitPanelProps) {
  const [platform, setPlatform] = useState<'github' | 'gitee'>('github');
  const [token, setToken] = useState('');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; branch?: string; error?: string } | null>(null);

  const handlePush = async () => {
    if (!token) return;
    setPushing(true);
    setResult(null);

    try {
      const resp = await fetch('/api/submit/git-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          platform,
          token,
          repo_url: repoUrl,
          branch: `candidate_${sessionId}`,
        }),
      });
      const data = await resp.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }
    setPushing(false);
  };

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      <h3 style={{ marginBottom: '8px', color: '#c9d1d9', fontSize: '14px' }}>Git 操作</h3>

      <select
        value={platform}
        onChange={e => setPlatform(e.target.value as any)}
        style={inputStyle}
      >
        <option value="github">GitHub</option>
        <option value="gitee">Gitee</option>
      </select>

      <input
        type="password"
        placeholder="Git Token"
        value={token}
        onChange={e => setToken(e.target.value)}
        style={inputStyle}
      />

      {repoUrl && (
        <div style={{ color: '#8b949e', marginBottom: '6px', fontSize: '12px' }}>
          仓库: {repoUrl}
        </div>
      )}

      <button
        onClick={handlePush}
        disabled={!token || pushing}
        style={{
          padding: '6px 12px',
          background: '#238636',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        {pushing ? '推送中...' : 'Push 代码'}
      </button>

      {result && (
        <div style={{ marginTop: '8px', color: result.success ? '#3fb950' : '#da3633' }}>
          {result.success ? `✓ 已推送到分支 ${result.branch}` : `✗ ${result.error}`}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  marginBottom: '6px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '4px',
  color: '#c9d1d9',
  fontSize: '13px',
};
