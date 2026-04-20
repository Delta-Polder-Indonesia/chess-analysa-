import { useEffect, useState } from 'react';

interface FenInputProps {
  fen: string;
  onFenSubmit: (fen: string) => void;
  onReset: () => void;
  initialFen: string;
}

export default function FenInput({ fen, onFenSubmit, onReset, initialFen }: FenInputProps) {
  const [inputValue, setInputValue] = useState(fen);
  const [error, setError] = useState('');

  useEffect(() => {
    setInputValue(fen);
  }, [fen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Please enter a FEN string');
      return;
    }
    setError('');
    onFenSubmit(trimmed);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text');
    if (text) {
      setInputValue(text.trim());
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
            }}
            onPaste={handlePaste}
            placeholder="Enter FEN string…"
            className="w-full px-3 py-2 text-sm font-mono border border-white/15 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#131313] text-gray-100 placeholder-gray-500"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          Load
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            setInputValue(initialFen);
          }}
          className="px-3 py-2 bg-white/10 text-gray-100 text-sm font-medium rounded-md hover:bg-white/20 transition-colors flex-shrink-0"
          title="Reset to starting position"
        >
          Reset
        </button>
      </form>

      <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-md px-3 py-1.5">
        <span className="text-xs text-gray-400 flex-shrink-0 font-medium">FEN:</span>
        <span
          className="text-xs font-mono text-gray-300 truncate flex-1 cursor-pointer"
          title={fen}
          onClick={() => {
            navigator.clipboard.writeText(fen).catch(() => {});
          }}
        >
          {fen}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(fen).catch(() => {})}
          className="text-gray-400 hover:text-gray-200 flex-shrink-0 transition-colors"
          title="Copy FEN to clipboard"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
