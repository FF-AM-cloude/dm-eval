import { useState, useCallback, useRef, useEffect } from 'react';
import { AIConfig } from '../types';
import MonacoEditor from '../components/MonacoEditor';
import OutputPanel from '../components/OutputPanel';
import AIConfigPanel from '../components/AIConfigPanel';
import AIChatPanel from '../components/AIChatPanel';
import GitPanel from '../components/GitPanel';
import GlobalTimer from '../components/GlobalTimer';
import { useEventLogger } from '../hooks/useEventLogger';
import { useGlobalTimer } from '../hooks/useTimer';

interface Phase2Task {
  id: string;
  title: string;
  difficulty: string;
  time_reference_min: number;
  spec: string;
  test_cases: { id: string; input: string; expected: string }[];
  trap?: { description: string; test_case_ids: string[] };
  toolchain_requirements: string[];
}

interface Phase2IDEProps {
  sessionId: string;
  candidateName: string;
  onSubmit: () => void;
}

export default function Phase2IDE({ sessionId, candidateName, onSubmit }: Phase2IDEProps) {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [task, setTask] = useState<Phase2Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState('');
  const { logEvent, flush } = useEventLogger(sessionId, 2);
  const timer = useGlobalTimer();
  const timerStarted = useRef(false);
  const debounceRef = useRef<number | null>(null);

  if (!timerStarted.current) {
    timer.start();
    timerStarted.current = true;
  }

  const loadTask = async () => {
    setTaskLoading(true);
    setTaskError('');
    try {
      const resp = await fetch(`/api/quiz/phase2-task?session_id=${sessionId}`);
      if (!resp.ok) throw new Error('获取任务失败');
      const data = await resp.json();
      setTask(data);
      if (data.seed_code) {
        setCode(data.seed_code);
      }
    } catch (e: any) {
      setTaskError(e.message);
    }
    setTaskLoading(false);
  };

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => {
      logEvent('code_snapshot', { code, length: code.length });
    }, 60000);
    return () => clearInterval(interval);
  }, [code, logEvent]);

  const handleCodeChange = useCallback((newCode: string | undefined) => {
    if (newCode === undefined) return;
    setCode(newCode);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      logEvent('code_change', { length: newCode.length });
    }, 2000);
  }, [logEvent]);

  const handleRun = async () => {
    setRunning(true);
    setError('');
    setOutput('');
    logEvent('code_run', {});
    try {
      const resp = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, code, language_id: 71, stdin: '' }),
      });
      const result = await resp.json();
      if (result.stderr) setError(result.stderr);
      setOutput(result.stdout || '(无输出)');
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  };

  const handleSubmit = async () => {
    logEvent('code_snapshot', { code, length: code.length });
    flush();
    try {
      await fetch(`/api/submit?session_id=${sessionId}`, { method: 'POST' });
    } catch {}
    onSubmit();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <GlobalTimer format={timer.format} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧面板 */}
        <div style={{ width: '300px', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 任务Spec区域 */}
          <div style={{ padding: '12px', overflow: 'auto', flex: 1 }}>
            <h3 style={{ fontSize: '14px', color: '#c9d1d9', marginBottom: '8px' }}>
              {task ? `📋 ${task.title}` : '任务说明'}
            </h3>

            {!task && !taskLoading && !taskError && (
              <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.6 }}>
                <p>请在左下角配置AI API Key，测试连接成功后点击"解锁题目"。</p>
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#c9d1d9', marginBottom: '6px' }}>评估流程：</h4>
                  <ol style={{ paddingLeft: '16px' }}>
                    <li style={{ marginBottom: '4px' }}>配置AI提供商 + API Key</li>
                    <li style={{ marginBottom: '4px' }}>测试连接 → 解锁题目</li>
                    <li style={{ marginBottom: '4px' }}>在编辑器中编写代码</li>
                    <li style={{ marginBottom: '4px' }}>运行测试</li>
                    <li style={{ marginBottom: '4px' }}>完成后提交</li>
                  </ol>
                </div>
              </div>
            )}

            {taskLoading && (
              <div style={{ color: '#8b949e', fontSize: '13px' }}>加载任务中...</div>
            )}

            {taskError && (
              <div style={{ color: '#da3633', fontSize: '13px' }}>{taskError}</div>
            )}

            {task && (
              <div style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: 1.6 }}>
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#1c2128', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#8b949e' }}>
                    {task.difficulty}
                  </span>
                  <span style={{ background: '#1c2128', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#8b949e' }}>
                    参考时间 {task.time_reference_min}分钟
                  </span>
                </div>

                <div style={{
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  padding: '12px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px',
                  lineHeight: 1.7,
                  color: '#c9d1d9',
                }}>
                  {task.spec}
                </div>

                {task.test_cases.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <h4 style={{ fontSize: '13px', color: '#c9d1d9', marginBottom: '6px' }}>测试用例：</h4>
                    {task.test_cases.map(tc => (
                      <div key={tc.id} style={{
                        padding: '6px 8px',
                        marginBottom: '4px',
                        background: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#8b949e',
                      }}>
                        <strong style={{ color: '#58a6ff' }}>{tc.id}</strong>: {tc.input.substring(0, 50)}{tc.input.length > 50 ? '…' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI配置 */}
          <div style={{ borderTop: '1px solid #30363d' }}>
            <AIConfigPanel
              onConfigChange={setAIConfig}
              onConnect={loadTask}
              connected={!!task}
            />
          </div>

          {/* Git */}
          <div style={{ borderTop: '1px solid #30363d' }}>
            <GitPanel sessionId={sessionId} code={code} />
          </div>
        </div>

        {/* 中间：编辑器 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #30363d' }}>
          <div style={{
            padding: '8px 12px',
            background: '#161b22',
            borderBottom: '1px solid #30363d',
            fontSize: '12px',
            color: '#8b949e',
          }}>
            main.py
          </div>
          <div style={{ flex: 1 }}>
            <MonacoEditor
              code={code}
              onChange={handleCodeChange}
              height="100%"
            />
          </div>
        </div>

        {/* 右侧：输出 + AI对话 */}
        <div style={{ width: '360px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ height: '40%', borderBottom: '1px solid #30363d', minHeight: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '8px 12px',
              background: '#161b22',
              borderBottom: '1px solid #30363d',
              fontSize: '12px',
              color: '#8b949e',
            }}>
              运行输出
            </div>
            <div style={{ height: 'calc(100% - 33px)', minHeight: 0 }}>
              <OutputPanel output={output} error={error} loading={running} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '8px 12px',
              background: '#161b22',
              borderBottom: '1px solid #30363d',
              fontSize: '12px',
              color: '#8b949e',
            }}>
              AI 对话
            </div>
            <div style={{ height: 'calc(100% - 33px)', minHeight: 0 }}>
              <AIChatPanel config={aiConfig} sessionId={sessionId} />
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #30363d',
        background: '#161b22',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ color: '#8b949e', fontSize: '12px' }}>
          {candidateName} · {sessionId.slice(0, 8)}
          {task && <span style={{ marginLeft: '8px', color: '#238636' }}>· 题目已解锁</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleRun} disabled={running || !task} style={{ ...btnStyle, opacity: task ? 1 : 0.5 }}>
            {running ? '运行中...' : '▶ 运行'}
          </button>
          <button onClick={handleSubmit} disabled={!task} style={{ ...btnStyle, background: '#238636', opacity: task ? 1 : 0.5 }}>
            提交
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: '6px',
  color: '#c9d1d9',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};
