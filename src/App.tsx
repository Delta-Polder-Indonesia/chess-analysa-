import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import AnalysisBoardSection from './components/AnalysisBoardSection';
import AnalysisSidePanel from './components/AnalysisSidePanel';
import { EngineLine } from './components/EngineLinesPanel';
import EngineSettingsModal, { EngineSettings } from './components/EngineSettingsModal';
import { OPENING_BOOK, OpeningLine } from './data/openingBook';
import { openings } from './data/openings';
import { DEFAULT_ENGINE_SETTINGS, NEW_GAME_FEN, STARTING_FEN, TABLEBASE_LIMITS, VARIANTS } from './features/analysis/constants';
import {
  CLASSIFICATION_ICONS,
  classifyMove,
  compareScoresForTurn,
  EngineArrowMove,
  EngineSuggestionMove,
  fetchStockfishOnline,
  MoveClassification,
  normalizeContinuation,
  parsePvMovesFromUci,
  parseUciMove,
  StockfishAnalysis,
  toScoreLabel,
} from './features/analysis/engine';
import { cacheKey, categoryScore, getLimitError } from './features/analysis/tablebase';
import { HistoryEntry, TablebaseResult, Variant } from './types/tablebase';
import { countPieces, fetchTablebase, formatCategory } from './utils/tablebase';

function loadInitialEngineSettings(): EngineSettings {
  try {
    const raw = localStorage.getItem('tb-engine-settings');
    if (!raw) return DEFAULT_ENGINE_SETTINGS;
    return { ...DEFAULT_ENGINE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ENGINE_SETTINGS;
  }
}

export default function App() {
  const [fen, setFen] = useState(STARTING_FEN);
  const [variant, setVariant] = useState<Variant>('standard');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [activeTab, setActiveTab] = useState<'analysis' | 'games' | 'explore'>('analysis');
  const [autoQuery, setAutoQuery] = useState(true);
  const [isEngineSettingsOpen, setIsEngineSettingsOpen] = useState(false);
  const [engineSettings, setEngineSettings] = useState<EngineSettings>(loadInitialEngineSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TablebaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engineAnalysis, setEngineAnalysis] = useState<StockfishAnalysis | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [engineRefreshTick, setEngineRefreshTick] = useState(0);
  const [boardResetKey, setBoardResetKey] = useState(0);
  const [cache, setCache] = useState<Record<string, TablebaseResult>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([{ fen: STARTING_FEN }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engineRequestIdRef = useRef(0);
  const engineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engineCacheRef = useRef<Record<string, StockfishAnalysis>>({});

  const pieceCount = countPieces(fen);
  const limitError = getLimitError(variant, pieceCount);
  const sideToMoveColor = fen.split(' ')[1] === 'b' ? 'black' : 'white';

  useEffect(() => {
    localStorage.setItem('tb-engine-settings', JSON.stringify(engineSettings));
  }, [engineSettings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEngineSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const queryTablebase = useCallback(async (targetFen: string, targetVariant: Variant, targetIndex: number) => {
    const pieces = countPieces(targetFen);
    const ruleError = getLimitError(targetVariant, pieces);
    if (ruleError) {
      setError(null);
      setResult(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTablebase(targetFen, targetVariant);
      if (requestIdRef.current !== currentRequestId) return;

      setResult(data);
      setCache(prev => ({ ...prev, [cacheKey(targetVariant, targetFen)]: data }));
      setHistory(prev => {
        const cloned = [...prev];
        if (cloned[targetIndex]?.fen === targetFen) {
          cloned[targetIndex] = { ...cloned[targetIndex], result: data };
        }
        return cloned;
      });
    } catch (e: any) {
      if (requestIdRef.current !== currentRequestId) return;
      setError(e?.message ?? 'Failed to fetch tablebase result.');
      setResult(null);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const queryEngine = useCallback(
    async (targetFen: string, targetVariant: Variant) => {
      if (!engineSettings.enabled) {
        setEngineAnalysis(null);
        setEngineError(null);
        return;
      }

      if (targetVariant !== 'standard') {
        setEngineAnalysis(null);
        setEngineError('Stockfish online only supports standard chess positions.');
        return;
      }

      const effectiveDepth = Math.max(1, Math.min(15, engineSettings.depth));
      const effectiveMultiPv = Math.max(1, Math.min(6, engineSettings.multiPv));
      const cacheToken = `${targetFen}::d${effectiveDepth}::mpv${effectiveMultiPv}`;
      const cachedAnalysis = engineCacheRef.current[cacheToken];
      if (cachedAnalysis) {
        setEngineAnalysis(cachedAnalysis);
        setEngineError(null);
        setIsEngineLoading(false);
        return;
      }

      const currentRequestId = ++engineRequestIdRef.current;
      setIsEngineLoading(true);
      setEngineError(null);

      try {
        const analysis = await fetchStockfishOnline(targetFen, effectiveDepth);
        if (engineRequestIdRef.current !== currentRequestId) return;

        const baseLineMoves = normalizeContinuation(analysis.bestMoveUci, analysis.continuation);
        const rootTurn = (targetFen.split(' ')[1] === 'b' ? 'b' : 'w') as 'w' | 'b';

        const game = new Chess(targetFen);
        const sortedLegalCandidates = game
          .moves({ verbose: true })
          .map(move => ({
            uci: `${move.from}${move.to}${move.promotion ?? ''}`,
            priority:
              (move.promotion ? 300 : 0) +
              (move.captured ? 200 : 0) +
              (move.san.includes('#') ? 180 : 0) +
              (move.san.includes('+') ? 120 : 0),
          }))
          .sort((a, b) => b.priority - a.priority)
          .map(move => move.uci);

        // IMPORTANT: Only use valid first moves for the current side.
        // baseLineMoves is the continuation PV (bestMove, opponentReply, ...) — its entries
        // after index 0 are opponent/later moves and will fail branchGame.move(). Exclude them.
        const firstMoveCandidates = [analysis.bestMoveUci, ...sortedLegalCandidates]
          .filter((move): move is string => Boolean(move))
          .filter((move, index, arr) => arr.indexOf(move) === index)
          .slice(0, effectiveMultiPv + 2); // extra buffer in case some fail validation

        const lines: StockfishAnalysis['lines'] = [];

        for (let index = 0; index < firstMoveCandidates.length && lines.length < effectiveMultiPv; index += 1) {
          if (engineRequestIdRef.current !== currentRequestId) return;

          const firstMoveUci = firstMoveCandidates[index];

          if (index === 0 && baseLineMoves.length > 0) {
            lines.push({
              id: `pv-${index + 1}`,
              scoreCp: analysis.evaluationCp,
              mate: analysis.mate,
              movesUci: baseLineMoves,
              source: 'api',
            });
            continue;
          }

          try {
            const branchGame = new Chess(targetFen);
            const parsed = parseUciMove(firstMoveUci);
            if (!parsed) continue;
            const played = branchGame.move(parsed);
            if (!played) continue;

            const alt = await fetchStockfishOnline(branchGame.fen(), Math.max(1, effectiveDepth - 1));
            if (engineRequestIdRef.current !== currentRequestId) return;
            const tail = normalizeContinuation(alt.bestMoveUci, alt.continuation);

            lines.push({
              id: `pv-${index + 1}`,
              scoreCp: alt.evaluationCp,
              mate: alt.mate,
              movesUci: [firstMoveUci, ...tail],
              source: 'api',
            });
          } catch {
            lines.push({
              id: `pv-${index + 1}`,
              scoreCp: analysis.evaluationCp,
              mate: analysis.mate,
              movesUci: [firstMoveUci],
              source: 'fallback',
            });
          }
        }

        lines.sort((a, b) => compareScoresForTurn(a, b, rootTurn));

        const nextAnalysis: StockfishAnalysis = {
          ...analysis,
          continuation: baseLineMoves,
          lines: lines.slice(0, effectiveMultiPv),
        };

        engineCacheRef.current[cacheToken] = nextAnalysis;
        setEngineAnalysis(nextAnalysis);

        // Classification Logic
        // We classify the move that LED to targetFen by comparing the evaluation
        // of targetFen with the evaluation of the position BEFORE targetFen.
        if (targetIndex > 0) {
          setHistory(prev => {
            const cloned = [...prev];
            const entry = cloned[targetIndex];
            const prevEntry = cloned[targetIndex - 1];

            if (entry && entry.fen === targetFen && !entry.classification) {
              const prevAnalysis = entry.uci && prevEntry.fen ?
                engineCacheRef.current[`${prevEntry.fen}::d${effectiveDepth}::mpv${effectiveMultiPv}`] : null;

              if (prevAnalysis && entry.uci) {
                const game = new Chess(prevEntry.fen);
                const isOpening = openings.some(o => o.fen.split(' ')[0] === targetFen.split(' ')[0]);
                const classification = classifyMove(
                  entry.uci,
                  prevAnalysis,
                  nextAnalysis,
                  isOpening,
                  game.moves().length
                );

                if (classification) {
                  cloned[targetIndex] = {
                    ...entry,
                    classification,
                    moveEvaluation: { cp: nextAnalysis.evaluationCp, mate: nextAnalysis.mate }
                  };
                }
              }
            }
            return cloned;
          });
        }
      } catch (e: any) {
        if (engineRequestIdRef.current !== currentRequestId) return;
        setEngineError(e?.message ?? 'Failed to fetch Stockfish analysis.');
      } finally {
        if (engineRequestIdRef.current === currentRequestId) {
          setIsEngineLoading(false);
        }
      }
    },
    [engineSettings.depth, engineSettings.enabled, engineSettings.multiPv],
  );

  useEffect(() => {
    const cached = cache[cacheKey(variant, fen)];
    if (cached) {
      setResult(cached);
      setError(null);
      return;
    }

    setResult(null);
    if (!autoQuery) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryTablebase(fen, variant, historyIndex);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoQuery, cache, fen, historyIndex, queryTablebase, variant]);

  useEffect(() => {
    if (!engineSettings.enabled) {
      setEngineAnalysis(null);
      setEngineError(null);
      setIsEngineLoading(false);
      return;
    }

    if (engineDebounceRef.current) clearTimeout(engineDebounceRef.current);
    engineDebounceRef.current = setTimeout(() => {
      queryEngine(fen, variant);
    }, 240);

    return () => {
      if (engineDebounceRef.current) clearTimeout(engineDebounceRef.current);
    };
  }, [engineRefreshTick, engineSettings.enabled, fen, queryEngine, variant]);

  const navigateTo = useCallback(
    (targetIndex: number) => {
      const entry = history[targetIndex];
      if (!entry) return;

      setFen(entry.fen);
      setHistoryIndex(targetIndex);
      setError(null);

      const cached = cache[cacheKey(variant, entry.fen)] || entry.result || null;
      setResult(cached);
      if (!cached && autoQuery) {
        queryTablebase(entry.fen, variant, targetIndex);
      }
    },
    [autoQuery, cache, history, queryTablebase, variant],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateTo(Math.max(0, historyIndex - 1));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateTo(Math.min(history.length - 1, historyIndex + 1));
      }
      if (event.key === 'Home') {
        event.preventDefault();
        navigateTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        navigateTo(history.length - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history.length, historyIndex, navigateTo]);

  function pushHistory(newFen: string, san?: string, uci?: string) {
    setFen(newFen);
    setError(null);
    setResult(cache[cacheKey(variant, newFen)] || null);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), { fen: newFen, san, uci }]);
    setHistoryIndex(prev => prev + 1);
  }

  function handleMoveFromTable(move: { uci: string; san?: string }) {
    try {
      const game = new Chess(fen);
      const from = move.uci.slice(0, 2);
      const to = move.uci.slice(2, 4);
      const promotion = move.uci.length > 4 ? move.uci[4] : undefined;
      const played = game.move({ from, to, promotion });
      pushHistory(game.fen(), played.san, move.uci);
    } catch {
      setError('Move is invalid for current position.');
    }
  }

  function applyUciSequence(uciMoves: string[]) {
    try {
      const game = new Chess(fen);
      const appended: HistoryEntry[] = [];

      for (const uci of uciMoves) {
        const parsed = parseUciMove(uci);
        if (!parsed) break;
        const played = game.move(parsed);
        if (!played) break;
        appended.push({ fen: game.fen(), san: played.san, uci });
      }

      if (appended.length === 0) return;

      const nextHistory = [...history.slice(0, historyIndex + 1), ...appended];
      const finalFen = appended[appended.length - 1].fen;
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setFen(finalFen);
      setError(null);
      setResult(cache[cacheKey(variant, finalFen)] || null);
    } catch {
      setError('Unable to apply selected engine line.');
    }
  }

  function handleFenSubmit(newFen: string) {
    try {
      new Chess(newFen);
      setFen(newFen);
      setHistory([{ fen: newFen }]);
      setHistoryIndex(0);
      setError(null);
      setResult(cache[cacheKey(variant, newFen)] || null);
    } catch {
      setError('Invalid FEN string.');
    }
  }

  function handleLoadOpeningLine(line: OpeningLine) {
    try {
      const game = new Chess();
      const nextHistory: HistoryEntry[] = [{ fen: game.fen() }];
      for (const sanMove of line.moves) {
        const played = game.move(sanMove);
        if (!played) throw new Error(`Illegal SAN: ${sanMove}`);
        const uci = `${played.from}${played.to}${played.promotion ?? ''}`;
        nextHistory.push({ fen: game.fen(), san: played.san, uci });
      }

      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setFen(game.fen());
      setError(null);
      setResult(cache[cacheKey(variant, game.fen())] || null);
    } catch {
      setError(`Failed to load opening line: ${line.name}`);
    }
  }

  function handleReset() {
    setFen(NEW_GAME_FEN);
    setHistory([{ fen: NEW_GAME_FEN }]);
    setHistoryIndex(0);
    setError(null);
    setResult(cache[cacheKey(variant, NEW_GAME_FEN)] || null);
    setBoardResetKey(prev => prev + 1);

    if (engineSettings.enabled) {
      setEngineRefreshTick(prev => prev + 1);
    } else {
      setEngineAnalysis(null);
      setEngineError(null);
      setIsEngineLoading(false);
    }
  }

  function changeVariant(targetVariant: Variant) {
    setVariant(targetVariant);
    const cached = cache[cacheKey(targetVariant, fen)] || null;
    setResult(cached);
    if (!cached && autoQuery) {
      queryTablebase(fen, targetVariant, historyIndex);
    }
  }

  const evaluation = useMemo(() => {
    if (!engineSettings.enabled) return { score: null as number | null, label: 'Engine Off' };
    if (engineAnalysis) {
      const sideMultiplier = sideToMoveColor === 'white' ? 1 : -1;
      const mateScore = engineAnalysis.mate === null ? null : engineAnalysis.mate > 0 ? 10000 : -10000;
      const cpScore = mateScore ?? engineAnalysis.evaluationCp ?? 0;
      return { score: cpScore * sideMultiplier, label: 'SF Online' };
    }
    if (!result) return { score: null as number | null, label: 'No Eval' };

    const base = categoryScore(result.category);
    const whiteScore = sideToMoveColor === 'white' ? base : -base;
    const dtzBias =
      result.dtz === null ? 0 : Math.max(-40, Math.min(40, Math.sign(whiteScore || 1) * (40 - Math.min(40, Math.abs(result.dtz)))));
    return { score: whiteScore === 0 ? 0 : whiteScore + dtzBias, label: `TB ${formatCategory(result.category)}` };
  }, [engineAnalysis, engineSettings.enabled, result, sideToMoveColor]);

  const engineSuggestionMoves = useMemo(() => {
    if (!engineSettings.enabled) return [] as EngineSuggestionMove[];
    const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';

    if (engineAnalysis?.lines?.length) {
      const fromLines = engineAnalysis.lines
        .map(line => {
          const firstMove = line.movesUci[0];
          if (!firstMove) return null;
          try {
            const game = new Chess(fen);
            const parsed = parseUciMove(firstMove);
            if (!parsed) return null;
            const played = game.move(parsed);
            return { uci: firstMove, san: played?.san ?? firstMove, score: line.scoreCp ?? 0, source: line.source };
          } catch {
            return null;
          }
        })
        .filter((move): move is NonNullable<typeof move> => move !== null)
        .sort((a, b) => {
          const aScore = sideToMove === 'w' ? a.score : -a.score;
          const bScore = sideToMove === 'w' ? b.score : -b.score;
          return bScore - aScore;
        });

      if (fromLines.length) return fromLines.slice(0, Math.max(1, engineSettings.arrowCount));
    }

    if (!engineAnalysis?.bestMoveUci) return [];
    try {
      const game = new Chess(fen);
      const from = engineAnalysis.bestMoveUci.slice(0, 2);
      const to = engineAnalysis.bestMoveUci.slice(2, 4);
      const promotion = engineAnalysis.bestMoveUci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
      const played = game.move({ from, to, promotion });
      return [{ uci: engineAnalysis.bestMoveUci, san: played?.san ?? engineAnalysis.bestMoveUci, score: engineAnalysis.evaluationCp ?? 0, source: 'api' as const }];
    } catch {
      return [];
    }
  }, [engineAnalysis, engineSettings.arrowCount, engineSettings.enabled, fen]);

  const engineArrowMoves = useMemo<EngineArrowMove[]>(() => {
    if (!engineSettings.enabled || !engineSettings.showArrows) return [];
    if (!engineAnalysis?.lines?.length) return [];

    const lineLimit = engineSettings.arrowMode === 'best' ? 1 : Math.max(1, engineSettings.arrowCount);
    const selectedLines = engineAnalysis.lines.slice(0, lineLimit);
    const used = new Set<string>();
    const arrows: EngineArrowMove[] = [];

    selectedLines.forEach(line => {
      const playerMove = line.movesUci[0];
      const opponentMove = line.movesUci[1];
      if (playerMove && !used.has(`p-${playerMove}`)) {
        used.add(`p-${playerMove}`);
        arrows.push({ uci: playerMove, side: 'player' });
      }
      if (engineSettings.showOpponentArrows && opponentMove && !used.has(`o-${opponentMove}`)) {
        used.add(`o-${opponentMove}`);
        arrows.push({ uci: opponentMove, side: 'opponent' });
      }
    });

    return arrows;
  }, [engineAnalysis, engineSettings.arrowCount, engineSettings.arrowMode, engineSettings.enabled, engineSettings.showArrows, engineSettings.showOpponentArrows]);

  const arrowMoves = useMemo(() => {
    if (!engineSettings.enabled || !engineSettings.showArrows) return [] as Array<{ uci: string; side?: 'player' | 'opponent' }>;
    // While engine is fetching for the new position, clear arrows so stale arrows don't persist
    if (isEngineLoading) return [] as Array<{ uci: string; side?: 'player' | 'opponent' }>;
    if (engineArrowMoves.length > 0) return engineArrowMoves;
    if (engineSuggestionMoves.length > 0) {
      return engineSuggestionMoves.slice(0, Math.max(1, engineSettings.arrowCount)).map(move => ({ uci: move.uci, side: 'player' as const }));
    }
    return [];
  }, [engineArrowMoves, engineSettings.arrowCount, engineSettings.enabled, engineSettings.showArrows, engineSuggestionMoves, isEngineLoading]);

  const topMoves = useMemo(() => {
    if (result?.moves?.length) {
      return result.moves.slice(0, 3).map(move => ({
        uci: move.uci,
        san: move.san,
        scoreLabel: `${(move.dtz ?? 0) >= 0 ? '+' : ''}${move.dtz ?? 0}`,
        source: 'tb' as const,
      }));
    }

    if (!engineSettings.enabled) return [];
    return engineSuggestionMoves.slice(0, 3).map(move => ({
      uci: move.uci,
      san: move.san,
      scoreLabel: `${move.score >= 0 ? '+' : ''}${(move.score / 100).toFixed(1)}`,
      source: 'engine' as const,
    }));
  }, [engineSettings.enabled, engineSuggestionMoves, result]);

  const engineLines = useMemo<EngineLine[]>(() => {
    if (!engineSettings.enabled) return [];
    if (engineAnalysis?.lines?.length) {
      return engineAnalysis.lines
        .slice(0, Math.max(1, engineSettings.multiPv))
        .map(line => ({
          id: line.id,
          scoreLabel: toScoreLabel(line.scoreCp, line.mate),
          moves: parsePvMovesFromUci(fen, line.movesUci),
          source: line.source,
        }))
        .filter(line => line.moves.length > 0);
    }

    if (engineSuggestionMoves.length === 0) return [];
    return engineSuggestionMoves.slice(0, Math.max(1, engineSettings.multiPv)).map((move, idx) => ({
      id: `pv-fallback-${idx + 1}`,
      scoreLabel: toScoreLabel(move.score, null),
      moves: parsePvMovesFromUci(fen, [move.uci]),
      source: move.source,
    }));
  }, [engineAnalysis, engineSettings.enabled, engineSettings.multiPv, engineSuggestionMoves, fen]);

  const engineLineLookup = useMemo(() => {
    const map = new Map<string, EngineLine>();
    engineLines.forEach(line => map.set(line.id, line));
    return map;
  }, [engineLines]);

  function handlePlayLinePrefix(lineId: string, plyCount: number) {
    const line = engineLineLookup.get(lineId);
    if (!line) return;
    const prefixMoves = line.moves.slice(0, plyCount).map(move => move.uci);
    applyUciSequence(prefixMoves);
  }

  const historyRows = useMemo(() => {
    const rows: Array<{
      moveNumber: number;
      whiteMove?: HistoryEntry;
      blackMove?: HistoryEntry;
      whiteIndex?: number;
      blackIndex?: number;
    }> = [];
    for (let i = 1; i < history.length; i += 2) {
      rows.push({
        moveNumber: Math.ceil(i / 2),
        whiteMove: history[i],
        blackMove: history[i + 1],
        whiteIndex: i,
        blackIndex: i + 1,
      });
    }
    return rows;
  }, [history]);

  const errorText = error || engineError || '';
  const depthLabel = `depth=${pieceCount <= TABLEBASE_LIMITS[variant] ? TABLEBASE_LIMITS[variant] : engineSettings.enabled ? engineSettings.depth : 0}`;

  return (
    <div className="h-screen overflow-hidden bg-[#262522] text-gray-100">
      <div className="h-full p-2 lg:p-2.5">
        <div className="grid h-full grid-cols-1 gap-2.5 lg:grid-cols-[minmax(780px,1fr)_460px]">
          <AnalysisBoardSection
            orientation={orientation}
            variantLabel={variant.toUpperCase()}
            fen={fen}
            isLoading={isLoading}
            isEngineEnabled={engineSettings.enabled}
            evaluation={evaluation}
            onFenChange={pushHistory}
            suggestionMoves={arrowMoves}
            maxSuggestionArrows={engineSettings.arrowMode === 'best' ? 1 : engineSettings.arrowCount}
            onFenSubmit={handleFenSubmit}
            onReset={handleReset}
            initialFen={NEW_GAME_FEN}
            boardResetKey={boardResetKey}
            lastMoveClassification={history[historyIndex]?.classification || null}
          />

          <AnalysisSidePanel
            variant={variant}
            variants={VARIANTS}
            autoQuery={autoQuery}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isLoading={isLoading}
            isEngineLoading={isEngineLoading}
            errorText={errorText}
            limitError={limitError}
            depthLabel={depthLabel}
            onQuery={() => queryTablebase(fen, variant, historyIndex)}
            onOpenEngineSettings={() => setIsEngineSettingsOpen(true)}
            onChangeVariant={changeVariant}
            onFlip={() => setOrientation(prev => (prev === 'white' ? 'black' : 'white'))}
            onToggleAuto={() => setAutoQuery(prev => !prev)}
            result={result}
            topMoves={topMoves}
            onPlayMove={handleMoveFromTable}
            engineLines={engineLines}
            isEngineEnabled={engineSettings.enabled}
            showPv={engineSettings.showPv}
            onPlayLinePrefix={handlePlayLinePrefix}
            historyRows={historyRows}
            history={history}
            historyIndex={historyIndex}
            onNavigate={navigateTo}
            openings={OPENING_BOOK}
            onLoadOpeningLine={handleLoadOpeningLine}
            onNew={handleReset}
            onCopyFen={() => navigator.clipboard.writeText(fen).catch(() => { })}
            onReview={() => queryTablebase(fen, variant, historyIndex)}
          />
        </div>
      </div>

      <EngineSettingsModal
        open={isEngineSettingsOpen}
        settings={engineSettings}
        onClose={() => setIsEngineSettingsOpen(false)}
        onChange={setEngineSettings}
        onReset={() => setEngineSettings(DEFAULT_ENGINE_SETTINGS)}
      />
    </div>
  );
}
