import Editor from '@monaco-editor/react';

interface Props {
  code: string;
  onChange: (value: string | undefined) => void;
  height?: string;
  readOnly?: boolean;
}

export default function MonacoEditor({ code, onChange, height = '100%', readOnly = false }: Props) {
  return (
    <Editor
      height={height}
      defaultLanguage="python"
      theme="vs-dark"
      value={code}
      onChange={onChange}
      options={{
        fontSize: 14,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly,
        padding: { top: 12 },
      }}
    />
  );
}
