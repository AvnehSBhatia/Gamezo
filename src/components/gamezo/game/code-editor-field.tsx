"use client";

interface CodeEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function CodeEditorField({ value, onChange, readOnly = false, placeholder }: CodeEditorFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      spellCheck={false}
      placeholder={placeholder}
      className="min-h-0 w-full flex-1 resize-none rounded-xl border-0 bg-white p-3 font-mono text-xs leading-relaxed text-neutral-800 outline-none ring-0 focus:ring-2 focus:ring-orange-200 disabled:cursor-default disabled:text-neutral-500"
    />
  );
}
