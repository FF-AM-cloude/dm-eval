import { useRef, useEffect } from 'react';
import { renderCodeOnCanvas } from '../utils/canvasRenderer';

interface CanvasQuestionProps {
  code: string;
  fontSize?: number;
}

export default function CanvasQuestion({ code, fontSize = 14 }: CanvasQuestionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    renderCodeOnCanvas(canvasRef.current, code, {
      fontSize,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      lineHeight: fontSize * 1.6,
    });
  }, [code, fontSize]);

  if (!code) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        minHeight: '80px',
        borderRadius: '8px',
        margin: '12px 0',
      }}
    />
  );
}
