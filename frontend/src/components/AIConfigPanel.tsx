import { useState } from 'react';
import { PROVIDERS, AIConfig } from '../types';

interface AIConfigPanelProps {
  onConfigChange: (config: AIConfig | null) => void;
  onConnect: () => void;
  connected: boolean;
}

export default function AIConfigPanel({ onConfigChange, onConnect, connected }: AIConfigPanelProps) {
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDERS.deepseek.models[0]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'fail'>('idle');

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[0]);
    onConfigChange(null);
    setTestResult('idle');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('idle');
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'test',
          provider,
          api_key: apiKey,
          model,
          base_url: PROVIDERS[provider].base_url,
          messages: [{ role: 'user', content: '回复"ok"即可' }],
        }),
      });
      if (resp.ok) {
        setTestResult('success');
        onConfigChange({ provider, api_key: apiKey, model, base_url: PROVIDERS[provider].base_url });
      } else {
        setTestResult('fail');
      }
    } catch {
      setTestResult('fail');
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: '12px', fontSize: '13px' }}>
      <h3 style={{ marginBottom: '8px', color: '#c9d1d9', fontSize: '14px' }}>AI 配置</h3>

      <select
        value={provider}
        onChange={e => handleProviderChange(e.target.value)}
        style={selectStyle}
        disabled={connected}
      >
        {Object.entries(PROVIDERS).map(([k, v]) => (
          <option key={k} value={k}>{v.name}</option>
        ))}
      </select>

      <input
        type="password"
        placeholder="API Key"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        style={inputStyle}
        disabled={connected}
      />

      <select
        value={model}
        onChange={e => setModel(e.target.value)}
        style={selectStyle}
        disabled={connected}
      >
        {PROVIDERS[provider].models.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {!connected && (
        <button
          onClick={handleTest}
          disabled={!apiKey || testing}
          style={btnStyle}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      )}

      {testResult === 'success' && <span style={{ color: '#3fb950', marginLeft: '8px' }}>✓ 连接成功</span>}
      {testResult === 'fail' && <span style={{ color: '#da3633', marginLeft: '8px' }}>✗ 连接失败</span>}

      {testResult === 'success' && !connected && (
        <button onClick={onConnect} style={{ ...btnStyle, background: '#238636', marginTop: '4px' }}>
          解锁题目
        </button>
      )}

      {connected && (
        <span style={{ color: '#3fb950', display: 'block', marginTop: '4px' }}>
          ✓ 已连接 - {PROVIDERS[provider].name}
        </span>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  marginBottom: '6px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '4px',
  color: '#c9d1d9',
  fontSize: '13px',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: '4px',
  color: '#c9d1d9',
  cursor: 'pointer',
  fontSize: '13px',
};
