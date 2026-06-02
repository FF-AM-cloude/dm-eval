const KEYWORDS = [
  'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import',
  'from', 'as', 'try', 'except', 'finally', 'with', 'in', 'not', 'and', 'or',
  'True', 'False', 'None', 'print', 'range', 'len', 'type', 'self',
  'async', 'await', 'nonlocal', 'global', 'lambda', 'yield', 'raise', 'pass',
];

function drawSyntaxHighlightedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  fontSize: number
) {
  // Tokenize by splitting on spaces and punctuation
  const tokens = line.split(/(\b|\s+|(?=[^\w\s])|(?<=[^\w\s]))/);
  let curX = x;

  for (const token of tokens) {
    if (!token) continue;

    if (token.trim() === '') {
      curX += ctx.measureText(token).width;
      continue;
    }

    if (token.startsWith('#')) {
      ctx.fillStyle = '#6a9955';
    } else if (KEYWORDS.includes(token)) {
      ctx.fillStyle = '#569cd6';
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('f"') || token.startsWith("f'")) {
      ctx.fillStyle = '#ce9178';
    } else if (/^\d+$/.test(token)) {
      ctx.fillStyle = '#b5cea8';
    } else {
      ctx.fillStyle = '#d4d4d4';
    }

    ctx.fillText(token, curX, y);
    curX += ctx.measureText(token).width;
  }
}

export function renderCodeOnCanvas(
  canvas: HTMLCanvasElement,
  code: string,
  options: { fontSize: number; fontFamily: string; lineHeight: number }
) {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  // Background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  // Code
  ctx.font = `${options.fontSize}px ${options.fontFamily}`;
  ctx.textBaseline = 'top';

  const lines = code.split('\n');
  const maxVisibleLines = Math.floor(canvas.clientHeight / options.lineHeight);
  const visibleLines = lines.slice(0, maxVisibleLines);

  visibleLines.forEach((line, i) => {
    drawSyntaxHighlightedLine(ctx, line, 16, 16 + i * options.lineHeight, options.fontSize);
  });
}
