import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EngineLinesPanel, { EngineLine } from './EngineLinesPanel';
import MoveList from './MoveList';
import OpeningExplorer from './OpeningExplorer';
import { OpeningFamily, OpeningLine } from '../data/openingBook';
import { openings as fullOpeningsList } from '../data/openings';
import { TablebaseResult, Variant, HistoryEntry } from '../types/tablebase';
import { formatCategory } from '../utils/tablebase';

interface HistoryRow {
  moveNumber: number;
  whiteMove?: HistoryEntry;
  blackMove?: HistoryEntry;
  whiteIndex?: number;
  blackIndex?: number;
}

interface AnalysisSidePanelProps {
  variant: Variant;
  variants: Variant[];
  autoQuery: boolean;
  activeTab: 'analysis' | 'games' | 'explore';
  setActiveTab: (tab: 'analysis' | 'games' | 'explore') => void;
  isLoading: boolean;
  isEngineLoading: boolean;
  errorText: string;
  limitError: string | null;
  depthLabel: string;
  onQuery: () => void;
  onOpenEngineSettings: () => void;
  onChangeVariant: (variant: Variant) => void;
  onFlip: () => void;
  onToggleAuto: () => void;
  result: TablebaseResult | null;
  topMoves: Array<{ uci: string; san: string; scoreLabel: string; source: 'tb' | 'engine' }>;
  onPlayMove: (move: { uci: string; san?: string }) => void;
  engineLines: EngineLine[];
  isEngineEnabled: boolean;
  showPv: boolean;
  onPlayLinePrefix: (lineId: string, plyCount: number) => void;
  historyRows: HistoryRow[];
  history: HistoryEntry[];
  historyIndex: number;
  onNavigate: (index: number) => void;
  openings: OpeningFamily[];
  onLoadOpeningLine: (line: OpeningLine) => void;
  onNew: () => void;
  onCopyFen: () => void;
  onReview: () => void;
}

export default function AnalysisSidePanel({
  variant,
  variants,
  autoQuery,
  activeTab,
  setActiveTab,
  isLoading,
  isEngineLoading,
  errorText,
  limitError,
  depthLabel,
  onQuery,
  onOpenEngineSettings,
  onChangeVariant,
  onFlip,
  onToggleAuto,
  result,
  topMoves,
  onPlayMove,
  engineLines,
  isEngineEnabled,
  showPv,
  onPlayLinePrefix,
  historyRows,
  history,
  historyIndex,
  onNavigate,
  openings,
  onLoadOpeningLine,
  onNew,
  onCopyFen,
  onReview,
}: AnalysisSidePanelProps) {
  const currentFen = history[historyIndex]?.fen || '';
  const boardFen = currentFen.split(' ')[0];

  // Track the last known opening name so it persists into mid-game.
  // It only resets when history is reset to a single entry (new game).
  const lastOpeningRef = useRef<string | null>(null);

  const liveOpening = useMemo(() => {
    if (!boardFen) return null;
    const opening = fullOpeningsList.find(op => op.fen.split(' ')[0] === boardFen);
    return opening ? opening.name : null;
  }, [boardFen]);

  // When the opening book matches a position, save it
  useEffect(() => {
    if (liveOpening) {
      lastOpeningRef.current = liveOpening;
    }
  }, [liveOpening]);

  // Reset the saved opening name when a new game starts (history collapses to 1 entry)
  useEffect(() => {
    if (history.length <= 1) {
      lastOpeningRef.current = null;
    }
  }, [history.length]);

  // Use the live match if available, otherwise fall back to the last known opening
  const currentOpening = liveOpening ?? lastOpeningRef.current;

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[#1d1d1c]">
      <div className="space-y-2 border-b border-white/10 px-3 py-2.5 lg:px-4 lg:py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold leading-none lg:text-[32px]">Analysis</h1>
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500">tablebase.lichess.ovh</div>
            {currentOpening && (
              <div className="text-[11px] font-semibold text-[#7fa650] max-w-[200px] truncate" title={currentOpening}>
                {currentOpening}
              </div>
            )}
          </div>
        </div>
        <div className="custom-scrollbar overflow-x-auto pb-1">
          <div className="flex w-max items-center gap-1.5 whitespace-nowrap text-[10px] md:text-[11px]">
            {variants.map(v => (
              <button
                key={v}
                onClick={() => onChangeVariant(v)}
                className={`rounded-sm px-2 py-1 font-semibold uppercase leading-none tracking-wide lg:px-2.5 ${variant === v ? 'bg-[#7fa650] text-[#101010]' : 'bg-white/8 text-gray-300 hover:bg-white/14'
                  }`}
              >
                {v}
              </button>
            ))}

            <button
              onClick={onFlip}
              className="rounded-sm bg-white/8 px-2 py-1 leading-none text-gray-200 hover:bg-white/14 lg:px-2.5"
            >
              Flip
            </button>

            <button
              onClick={onToggleAuto}
              className={`rounded-sm px-2 py-1 leading-none lg:px-2.5 ${autoQuery ? 'bg-blue-600 text-white' : 'bg-white/8 text-gray-200 hover:bg-white/14'
                }`}
            >
              Auto {autoQuery ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-white/10 bg-[#232321] text-xs">
        {(['analysis', 'games', 'explore'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 uppercase tracking-wide ${activeTab === tab ? 'bg-white/8 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-white/10 bg-[#222220] px-3.5 py-2 text-sm">
        <span className={errorText ? 'text-red-300' : 'text-gray-300'}>
          {errorText || (result ? formatCategory(result.category) : 'Ready to analyze')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{depthLabel}</span>
          {!autoQuery && (
            <button
              onClick={onQuery}
              className="rounded-sm bg-[#7fa650] px-2 py-1 text-[11px] font-semibold text-[#0f1705] disabled:opacity-40"
              disabled={isLoading}
            >
              Query
            </button>
          )}
          <button
            onClick={onOpenEngineSettings}
            className="rounded-sm p-1 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Engine settings"
            aria-label="Open engine settings"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm8-3.5-.98-.56a1 1 0 0 1-.48-1.17l.2-1.09a1 1 0 0 0-.61-1.11l-1.02-.39a1 1 0 0 1-.61-.87L16.42 5a1 1 0 0 0-.96-.76h-1.13a1 1 0 0 1-.95-.69l-.37-1.06a1 1 0 0 0-1.9 0l-.37 1.06a1 1 0 0 1-.95.7H8.66A1 1 0 0 0 7.7 5l-.08 1.16a1 1 0 0 1-.61.87l-1.02.39a1 1 0 0 0-.61 1.1l.2 1.1a1 1 0 0 1-.48 1.16L4 12l.98.56a1 1 0 0 1 .48 1.17l-.2 1.09a1 1 0 0 0 .61 1.11l1.02.39a1 1 0 0 1 .61.87L7.58 19a1 1 0 0 0 .96.76h1.13a1 1 0 0 1 .95.69l.37 1.06a1 1 0 0 0 1.9 0l.37-1.06a1 1 0 0 1 .95-.69h1.13a1 1 0 0 0 .96-.76l.08-1.16a1 1 0 0 1 .61-.87l1.02-.39a1 1 0 0 0 .61-1.1l-.2-1.1a1 1 0 0 1 .48-1.16L20 12Z"
              />
            </svg>
          </button>
          {(isLoading || isEngineLoading) && (
            <div className="flex items-center gap-1 rounded-sm bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
              Updating
            </div>
          )}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 p-3"
            >
              <EngineLinesPanel
                lines={engineLines}
                isLoading={isEngineLoading}
                isEngineEnabled={isEngineEnabled}
                showPv={showPv}
                onPlayLinePrefix={onPlayLinePrefix}
              />

              <div className="overflow-hidden rounded-sm border border-white/10 bg-black/20">
                <div className="border-b border-white/10 px-2.5 py-2 text-xs uppercase tracking-wide text-gray-500">White - Black</div>
                <div className="custom-scrollbar max-h-56 overflow-y-auto">
                  {historyRows.length === 0 && <div className="p-3 text-sm text-gray-500">No moves yet</div>}
                  {historyRows.map(row => (
                    <div key={row.moveNumber} className="grid grid-cols-[36px_1fr_1fr] border-b border-white/5 text-sm last:border-0">
                      <div className="px-2 py-1.5 text-gray-500">{row.moveNumber}.</div>
                      <button
                        onClick={() => row.whiteIndex !== undefined && onNavigate(row.whiteIndex)}
                        className={`px-2 py-1.5 text-left ${row.whiteIndex === historyIndex ? 'bg-white/12 text-white' : 'text-gray-300 hover:bg-white/7'
                          }`}
                      >
                        {row.whiteMove?.san || '-'}
                      </button>
                      <button
                        onClick={() => row.blackIndex !== undefined && row.blackIndex < history.length && onNavigate(row.blackIndex)}
                        className={`px-2 py-1.5 text-left ${row.blackIndex === historyIndex ? 'bg-white/12 text-white' : 'text-gray-300 hover:bg-white/7'
                          }`}
                      >
                        {row.blackMove?.san || '-'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 p-3"
            >
              {isLoading && (
                <div className="rounded-sm border border-blue-400/25 bg-blue-500/10 px-2 py-1.5 text-xs text-blue-100">
                  Refreshing tablebase lines...
                </div>
              )}

              {limitError && (
                <div className="rounded-sm border border-amber-400/25 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
                  {limitError}
                </div>
              )}

              <div className="space-y-1.5">
                {topMoves.length === 0 && (
                  <div className="rounded-sm border border-white/10 bg-black/20 px-2 py-2 text-xs text-gray-500">
                    No principal line available yet.
                  </div>
                )}

                {topMoves.map((move, index) => (
                  <button
                    key={`${move.uci}-${index}`}
                    onClick={() => onPlayMove(move)}
                    className="flex w-full items-center gap-2 rounded-sm border border-white/10 bg-black/15 px-2 py-1.5 text-left text-sm hover:bg-white/10"
                  >
                    <span className="w-11 rounded-sm bg-white text-center text-[13px] font-bold leading-6 text-[#181818]">
                      {move.scoreLabel}
                    </span>
                    <span className="truncate font-medium text-gray-200">{move.san}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">
                      {move.source === 'tb' ? 'tb' : 'eng'} {move.uci}
                    </span>
                  </button>
                ))}
              </div>

              {result ? (
                <>
                  <MoveList moves={result.moves} onMoveClick={onPlayMove} />
                  <div className="rounded-sm border border-white/10 bg-black/20 p-2 text-sm text-gray-300">
                    DTZ: {result.dtz ?? '-'} | DTM: {result.dtm ?? '-'} | DTC: {result.dtc ?? '-'}
                  </div>
                </>
              ) : (
                <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-sm text-gray-400">
                  {isLoading ? 'Querying tablebase...' : 'Make a move or load a FEN position to show tablebase panel.'}
                </div>
              )}

              <div className="rounded-sm border border-white/10 bg-black/20 p-3 text-xs text-gray-400">
                Keyboard: Left/Right to step, Home/End for first and last move.
              </div>
            </motion.div>
          )}

          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="motion-panel h-full"
            >
              <OpeningExplorer openings={openings} onLoadLine={onLoadOpeningLine} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2 border-t border-white/10 bg-[#20201e] p-3">
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => onNavigate(0)} disabled={historyIndex === 0} className="rounded-md bg-white/8 py-2 hover:bg-white/14 disabled:opacity-30">
            |&lt;
          </button>
          <button onClick={() => onNavigate(Math.max(0, historyIndex - 1))} disabled={historyIndex === 0} className="rounded-md bg-white/8 py-2 hover:bg-white/14 disabled:opacity-30">
            &lt;
          </button>
          <button onClick={() => onNavigate(Math.min(history.length - 1, historyIndex + 1))} disabled={historyIndex >= history.length - 1} className="rounded-md bg-white/8 py-2 hover:bg-white/14 disabled:opacity-30">
            &gt;
          </button>
          <button onClick={() => onNavigate(history.length - 1)} disabled={historyIndex >= history.length - 1} className="rounded-md bg-white/8 py-2 hover:bg-white/14 disabled:opacity-30">
            &gt;|
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <button onClick={onNew} className="rounded-md bg-white/8 py-2 hover:bg-white/14">
            New
          </button>
          <button onClick={onCopyFen} className="rounded-md bg-white/8 py-2 hover:bg-white/14">
            Copy FEN
          </button>
          <button onClick={onReview} className="rounded-md bg-white/8 py-2 hover:bg-white/14">
            Review
          </button>
        </div>
      </div>
    </aside>
  );
}
