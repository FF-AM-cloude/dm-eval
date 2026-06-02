import { useState, useEffect } from 'react';
import { Session } from '../types';

export default function Report() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (authed) fetchSessions();
  }, [authed]);

  const fetchSessions = async () => {
    try {
      const resp = await fetch('/api/report');
      const data = await resp.json();
      setSessions(data);
    } catch {}
  };

  const loadDetail = async (sessionId: string) => {
    const resp = await fetch(`/api/report/${sessionId}`);
    const data = await resp.json();
    setSelected(data);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
        <div style={{ padding: '40px', background: '#161b22', border: '1px solid #30363d', borderRadius: '12px' }}>
          <h2 style={{ color: '#c9d1d9', marginBottom: '16px' }}>管理端登录</h2>
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          <button onClick={() => setAuthed(true)} style={btnStyle}>登录</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', padding: '20px' }}>
      <h1 style={{ color: '#c9d1d9', marginBottom: '20px', fontSize: '24px' }}>评估报告</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* 候选人列表 */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ color: '#c9d1d9', marginBottom: '12px', fontSize: '14px' }}>候选人列表</h3>
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => loadDetail(s.id)}
              style={{
                padding: '10px',
                marginBottom: '4px',
                background: selected?.id === s.id ? '#1c2128' : 'transparent',
                border: '1px solid #30363d',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: '#c9d1d9', fontSize: '14px' }}>{s.candidate_name}</div>
              <div style={{ color: '#8b949e', fontSize: '12px' }}>
                总分: {s.total_score ?? '-'} · {s.status}
              </div>
            </div>
          ))}
        </div>

        {/* 详情 */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          {selected ? (
            <div>
              <h2 style={{ color: '#c9d1d9', marginBottom: '12px' }}>{selected.candidate_name}</h2>
              {selected.report_json && (
                <pre style={{ color: '#8b949e', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(JSON.parse(selected.report_json), null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div style={{ color: '#484f58' }}>选择一个候选人查看详情</div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  marginBottom: '12px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '6px',
  color: '#c9d1d9',
  fontSize: '14px',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#238636',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
};
