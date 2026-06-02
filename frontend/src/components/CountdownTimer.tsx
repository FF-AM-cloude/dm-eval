interface CountdownTimerProps {
  seconds: number;
  total?: number;
}

export default function CountdownTimer({ seconds, total = 30 }: CountdownTimerProps) {
  const pct = (seconds / total) * 100;
  const isUrgent = seconds <= 5;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 0',
    }}>
      <div style={{
        flex: 1,
        height: '6px',
        background: '#21262d',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isUrgent ? '#da3633' : '#58a6ff',
          borderRadius: '3px',
          transition: 'width 1s linear',
        }} />
      </div>
      <span style={{
        fontSize: '14px',
        fontWeight: 600,
        color: isUrgent ? '#da3633' : '#c9d1d9',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '24px',
        textAlign: 'right',
      }}>
        {seconds}
      </span>
    </div>
  );
}
