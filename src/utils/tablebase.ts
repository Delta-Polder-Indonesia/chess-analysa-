import { Category, MoveCategory, TablebaseResult, Variant } from '../types/tablebase';

const BASE_URL = 'https://tablebase.lichess.ovh';

export async function fetchTablebase(fen: string, variant: Variant = 'standard'): Promise<TablebaseResult> {
  const encodedFen = fen.replace(/ /g, '_');
  const url = `${BASE_URL}/${variant}?fen=${encodeURIComponent(encodedFen)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export function getCategoryColor(category: Category | MoveCategory): string {
  switch (category) {
    case 'win':
    case 'syzygy-win':
      return 'bg-green-600 text-white';
    case 'maybe-win':
      return 'bg-green-400 text-white';
    case 'cursed-win':
      return 'bg-lime-500 text-white';
    case 'draw':
      return 'bg-gray-500 text-white';
    case 'blessed-loss':
      return 'bg-orange-400 text-white';
    case 'maybe-loss':
      return 'bg-red-400 text-white';
    case 'loss':
    case 'syzygy-loss':
      return 'bg-red-600 text-white';
    case 'unknown':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-300 text-gray-800';
  }
}

export function getCategoryBadgeColor(category: Category | MoveCategory): string {
  switch (category) {
    case 'win':
    case 'syzygy-win':
      return 'bg-green-500/20 text-green-200 border border-green-400/40';
    case 'maybe-win':
      return 'bg-green-500/15 text-green-200 border border-green-400/30';
    case 'cursed-win':
      return 'bg-lime-500/20 text-lime-200 border border-lime-400/40';
    case 'draw':
      return 'bg-gray-500/20 text-gray-200 border border-gray-400/40';
    case 'blessed-loss':
      return 'bg-orange-500/20 text-orange-200 border border-orange-400/40';
    case 'maybe-loss':
      return 'bg-red-500/15 text-red-200 border border-red-400/30';
    case 'loss':
    case 'syzygy-loss':
      return 'bg-red-500/20 text-red-200 border border-red-400/40';
    case 'unknown':
      return 'bg-gray-500/20 text-gray-300 border border-gray-400/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-400/40';
  }
}

export function getCategoryTextColor(category: Category | MoveCategory): string {
  switch (category) {
    case 'win':
    case 'syzygy-win':
      return 'text-green-600';
    case 'maybe-win':
      return 'text-green-500';
    case 'cursed-win':
      return 'text-lime-600';
    case 'draw':
      return 'text-gray-500';
    case 'blessed-loss':
      return 'text-orange-500';
    case 'maybe-loss':
      return 'text-red-400';
    case 'loss':
    case 'syzygy-loss':
      return 'text-red-600';
    case 'unknown':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export function formatCategory(category: Category | MoveCategory): string {
  switch (category) {
    case 'win': return 'Win';
    case 'syzygy-win': return 'Win (Syzygy)';
    case 'maybe-win': return 'Maybe Win';
    case 'cursed-win': return 'Cursed Win';
    case 'draw': return 'Draw';
    case 'blessed-loss': return 'Blessed Loss';
    case 'maybe-loss': return 'Maybe Loss';
    case 'loss': return 'Loss';
    case 'syzygy-loss': return 'Loss (Syzygy)';
    case 'unknown': return 'Unknown';
    default: return category;
  }
}

export function getCategoryIconSrc(category: Category | MoveCategory): string {
  switch (category) {
    case 'win':
    case 'syzygy-win':
      return '/icons/best.png';
    case 'maybe-win':
      return '/icons/excellent.png';
    case 'cursed-win':
      return '/icons/okay.png';
    case 'draw':
      return '/icons/okay.png';
    case 'blessed-loss':
      return '/icons/inaccuracy.png';
    case 'maybe-loss':
      return '/icons/mistake.png';
    case 'loss':
    case 'syzygy-loss':
      return '/icons/blunder.png';
    case 'unknown':
      return '/icons/opening.png';
    default:
      return '/icons/opening.png';
  }
}

export function countPieces(fen: string): number {
  const position = fen.split(' ')[0];
  let count = 0;
  for (const ch of position) {
    if (ch.match(/[a-zA-Z]/)) count++;
  }
  return count;
}

export function isEndgame(fen: string): boolean {
  return countPieces(fen) <= 7;
}

export const EXAMPLE_POSITIONS = [
  {
    label: 'KQK (King + Queen vs King)',
    fen: '8/8/8/8/8/8/6K1/4k1Q1 w - - 0 1',
    pieces: 3,
  },
  {
    label: 'KRK (King + Rook vs King)',
    fen: '8/8/8/8/8/8/6K1/4k1R1 w - - 0 1',
    pieces: 3,
  },
  {
    label: 'KQKR (Queen vs Rook)',
    fen: '8/8/8/8/8/1r6/6K1/4k1Q1 w - - 0 1',
    pieces: 4,
  },
  {
    label: 'KBK (King + Bishop - Draw)',
    fen: '8/8/8/8/8/8/4B1K1/4k3 w - - 0 1',
    pieces: 3,
  },
  {
    label: 'KPPK (Two Pawns vs King)',
    fen: '8/8/8/8/8/8/PPK5/4k3 w - - 0 1',
    pieces: 4,
  },
  {
    label: 'KPK (Pawn Endgame)',
    fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
    pieces: 3,
  },
  {
    label: 'KQKP (Queen vs Pawn)',
    fen: '8/8/8/8/8/5Q2/1p6/1K2k3 w - - 0 1',
    pieces: 4,
  },
  {
    label: 'KBNK (Bishop + Knight)',
    fen: '8/8/8/8/8/N3B3/6K1/4k3 w - - 0 1',
    pieces: 4,
  },
  {
    label: 'Promotion Puzzle',
    fen: '4k3/6KP/8/8/8/8/7p/8 w - - 0 1',
    pieces: 4,
  },
  {
    label: 'KRKB (Rook vs Bishop)',
    fen: '8/8/8/8/3b4/8/3RK3/4k3 w - - 0 1',
    pieces: 4,
  },
  {
    label: '7-piece Endgame',
    fen: 'r1b1k2r/pp3ppp/2p5/3q4/8/2N5/PPP2PPP/R1BQK2R w KQkq - 0 1',
    pieces: 7,
  },
  {
    label: 'KNNK (Two Knights)',
    fen: '8/8/8/8/8/N7/N5K1/4k3 w - - 0 1',
    pieces: 4,
  },
];
