import { TablebaseMove } from '../types/tablebase';
import { getCategoryBadgeColor, formatCategory, getCategoryIconSrc } from '../utils/tablebase';

interface MoveListProps {
  moves: TablebaseMove[];
  onMoveClick: (move: TablebaseMove) => void;
}

export default function MoveList({ moves, onMoveClick }: MoveListProps) {
  if (!moves || moves.length === 0) {
    return (
      <div className="text-center py-5 text-gray-500 text-sm border border-white/10 rounded-md bg-black/20">
        No legal moves
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar border border-white/10 rounded-sm bg-black/15 p-1.5">
      {moves.map((move, idx) => (
        <button
          key={idx}
          onClick={() => onMoveClick(move)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-white/7 transition-colors group text-left border border-white/5"
        >
          <span className="text-xs text-[#181818] w-12 text-center flex-shrink-0 font-semibold bg-white rounded-sm py-0.5">
            {(move.dtz ?? 0) >= 0 ? '+' : ''}{move.dtz ?? 0}
          </span>

          <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
            <span className="font-mono font-semibold text-gray-100 group-hover:text-blue-300 transition-colors">
              {move.san}
            </span>
            <img src={getCategoryIconSrc(move.category)} alt="" className="w-3.5 h-3.5 object-contain" />
          </div>

          <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0 ${getCategoryBadgeColor(move.category)}`}>
            {formatCategory(move.category)}
          </span>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
            {move.dtm !== null && move.dtm !== undefined && (
              <span className="font-mono" title="Depth to Mate">
                DTM <span className="font-semibold text-gray-200">{Math.abs(move.dtm)}</span>
              </span>
            )}
            {move.dtz !== null && move.dtz !== undefined && (
              <span className="font-mono" title="Distance to Zero (DTZ50'')">
                DTZ <span className="font-semibold text-gray-200">{move.dtz}</span>
              </span>
            )}
            {move.zeroing && (
              <span className="text-blue-500 text-xs" title="Zeroing move (pawn move or capture)">Z</span>
            )}
            <span className="text-gray-600">#{idx + 1}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
