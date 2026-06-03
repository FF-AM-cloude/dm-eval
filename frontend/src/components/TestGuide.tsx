import { useState, useEffect, useRef } from 'react';

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 28px',
  borderRadius: '0 0 12px 12px',
  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
  color: '#1c1917',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  border: 'none',
  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
  letterSpacing: '0.5px',
  transition: 'box-shadow 0.2s, transform 0.2s',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 998,
};

const drawerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: 350,
  zIndex: 999,
  background: 'rgba(13, 17, 23, 0.95)',
  borderLeft: '1px solid #30363d',
  color: '#c9d1d9',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #30363d',
  fontSize: 16,
  fontWeight: 600,
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8b949e',
  cursor: 'pointer',
  fontSize: 20,
  padding: '4px 8px',
  borderRadius: 4,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
  fontSize: 14,
  lineHeight: 1.7,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};

const headingStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#58a6ff',
  marginBottom: 8,
  marginTop: 0,
};

const subheadingStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#d2a8ff',
  marginBottom: 6,
  marginTop: 12,
};

const linkStyle: React.CSSProperties = {
  color: '#58a6ff',
  textDecoration: 'underline',
};

export default function TestGuide() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [open]);

  return (
    <>
      <button
        style={{ ...bannerStyle, boxShadow: hover ? '0 6px 28px rgba(245, 158, 11, 0.7)' : '0 4px 20px rgba(245, 158, 11, 0.5)' }}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="查看测试指南"
      >
        <span style={{ fontSize: 20 }}>📖</span>
        测试指南
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>点击展开</span>
      </button>

      {open && (
        <div style={overlayStyle}>
          <div ref={drawerRef} style={drawerStyle}>
            <div style={headerStyle}>
              <span>📖 测试指南</span>
              <button style={closeStyle} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div style={bodyStyle}>
              <div style={sectionStyle}>
                <h3 style={headingStyle}>总览</h3>
                <p>本测试分两个部分，总计约 <strong>100 分钟</strong>：</p>
                <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                  <li><strong>第一部分：基本功速答</strong>（约 8 分钟，20 道选择题）</li>
                  <li><strong>第二部分：AI 实战项目</strong>（约 90 分钟，修 bug + 加功能）</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h3 style={headingStyle}>第一部分：基本功速答</h3>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>每题限时作答，至少 3 秒后方可提交</li>
                  <li>禁止复制粘贴，不可回退</li>
                  <li>涵盖：代码逻辑、SQL、架构设计、HTTP/API、数据结构</li>
                </ul>
              </div>

              <div style={sectionStyle}>
                <h3 style={headingStyle}>第二部分：AI 实战项目</h3>

                <div style={subheadingStyle}>1. 配置 AI（可选）</div>
                <ul style={{ paddingLeft: 20, margin: '2px 0' }}>
                  <li>支持 DeepSeek、智谱、Kimi、OpenAI</li>
                  <li>注册链接：<br />
                    DeepSeek：<a style={linkStyle} href="https://platform.deepseek.com" target="_blank" rel="noreferrer">platform.deepseek.com</a><br />
                    智谱 AI：<a style={linkStyle} href="https://open.bigmodel.cn" target="_blank" rel="noreferrer">open.bigmodel.cn</a><br />
                    Kimi：<a style={linkStyle} href="https://platform.moonshot.cn" target="_blank" rel="noreferrer">platform.moonshot.cn</a>
                  </li>
                  <li>大多数平台注册即送免费额度</li>
                  <li>也可以跳过 AI，直接开始</li>
                </ul>

                <div style={subheadingStyle}>2. 阅读任务说明和种子代码</div>

                <div style={subheadingStyle}>3. 在编辑器中修改代码</div>
                <ul style={{ paddingLeft: 20, margin: '2px 0' }}>
                  <li>可借助右侧 AI 助手分析和修复</li>
                  <li>修改完点"复制"或"下载"</li>
                </ul>

                <div style={subheadingStyle}>4. 在您自己的终端运行验证</div>
                <pre style={{ background: '#161b22', padding: '8px 12px', borderRadius: 6, overflow: 'auto', fontSize: 13 }}>
python contact_api.py{'\n'}
curl http://localhost:8000/contacts</pre>

                <div style={subheadingStyle}>5. 验证通过后提交</div>
                <ul style={{ paddingLeft: 20, margin: '2px 0' }}>
                  <li>可选：Git Push 代码</li>
                  <li>可选：填写备注说明思路</li>
                  <li>点击"提交评估"</li>
                </ul>
              </div>

              <div style={{ ...sectionStyle, borderTop: '1px solid #30363d', paddingTop: 12 }}>
                <h3 style={headingStyle}>注意事项</h3>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>系统全程记录操作过程（代码编辑、AI 对话、页面切换）</li>
                  <li>此链接一次性使用，关闭后无法重新进入</li>
                  <li>可以使用任何外部工具和资源</li>
                  <li><strong>没有标准答案</strong>，我们关注的是您解决问题的过程</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
