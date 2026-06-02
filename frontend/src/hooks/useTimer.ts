import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning) return;
    if (seconds <= 0) {
      onExpireRef.current?.();
      return;
    }
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(id);
          onExpireRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, seconds]);

  const reset = useCallback((s: number) => {
    setSeconds(s);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => setIsRunning(false), []);

  return { seconds, isRunning, reset, stop };
}

export function useGlobalTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const start = Date.now() - elapsedMs;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, elapsedMs]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);
  const format = useCallback((ms?: number) => {
    const totalSec = Math.floor((ms ?? elapsedMs) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsedMs]);

  return { elapsedMs, isRunning, start, stop, format };
}
