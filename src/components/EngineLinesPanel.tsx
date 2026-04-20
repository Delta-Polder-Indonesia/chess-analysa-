import { useState } from 'react';

interface EngineLineMove {
  uci: string;
  san: string;
  prefix: string;
}

export interface EngineLine {
  id: string;
  scoreLabel: string;
  moves: EngineLineMove[];
  source: 'api' | 'fallback';
}

interface EngineLinesPanelProps {
  lines: EngineLine[];
  isLoading: boolean;
  isEngineEnabled: boolean;
  showPv: boolean;
  onPlayLinePrefix: (lineId: string, plyCount: number) => void;
}

const COLLAPSED_PLY_COUNT = 12;

export default function EngineLinesPanel({
  lines,
  isLoading,
  isEngineEnabled,
  showPv,
  onPlayLinePrefix,
}: EngineLinesPanelProps) {
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});

  function toggleExpand(lineId: string) {
    setExpandedLineIds(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  }

  return (
    <div className="overflow-hidden rounded-sm border border-white/10 bg-black/20">
      <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-2 text-xs uppercase tracking-wide text-gray-500">
        <span>Engine Lines</span>
        <span className="text-[10px] text-gray-400">PV / MultiPV</span>
      </div>

      {!isEngineEnabled && (
        <div className="px-3 py-3 text-sm text-gray-500">Engine is OFF. Turn on engine in settings to see PV and MultiPV.</div>
      )}

      {isEngineEnabled && !showPv && (
        <div className="px-3 py-3 text-sm text-gray-500">Principal variation is hidden in engine settings.</div>
      )}

      {isEngineEnabled && showPv && (
        <div className="space-y-1 p-2">
          {isLoading && lines.length === 0 && (
            <div className="rounded-sm border border-blue-400/25 bg-blue-500/10 px-2 py-1.5 text-xs text-blue-100">
              Engine is calculating PV...
            </div>
          )}

          {!isLoading && lines.length === 0 && (
            <div className="rounded-sm border border-white/10 bg-black/15 px-2 py-2 text-xs text-gray-500">
              No PV line available for this position.
            </div>
          )}

          {lines.map((line, lineIndex) => {
            const expanded = Boolean(expandedLineIds[line.id]);
            const visibleMoves = expanded ? line.moves : line.moves.slice(0, COLLAPSED_PLY_COUNT);
            const hiddenCount = Math.max(0, line.moves.length - visibleMoves.length);

            return (
              <div key={line.id} className="rounded-sm border border-white/10 bg-black/15 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-11 shrink-0 rounded-sm bg-white text-center text-[13px] font-bold leading-6 text-[#181818]">
                    {line.scoreLabel}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">line {lineIndex + 1}</span>

                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="inline-flex min-w-full items-center gap-1 text-[13px] leading-5 text-gray-200 whitespace-nowrap">
                      {visibleMoves.map((move, moveIndex) => (
                        <button
                          key={`${line.id}-${moveIndex}-${move.uci}`}
                          onClick={() => onPlayLinePrefix(line.id, moveIndex + 1)}
                          className="shrink-0 rounded-sm px-1 py-0.5 hover:bg-white/10"
                        >
                          {move.prefix && <span className="mr-0.5 text-gray-400">{move.prefix}</span>}
                          <span>{move.san}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {line.moves.length > COLLAPSED_PLY_COUNT && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(line.id)}
                      aria-label={expanded ? 'Show less moves' : 'Show more moves'}
                      className="inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border border-white/12 bg-white/6 px-1.5 text-[10px] uppercase tracking-wide text-gray-300 hover:bg-white/12"
                    >
                      <span>{expanded ? 'Less' : `More${hiddenCount > 0 ? ` ${hiddenCount}` : ''}`}</span>
                      <svg
                        className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}