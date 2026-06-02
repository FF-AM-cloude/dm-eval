import { useState } from 'react';
import Landing from './pages/Landing';
import Phase1Quiz from './pages/Phase1Quiz';
import Phase2IDE from './pages/Phase2IDE';
import Submitted from './pages/Submitted';

type Phase = 'landing' | 'phase1' | 'phase2' | 'submitted';

export default function App() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [sessionId, setSessionId] = useState('');
  const [candidateName, setCandidateName] = useState('');

  const handleStart = async (name: string, email: string) => {
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: name, candidate_email: email || null }),
      });
      const data = await resp.json();
      setSessionId(data.session_id);
      setCandidateName(name);
      setPhase('phase1');
    } catch (e) {
      alert('创建会话失败，请检查后端是否运行');
    }
  };

  const handlePhase1Complete = () => {
    setPhase('phase2');
  };

  const handleSubmit = () => {
    setPhase('submitted');
  };

  switch (phase) {
    case 'landing':
      return <Landing onStart={handleStart} />;
    case 'phase1':
      return <Phase1Quiz sessionId={sessionId} onComplete={handlePhase1Complete} />;
    case 'phase2':
      return <Phase2IDE sessionId={sessionId} candidateName={candidateName} onSubmit={handleSubmit} />;
    case 'submitted':
      return <Submitted />;
  }
}
