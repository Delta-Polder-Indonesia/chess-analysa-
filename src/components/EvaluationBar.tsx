interface EvaluationBarProps {
  score: number | null;
  label: string;
  isEngineEnabled: boolean;
  isLoading: boolean;
}

function formatScore(score: number | null): string {
  if (score === null) return '--';
  const display = Math.abs(score) >= 1000 ? (score / 100).toFixed(1) : (score / 100).toFixed(2);
  return `${score >= 0 ? '+' : ''}${display}`;
}

export default function EvaluationBar({ score, label, isEngineEnabled, isLoading }: EvaluationBarProps) {
  const normalized = score === null ? 0.5 : Math.max(0, Math.min(1, (Math.tanh(score / 380) + 1) / 2));
  const whitePercent = normalized * 100;

  return (
    <div className="flex h-full w-10 flex-col items-center gap-2">
      <div
        className={`relative h-full min-h-[280px] w-full overflow-hidden rounded-sm border border-white/15 ${
          isEngineEnabled ? 'opacity-100' : 'opacity-45'
        }`}
      >
        <div
          className="absolute inset-x-0 top-0 bg-[#111111] transition-all duration-300"
          style={{ height: `${100 - whitePercent}%` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 bg-[#f2f2f2] transition-all duration-300"
          style={{ height: `${whitePercent}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/8 to-transparent" />

        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
          {isEngineEnabled ? (isLoading ? '...' : formatScore(-(score ?? 0))) : 'OFF'}
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-[10px] font-semibold text-[#0f0f0f]">
          {isEngineEnabled ? (isLoading ? '...' : formatScore(score)) : 'OFF'}
        </div>
      </div>
      <div className="w-full text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
    </div>
  );
}