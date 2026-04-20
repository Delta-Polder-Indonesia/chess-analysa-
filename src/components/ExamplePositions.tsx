import { EXAMPLE_POSITIONS } from '../utils/tablebase';

interface ExamplePositionsProps {
  onSelect: (fen: string) => void;
}

export default function ExamplePositions({ onSelect }: ExamplePositionsProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Example Positions
      </h3>
      <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
        {EXAMPLE_POSITIONS.map((pos, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(pos.fen)}
            className="flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-colors group"
          >
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
              {pos.pieces}♟
            </span>
            <span className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors font-medium">
              {pos.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
