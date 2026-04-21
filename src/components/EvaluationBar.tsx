// ─────────────────────────────────────────────────────────────
// EvaluationBar.tsx
// Chess.com-style vertical evaluation bar
// score = always white perspective (+white advantage, -black advantage)
// mate  = positive = white mates, negative = black mates
// ─────────────────────────────────────────────────────────────

interface EvaluationBarProps {
  score: number | null;       // centipawns, white perspective
  label: string;              // display string e.g. "+1.20" or "#3"
  isEngineEnabled: boolean;
  isLoading: boolean;
  mate?: number | null;
  turn?: 'w' | 'b';           // giliran siapa sekarang
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getWinPercentageFromCp(cp: number): number {
  const cpClamped = Math.max(-1000, Math.min(1000, cp));
  const winChances = 2 / (1 + Math.exp(-0.00368208 * cpClamped)) - 1;
  return 50 + 50 * winChances;
}

function buildScoreLabel(
  score: number | null,
  mate: number | null | undefined,
  isEngineEnabled: boolean,
  isLoading: boolean,
  label: string,
): string {
  if (!isEngineEnabled) return 'OFF';
  if (isLoading) return '...';
  if (mate !== null && mate !== undefined) {
    return `#${Math.abs(mate)}`;
  }
  if (score === null) return '--';
  return label;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function EvaluationBar({
  score,
  label,
  isEngineEnabled,
  isLoading,
  mate,
  turn = 'w',
}: EvaluationBarProps) {
  const isMate = mate !== null && mate !== undefined;
  const isOff = !isEngineEnabled;
  const isBlackTurn = turn === 'b';

  // ── Compute white fill percentage ──────────────────────────
  let whitePercent = 50;
  if (isMate) {
    whitePercent = mate! > 0 ? 100 : 0;
  } else if (score !== null && !isOff) {
    whitePercent = getWinPercentageFromCp(score);
  }

  // Clamp so the bar never fully disappears (min 4px visual presence)
  const whitePercentClamped = Math.max(2, Math.min(98, whitePercent));
  const blackPercentClamped = 100 - whitePercentClamped;

  // ── Saat giliran HITAM, balik logika tampilan ─────────────
  // Jika hitam yang main, hitam di bawah (seperti perspektif hitam)
  const bottomPercent = isBlackTurn ? whitePercentClamped : blackPercentClamped;
  const topPercent = isBlackTurn ? blackPercentClamped : whitePercentClamped;
  const isBottomAdvantage = isBlackTurn
    ? whitePercent < 50   // hitam unggul = bottom (hitam) besar
    : whitePercent >= 50;  // putih unggul = bottom (putih) besar

  const scoreLabel = buildScoreLabel(score, mate, isEngineEnabled, isLoading, label);

  // ── Score label color ───────────────────────────────────────
  const labelTextColor = isBottomAdvantage
    ? 'text-[#1a1a1a]'
    : 'text-gray-100';

  // ── Mate accent color ───────────────────────────────────────
  const whiteBackground = isMate && mate! > 0
    ? 'linear-gradient(to bottom, #16a34a, #15803d)'
    : 'linear-gradient(to bottom, #f5f5f5, #e0e0e0)';

  const blackBackground = isMate && mate! < 0
    ? 'linear-gradient(to top, #16a34a, #15803d)'
    : 'linear-gradient(to top, #383838, #4a4a4a)';

  // ── Background untuk top dan bottom section ────────────────
  const topBackground = isBlackTurn ? whiteBackground : blackBackground;
  const bottomBackground = isBlackTurn ? blackBackground : whiteBackground;

  return (
    <div className="flex h-full w-6 sm:w-7 flex-col items-center">
      {/* ── Score label above bar ─────────────────────────── */}
      <div
        className={`
          mb-1 min-h-[18px] text-center text-[10px] font-bold leading-none tracking-tight
          ${labelTextColor}
        `}
      >
        <span
          className={`
            rounded px-0.5 py-px
            ${isBottomAdvantage
              ? 'bg-[#f5f5f5] text-[#1a1a1a]'
              : 'bg-[#383838] text-gray-100'}
            ${isMate ? '!bg-green-700 !text-white animate-pulse' : ''}
            ${isLoading ? 'opacity-50' : ''}
          `}
        >
          {scoreLabel}
        </span>
      </div>

      {/* ── Bar ──────────────────────────────────────────────── */}
      <div
        className="relative flex flex-1 w-full flex-col overflow-hidden rounded-[5px] border border-black/70 shadow-lg"
        style={{ minHeight: 240 }}
      >
        {/* TOP section */}
        <div
          className="w-full flex-shrink-0 transition-[height] duration-500 ease-out"
          style={{
            height: `${topPercent}%`,
            background: topBackground,
          }}
        />

        {/* Divider line */}
        <div className="absolute left-0 right-0 z-10 h-px bg-black/40"
          style={{ top: `${topPercent}%` }}
        />

        {/* BOTTOM section */}
        <div
          className="w-full flex-shrink-0 transition-[height] duration-500 ease-out"
          style={{
            height: `${bottomPercent}%`,
            background: bottomBackground,
          }}
        />

        {/* Engine off overlay */}
        {isOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span
              className="rotate-[-90deg] select-none whitespace-nowrap text-[9px] font-semibold uppercase tracking-widest text-gray-400"
            >
              Engine Off
            </span>
          </div>
        )}

        {/* Loading shimmer */}
        {isLoading && !isOff && (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}
      </div>
    </div>
  );
}