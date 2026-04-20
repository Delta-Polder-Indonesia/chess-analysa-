import { useEffect, useMemo, useRef, useState } from 'react';
import { OpeningFamily, OpeningLine } from '../data/openingBook';

type OpeningExplorerProps = {
  openings: OpeningFamily[];
  onLoadLine: (line: OpeningLine) => void;
};

type EcoLetter = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'E';

type RepertoireEntry = {
  id: string;
  familyId: string;
  familyName: string;
  line: OpeningLine;
};

const FAVORITES_STORAGE_KEY = 'tb-opening-favorites-v1';
const REPERTOIRE_STORAGE_KEY = 'tb-opening-repertoire-v1';

function buildLineId(familyId: string, line: OpeningLine): string {
  return `${familyId}::${line.eco}::${line.name}`;
}

function getEcoPrefix(eco: string): EcoLetter {
  const letter = eco.trim().charAt(0).toUpperCase();
  if (['A', 'B', 'C', 'D', 'E'].includes(letter)) return letter as EcoLetter;
  return 'ALL';
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function OpeningExplorer({ openings, onLoadLine }: OpeningExplorerProps) {
  const [query, setQuery] = useState('');
  const [ecoFilter, setEcoFilter] = useState<EcoLetter>('ALL');
  const [favorites, setFavorites] = useState<string[]>(() => safeParse<string[]>(localStorage.getItem(FAVORITES_STORAGE_KEY), []));
  const [repertoire, setRepertoire] = useState<RepertoireEntry[]>(() =>
    safeParse<RepertoireEntry[]>(localStorage.getItem(REPERTOIRE_STORAGE_KEY), []),
  );
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(REPERTOIRE_STORAGE_KEY, JSON.stringify(repertoire));
  }, [repertoire]);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  function toggleFavorite(lineId: string) {
    setFavorites(prev => (prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]));
  }

  function isInRepertoire(lineId: string): boolean {
    return repertoire.some(entry => entry.id === lineId);
  }

  function toggleRepertoire(family: OpeningFamily, line: OpeningLine) {
    const lineId = buildLineId(family.id, line);
    setRepertoire(prev => {
      if (prev.some(entry => entry.id === lineId)) {
        return prev.filter(entry => entry.id !== lineId);
      }

      return [
        ...prev,
        {
          id: lineId,
          familyId: family.id,
          familyName: family.name,
          line,
        },
      ];
    });
  }

  function exportRepertoire() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites,
      repertoire,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `opening-repertoire-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFlashMessage('Repertoire exported as JSON.');
  }

  async function importRepertoireFromFile(file: File) {
    const text = await file.text();
    const parsed = safeParse<any>(text, null);

    if (!parsed || !Array.isArray(parsed.repertoire)) {
      setFlashMessage('Import failed: invalid JSON format.');
      return;
    }

    const importedFav = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter((item: unknown) => typeof item === 'string')
      : [];

    const importedRep: RepertoireEntry[] = parsed.repertoire
      .filter((item: any) => {
        return (
          item &&
          typeof item.id === 'string' &&
          typeof item.familyId === 'string' &&
          typeof item.familyName === 'string' &&
          item.line &&
          typeof item.line.eco === 'string' &&
          typeof item.line.name === 'string' &&
          Array.isArray(item.line.moves)
        );
      })
      .map((item: any) => ({
        id: item.id,
        familyId: item.familyId,
        familyName: item.familyName,
        line: {
          eco: item.line.eco,
          name: item.line.name,
          moves: item.line.moves.filter((m: unknown) => typeof m === 'string'),
        },
      }));

    if (!importedRep.length && !importedFav.length) {
      setFlashMessage('Import failed: no valid repertoire items found.');
      return;
    }

    setFavorites(prev => Array.from(new Set([...prev, ...importedFav])));
    setRepertoire(prev => {
      const map = new Map(prev.map(entry => [entry.id, entry]));
      importedRep.forEach(entry => map.set(entry.id, entry));
      return Array.from(map.values());
    });
    setFlashMessage(`Imported ${importedRep.length} repertoire lines.`);
  }

  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    return openings
      .map(family => {
        const linesByEco =
          ecoFilter === 'ALL' ? family.lines : family.lines.filter(line => getEcoPrefix(line.eco) === ecoFilter);

        if (!linesByEco.length) return null;

        if (!token) {
          return { ...family, lines: linesByEco };
        }

        const familyMatch = `${family.name} ${family.description} ${family.ecoRange}`.toLowerCase().includes(token);
        if (familyMatch) return { ...family, lines: linesByEco };

        const lines = linesByEco.filter(line => {
          const haystack = `${line.eco} ${line.name} ${line.moves.join(' ')}`.toLowerCase();
          return haystack.includes(token);
        });

        if (!lines.length) return null;
        return { ...family, lines };
      })
      .filter(Boolean) as OpeningFamily[];
  }, [ecoFilter, openings, query]);

  const totalLines = useMemo(() => filtered.reduce((sum, family) => sum + family.lines.length, 0), [filtered]);

  const favoriteEntries = useMemo(() => {
    const allLines = openings.flatMap(family =>
      family.lines.map(line => ({
        id: buildLineId(family.id, line),
        line,
      })),
    );
    return allLines.filter(entry => favorites.includes(entry.id));
  }, [favorites, openings]);

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-200">Opening Book Explorer</div>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Cari opening, ECO, atau langkah (contoh: Sicilian, B90, Nf3)"
          className="w-full rounded-sm border border-white/15 bg-black/25 px-2.5 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#7fa650]"
        />
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'A', 'B', 'C', 'D', 'E'] as EcoLetter[]).map(letter => (
            <button
              key={letter}
              onClick={() => setEcoFilter(letter)}
              className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${
                ecoFilter === letter ? 'bg-[#7fa650] text-[#111]' : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              ECO {letter}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={exportRepertoire} className="rounded-sm bg-white/10 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/15">
            Export Repertoire JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-sm bg-white/10 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/15"
          >
            Import Repertoire JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async event => {
              const file = event.target.files?.[0];
              if (file) {
                await importRepertoireFromFile(file);
              }
              event.currentTarget.value = '';
            }}
          />
        </div>
        {flashMessage && <div className="text-[11px] text-[#98c56f]">{flashMessage}</div>}
        <div className="text-xs text-gray-400">
          {filtered.length} families | {totalLines} variations | {favorites.length} favorites | {repertoire.length} repertoire lines
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-black/20 p-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">My Repertoire</div>
        <div className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto pr-1">
          {repertoire.length === 0 && <div className="text-xs text-gray-500">No saved lines yet.</div>}
          {repertoire.map(entry => (
            <div key={entry.id} className="flex items-center gap-1 rounded-sm bg-white/5 px-2 py-1.5 text-xs">
              <button onClick={() => onLoadLine(entry.line)} className="min-w-0 flex-1 truncate text-left text-gray-200 hover:text-white">
                {entry.line.eco} {entry.line.name}
              </button>
              <button onClick={() => setRepertoire(prev => prev.filter(item => item.id !== entry.id))} className="text-gray-400 hover:text-red-300">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-black/20 p-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Favorites</div>
        <div className="custom-scrollbar max-h-28 space-y-1 overflow-y-auto pr-1">
          {favoriteEntries.length === 0 && <div className="text-xs text-gray-500">No favorite openings yet.</div>}
          {favoriteEntries.map(entry => (
            <div key={entry.id} className="flex items-center gap-1 rounded-sm bg-white/5 px-2 py-1.5 text-xs">
              <button onClick={() => onLoadLine(entry.line)} className="min-w-0 flex-1 truncate text-left text-gray-200 hover:text-white">
                {entry.line.eco} {entry.line.name}
              </button>
              <button onClick={() => toggleFavorite(entry.id)} className="text-gray-400 hover:text-red-300">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="custom-scrollbar max-h-[calc(100vh-360px)] space-y-2 overflow-y-auto pr-1">
        {filtered.map(family => (
          <details key={family.id} open className="rounded-sm border border-white/10 bg-black/20">
            <summary className="cursor-pointer select-none border-b border-white/10 px-2.5 py-2.5 text-sm font-semibold text-gray-100">
              {family.name}
              <span className="ml-2 text-[11px] font-medium text-gray-400">{family.ecoRange}</span>
            </summary>
            <div className="space-y-1.5 p-2">
              <div className="px-1 pb-1 text-[11px] text-gray-400">{family.description}</div>
              {family.lines.map((line, index) => (
                <div
                  key={`${family.id}-${line.eco}-${index}`}
                  className="w-full rounded-sm border border-white/10 bg-[#242422] px-2 py-1.5 hover:border-[#7fa650]/50 hover:bg-[#2c2c29]"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => onLoadLine(line)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="w-11 rounded-sm bg-white/12 px-1 py-0.5 text-center text-[11px] font-bold text-gray-100">
                        {line.eco}
                      </span>
                      <span className="truncate font-medium text-gray-100">{line.name}</span>
                    </button>

                    <button
                      onClick={() => toggleFavorite(buildLineId(family.id, line))}
                      className={`rounded-sm px-1.5 py-0.5 text-[11px] ${
                        favorites.includes(buildLineId(family.id, line)) ? 'bg-amber-400/30 text-amber-200' : 'bg-white/10 text-gray-300'
                      }`}
                      title="Toggle favorite"
                    >
                      Fav
                    </button>

                    <button
                      onClick={() => toggleRepertoire(family, line)}
                      className={`rounded-sm px-1.5 py-0.5 text-[11px] ${
                        isInRepertoire(buildLineId(family.id, line)) ? 'bg-blue-500/25 text-blue-200' : 'bg-white/10 text-gray-300'
                      }`}
                      title="Add to repertoire"
                    >
                      {isInRepertoire(buildLineId(family.id, line)) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <div className="mt-1 truncate text-[11px] text-gray-400">{line.moves.join(' ')}</div>
                </div>
              ))}
            </div>
          </details>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-sm border border-white/10 bg-black/20 px-3 py-4 text-sm text-gray-400">
            Opening tidak ditemukan. Coba kata kunci lain.
          </div>
        )}
      </div>
    </div>
  );
}