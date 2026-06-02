export default function Submitted() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        maxWidth: '480px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ color: '#c9d1d9', marginBottom: '8px' }}>评估已提交</h1>
        <p style={{ color: '#8b949e', lineHeight: 1.6 }}>
          你的答题记录和代码已全部保存。系统正在自动评分，结果将发送到你的邮箱。
        </p>
        <p style={{ color: '#484f58', marginTop: '16px', fontSize: '13px' }}>
          你可以关闭此页面了
        </p>
      </div>
    </div>
  );
}
