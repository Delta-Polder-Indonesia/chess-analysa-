import { Chess } from 'chess.js';

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
  | 'best'
  | 'excellent'
  | 'okay'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'opening'
  | 'forced'
  | 'splendid'
  | 'perfect';

export const CLASSIFICATION_ICONS: Record<MoveClassification, string> = {
  best: '/icons/best.png',
  excellent: '/icons/excellent.png',
  okay: '/icons/okay.png',
  inaccuracy: '/icons/inaccuracy.png',
  mistake: '/icons/mistake.png',
  blunder: '/icons/blunder.png',
  opening: '/icons/opening.png',
  forced: '/icons/forced.png',
  splendid: '/icons/splendid.png',
  perfect: '/icons/perfect.png',
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

export function parseBestMove(bestmove: string): string | null {
  const lower = bestmove.toLowerCase();
  const keywordMatch = lower.match(/bestmove\s+([a-h][1-8][a-h][1-8][nbrq]?)/i);
  if (keywordMatch?.[1]) return keywordMatch[1];
  const tokenMatch = lower.match(/[a-h][1-8][a-h][1-8][nbrq]?/i);
  return tokenMatch?.[0] ?? null;
}

export function extractUciTokens(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-h][1-8][a-h][1-8][nbrq]?/g);
  return matches ?? [];
}

export function parseUciMove(uci: string): { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' } | null {
  const clean = uci.toLowerCase();
  const match = clean.match(/^([a-h][1-8])([a-h][1-8])([nbrq])?$/);
  if (!match) return null;
  return {
    from: match[1],
    to: match[2],
    promotion: match[3] as 'q' | 'r' | 'b' | 'n' | undefined,
  };
}

export function toScoreLabel(scoreCp: number | null, mate: number | null): string {
  if (mate !== null) return `#${mate > 0 ? '+' : ''}${mate}`;
  if (scoreCp === null) return '--';
  const value = scoreCp / 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function normalizeContinuation(bestMoveUci: string | null, continuation: string[]): string[] {
  if (!bestMoveUci) return continuation;
  if (continuation[0] === bestMoveUci) return continuation;
  return [bestMoveUci, ...continuation];
}

export function parsePvMovesFromUci(fen: string, uciMoves: string[]): ParsedPvMove[] {
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

export async function fetchStockfishOnline(fen: string, depth: number): Promise<StockfishAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const response = await fetch('https://chess-api.com/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, depth: Math.max(1, Math.min(18, depth)), maxMoves: 4 }),
    signal: controller.signal
  });

  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`Stockfish API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  const mateVal = data.mate !== undefined && data.mate !== null ? Number(data.mate) : null;
  const cpVal = mateVal === null && data.centipawns !== undefined ? Number(data.centipawns) : null;

  return {
    evaluationCp: cpVal,
    mate: mateVal,
    bestMoveUci: data.move || null,
    continuation: data.continuationArr || [],
    lines: [],
  };
}

function scoreFromWhitePerspective(scoreCp: number | null, mate: number | null): number {
  if (mate !== null) {
    return mate > 0 ? 100000 - mate : -100000 - mate;
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

export function classifyMove(
  uci: string,
  prevAnalysis: StockfishAnalysis | null,
  currAnalysis: StockfishAnalysis | null,
  isOpening: boolean,
  legalMovesCount: number
): MoveClassification | null {
  if (isOpening) return 'opening';
  if (legalMovesCount <= 1) return 'forced';
  if (!prevAnalysis) return null;

  const bestMove = prevAnalysis.bestMoveUci;
  if (uci === bestMove) return 'best';

  // Calculate centipawn loss
  // Note: prevAnalysis is for the position BEFORE the move.
  // It already contains the evaluation for the best move.
  const bestEval = scoreFromWhitePerspective(prevAnalysis.evaluationCp, prevAnalysis.mate);
  const currEval = scoreFromWhitePerspective(currAnalysis?.evaluationCp ?? null, currAnalysis?.mate ?? null);

  // Loss is from the perspective of the player who just moved.
  // If White just moved, loss = BestEval - CurrEval (if BestEval was +1 and CurrEval is +0.2, loss is 0.8)
  // If Black just moved, loss = CurrEval - BestEval (if BestEval was -1 and CurrEval is -0.2, loss is 0.8)
  // Wait, let's simplify: the side who moved is the opposite of the current side to move.
  const loss = Math.abs(bestEval - currEval);

  if (loss <= 20) return 'excellent';
  if (loss <= 50) return 'okay';
  if (loss <= 120) return 'inaccuracy';
  if (loss <= 250) return 'mistake';
  return 'blunder';
}
