export interface EngineSettings {
  enabled: boolean;
  engine: 'stockfish' | 'lc0';
  depth: number;
  multiPv: number;
  arrowCount: number;
  arrowMode: 'best' | 'top';
  showOpponentArrows: boolean;
  threads: number;
  hash: number;
  skillLevel: number;
  moveOverhead: number;
  slowMover: number;
  contempt: number;
  useNnue: boolean;
  syzygy50MoveRule: boolean;
  showArrows: boolean;
  showPv: boolean;
}

interface EngineSettingsModalProps {
  open: boolean;
  settings: EngineSettings;
  onClose: () => void;
  onChange: (settings: EngineSettings) => void;
  onReset: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[150px_1fr] items-center gap-3 text-sm">
      <span className="text-gray-300">{label}</span>
      {children}
    </label>
  );
}

export default function EngineSettingsModal({
  open,
  settings,
  onClose,
  onChange,
  onReset,
}: EngineSettingsModalProps) {
  if (!open) return null;

  const update = <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="custom-scrollbar w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-md border border-white/15 bg-[#1c1c1b] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-xl font-semibold text-white">Engine Settings</h2>
          <button onClick={onClose} className="rounded-sm bg-white/10 px-2 py-1 text-xs text-gray-200 hover:bg-white/20">
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          <Row label="Engine Enabled">
            <button
              onClick={() => update('enabled', !settings.enabled)}
              className={`w-fit rounded-sm px-3 py-1.5 text-xs font-semibold ${
                settings.enabled ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-200'
              }`}
            >
              {settings.enabled ? 'ON' : 'OFF'}
            </button>
          </Row>

          <Row label="Engine Core">
            <select
              value={settings.engine}
              onChange={e => update('engine', e.target.value as EngineSettings['engine'])}
              className="rounded-sm border border-white/15 bg-[#111] px-3 py-2 text-sm text-gray-100"
            >
              <option value="stockfish">Stockfish</option>
              <option value="lc0">Leela Chess Zero (LC0)</option>
            </select>
          </Row>

          <Row label="Search Depth">
            <input
              type="range"
              min={1}
              max={40}
              value={settings.depth}
              onChange={e => update('depth', Number(e.target.value))}
            />
            <span className="ml-3 inline-block w-8 text-right text-xs text-gray-300">{settings.depth}</span>
          </Row>

          <Row label="MultiPV">
            <input
              type="number"
              min={1}
              max={8}
              value={settings.multiPv}
              onChange={e => update('multiPv', Number(e.target.value))}
              className="w-24 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Arrow Mode">
            <select
              value={settings.arrowMode}
              onChange={e => update('arrowMode', e.target.value as EngineSettings['arrowMode'])}
              className="rounded-sm border border-white/15 bg-[#111] px-3 py-2 text-sm text-gray-100"
            >
              <option value="best">Best move only</option>
              <option value="top">Top lines (MultiPV)</option>
            </select>
          </Row>

          <Row label="Arrow Count">
            <input
              type="number"
              min={1}
              max={8}
              value={settings.arrowCount}
              onChange={e => update('arrowCount', Number(e.target.value))}
              className="w-24 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Threads">
            <input
              type="number"
              min={1}
              max={32}
              value={settings.threads}
              onChange={e => update('threads', Number(e.target.value))}
              className="w-24 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Hash (MB)">
            <input
              type="number"
              min={16}
              max={4096}
              step={16}
              value={settings.hash}
              onChange={e => update('hash', Number(e.target.value))}
              className="w-28 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Skill Level">
            <input
              type="range"
              min={0}
              max={20}
              value={settings.skillLevel}
              onChange={e => update('skillLevel', Number(e.target.value))}
            />
            <span className="ml-3 inline-block w-8 text-right text-xs text-gray-300">{settings.skillLevel}</span>
          </Row>

          <Row label="Move Overhead (ms)">
            <input
              type="number"
              min={0}
              max={2000}
              step={10}
              value={settings.moveOverhead}
              onChange={e => update('moveOverhead', Number(e.target.value))}
              className="w-28 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Slow Mover (%)">
            <input
              type="number"
              min={10}
              max={500}
              value={settings.slowMover}
              onChange={e => update('slowMover', Number(e.target.value))}
              className="w-28 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <Row label="Contempt">
            <input
              type="number"
              min={-100}
              max={100}
              value={settings.contempt}
              onChange={e => update('contempt', Number(e.target.value))}
              className="w-24 rounded-sm border border-white/15 bg-[#111] px-2 py-1.5 text-sm text-gray-100"
            />
          </Row>

          <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-3 text-sm sm:grid-cols-2">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={settings.useNnue}
                onChange={e => update('useNnue', e.target.checked)}
              />
              Use NNUE
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={settings.syzygy50MoveRule}
                onChange={e => update('syzygy50MoveRule', e.target.checked)}
              />
              Syzygy 50-move rule
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={settings.showArrows}
                onChange={e => update('showArrows', e.target.checked)}
              />
              Show best move arrows
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={settings.showOpponentArrows}
                onChange={e => update('showOpponentArrows', e.target.checked)}
              />
              Show opponent reply arrows
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={settings.showPv}
                onChange={e => update('showPv', e.target.checked)}
              />
              Show principal variation
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-[#1a1a19] px-4 py-3">
          <button onClick={onReset} className="rounded-sm bg-white/10 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/20">
            Reset Defaults
          </button>
          <button onClick={onClose} className="rounded-sm bg-[#7fa650] px-4 py-1.5 text-xs font-semibold text-[#10180a]">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}