import { Variant } from '../../types/tablebase';
import { TABLEBASE_LIMITS } from './constants';

export function categoryScore(category: string): number {
  switch (category) {
    case 'win':
    case 'syzygy-win':
      return 900;
    case 'maybe-win':
      return 360;
    case 'cursed-win':
      return 140;
    case 'draw':
      return 0;
    case 'blessed-loss':
      return -140;
    case 'maybe-loss':
      return -360;
    case 'loss':
    case 'syzygy-loss':
      return -900;
    default:
      return 0;
  }
}

export function cacheKey(variant: Variant, fen: string): string {
  return `${variant}::${fen}`;
}

export function getLimitError(variant: Variant, pieces: number): string | null {
  const limit = TABLEBASE_LIMITS[variant];
  if (pieces <= limit) return null;
  return `${variant} tablebase supports up to ${limit} pieces. Current position has ${pieces}.`;
}
