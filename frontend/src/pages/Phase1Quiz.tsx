import { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import CanvasQuestion from '../components/CanvasQuestion';
import CountdownTimer from '../components/CountdownTimer';
import { useTimer } from '../hooks/useTimer';
import { useClipboardGuard } from '../hooks/useClipboardGuard';
import { useEventLogger } from '../hooks/useEventLogger';

interface Phase1QuizProps {
  sessionId: string;
  onComplete: () => void;
}

export default function Phase1Quiz({ sessionId, onComplete }: Phase1QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { logEvent } = useEventLogger(sessionId, 1);

  useClipboardGuard(true, logEvent);

  const currentQ = questions[currentIndex];
  const total = questions.length;

  const handleExpire = useCallback(() => {
    handleAnswer(-1); // -1 = 超时未答
  }, [currentIndex]);

  const { seconds, reset } = useTimer(30, handleExpire);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (currentQ) reset(currentQ.time_limit_sec);
  }, [currentIndex, currentQ]);

  const fetchQuestions = async () => {
    try {
      const resp = await fetch(`/api/quiz/questions?session_id=${sessionId}`);
      const data = await resp.json();
      if (data.questions) {
        setQuestions(data.questions);
        reset(data.questions[0]?.time_limit_sec || 30);
      } else {
        setError('Failed to load questions');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleAnswer = async (answerIndex: number) => {
    if (submitting || !currentQ) return;
    setSubmitting(true);

    try {
      await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQ.id,
          answer: String(answerIndex),
          time_spent_ms: (currentQ.time_limit_sec - seconds) * 1000,
        }),
      });
    } catch {}

    if (currentIndex >= total - 1) {
      // All questions answered
      await fetch(`/api/quiz/complete?session_id=${sessionId}`, { method: 'POST' });
      onComplete();
    } else {
      setCurrentIndex(i => i + 1);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8b949e' }}>
        加载题目中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#da3633' }}>
        {error}
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8b949e' }}>
        没有题目
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* 进度 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '13px',
          color: '#8b949e',
        }}>
          <span>第 {currentIndex + 1}/{total} 题</span>
          <span>{currentQ.category} · {currentQ.difficulty}</span>
        </div>

        {/* 倒计时 */}
        <CountdownTimer seconds={seconds} total={currentQ.time_limit_sec} />

        {/* 题目内容 */}
        <div style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '24px',
          marginTop: '12px',
        }}>
          <h2 style={{ fontSize: '16px', color: '#c9d1d9', marginBottom: '16px', lineHeight: 1.5 }}>
            {currentQ.question}
          </h2>

          {currentQ.code && <CanvasQuestion code={currentQ.code} />}

          {/* 选项 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={submitting}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#c9d1d9',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#58a6ff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#30363d'}
              >
                {String.fromCharCode(65 + idx)}. {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
