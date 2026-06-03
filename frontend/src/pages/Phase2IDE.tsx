import { useState, useEffect, useCallback, useRef } from 'react';
import { AIConfig } from '../types';
import AIConfigPanel from '../components/AIConfigPanel';
import AIChatPanel from '../components/AIChatPanel';
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

export default function Phase2IDE({ sessionId, candidateName, onSubmit }: Props) {
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [task, setTask] = useState<Phase2Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'spec' | 'code' | 'tests'>('spec');
  const [gitUrl, setGitUrl] = useState('');
  const [tabWarning, setTabWarning] = useState(false);
  const { logEvent, flush } = useEventLogger(sessionId, 2);
  const timer = useGlobalTimer();
  const timerStarted = useRef(false);

  if (!timerStarted.current) {
    timer.start();
    timerStarted.current = true;
  }

  // 页面切换检测 + 警告条
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        logEvent('tab_switch_away', { timestamp: Date.now() });
        setTabWarning(true);
      } else {
        logEvent('tab_switch_back', { timestamp: Date.now() });
        // 3秒后隐藏警告
        setTimeout(() => setTabWarning(false), 3000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [logEvent]);

  const loadTask = async () => {
    setTaskLoading(true);
    try {
      const resp = await fetch(`/api/quiz/phase2-task?session_id=${sessionId}`);
      if (!resp.ok) throw new Error('获取任务失败');
      const data = await resp.json();
      setTask(data);
      logEvent('spec_opened', { task_id: data.id });
    } catch (e: any) {
      alert(e.message);
    }
    setTaskLoading(false);
  };

  const handleSubmit = async () => {
    if (!confirm('确认提交？提交后无法修改。')) return;
    logEvent('submission', { timestamp: Date.now() });
    flush();
    try {
      await fetch(`/api/submit?session_id=${sessionId}`, { method: 'POST' });
    } catch {}
    onSubmit();
  };

  // 生成git clone命令
  const repoCloneCmd = gitUrl
    ? `git clone ${gitUrl} && cd ${gitUrl.split('/').pop()?.replace('.git', '') || 'project'}`
    : 'git clone <仓库地址>';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      {/* 顶部：计时器 + 离开警告 */}
      <div style={{ position: 'relative' }}>
        <GlobalTimer format={timer.format} />
        {tabWarning && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: '#da3633', color: '#fff', textAlign: 'center',
            padding: '6px', fontSize: '13px', fontWeight: 600,
            animation: 'fadeIn 0.3s',
          }}>
            ⚠️ 您已离开测试页面，离开时间正在记录中
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ===== 左侧：任务面板（60%宽度）===== */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', borderRight: '1px solid #30363d', minWidth: 0 }}>

          {/* AI配置（折叠在顶部）*/}
          {!task && (
            <div style={{ borderBottom: '1px solid #30363d' }}>
              <AIConfigPanel
                onConfigChange={setAIConfig}
                onConnect={loadTask}
                connected={!!task}
              />
            </div>
          )}

          {/* Tab栏 */}
          {task && (
            <div style={{
              display: 'flex', borderBottom: '1px solid #30363d', background: '#161b22',
            }}>
              {(['spec', 'code', 'tests'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px', border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? '#0d1117' : 'transparent',
                    color: activeTab === tab ? '#58a6ff' : '#8b949e',
                    borderBottom: activeTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
                    fontSize: '14px', fontWeight: 500,
                  }}
                >
                  {{ spec: '📋 任务说明', code: '💻 种子代码', tests: '✅ 测试用例' }[tab]}
                </button>
              ))}
            </div>
          )}

          {/* 内容区 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', minHeight: 0 }}>
            {!task && !taskLoading && (
              <div style={{ color: '#8b949e', fontSize: '15px', lineHeight: 2 }}>
                <h2 style={{ color: '#c9d1d9', fontSize: '20px', marginBottom: '16px' }}>第二段：AI实战项目</h2>
                <p>请先在右侧配置AI API Key并测试连接，连接成功后题目将自动解锁。</p>
                <p style={{ marginTop: '16px', color: '#c9d1d9', fontWeight: 600 }}>本段流程：</p>
                <ol style={{ paddingLeft: '20px' }}>
                  <li>配置AI → 解锁题目</li>
                  <li>阅读任务说明和种子代码</li>
                  <li>在您自己的电脑上 clone 仓库、运行代码</li>
                  <li>修复bug、添加功能（可使用右侧AI助手）</li>
                  <li>完成后 git push，然后点击"提交评估"</li>
                </ol>
                <p style={{ marginTop: '16px', padding: '12px', background: '#161b22', borderRadius: '6px', border: '1px solid #30363d' }}>
                  💡 您可以使用任何IDE、终端工具和AI工具。右侧的AI对话面板会记录您的交互过程。
                </p>
              </div>
            )}

            {taskLoading && (
              <div style={{ color: '#8b949e', fontSize: '15px' }}>加载任务中...</div>
            )}

            {task && activeTab === 'spec' && (
              <div style={{ color: '#c9d1d9', fontSize: '14px', lineHeight: 1.9 }}>
                <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>{task.title}</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <span style={{ background: '#1c2128', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: '#8b949e' }}>
                    难度: {task.difficulty}
                  </span>
                  <span style={{ background: '#1c2128', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: '#8b949e' }}>
                    参考时间: {task.time_reference_min}分钟
                  </span>
                </div>

                <div style={{
                  whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.9,
                  background: '#161b22', padding: '20px', borderRadius: '8px',
                  border: '1px solid #30363d',
                }}>
                  {task.spec}
                </div>

                {/* 操作指引 */}
                <div style={{
                  marginTop: '24px', padding: '16px', borderRadius: '8px',
                  background: '#0b3d22', border: '1px solid #238636',
                }}>
                  <p style={{ color: '#3fb950', fontWeight: 600, marginBottom: '8px' }}>🚀 开始步骤</p>
                  <p style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '8px' }}>
                    1. 将下面的种子代码保存为 <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: '3px' }}>contact_api.py</code>
                  </p>
                  <p style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '8px' }}>
                    2. 在终端运行：<code style={{ background: '#161b22', padding: '2px 6px', borderRadius: '3px' }}>python contact_api.py</code>
                  </p>
                  <p style={{ color: '#c9d1d9', fontSize: '13px', marginBottom: '8px' }}>
                    3. 测试：<code style={{ background: '#161b22', padding: '2px 6px', borderRadius: '3px' }}>curl http://localhost:8000/contacts</code>
                  </p>
                  <p style={{ color: '#c9d1d9', fontSize: '13px' }}>
                    4. 修完bug、加完功能后，push到Git仓库并点击下方"提交评估"
                  </p>
                </div>
              </div>
            )}

            {task && activeTab === 'code' && (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '12px',
                }}>
                  <span style={{ color: '#c9d1d9', fontSize: '14px', fontWeight: 600 }}>
                    contact_api.py
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(task.seed_code || '');
                      logEvent('seed_code_copied', { timestamp: Date.now() });
                      alert('代码已复制到剪贴板');
                    }}
                    style={{
                      padding: '6px 16px', background: '#21262d', border: '1px solid #30363d',
                      borderRadius: '6px', color: '#c9d1d9', cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    📋 复制代码
                  </button>
                </div>
                <pre style={{
                  background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
                  padding: '20px', overflow: 'auto', fontSize: '13px', lineHeight: 1.7,
                  color: '#c9d1d9', fontFamily: 'Menlo, Monaco, Consolas, monospace',
                  maxHeight: 'calc(100vh - 250px)',
                }}>
                  {task.seed_code || '（无种子代码）'}
                </pre>
              </div>
            )}

            {task && activeTab === 'tests' && (
              <div>
                <h3 style={{ color: '#c9d1d9', fontSize: '16px', marginBottom: '16px' }}>测试用例</h3>
                <p style={{ color: '#8b949e', fontSize: '13px', marginBottom: '16px' }}>
                  您的代码需要通过以下测试。标记为"必做"的用例对应必做阶段，"选做"对应加分阶段。
                </p>
                {task.test_cases.map((tc, i) => (
                  <div key={tc.id} style={{
                    padding: '12px 16px', marginBottom: '8px',
                    background: '#161b22', border: '1px solid #30363d', borderRadius: '6px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#58a6ff', fontSize: '13px', fontWeight: 600 }}>{tc.id}</span>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '8px',
                        background: i < 7 ? '#0b3d22' : '#1c2128',
                        color: i < 7 ? '#3fb950' : '#8b949e',
                      }}>
                        {i < 7 ? '必做' : '选做'}
                      </span>
                    </div>
                    <div style={{ color: '#8b949e', fontSize: '12px' }}>
                      <div>输入: {tc.input || '（空）'}</div>
                      <div>期望: {tc.expected}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 右侧：AI面板（40%宽度）===== */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {/* AI配置（任务解锁后移到这里）*/}
          {task && (
            <div style={{ borderBottom: '1px solid #30363d' }}>
              <AIConfigPanel
                onConfigChange={setAIConfig}
                onConnect={() => {}}
                connected={true}
              />
            </div>
          )}

          {/* AI对话 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px', background: '#161b22',
              borderBottom: '1px solid #30363d',
              fontSize: '13px', color: '#c9d1d9', fontWeight: 600,
            }}>
              🤖 AI 助手
              <span style={{ fontWeight: 400, color: '#8b949e', marginLeft: '8px', fontSize: '12px' }}>
                对话内容将被记录用于评估
              </span>
            </div>
            <div style={{ height: 'calc(100% - 41px)', minHeight: 0 }}>
              <AIChatPanel config={aiConfig} sessionId={sessionId} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div style={{
        padding: '12px 24px', borderTop: '1px solid #30363d', background: '#161b22',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ color: '#8b949e', fontSize: '13px' }}>
          {candidateName} · {sessionId.slice(0, 8)}
          {task && <span style={{ marginLeft: '8px', color: '#238636' }}>· 题目已解锁</span>}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#484f58', fontSize: '12px' }}>
            完成代码修改并push到Git后 →
          </span>
          <button
            onClick={handleSubmit}
            disabled={!task}
            style={{
              padding: '10px 24px', background: task ? '#238636' : '#21262d',
              border: '1px solid ' + (task ? '#238636' : '#30363d'),
              borderRadius: '6px', color: '#fff', cursor: task ? 'pointer' : 'not-allowed',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            提交评估
          </button>
        </div>
      </div>
    </div>
  );
}
