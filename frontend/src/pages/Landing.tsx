import { useState } from 'react';

interface Props {
  onStart: (name: string) => void;
}

const PASSWORD = 'dm-eval-2026';

export default function Landing({ onStart }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入您的姓名');
      return;
    }
    if (password !== PASSWORD) {
      setError('密码错误');
      return;
    }
    setError('');
    onStart(trimmed);
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#c9d1d9', fontSize: '28px', marginBottom: '24px' }}>
        DM-Eval 技术能力评估
      </h1>

      <div style={cardStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>您的姓名</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="请输入姓名"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>访问密码</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="请输入密码"
            style={inputStyle}
            onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
          />
        </div>

        {error && <p style={{ color: '#da3633', fontSize: '14px', margin: '0 0 12px' }}>{error}</p>}

        <button onClick={handleStart} style={buttonStyle}>
          开始测试
        </button>
      </div>

      <div style={noticeStyle}>
        <p style={{ color: '#c9d1d9', fontWeight: 600, marginBottom: '8px' }}>📋 测试须知</p>
        <p>1. 本测试分两段：基本功速答（约8分钟）+ AI实战项目（约90分钟）</p>
        <p>2. 第一段禁止复制粘贴，每题限时作答，至少3秒后方可提交，不可回退</p>
        <p>3. 第二段需要您在自己的电脑上运行代码，可以使用任何AI工具</p>
        <p>4. 系统将记录您的全部操作过程，包括AI对话、代码编辑、页面切换等</p>
        <p>5. 此链接仅限一次使用，开始后无法通过同一链接重新进入</p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  height: '100vh', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center',
  background: '#0d1117', textAlign: 'center',
};

const cardStyle: React.CSSProperties = {
  background: '#161b22',
  border: '1px solid #30363d',
  borderRadius: '8px',
  padding: '24px 32px',
  width: 340,
  marginBottom: 20,
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
  textAlign: 'left',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#c9d1d9',
  fontSize: '14px',
  marginBottom: 6,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '15px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '6px',
  color: '#c9d1d9',
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 0',
  fontSize: '16px',
  fontWeight: 600,
  background: '#238636',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  cursor: 'pointer',
};

const noticeStyle: React.CSSProperties = {
  padding: '16px',
  background: '#161b22',
  border: '1px solid #30363d',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: 1.8,
  color: '#8b949e',
  maxWidth: '560px',
  textAlign: 'left',
};
