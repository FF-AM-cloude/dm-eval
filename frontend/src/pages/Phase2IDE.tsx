import { useState, useEffect, useCallback, useRef } from 'react';
import { AIConfig } from '../types';
import MonacoEditor from '../components/MonacoEditor';
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
  seed_code?: string;
  test_cases: { id: string; input: string; expected: string }[];
  toolchain_requirements: string[];
}

interface Props {
  sessionId: string;
  candidateName: string;
  onSubmit: () => void;
}

const STEPS = ['①配置AI', '②读题', '③改代码', '④本地运行', '⑤提交'];

export default function Phase2IDE({ sessionId, candidateName, onSubmit }: Props) {
  const [code, setCode] = useState('');
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [task, setTask] = useState<Phase2Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [leftTab, setLeftTab] = useState<'spec' | 'tests'>('spec');
  const [notes, setNotes] = useState('');
  const [hint, setHint] = useState('🔧 请先在左侧配置AI API Key，测试连接后题目自动解锁');
  const [tabWarning, setTabWarning] = useState(false);
  const { logEvent, flush } = useEventLogger(sessionId, 2);
  const timer = useGlobalTimer();
  const timerStarted = useRef(false);
  const debounceRef = useRef<number | null>(null);

  if (!timerStarted.current) {
    timer.start();
    timerStarted.current = true;
  }

  // 页面切换警告
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        logEvent('tab_switch_away', { timestamp: Date.now() });
        setTabWarning(true);
      } else {
        logEvent('tab_switch_back', { timestamp: Date.now() });
        setTimeout(() => setTabWarning(false), 3000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [logEvent]);

  // 定期保存代码快照
  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => {
      logEvent('code_snapshot', { code, length: code.length });
    }, 60000);
    return () => clearInterval(interval);
  }, [code, logEvent]);

  // 动态提示：根据当前步骤自动更新
  useEffect(() => {
    switch (currentStep) {
      case 0:
        setHint('🔧 请先在左侧配置AI API Key，测试连接后题目自动解锁');
        break;
      case 1:
        setHint('📖 阅读左侧任务说明，了解需要修复的bug和要添加的功能。可以使用右侧AI助手分析代码');
        break;
      case 2:
        setHint('✏️ 在编辑器中修改代码。修改完成后，点击上方"复制"或"下载"按钮，拿到本地终端运行验证');
        break;
      case 3:
        setHint('🖥️ 在您的终端运行: python contact_api.py → 然后用 curl http://localhost:8000/contacts 测试。验证通过后回来提交');
        break;
      case 4:
        setHint('✅ 本地验证通过？请填写备注说明思路，然后点击"提交评估"。如有Git仓库也可以push代码');
        break;
    }
  }, [currentStep]);

  // 当用户从外部回来时（tab_switch_back），推进到步骤4
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && currentStep === 3) {
        setCurrentStep(4);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [currentStep]);

  const loadTask = async () => {
    setTaskLoading(true);
    try {
      const resp = await fetch(`/api/quiz/phase2-task?session_id=${sessionId}`);
      if (!resp.ok) throw new Error('获取任务失败');
      const data = await resp.json();
      setTask(data);
      if (data.seed_code) setCode(data.seed_code);
      logEvent('spec_opened', { task_id: data.id });
      setCurrentStep(1);
    } catch (e: any) {
      alert(e.message);
    }
    setTaskLoading(false);
  };

  const handleCodeChange = useCallback((newCode: string | undefined) => {
    if (newCode === undefined) return;
    // 检测大段代码变更（可能是从AI粘贴）
    if (Math.abs(newCode.length - code.length) > 100 && currentStep < 3) {
      setHint('📋 检测到大段代码变更。点击"复制"或"下载"按钮，在本地终端运行 python contact_api.py 验证修复效果');
    }
    setCode(newCode);
    if (currentStep < 2) setCurrentStep(2);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      logEvent('code_change', { length: newCode.length });
    }, 2000);
  }, [logEvent, currentStep, code]);

  const handleCopyCode = () => {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    logEvent('code_copied', { length: code.length });
    if (currentStep < 3) setCurrentStep(3);
    alert('代码已复制到剪贴板');
  };

  const handleDownload = () => {
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(code);
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = 'contact_api.py';
    a.click();
    logEvent('code_downloaded', { length: code.length });
    if (currentStep < 3) setCurrentStep(3);
  };

  const handleSubmit = async () => {
    if (!confirm('确认提交？提交后无法修改。')) return;
    logEvent('code_snapshot', { code, length: code.length });
    if (notes) logEvent('submission_notes', { notes });
    logEvent('submission', { timestamp: Date.now() });
    flush();
    try {
      await fetch(`/api/submit?session_id=${sessionId}`, { method: 'POST' });
    } catch {}
    onSubmit();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      {/* 顶部：计时器 + 步骤指示 + 离开警告 */}
      <div style={{ position: 'relative' }}>
        {tabWarning && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
            background: '#da3633', color: '#fff', textAlign: 'center',
            padding: '6px', fontSize: '13px', fontWeight: 600,
          }}>
            ⚠️ 您已离开测试页面，离开时间正在记录中
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
        }}>
          <GlobalTimer format={timer.format} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {STEPS.map((step, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                background: i <= currentStep ? '#0b3d22' : '#21262d',
                color: i <= currentStep ? '#3fb950' : '#484f58',
                fontWeight: i === currentStep ? 600 : 400,
              }}>
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 动态提示栏 */}
      <div style={{
        padding: '8px 16px',
        background: '#0b1d33',
        borderBottom: '1px solid #1f3a5f',
        fontSize: '13px',
        color: '#58a6ff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>💡</span>
        <span>{hint}</span>
      </div>

      {/* 三栏主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ===== 左栏：任务+配置 (25%) ===== */}
        <div style={{
          width: '280px', minWidth: '280px',
          borderRight: '1px solid #30363d',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* AI配置 */}
          {!task && (
            <div style={{ borderBottom: '1px solid #30363d' }}>
              <AIConfigPanel onConfigChange={setAIConfig} onConnect={loadTask} connected={!!task} />
            </div>
          )}

          {/* Tab切换 */}
          {task && (
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', background: '#161b22' }}>
              {(['spec', 'tests'] as const).map(tab => (
                <button key={tab} onClick={() => setLeftTab(tab)} style={{
                  flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                  background: leftTab === tab ? '#0d1117' : 'transparent',
                  color: leftTab === tab ? '#58a6ff' : '#8b949e',
                  borderBottom: leftTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
                  fontSize: '13px',
                }}>
                  {{ spec: '📋 任务', tests: '✅ 用例' }[tab]}
                </button>
              ))}
            </div>
          )}

          {/* 内容 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px', fontSize: '13px', color: '#c9d1d9', lineHeight: 1.8 }}>
            {!task && !taskLoading && (
              <div style={{ color: '#8b949e' }}>
                <p style={{ marginBottom: '12px' }}>请先配置AI API Key并测试连接。</p>
                <p>连接成功后题目自动解锁。</p>
              </div>
            )}
            {taskLoading && <div style={{ color: '#8b949e' }}>加载中...</div>}

            {task && leftTab === 'spec' && (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{task.title}</h3>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <span style={{ background: '#1c2128', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', color: '#8b949e' }}>
                    {task.difficulty}
                  </span>
                  <span style={{ background: '#1c2128', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', color: '#8b949e' }}>
                    约{task.time_reference_min}分钟
                  </span>
                </div>
                {task.spec}
              </div>
            )}

            {task && leftTab === 'tests' && (
              <div>
                {task.test_cases.map((tc, i) => (
                  <div key={tc.id} style={{
                    padding: '8px', marginBottom: '6px',
                    background: '#161b22', border: '1px solid #30363d', borderRadius: '4px',
                  }}>
                    <div style={{ color: '#58a6ff', fontSize: '12px', fontWeight: 600 }}>
                      {tc.id}
                      <span style={{
                        marginLeft: '8px', fontSize: '10px', padding: '1px 6px', borderRadius: '6px',
                        background: i < 7 ? '#0b3d22' : '#1c2128',
                        color: i < 7 ? '#3fb950' : '#8b949e',
                      }}>
                        {i < 7 ? '必做' : '选做'}
                      </span>
                    </div>
                    <div style={{ color: '#8b949e', fontSize: '11px', marginTop: '4px' }}>
                      {tc.input || '（空）'} → {tc.expected}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Git Push */}
          {task && <GitPanel sessionId={sessionId} code={code} />}
        </div>

        {/* ===== 中栏：代码编辑器 (45%) ===== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #30363d' }}>
          <div style={{
            padding: '8px 12px', background: '#161b22',
            borderBottom: '1px solid #30363d',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: '#8b949e' }}>
              📝 contact_api.py {task ? '' : '（等待解锁）'}
            </span>
            {task && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCopyCode} style={smallBtn}>📋 复制</button>
                <button onClick={handleDownload} style={smallBtn}>💾 下载</button>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <MonacoEditor
              code={code}
              onChange={handleCodeChange}
              height="100%"
              readOnly={!task}
            />
          </div>
        </div>

        {/* ===== 右栏：AI对话 (30%) ===== */}
        <div style={{ width: '340px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 12px', background: '#161b22',
            borderBottom: '1px solid #30363d', fontSize: '13px', color: '#c9d1d9',
          }}>
            🤖 AI 助手
            <span style={{ color: '#8b949e', fontSize: '11px', marginLeft: '6px' }}>
              对话将被记录
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <AIChatPanel config={aiConfig} sessionId={sessionId} />
          </div>
        </div>
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #30363d', background: '#161b22',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ color: '#8b949e', fontSize: '12px' }}>
          {candidateName} · {sessionId.slice(0, 8)}
          {task && <span style={{ marginLeft: '8px', color: '#238636' }}>· 题目已解锁</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            placeholder="备注：简述你的思路（可选）"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{
              width: '280px', padding: '6px 10px', background: '#0d1117',
              border: '1px solid #30363d', borderRadius: '6px',
              color: '#c9d1d9', fontSize: '12px',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!task}
            style={{
              padding: '8px 20px',
              background: task ? '#238636' : '#21262d',
              border: '1px solid ' + (task ? '#238636' : '#30363d'),
              borderRadius: '6px', color: '#fff',
              cursor: task ? 'pointer' : 'not-allowed',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            ✅ 提交评估
          </button>
        </div>
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '3px 10px', background: '#21262d', border: '1px solid #30363d',
  borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer', fontSize: '11px',
};
