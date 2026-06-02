import { useRef, useCallback, useEffect } from 'react';

interface EvalEvent {
  event_type: string;
  event_data: any;
  timestamp_ms: number;
}

export function useEventLogger(sessionId: string | null, phase: number) {
  const buffer = useRef<EvalEvent[]>([]);
  const timerRef = useRef<number | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  const flush = useCallback(() => {
    if (buffer.current.length === 0 || !sessionRef.current) return;
    const events = [...buffer.current];
    buffer.current = [];

    fetch('/api/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        events.map(e => ({
          session_id: sessionRef.current,
          phase,
          event_type: e.event_type,
          event_data: JSON.stringify(e.event_data),
          timestamp_ms: e.timestamp_ms,
        }))
      ),
    }).catch(() => {});
  }, [phase]);

  // Auto-flush every 5 seconds
  useEffect(() => {
    timerRef.current = window.setInterval(flush, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      flush();
    };
  }, [flush]);

  const logEvent = useCallback((type: string, data: any) => {
    buffer.current.push({
      event_type: type,
      event_data: data,
      timestamp_ms: Date.now(),
    });
    if (buffer.current.length >= 10) flush();
  }, [flush]);

  // Flush on unmount
  useEffect(() => {
    return () => flush();
  }, [flush]);

  return { logEvent, flush };
}
