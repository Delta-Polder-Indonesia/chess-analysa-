import { motion } from 'framer-motion';
import ChessBoardPanel from './ChessBoardPanel';
import EvaluationBar from './EvaluationBar';
import FenInput from './FenInput';
import { EXAMPLE_POSITIONS } from '../utils/tablebase';

interface AnalysisBoardSectionProps {
  orientation: 'white' | 'black';
  variantLabel: string;
  fen: string;
  isLoading: boolean;
  isEngineEnabled: boolean;
  evaluation: { score: number | null; label: string };
  onFenChange: (fen: string, san?: string, uci?: string) => void;
  suggestionMoves: Array<{ uci: string; side?: 'player' | 'opponent' }>;
  maxSuggestionArrows: number;
  onFenSubmit: (fen: string) => void;
  onReset: () => void;
  initialFen: string;
}

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
}: AnalysisBoardSectionProps) {
  return (
    <section className="min-h-0 rounded-md border border-white/10 bg-[#2f2d2a] px-3 py-3 lg:px-4">
      <div className="flex h-full min-h-0 flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5 text-sm font-semibold text-gray-100">
          <span>{orientation === 'white' ? 'Black' : 'White'}</span>
          <span className="text-xs font-medium text-gray-400">{variantLabel} tablebase</span>
        </div>

        <motion.div
          layout
          className="flex flex-1 min-h-0 items-center justify-center"
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="flex h-full w-full items-center justify-center gap-2">
            <motion.div
              className="flex h-[min(calc(100vh-220px),900px)] w-[min(calc(100vh-220px),900px)] max-h-full max-w-full items-stretch gap-2"
              animate={{ scale: isLoading ? 0.996 : 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <EvaluationBar
                score={evaluation.score}
                label={evaluation.label}
                isEngineEnabled={isEngineEnabled}
                isLoading={isLoading}
              />
              <div className="aspect-square flex-1">
                <ChessBoardPanel
                  fen={fen}
                  onFenChange={onFenChange}
                  tablebaseResult={null}
                  suggestionMoves={suggestionMoves}
                  isLoading={isLoading}
                  maxSuggestionArrows={maxSuggestionArrows}
                  orientation={orientation}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="px-0.5 text-sm font-semibold text-gray-100">{orientation === 'white' ? 'White' : 'Black'}</div>

        <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-2">
          <FenInput fen={fen} onFenSubmit={onFenSubmit} onReset={onReset} initialFen={initialFen} />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_POSITIONS.slice(0, 5).map(example => (
              <button
                key={example.fen}
                onClick={() => onFenSubmit(example.fen)}
                className="rounded-sm bg-white/8 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/14"
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
