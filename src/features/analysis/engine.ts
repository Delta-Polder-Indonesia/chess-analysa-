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
  const params = new URLSearchParams({
    fen,
    depth: String(Math.max(1, Math.min(15, depth))),
  });
  const url = `https://stockfish.online/api/s/v2.php?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`Stockfish API HTTP ${response.status}`);
  }

  const data = (await response.json()) as StockfishApiResponse;
  if (!data.success) {
    throw new Error(data.error || 'Stockfish API returned an error.');
  }

  const continuation = typeof data.continuation === 'string' ? extractUciTokens(data.continuation) : [];

  return {
    evaluationCp: data.evaluation === null ? null : Math.round(data.evaluation * 100),
    mate: data.mate,
    bestMoveUci: parseBestMove(data.bestmove),
    continuation,
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
