import { HistoryEntry } from '../types/tablebase';
import { getCategoryTextColor, formatCategory } from '../utils/tablebase';

interface MoveHistoryProps {
  history: HistoryEntry[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function MoveHistory({ history, currentIndex, onNavigate }: MoveHistoryProps) {
  if (history.length <= 1) {
    return (
      <div className="text-center py-4 text-gray-400 text-xs">
        Make moves on the board to see history
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
      {history.map((entry, idx) => (
        <button
          key={idx}
          onClick={() => onNavigate(idx)}
          className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
            idx === currentIndex
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={entry.result ? formatCategory(entry.result.category) : undefined}
        >
          {entry.san || (idx === 0 ? 'Start' : `#${idx}`)}
          {entry.result && (
            <span className={`ml-1 ${idx === currentIndex ? 'text-blue-200' : getCategoryTextColor(entry.result.category)}`}>
              {entry.result.category === 'win' ? '✓' :
               entry.result.category === 'loss' ? '✗' :
               entry.result.category === 'draw' ? '½' : '?'}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
