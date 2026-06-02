import { useEffect } from 'react';

interface LogFn {
  (type: string, data: any): void;
}

export function useClipboardGuard(enabled: boolean, logEvent: LogFn) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent('clipboard_blocked', { type: e.type });
    };

    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logEvent('hotkey_blocked', { key: e.key });
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logEvent('printscreen_blocked', {});
      }
    };

    const contextHandler = (e: MouseEvent) => {
      e.preventDefault();
      logEvent('contextmenu_blocked', {});
    };

    const visHandler = () => {
      if (document.hidden) {
        logEvent('tab_switch', { hidden: true });
      }
    };

    document.addEventListener('copy', handler);
    document.addEventListener('cut', handler);
    document.addEventListener('paste', handler);
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('contextmenu', contextHandler);
    document.addEventListener('visibilitychange', visHandler);

    return () => {
      document.removeEventListener('copy', handler);
      document.removeEventListener('cut', handler);
      document.removeEventListener('paste', handler);
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('contextmenu', contextHandler);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [enabled, logEvent]);
}
