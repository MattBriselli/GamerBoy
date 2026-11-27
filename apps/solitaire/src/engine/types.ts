import type { Card } from '@gamerboy/card-kit/types';

export type { Card, CardColor, Rank, Suit } from '@gamerboy/card-kit/types';
export {
  getSuitColor,
  RANK_LABEL,
  RANKS,
  SUIT_SYMBOL,
  SUITS,
} from '@gamerboy/card-kit/types';

export type DrawMode = 1 | 3;
export type DealType = 'standard' | 'winning' | 'daily';

export type PileZone = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileLocation {
  zone: PileZone;
  index?: number; // 0..3 for foundation, 0..6 for tableau
  cardIndex?: number; // index within tableau pile when moving a stack
}

export interface MoveAction {
  from: PileLocation;
  to: PileLocation;
  cards: Card[];
}

export interface GameSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
  moves: number;
  recycleCount: number;
}

export interface GameState extends GameSnapshot {
  seed: number;
  drawMode: DrawMode;
  dealType: DealType;
  dailyDate?: string; // YYYY-MM-DD
  elapsedSeconds: number;
  isWon: boolean;
  history: GameSnapshot[];
}
