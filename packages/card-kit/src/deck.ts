import { Card, getSuitColor, RANKS, SUITS } from './types';

export function createOrderedDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    const color = getSuitColor(suit);
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color,
        faceUp: false,
      });
    }
  }
  return deck;
}

export function cloneCard(card: Card): Card {
  return { ...card };
}
