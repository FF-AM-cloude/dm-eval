interface GlobalTimerProps {
  format: () => string;
}

export default function GlobalTimer({ format }: GlobalTimerProps) {
  return (
    <div style={{
      background: '#161b22',
      borderBottom: '1px solid #30363d',
      padding: '8px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px',
    }}>
      <span style={{ color: '#8b949e' }}>DM-Eval · AI原生能力评估</span>
      <span style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        color: '#58a6ff',
      }}>
        总用时: {format()}
      </span>
    </div>
  );
}
