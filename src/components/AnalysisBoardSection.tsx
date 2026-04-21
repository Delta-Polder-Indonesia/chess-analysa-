import { motion } from 'framer-motion';
import ChessBoardPanel from './ChessBoardPanel';
import EvaluationBar from './EvaluationBar';
import FenInput from './FenInput';
import { EXAMPLE_POSITIONS } from '../utils/tablebase';
import { MoveClassification } from '../features/analysis/engine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type EvaluationInfo = {
  score: number | null;
  label: string;
  mate?: number | null;
};

interface AnalysisBoardSectionProps {
  orientation: 'white' | 'black';
  variantLabel: string;
  fen: string;
  isLoading: boolean;
  isEngineEnabled: boolean;
  evaluation: EvaluationInfo;
  onFenChange: (fen: string, san?: string, uci?: string) => void;
  suggestionMoves: Array<{ uci: string; side?: 'player' | 'opponent' }>;
  maxSuggestionArrows: number;
  onFenSubmit: (fen: string) => void;
  onReset: () => void;
  initialFen: string;
  boardResetKey: number;
  lastMoveClassification?: MoveClassification | null;
  lastMoveUci?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Player Label
// ─────────────────────────────────────────────────────────────

function PlayerLabel({ side }: { side: 'white' | 'black' }) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <div
        className="h-3.5 w-3.5 rounded-sm border border-white/20"
        style={{ background: side === 'white' ? '#f0d9b5' : '#2c2c2c' }}
      />
      <span className="text-sm font-semibold text-gray-100 capitalize">
        {side}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function AnalysisBoardSection({
  orientation,
  variantLabel,
  fen,
  isLoading,
  isEngineEnabled,
  evaluation,
  onFenChange,
  suggestionMoves,
  maxSuggestionArrows,
  onFenSubmit,
  onReset,
  initialFen,
  boardResetKey,
  lastMoveClassification,
  lastMoveUci,
}: AnalysisBoardSectionProps) {
  // The opponent is shown at the top, player at the bottom
  const topSide = orientation === 'white' ? 'black' : 'white';
  const bottomSide = orientation;

  return (
    <section className="min-h-0 rounded-md border border-white/10 bg-[#2f2d2a] px-3 py-3 lg:px-4">
      <div className="flex h-full min-h-0 flex-col gap-2.5">

        {/* ── Top: Opponent label + variant badge ───────── */}
        <div className="flex items-center justify-between px-0.5">
          <PlayerLabel side={topSide} />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {variantLabel} tablebase
          </span>
        </div>

        {/* ── Board + Eval Bar ───────────────────────────── */}
        <motion.div
          layout
          className="flex flex-1 min-h-0 items-center justify-center"
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <motion.div
              className="flex h-[min(calc(100vh-220px),900px)] w-[min(calc(100vh-220px),900px)] max-h-full max-w-full items-stretch gap-2"
              animate={{ scale: isLoading ? 0.996 : 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Eval Bar — always white perspective */}
              <EvaluationBar
                score={evaluation.score}
                label={evaluation.label}
                mate={evaluation.mate ?? null}
                isEngineEnabled={isEngineEnabled}
                isLoading={isLoading}
              />

              {/* Chess Board */}
              <div className="aspect-square flex-1">
                <ChessBoardPanel
                  fen={fen}
                  onFenChange={onFenChange}
                  tablebaseResult={null}
                  suggestionMoves={suggestionMoves}
                  isLoading={isLoading}
                  maxSuggestionArrows={maxSuggestionArrows}
                  orientation={orientation}
                  boardResetKey={boardResetKey}
                  lastMoveClassification={lastMoveClassification ?? null}
                  lastMoveUci={lastMoveUci ?? null}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Bottom: Player label ───────────────────────── */}
        <PlayerLabel side={bottomSide} />

        {/* ── FEN Input + Example Positions ─────────────── */}
        <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-2">
          <FenInput
            fen={fen}
            onFenSubmit={onFenSubmit}
            onReset={onReset}
            initialFen={initialFen}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_POSITIONS.slice(0, 5).map((example) => (
              <button
                key={example.fen}
                onClick={() => onFenSubmit(example.fen)}
                className="rounded-sm bg-white/8 px-2 py-1 text-[11px] text-gray-200 transition-colors hover:bg-white/14"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}