import { Chess } from 'chess.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ParsedPvMove = {
  uci: string;
  san: string;
  prefix: string;
};

export type StockfishApiResponse = {
  success: boolean;
  evaluation: number | null;
  mate: number | null;
  bestmove: string;
  continuation: string;
  error?: string;
};

export type StockfishLine = {
  id: string;
  scoreCp: number | null;
  mate: number | null;
  movesUci: string[];
  source: 'api' | 'fallback';
};

export type StockfishAnalysis = {
  evaluationCp: number | null;
  mate: number | null;
  bestMoveUci: string | null;
  continuation: string[];
  lines: StockfishLine[];
};

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'
  | 'forced';

export const CLASSIFICATION_ICONS: Record<MoveClassification, string> = {
  brilliant: '/icons/brilliant.png',
  great: '/icons/great.png',
  best: '/icons/best.png',
  excellent: '/icons/excellent.png',
  good: '/icons/good.png',
  book: '/icons/book.png',
  inaccuracy: '/icons/inaccuracy.png',
  mistake: '/icons/mistake.png',
  miss: '/icons/miss.png',
  blunder: '/icons/blunder.png',
  forced: '/icons/forced.png',
};

export const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: '#1baaa7',
  great: '#5b8bb6',
  best: '#98bc4b',
  excellent: '#98bc4b',
  good: '#97af8b',
  book: '#a88764',
  inaccuracy: '#f7c631',
  mistake: '#e6912c',
  miss: '#db6a2c',
  blunder: '#ca3431',
  forced: '#97af8b',
};

export type EngineSuggestionMove = {
  uci: string;
  san: string;
  score: number;
  source: 'api' | 'fallback';
};

export type EngineArrowMove = {
  uci: string;
  side: 'player' | 'opponent';
};

// ─────────────────────────────────────────────────────────────
// UCI Parsing Utilities
// ─────────────────────────────────────────────────────────────

export function parseBestMove(bestmove: string): string | null {
  const lower = bestmove.toLowerCase();
  const keywordMatch = lower.match(
    /bestmove\s+([a-h][1-8][a-h][1-8][nbrq]?)/i,
  );
  if (keywordMatch?.[1]) return keywordMatch[1];
  const tokenMatch = lower.match(/[a-h][1-8][a-h][1-8][nbrq]?/i);
  return tokenMatch?.[0] ?? null;
}

export function extractUciTokens(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-h][1-8][a-h][1-8][nbrq]?/g);
  return matches ?? [];
}

export function parseUciMove(
  uci: string,
): { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' } | null {
  const clean = uci.toLowerCase();
  const match = clean.match(/^([a-h][1-8])([a-h][1-8])([nbrq])?$/);
  if (!match) return null;
  return {
    from: match[1],
    to: match[2],
    promotion: match[3] as 'q' | 'r' | 'b' | 'n' | undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Score Formatting
// ─────────────────────────────────────────────────────────────

export function toScoreLabel(
  scoreCp: number | null,
  mate: number | null,
): string {
  if (mate !== null) return `#${mate > 0 ? '+' : ''}${mate}`;
  if (scoreCp === null) return '--';
  const value = scoreCp / 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

/** Returns a short eval bar label like "+1.2" or "M3". */
export function toEvalBarLabel(
  scoreCp: number | null,
  mate: number | null,
): string {
  if (mate !== null) return `M${Math.abs(mate)}`;
  if (scoreCp === null) return '0.0';
  const value = Math.abs(scoreCp) / 100;
  return value.toFixed(1);
}

/**
 * Returns a percentage (0–100) representing how much of the eval bar
 * should be filled for White. 50 = equal.
 */
export function evalToWhitePercent(
  scoreCp: number | null,
  mate: number | null,
): number {
  if (mate !== null) return mate > 0 ? 100 : 0;
  if (scoreCp === null) return 50;
  // Use a sigmoid-style curve so extremes flatten out
  const clamped = Math.max(-1000, Math.min(1000, scoreCp));
  return 50 + (clamped / 1000) * 50;
}

// ─────────────────────────────────────────────────────────────
// Continuation Helpers
// ─────────────────────────────────────────────────────────────

export function normalizeContinuation(
  bestMoveUci: string | null,
  continuation: string[],
): string[] {
  if (!bestMoveUci) return continuation;
  if (continuation[0] === bestMoveUci) return continuation;
  return [bestMoveUci, ...continuation];
}

export function parsePvMovesFromUci(
  fen: string,
  uciMoves: string[],
): ParsedPvMove[] {
  try {
    const game = new Chess(fen);
    const startFullMove = Number(fen.split(' ')[5] || '1');
    let moveNumber = Number.isFinite(startFullMove) ? startFullMove : 1;
    const parsed: ParsedPvMove[] = [];

    for (let i = 0; i < uciMoves.length; i += 1) {
      const moveData = parseUciMove(uciMoves[i]);
      if (!moveData) break;

      const turnBeforeMove = game.turn();
      const played = game.move(moveData);
      if (!played) break;

      let prefix = '';
      if (turnBeforeMove === 'w') {
        prefix = `${moveNumber}.`;
      } else if (i === 0) {
        prefix = `${moveNumber}...`;
      }

      parsed.push({
        uci: uciMoves[i],
        san: played.san,
        prefix,
      });

      if (turnBeforeMove === 'b') {
        moveNumber += 1;
      }
    }

    return parsed;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Stockfish API
// ─────────────────────────────────────────────────────────────

export async function fetchStockfishOnline(
  fen: string,
  depth: number,
): Promise<StockfishAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  const response = await fetch('https://chess-api.com/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fen,
      depth: Math.max(1, Math.min(18, depth)),
      maxMoves: 4,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`Stockfish API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  const mateVal =
    data.mate !== undefined && data.mate !== null ? Number(data.mate) : null;
  const cpVal =
    mateVal === null && data.centipawns !== undefined
      ? Number(data.centipawns)
      : null;

  return {
    evaluationCp: cpVal,
    mate: mateVal,
    bestMoveUci: data.move || null,
    continuation: data.continuationArr || [],
    lines: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Score Comparison
// ─────────────────────────────────────────────────────────────

/**
 * Converts any eval to a single number from White's perspective.
 * Mate scores are pushed to extreme values so they always dominate.
 */
function scoreFromWhitePerspective(
  scoreCp: number | null,
  mate: number | null,
): number {
  if (mate !== null) {
    return mate > 0 ? 100_000 - mate : -100_000 - mate;
  }
  return scoreCp ?? 0;
}

export function compareScoresForTurn(
  a: { scoreCp: number | null; mate: number | null },
  b: { scoreCp: number | null; mate: number | null },
  turn: 'w' | 'b',
): number {
  const aScore = scoreFromWhitePerspective(a.scoreCp, a.mate);
  const bScore = scoreFromWhitePerspective(b.scoreCp, b.mate);
  return turn === 'w' ? bScore - aScore : aScore - bScore;
}

// ─────────────────────────────────────────────────────────────
// Move Classification  (chess.com-style)
// ─────────────────────────────────────────────────────────────

/**
 * Determines whether the played move is a sacrifice.
 * A sacrifice means the player voluntarily gives up material.
 */
function isSacrifice(fen: string, uci: string): boolean {
  try {
    const game = new Chess(fen);
    const moveData = parseUciMove(uci);
    if (!moveData) return false;

    const movingPiece = game.get(moveData.from as any);
    if (!movingPiece) return false;

    const captured = game.get(moveData.to as any);
    if (!captured) return false;

    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const movingValue = pieceValues[movingPiece.type] ?? 0;
    const capturedValue = pieceValues[captured.type] ?? 0;

    // Sacrifice = you give up more material than you win
    return movingValue > capturedValue + 1;
  } catch {
    return false;
  }
}

/**
 * Detects whether the opponent was threatening mate before this move
 * and the played move prevents it.
 */
function preventsMate(
  prevAnalysis: StockfishAnalysis | null,
  currAnalysis: StockfishAnalysis | null,
  turnBeforeMove: 'w' | 'b',
): boolean {
  if (!prevAnalysis || !currAnalysis) return false;
  // Opponent had forced mate, now they don't
  if (prevAnalysis.mate !== null) {
    const mateForOpponent =
      (turnBeforeMove === 'w' && prevAnalysis.mate < 0) ||
      (turnBeforeMove === 'b' && prevAnalysis.mate > 0);
    if (mateForOpponent && currAnalysis.mate === null) return true;
  }
  return false;
}

/**
 * Chess.com-style classification.
 *
 * ┌────────────┬───────────────────────────────────────────────────────┐
 * │ Category   │ Criteria                                             │
 * ├────────────┼───────────────────────────────────────────────────────┤
 * │ brilliant  │ Sacrifice + best/excellent move, OR prevents mate    │
 * │ great      │ Only strong move in a very sharp position            │
 * │ best       │ Matches engine top pick                              │
 * │ excellent  │ Loss ≤ 10 cp                                         │
 * │ good       │ Loss ≤ 30 cp                                         │
 * │ book       │ Opening-book move                                    │
 * │ inaccuracy │ Loss 30–80 cp                                        │
 * │ mistake    │ Loss 80–200 cp                                       │
 * │ miss       │ Missed a winning tactic (had mate, lost it)          │
 * │ blunder    │ Loss > 200 cp                                        │
 * │ forced     │ Only legal move                                      │
 * └────────────┴───────────────────────────────────────────────────────┘
 */
export function classifyMove(
  uci: string,
  fen: string,
  prevAnalysis: StockfishAnalysis | null,
  currAnalysis: StockfishAnalysis | null,
  isOpening: boolean,
  legalMovesCount: number,
  turnBeforeMove: 'w' | 'b',
): { classification: MoveClassification | null; loss: number } {
  // ── Book move ──────────────────────────────────────────────
  if (isOpening) return { classification: 'book', loss: 0 };

  // ── Forced move ────────────────────────────────────────────
  if (legalMovesCount <= 1) return { classification: 'forced', loss: 0 };

  // Need engine data for everything below
  if (!prevAnalysis) return { classification: null, loss: 0 };

  // ── Compute centipawn loss ─────────────────────────────────
  const bestEval = scoreFromWhitePerspective(
    prevAnalysis.evaluationCp,
    prevAnalysis.mate,
  );
  const currEval = scoreFromWhitePerspective(
    currAnalysis?.evaluationCp ?? null,
    currAnalysis?.mate ?? null,
  );

  let loss: number;
  if (turnBeforeMove === 'w') {
    loss = bestEval - currEval;
  } else {
    loss = currEval - bestEval;
  }
  loss = Math.max(0, loss);

  const isBestMove = uci === prevAnalysis.bestMoveUci;

  // ── Miss: player had mate and lost it ──────────────────────
  if (prevAnalysis.mate !== null && !isBestMove) {
    const hadMateForPlayer =
      (turnBeforeMove === 'w' && prevAnalysis.mate > 0) ||
      (turnBeforeMove === 'b' && prevAnalysis.mate < 0);

    if (hadMateForPlayer) {
      const stillHasMate =
        currAnalysis?.mate !== null &&
        ((turnBeforeMove === 'w' && (currAnalysis?.mate ?? 0) < 0) === false);

      if (!stillHasMate) {
        return { classification: 'miss', loss };
      }
    }
  }

  // ── Brilliant: sacrifice that is engine-approved, or prevents mate ─
  if (loss <= 10) {
    if (preventsMate(prevAnalysis, currAnalysis, turnBeforeMove)) {
      return { classification: 'brilliant', loss };
    }
    if (isSacrifice(fen, uci)) {
      return { classification: 'brilliant', loss };
    }
  }

  // ── Great: strong move in a sharp position (narrow best margin) ─
  // Approximation: not the #1 move but still within 5 cp, and position was
  // volatile (eval swung more than 150 cp in the last pair of plies).
  if (!isBestMove && loss <= 5 && Math.abs(bestEval) > 150) {
    return { classification: 'great', loss };
  }

  // ── Best ───────────────────────────────────────────────────
  if (isBestMove) return { classification: 'best', loss };

  // ── Excellent ──────────────────────────────────────────────
  if (loss <= 10) return { classification: 'excellent', loss };

  // ── Good ───────────────────────────────────────────────────
  if (loss <= 30) return { classification: 'good', loss };

  // ── Inaccuracy ─────────────────────────────────────────────
  if (loss <= 80) return { classification: 'inaccuracy', loss };

  // ── Mistake ────────────────────────────────────────────────
  if (loss <= 200) return { classification: 'mistake', loss };

  // ── Blunder ────────────────────────────────────────────────
  return { classification: 'blunder', loss };
}

// ─────────────────────────────────────────────────────────────
// Accuracy (chess.com-style per-game accuracy %)
// ─────────────────────────────────────────────────────────────

/**
 * Converts a centipawn loss array into a chess.com-style accuracy
 * percentage (0–100). Uses the same "win%" model chess.com describes:
 *
 *   winChance(cp) = 50 + 50 * (2 / (1 + e^(-0.00368208 * cp)) - 1)
 *
 * Accuracy of a single move = clamp(103.1668 * e^(-0.04354 * |Δwin%|) - 3.1668)
 * Overall accuracy = average of per-move accuracies.
 */
export function winChance(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function moveAccuracy(cpLoss: number): number {
  const winDelta = Math.abs(
    winChance(0) - winChance(-Math.abs(cpLoss)),
  );
  const raw = 103.1668 * Math.exp(-0.04354 * winDelta) - 3.1668;
  return Math.max(0, Math.min(100, raw));
}

export function gameAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 100;
  const sum = cpLosses.reduce((a, b) => a + moveAccuracy(b), 0);
  return Math.round((sum / cpLosses.length) * 10) / 10;
}

// ─────────────────────────────────────────────────────────────
// Classification Summary (for the report panel)
// ─────────────────────────────────────────────────────────────

export type ClassificationSummary = Record<MoveClassification, number>;

export function emptyClassificationSummary(): ClassificationSummary {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
    forced: 0,
  };
}

export function buildClassificationSummary(
  classifications: (MoveClassification | null)[],
): ClassificationSummary {
  const summary = emptyClassificationSummary();
  for (const c of classifications) {
    if (c !== null && c in summary) {
      summary[c] += 1;
    }
  }
  return summary;
}