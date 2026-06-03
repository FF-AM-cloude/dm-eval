import { useState, useEffect } from 'react';
import TestGuide from './components/TestGuide';
import Landing from './pages/Landing';
import Phase1Quiz from './pages/Phase1Quiz';
import Phase2IDE from './pages/Phase2IDE';
import Submitted from './pages/Submitted';
import Report from './pages/Report';

type Phase = 'landing' | 'phase1' | 'phase2' | 'submitted' | 'report';

function getInitialState(): { phase: Phase; sessionId: string } {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get('session');
  const page = params.get('page');

  if (page === 'report') return { phase: 'report', sessionId: '' };
  if (sid) {
    const p = params.get('phase');
    if (p === '2') return { phase: 'phase2', sessionId: sid };
    return { phase: 'phase1', sessionId: sid };
  }
  return { phase: 'landing', sessionId: '' };
}

export default function App() {
  const initial = getInitialState();
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [sessionId, setSessionId] = useState(initial.sessionId);
  const [candidateName, setCandidateName] = useState('');

  useEffect(() => {
    if (phase === 'report') {
      window.history.replaceState({}, '', '?page=report');
    } else if (sessionId) {
      const p = phase === 'phase2' ? '2' : '1';
      window.history.replaceState({}, '', `?session=${sessionId}&phase=${p}`);
    }
  }, [phase, sessionId]);

  const handleStart = async (name: string) => {
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: name }),
      });
      const data = await resp.json();
      setSessionId(data.session_id);
      setCandidateName(name);
      setPhase('phase1');
    } catch {
      alert('创建会话失败');
    }
  };

  return (
    <>
      <TestGuide />
      {(() => {
        switch (phase) {
          case 'landing':
            return <Landing onStart={handleStart} />;
          case 'phase1':
            return <Phase1Quiz sessionId={sessionId} onComplete={() => setPhase('phase2')} />;
          case 'phase2':
            return <Phase2IDE sessionId={sessionId} candidateName={candidateName} onSubmit={() => setPhase('submitted')} />;
          case 'submitted':
            return <Submitted />;
          case 'report':
            return <Report />;
        }
      })()}
    </>
  );
}
