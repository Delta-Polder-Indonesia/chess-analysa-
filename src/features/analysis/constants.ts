import { EngineSettings } from '../../components/EngineSettingsModal';
import { Variant } from '../../types/tablebase';

export const STARTING_FEN = '8/8/8/8/8/1r6/6K1/4k1Q1 w - - 0 1';
export const NEW_GAME_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const VARIANTS: Variant[] = ['standard', 'antichess', 'atomic'];

export const TABLEBASE_LIMITS: Record<Variant, number> = {
  standard: 7,
  antichess: 4,
  atomic: 6,
};

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  enabled: true,
  engine: 'stockfish',
  depth: 18,
  multiPv: 3,
  arrowCount: 3,
  arrowMode: 'top',
  showOpponentArrows: false,
  threads: 2,
  hash: 256,
  skillLevel: 20,
  moveOverhead: 30,
  slowMover: 100,
  contempt: 0,
  useNnue: true,
  syzygy50MoveRule: true,
  showArrows: true,
  showPv: true,
};
