import { MoveClassification } from './engine';
import { HistoryEntry } from '../../types/tablebase';

export function calculateAccuracy(loss: number): number {
  return Math.max(0, 100 - loss / 10);
}

export function getMoveComment(classification: MoveClassification | string | null | undefined): string {
  switch (classification) {
    case 'blunder':
      return 'This move loses decisive material or position.';
    case 'mistake':
      return 'A better move was available.';
    case 'inaccuracy':
      return 'This move is slightly suboptimal.';
    case 'okay':
      return 'An okay move, but there were better options.';
    case 'excellent':
      return 'Strong move, close to best.';
    case 'best':
      return 'Best move!';
    case 'forced':
      return 'Only move available.';
    case 'opening':
      return 'Book move.';
    case 'splendid':
      return 'Brilliant move!';
    case 'perfect':
      return 'Perfect move!';
    default:
      return '';
  }
}

export function computeGameAccuracy(history: HistoryEntry[]): { whiteAccuracy: number; blackAccuracy: number } {
  let whiteTotal = 0;
  let whiteCount = 0;
  let blackTotal = 0;
  let blackCount = 0;

  history.forEach((entry, idx) => {
    if (idx === 0) return; // Skip initial position
    if (entry.accuracy !== undefined) {
      if (idx % 2 !== 0) {
        whiteTotal += entry.accuracy;
        whiteCount += 1;
      } else {
        blackTotal += entry.accuracy;
        blackCount += 1;
      }
    }
  });

  return {
    whiteAccuracy: whiteCount > 0 ? Math.round(whiteTotal / whiteCount) : 100,
    blackAccuracy: blackCount > 0 ? Math.round(blackTotal / blackCount) : 100,
  };
}
