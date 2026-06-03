import { useState } from 'react';

interface Props {
  sessionId: string;
  code: string;
}

export default function GitPanel({ sessionId, code }: Props) {
  const [platform, setPlatform] = useState<'github' | 'gitee'>('github');
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handlePush = async () => {
    if (!token || !repoUrl) {
      setResult({ success: false, message: '请填写Token和仓库地址' });
      return;
    }
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
          branch: `candidate_${sessionId.slice(0, 8)}`,
          code,
        }),
      });
      const data = await resp.json();
      setResult({
        success: data.success,
        message: data.success ? `推送成功 → branch: ${data.branch}` : `失败: ${data.error}`,
      });
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    }
    setPushing(false);
  };

  return (
    <div style={{ background: '#161b22', borderTop: '1px solid #30363d' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '8px 12px', background: 'transparent',
          border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px',
          textAlign: 'left',
        }}
      >
        🔀 Git Push {expanded ? '▼' : '▶'}
      </button>

      {expanded && (
        <div style={{ padding: '8px 12px 12px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={() => setPlatform('github')}
              style={{
                flex: 1, padding: '4px', border: '1px solid #30363d', borderRadius: '4px',
                background: platform === 'github' ? '#21262d' : 'transparent',
                color: '#c9d1d9', cursor: 'pointer', fontSize: '12px',
              }}
            >
              GitHub
            </button>
            <button
              onClick={() => setPlatform('gitee')}
              style={{
                flex: 1, padding: '4px', border: '1px solid #30363d', borderRadius: '4px',
                background: platform === 'gitee' ? '#21262d' : 'transparent',
                color: '#c9d1d9', cursor: 'pointer', fontSize: '12px',
              }}
            >
              Gitee
            </button>
          </div>
          <input
            placeholder="仓库HTTPS地址"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Personal Access Token"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={handlePush}
            disabled={pushing}
            style={{
              width: '100%', padding: '6px', background: '#238636',
              border: 'none', borderRadius: '4px', color: '#fff',
              cursor: pushing ? 'not-allowed' : 'pointer', fontSize: '12px',
            }}
          >
            {pushing ? '推送中...' : '推送代码'}
          </button>
          {result && (
            <div style={{
              marginTop: '8px', padding: '6px', borderRadius: '4px', fontSize: '11px',
              background: result.success ? '#0b3d22' : '#3d0b0b',
              color: result.success ? '#3fb950' : '#da3633',
            }}>
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', marginBottom: '6px',
  background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px',
  color: '#c9d1d9', fontSize: '12px',
};
