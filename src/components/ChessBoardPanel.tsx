import { useCallback, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { TablebaseResult } from '../types/tablebase';

interface ChessBoardPanelProps {
  fen: string;
  onFenChange: (fen: string, san?: string, uci?: string) => void;
  tablebaseResult: TablebaseResult | null;
  suggestionMoves?: Array<{ uci: string; side?: 'player' | 'opponent' }>;
  isLoading: boolean;
  maxSuggestionArrows?: number;
  onMoveSelect?: (uci: string) => void;
  orientation: 'white' | 'black';
}

export default function ChessBoardPanel({
  fen,
  onFenChange,
  tablebaseResult,
  suggestionMoves = [],
  isLoading,
  maxSuggestionArrows = 3,
  onMoveSelect,
  orientation,
}: ChessBoardPanelProps) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [markedSquares, setMarkedSquares] = useState<Record<string, React.CSSProperties>>({});
  const [manualArrows, setManualArrows] = useState<
    Array<{ startSquare: string; endSquare: string; color: string }>
  >([]);
  const [engineArrowHighlights, setEngineArrowHighlights] = useState<Record<string, true>>({});

  const getGame = useCallback(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  function getMoveOptions(square: string) {
    const game = getGame();
    const moves = game.moves({ square: square as any, verbose: true });
    if (!moves || moves.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move: any) => {
      const isCapture = game.get(move.to as any);
      newSquares[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(255,100,100,.8) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    setOptionSquares(newSquares);
    return true;
  }

  function handleSquareClick({ square }: { piece: any; square: string }) {
    if (Object.keys(markedSquares).length > 0) {
      setMarkedSquares({});
    }

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const game = getGame();
    const moves = game.moves({ square: moveFrom as any, verbose: true });
    const foundMove = moves.find(
      (m: any) => m.from === moveFrom && m.to === square
    );

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : null);
      if (!hasMoveOptions) setOptionSquares({});
      return;
    }

    const promotion =
      foundMove.piece === 'p' &&
        (square[1] === '8' || square[1] === '1')
        ? 'q'
        : undefined;

    try {
      const playedMove = game.move({ from: moveFrom, to: square, promotion });
      setLastMove({ from: moveFrom, to: square });
      setMoveFrom(null);
      setOptionSquares({});
      const playedUci = moveFrom + square + (promotion || '');
      onFenChange(game.fen(), playedMove.san, playedUci);
      if (onMoveSelect) onMoveSelect(playedUci);
    } catch {
      setMoveFrom(null);
      setOptionSquares({});
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    const game = getGame();
    try {
      const piece = game.get(sourceSquare as any);
      const promotion =
        piece?.type === 'p' &&
          (targetSquare[1] === '8' || targetSquare[1] === '1')
          ? 'q'
          : undefined;

      const playedMove = game.move({ from: sourceSquare, to: targetSquare, promotion });
      if (!playedMove) return false;
      setLastMove({ from: sourceSquare, to: targetSquare });
      setMoveFrom(null);
      setOptionSquares({});
      const playedUci = sourceSquare + targetSquare + (promotion || '');
      onFenChange(game.fen(), playedMove.san, playedUci);
      if (onMoveSelect) onMoveSelect(playedUci);
      return true;
    } catch {
      return false;
    }
  }

  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { boxShadow: 'inset 0 0 0 9999px rgba(255, 255, 0, 0.3)' };
    customSquareStyles[lastMove.to] = { boxShadow: 'inset 0 0 0 9999px rgba(255, 255, 0, 0.5)' };
  }

  // Highlight best move from active suggestion source
  const bestSuggestionMove = suggestionMoves[0] ?? tablebaseResult?.moves?.[0];
  if (bestSuggestionMove) {
    const bestMove = bestSuggestionMove;
    const from = bestMove.uci.slice(0, 2);
    const to = bestMove.uci.slice(2, 4);
    if (!lastMove || (lastMove.from !== from || lastMove.to !== to)) {
      customSquareStyles[from] = {
        ...(customSquareStyles[from] || {}),
        boxShadow: 'inset 0 0 0 9999px rgba(0, 200, 100, 0.32)',
      };
      customSquareStyles[to] = {
        ...(customSquareStyles[to] || {}),
        boxShadow: 'inset 0 0 0 9999px rgba(0, 200, 100, 0.45)',
      };
    }
  }

  const engineSuggestionArrows = useMemo(() => {
    const sourceMoves = suggestionMoves.length > 0 ? suggestionMoves : (tablebaseResult?.moves ?? []);
    if (!sourceMoves.length) return [];

    let playerArrowIndex = 0;
    let opponentArrowIndex = 0;

    return sourceMoves.slice(0, Math.max(1, maxSuggestionArrows)).map(move => {
      const isOpponent = 'side' in move && move.side === 'opponent';
      const rankIndex = isOpponent ? opponentArrowIndex++ : playerArrowIndex++;
      const opacity = Math.max(0.35, 0.82 - rankIndex * 0.14);

      const key = `${move.uci.slice(0, 2).toLowerCase()}-${move.uci.slice(2, 4).toLowerCase()}`;
      const isHighlighted = Boolean(engineArrowHighlights[key]);

      return {
        startSquare: move.uci.slice(0, 2),
        endSquare: move.uci.slice(2, 4),
        color: isHighlighted
          ? 'rgba(247, 190, 59, 0.95)'
          : isOpponent
            ? `rgba(247, 190, 59, ${opacity.toFixed(2)})`
            : `rgba(72, 193, 249, ${opacity.toFixed(2)})`,
      };
    });
  }, [engineArrowHighlights, maxSuggestionArrows, suggestionMoves, tablebaseResult]);

  const engineArrowKeys = useMemo(() => {
    return new Set(
      engineSuggestionArrows.map(
        arrow => `${arrow.startSquare.toLowerCase()}-${arrow.endSquare.toLowerCase()}`,
      ),
    );
  }, [engineSuggestionArrows]);

  const combinedArrows = useMemo(() => {
    // Render engine arrows first, then user right-click arrows so manual arrows sit on top.
    return [...engineSuggestionArrows, ...manualArrows];
  }, [engineSuggestionArrows, manualArrows]);

  const handleArrowsChange = useCallback((nextArrows: unknown) => {
    if (!Array.isArray(nextArrows)) {
      setManualArrows([]);
      return;
    }

    const parsedArrows = nextArrows
      .map(arrow => {
        if (Array.isArray(arrow) && arrow.length >= 2) {
          const [startSquare, endSquare] = arrow;
          return {
            startSquare: String(startSquare).toLowerCase(),
            endSquare: String(endSquare).toLowerCase(),
          };
        }

        if (arrow && typeof arrow === 'object') {
          const candidate = arrow as {
            startSquare?: string;
            endSquare?: string;
            from?: string;
            to?: string;
          };
          const startSquare = candidate.startSquare ?? candidate.from;
          const endSquare = candidate.endSquare ?? candidate.to;
          if (typeof startSquare === 'string' && typeof endSquare === 'string') {
            return {
              startSquare: startSquare.toLowerCase(),
              endSquare: endSquare.toLowerCase(),
            };
          }
        }

        return null;
      })
      .filter((arrow): arrow is { startSquare: string; endSquare: string } => arrow !== null);

    const parsedKeys = new Set(parsedArrows.map(arrow => `${arrow.startSquare}-${arrow.endSquare}`));

    // If a drawn arrow overlaps an engine suggestion path, mark that engine arrow in yellow.
    // This avoids path conflicts where manual arrows cannot visually stack on the same route.
    if (parsedArrows.length > 0) {
      setEngineArrowHighlights(prev => {
        const next = { ...prev };
        let changed = false;

        parsedArrows.forEach(arrow => {
          const key = `${arrow.startSquare}-${arrow.endSquare}`;
          if (!engineArrowKeys.has(key)) return;
          if (next[key]) {
            delete next[key];
          } else {
            next[key] = true;
          }
          changed = true;
        });

        return changed ? next : prev;
      });
    }

    setManualArrows(prev => {
      const manualMap = new Map(
        prev.map(arrow => [`${arrow.startSquare.toLowerCase()}-${arrow.endSquare.toLowerCase()}`, arrow]),
      );

      // Keep only manual arrows that still exist in the board output.
      for (const key of [...manualMap.keys()]) {
        if (!parsedKeys.has(key)) manualMap.delete(key);
      }

      // Add or refresh manual arrows that are not part of immutable engine suggestions.
      for (const arrow of parsedArrows) {
        const key = `${arrow.startSquare}-${arrow.endSquare}`;
        if (engineArrowKeys.has(key)) continue;
        manualMap.set(key, {
          startSquare: arrow.startSquare,
          endSquare: arrow.endSquare,
          color: 'rgba(235, 97, 80, 0.9)',
        });
      }

      return [...manualMap.values()];
    });
  }, [engineArrowKeys]);

  const handleSquareRightClick = useCallback(({ square }: { piece: any; square: string }) => {
    setMarkedSquares(prev => {
      const next = { ...prev };
      if (next[square]) {
        delete next[square];
      } else {
        next[square] = {
          backgroundColor: 'rgb(235, 97, 80)',
          opacity: 0.8,
        };
      }
      return next;
    });
  }, []);

  const mergedSquareStyles = useMemo(
    () => ({ ...customSquareStyles, ...optionSquares, ...markedSquares }),
    [customSquareStyles, markedSquares, optionSquares],
  );

  return (
    <div className="relative chessboard-surface">
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          onSquareRightClick: handleSquareRightClick,
          onArrowsChange: handleArrowsChange,
          boardOrientation: orientation,
          squareStyles: mergedSquareStyles,
          arrows: combinedArrows,
          allowDrawingArrows: true,
          clearArrowsOnClick: true,
          boardStyle: {
            borderRadius: '2px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
          },
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
          animationDurationInMs: isLoading ? 120 : 200,
          snapToCursor: false,
          dropSquareStyle: {
            boxShadow: 'inset 0 0 1px 6px rgba(255, 255, 255, 0.75)'
          }
        }}
      />
    </div>
  );
}
