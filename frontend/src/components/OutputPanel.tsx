interface OutputPanelProps {
  output: string;
  error?: string;
  loading?: boolean;
}

export default function OutputPanel({ output, error, loading }: OutputPanelProps) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '6px',
      padding: '12px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      lineHeight: 1.5,
      height: '100%',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
    }}>
      {loading && <span style={{ color: '#8b949e' }}>运行中...</span>}
      {error && <span style={{ color: '#da3633' }}>{error}</span>}
      {output && !error && <span style={{ color: '#c9d1d9' }}>{output}</span>}
      {!output && !loading && !error && (
        <span style={{ color: '#484f58' }}>点击"运行"执行代码</span>
      )}
    </div>
  );
}
