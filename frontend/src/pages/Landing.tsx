import { useState } from 'react';

interface LandingProps {
  onStart: (name: string, email: string) => void;
}

export default function Landing({ onStart }: LandingProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!name.trim()) return;
    setLoading(true);
    onStart(name, email);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
    }}>
      <div style={{
        width: '420px',
        padding: '40px',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '4px', color: '#c9d1d9' }}>
          AI原生能力评估
        </h1>
        <p style={{ color: '#8b949e', marginBottom: '24px', fontSize: '14px' }}>
          全程自动计时，请确保你有充足的时间（约2小时）一次性完成
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#c9d1d9', fontSize: '13px' }}>
            姓名 *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="请输入你的姓名"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#c9d1d9', fontSize: '13px' }}>
            邮箱
          </label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="选填"
            style={inputStyle}
          />
        </div>

        <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px', lineHeight: 1.6 }}>
          <p>⚡ 评估分两段：</p>
          <p>1. 基本功速答 — 15-20题，每题30秒，不可回退</p>
          <p>2. AI实战 — 在Monaco编辑器中完成任务</p>
          <p style={{ marginTop: '8px', color: '#da3633' }}>
            ⚠ 开始后计时不可暂停，请确保网络稳定
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={!name.trim() || loading}
          style={{
            width: '100%',
            padding: '12px',
            background: name.trim() ? '#238636' : '#21262d',
            border: 'none',
            borderRadius: '6px',
            color: name.trim() ? '#fff' : '#484f58',
            fontSize: '16px',
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? '创建会话中...' : '开始评估'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '6px',
  color: '#c9d1d9',
  fontSize: '14px',
  outline: 'none',
};
