export type Category =
  | 'win'
  | 'unknown'
  | 'syzygy-win'
  | 'maybe-win'
  | 'cursed-win'
  | 'draw'
  | 'blessed-loss'
  | 'maybe-loss'
  | 'syzygy-loss'
  | 'loss';

export type MoveCategory =
  | 'loss'
  | 'unknown'
  | 'syzygy-loss'
  | 'maybe-loss'
  | 'blessed-loss'
  | 'draw'
  | 'cursed-win'
  | 'maybe-win'
  | 'syzygy-win'
  | 'win';

export interface TablebaseMove {
  uci: string;
  san: string;
  dtz: number | null;
  precise_dtz: number | null;
  dtc: number | null;
  dtm: number | null;
  dtw: number | null;
  zeroing: boolean;
  checkmate: boolean;
  stalemate: boolean;
  variant_win: boolean;
  variant_loss: boolean;
  insufficient_material: boolean;
  category: MoveCategory;
}

export interface TablebaseResult {
  dtz: number | null;
  precise_dtz: number | null;
  dtc: number | null;
  dtm: number | null;
  dtw: number | null;
  checkmate: boolean;
  stalemate: boolean;
  variant_win: boolean;
  variant_loss: boolean;
  insufficient_material: boolean;
  category: Category;
  moves: TablebaseMove[];
}

export type Variant = 'standard' | 'antichess' | 'atomic';

export interface HistoryEntry {
  fen: string;
  san?: string;
  uci?: string;
  result?: TablebaseResult;
  moveEvaluation?: { cp: number | null; mate: number | null };
  classification?: MoveCategory | string; // Using string to allow engine classifications
  accuracy?: number;
  comment?: string;
}
