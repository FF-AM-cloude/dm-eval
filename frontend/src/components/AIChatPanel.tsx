import { useState } from 'react';
import { AIConfig, AICall } from '../types';

interface AIChatPanelProps {
  config: AIConfig | null;
  sessionId: string;
  onCallComplete?: (call: AICall) => void;
}

export default function AIChatPanel({ config, sessionId, onCallComplete }: AIChatPanelProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: '你好！我是你的AI助手。有什么需要帮忙的吗？' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !config) return;

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          provider: config.provider,
          api_key: config.api_key,
          model: config.model,
          base_url: config.base_url,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await resp.json();
      const aiContent = data?.choices?.[0]?.message?.content || '（无响应）';
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
      onCallComplete?.({
        id: 0,
        provider: config.provider,
        model: config.model,
        prompt: JSON.stringify(newMessages),
        response: JSON.stringify(data),
        latency_ms: 0,
        success: resp.ok ? 1 : 0,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${e}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: '13px' }}>
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
        background: '#0d1117',
        borderBottom: '1px solid #30363d',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '8px',
            padding: '8px',
            background: m.role === 'user' ? '#161b22' : '#0d1117',
            borderRadius: '4px',
            border: '1px solid #30363d',
          }}>
            <strong style={{ color: m.role === 'user' ? '#58a6ff' : '#3fb950', fontSize: '12px' }}>
              {m.role === 'user' ? '🧑 你' : '🤖 AI'}
            </strong>
            <div style={{ marginTop: '4px', color: '#c9d1d9', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#8b949e' }}>AI 思考中...</div>}
      </div>

      <div style={{ display: 'flex', gap: '4px', padding: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={config ? '输入你的问题...' : '请先在AI配置面板连接'}
          disabled={!config || loading}
          style={{
            flex: 1,
            padding: '6px 8px',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '4px',
            color: '#c9d1d9',
            fontSize: '13px',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!config || loading || !input.trim()}
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
          发送
        </button>
      </div>
    </div>
  );
}
