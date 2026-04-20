import { TablebaseResult } from '../types/tablebase';
import { getCategoryColor, formatCategory, getCategoryIconSrc } from '../utils/tablebase';

interface PositionInfoProps {
  result: TablebaseResult | null;
  isLoading: boolean;
  error: string | null;
  pieceCount: number;
}

export default function PositionInfo({ result, isLoading, error, pieceCount }: PositionInfoProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm">Querying Lichess tablebase…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <div className="flex items-center gap-2 text-red-700">
          <span>⚠️</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center">
          {pieceCount > 7
            ? `⚠️ Position has ${pieceCount} pieces. Tablebase supports up to 7 pieces.`
            : 'Enter a position or make a move to query the tablebase.'}
        </p>
      </div>
    );
  }

  const isTerminal = result.checkmate || result.stalemate || result.insufficient_material;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Category Banner */}
      <div className={`p-3 ${getCategoryColor(result.category)} flex items-center gap-3`}>
        <img src={getCategoryIconSrc(result.category)} alt="" className="w-8 h-8 object-contain" />
        <div>
          <div className="font-bold text-lg leading-tight">{formatCategory(result.category)}</div>
          {isTerminal && (
            <div className="text-xs opacity-90">
              {result.checkmate ? 'Checkmate' : result.stalemate ? 'Stalemate' : 'Insufficient Material'}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="p-3 grid grid-cols-3 gap-2">
        <MetricBox label="DTZ" value={result.dtz} tooltip="Distance to Zero (DTZ50'')" />
        <MetricBox label="Precise DTZ" value={result.precise_dtz} tooltip="Unrounded DTZ50''" />
        <MetricBox label="DTM" value={result.dtm} tooltip="Depth to Mate" />
        <MetricBox label="DTC" value={result.dtc} tooltip="Depth to Conversion" />
        <div className="col-span-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 space-y-0.5">
            {result.checkmate && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Checkmate</div>}
            {result.stalemate && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />Stalemate</div>}
            {result.insufficient_material && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Insufficient material</div>}
            {!isTerminal && result.moves.length > 0 && (
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{result.moves.length} legal moves</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, tooltip }: { label: string; value: number | null | undefined; tooltip: string }) {
  return (
    <div
      className="bg-gray-50 rounded-lg p-2 text-center"
      title={tooltip}
    >
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">
        {value !== null && value !== undefined ? value : <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}
