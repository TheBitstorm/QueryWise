import React, { useRef } from 'react';
import { Database, Copy, Check, Trash2, Code2 } from 'lucide-react';

export default function SqlEditor({
  value,
  onChange,
  placeholder = 'Enter read-only SQL query (SELECT ...) here...',
  height = 'h-52',
  readOnly = false,
  label = 'PostgreSQL Query Editor',
}) {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef(null);

  const lines = (value || '').split('\n');
  const lineCount = Math.max(1, lines.length);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (onChange && !readOnly) {
      onChange('');
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-[#4F46E5] dark:focus-within:ring-[#818CF8] focus-within:border-transparent transition-all">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
        <div className="flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
          <span className="text-xs font-semibold text-[#172033] dark:text-[#F1F5F9]">{label}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]">
            PostgreSQL Dialect
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Copy SQL"
            >
              {copied ? <Check className="w-3 h-3 text-[#16A34A] dark:text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {!readOnly && value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="Clear Editor"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className={`relative flex font-mono text-xs ${height} bg-white dark:bg-[#0B1120]`}>
        {/* Line numbers column */}
        <div className="select-none py-3 pl-3 pr-2 text-right bg-[#F8FAFC] dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#334155] text-[#94A3B8] dark:text-[#64748B] min-w-[36px]">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck="false"
          className="flex-1 p-3 leading-5 bg-transparent resize-none border-0 outline-none text-[#172033] dark:text-[#F1F5F9] placeholder:text-[#94A3B8] focus:ring-0 whitespace-pre overflow-auto font-mono text-xs"
        />
      </div>

      {/* Editor Footer Status */}
      <div className="flex items-center justify-between px-3 py-1 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#334155]">
        <div className="flex items-center space-x-3">
          <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          <span>{(value || '').length} chars</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]" />
          <span>Read-Only Protected</span>
        </div>
      </div>
    </div>
  );
}

