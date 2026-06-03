import { useState, useEffect } from 'react';

interface Props {
  onStart: (name: string, email: string, sessionId: string) => void;
}

export default function Landing({ onStart }: Props) {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'used'>('loading');
  const [candidateName, setCandidateName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setStatus('invalid');
      setErrorMsg('缺少访问令牌。请使用管理员提供的链接访问。');
      return;
    }
    setToken(t);

    fetch(`/api/sessions/verify-token?token=${t}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setStatus('valid');
          setCandidateName(data.candidate_name);
          setSessionId(data.session_id);
        } else {
          setStatus(data.error.includes('已使用') ? 'used' : 'invalid');
          setErrorMsg(data.error);
        }
      })
      .catch(() => {
        setStatus('invalid');
        setErrorMsg('服务器连接失败，请稍后再试。');
      });
  }, []);

  const handleStart = async () => {
    try {
      const resp = await fetch(`/api/sessions/activate-token?token=${token}`, { method: 'POST' });
      if (!resp.ok) {
        const err = await resp.json();
        alert(err.detail || '激活失败');
        return;
      }
      const data = await resp.json();
      onStart(data.candidate_name, '', data.session_id);
    } catch {
      alert('激活失败，请检查网络');
    }
  };

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#8b949e', fontSize: '16px' }}>验证链接中...</p>
      </div>
    );
  }

  if (status === 'invalid' || status === 'used') {
    return (
      <div style={containerStyle}>
        <h1 style={{ color: '#da3633', fontSize: '24px', marginBottom: '16px' }}>
          {status === 'used' ? '🔒 链接已使用' : '⚠️ 链接无效'}
        </h1>
        <p style={{ color: '#8b949e', fontSize: '15px' }}>{errorMsg}</p>
        <p style={{ color: '#484f58', fontSize: '13px', marginTop: '20px' }}>
          如有疑问请联系管理员获取新的测试链接。
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#c9d1d9', fontSize: '28px', marginBottom: '8px' }}>
        DM-Eval 技术能力评估
      </h1>
      <p style={{ color: '#58a6ff', fontSize: '18px', marginBottom: '24px' }}>
        你好，{candidateName}
      </p>

      <div style={{
        margin: '20px 0', padding: '16px', background: '#161b22',
        border: '1px solid #30363d', borderRadius: '8px',
        fontSize: '13px', lineHeight: 1.8, color: '#8b949e',
        maxWidth: '560px', textAlign: 'left',
      }}>
        <p style={{ color: '#c9d1d9', fontWeight: 600, marginBottom: '8px' }}>📋 测试须知</p>
        <p>1. 本测试分两段：基本功速答（约8分钟）+ AI实战项目（约90分钟）</p>
        <p>2. 第一段禁止复制粘贴，每题限时作答，至少3秒后方可提交，不可回退</p>
        <p>3. 第二段需要您在自己的电脑上运行代码，可以使用任何AI工具</p>
        <p>4. 系统将记录您的全部操作过程，包括AI对话、代码编辑、页面切换等</p>
        <p>5. 此链接仅限一次使用，点击开始后无法重新进入</p>
      </div>

      <button
        onClick={handleStart}
        style={{
          padding: '14px 48px', fontSize: '16px', fontWeight: 600,
          background: '#238636', border: 'none', borderRadius: '8px',
          color: '#fff', cursor: 'pointer', marginTop: '8px',
        }}
      >
        开始测试
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  height: '100vh', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center',
  background: '#0d1117', textAlign: 'center',
};
