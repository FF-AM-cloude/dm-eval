import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  code: string;
  onChange?: (code: string | undefined) => void;
  language?: string;
  readonly?: boolean;
  height?: string;
}

export default function MonacoEditor({
  code,
  onChange,
  language = 'python',
  readonly = false,
  height = '400px',
}: MonacoEditorProps) {
  return (
    <Editor
      height={height}
      language={language}
      value={code}
      onChange={onChange}
      theme="vs-dark"
      options={{
        readOnly: readonly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 8 },
      }}
    />
  );
}
