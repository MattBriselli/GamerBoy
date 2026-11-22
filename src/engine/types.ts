export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
export type CardColor = 'black' | 'red';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  color: CardColor;
  faceUp: boolean;
}

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

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

export const RANK_LABEL: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export function getSuitColor(suit: Suit): CardColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
