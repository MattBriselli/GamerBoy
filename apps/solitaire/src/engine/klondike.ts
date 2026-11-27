import { cloneCard, createOrderedDeck } from '@gamerboy/card-kit/deck';
import { RANK_LABEL, SUIT_SYMBOL } from '@gamerboy/card-kit/types';
import { randomSeed, shuffleWithSeed } from '@gamerboy/core/prng';
import {
  Card,
  DealType,
  DrawMode,
  GameSnapshot,
  GameState,
  PileLocation,
} from './types';

export { cloneCard, createOrderedDeck };

export function cloneSnapshot(snap: GameSnapshot): GameSnapshot {
  return {
    stock: snap.stock.map(cloneCard),
    waste: snap.waste.map(cloneCard),
    foundations: snap.foundations.map((pile) => pile.map(cloneCard)),
    tableau: snap.tableau.map((pile) => pile.map(cloneCard)),
    score: snap.score,
    moves: snap.moves,
    recycleCount: snap.recycleCount,
  };
}

export interface DealOptions {
  seed: number;
  drawMode: DrawMode;
  dealType: DealType;
  dailyDate?: string;
}

/**
 * Deals a 52-card Klondike Solitaire board from a deterministic seed.
 * Array end (pile[pile.length - 1]) is the TOP card of every pile.
 */
export function dealKlondike({
  seed,
  drawMode,
  dealType,
  dailyDate,
}: DealOptions): GameState {
  const shuffled = shuffleWithSeed(createOrderedDeck(), seed);
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let cursor = 0;

  // Classic Klondike triangle deal: col i gets i+1 cards, top card faceUp
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...shuffled[cursor++], faceUp: row === col };
      tableau[col].push(card);
    }
  }

  // Remaining 24 cards form the stock (face down)
  const stock = shuffled.slice(cursor).map((c) => ({ ...c, faceUp: false }));

  return {
    seed,
    drawMode,
    dealType,
    dailyDate,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    recycleCount: 0,
    elapsedSeconds: 0,
    isWon: false,
    history: [],
  };
}

export function isGameWon(foundations: Card[][]): boolean {
  return foundations.every((pile) => pile.length === 13);
}

export function canMoveToFoundation(card: Card, foundationPile: Card[]): boolean {
  if (foundationPile.length === 0) {
    return card.rank === 1;
  }
  const top = foundationPile[foundationPile.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function canMoveToTableau(bottomCard: Card, tableauPile: Card[]): boolean {
  if (tableauPile.length === 0) {
    return bottomCard.rank === 13; // Only Kings on empty columns
  }
  const top = tableauPile[tableauPile.length - 1];
  if (!top.faceUp) return false;
  return top.color !== bottomCard.color && bottomCard.rank === top.rank - 1;
}

/**
 * Extracts the card(s) that would move from `from`, or null if invalid/unplayable.
 */
export function getMovingCards(state: GameSnapshot, from: PileLocation): Card[] | null {
  if (from.zone === 'waste') {
    if (state.waste.length === 0) return null;
    return [state.waste[state.waste.length - 1]];
  }
  if (from.zone === 'foundation') {
    const idx = from.index ?? -1;
    const pile = state.foundations[idx];
    if (!pile || pile.length === 0) return null;
    return [pile[pile.length - 1]];
  }
  if (from.zone === 'tableau') {
    const col = from.index ?? -1;
    const pile = state.tableau[col];
    if (!pile || pile.length === 0) return null;
    const startIdx = from.cardIndex ?? pile.length - 1;
    if (startIdx < 0 || startIdx >= pile.length) return null;
    const slice = pile.slice(startIdx);
    if (!slice[0].faceUp) return null;
    // Verify valid alternating descending stack
    for (let i = 1; i < slice.length; i++) {
      if (
        !slice[i].faceUp ||
        slice[i].color === slice[i - 1].color ||
        slice[i].rank !== slice[i - 1].rank - 1
      ) {
        return null;
      }
    }
    return slice;
  }
  return null;
}

export function isValidMove(
  state: GameSnapshot,
  from: PileLocation,
  to: PileLocation
): boolean {
  if (from.zone === to.zone && from.index === to.index) return false;
  const moving = getMovingCards(state, from);
  if (!moving || moving.length === 0) return false;

  if (to.zone === 'foundation') {
    if (moving.length !== 1) return false;
    const idx = to.index ?? -1;
    const targetPile = state.foundations[idx];
    if (!targetPile) return false;
    return canMoveToFoundation(moving[0], targetPile);
  }

  if (to.zone === 'tableau') {
    const col = to.index ?? -1;
    const targetPile = state.tableau[col];
    if (!targetPile) return false;
    return canMoveToTableau(moving[0], targetPile);
  }

  return false;
}

/**
 * Draws 1 or 3 cards from Stock to Waste, or recycles Waste back to Stock.
 */
export function drawOrRecycleStock(state: GameState): GameState {
  if (state.isWon) return state;
  if (state.stock.length === 0 && state.waste.length === 0) return state;

  const prevSnapshot = cloneSnapshot(state);
  const next = cloneSnapshot(state);

  if (next.stock.length > 0) {
    const count = Math.min(state.drawMode, next.stock.length);
    for (let i = 0; i < count; i++) {
      const card = next.stock.pop()!;
      card.faceUp = true;
      next.waste.push(card);
    }
    next.moves += 1;
  } else {
    // Recycle waste back into stock in reverse so original order is preserved
    while (next.waste.length > 0) {
      const card = next.waste.pop()!;
      card.faceUp = false;
      next.stock.push(card);
    }
    next.recycleCount += 1;
    next.moves += 1;
    // Standard Klondike recycle penalty
    if (state.drawMode === 1 && next.recycleCount >= 1) {
      next.score = Math.max(0, next.score - 20);
    } else if (state.drawMode === 3 && next.recycleCount >= 3) {
      next.score = Math.max(0, next.score - 20);
    }
  }

  return {
    ...state,
    ...next,
    history: [...state.history, prevSnapshot],
  };
}

/**
 * Executes a validated move from `from` to `to`, updating score, flipping newly exposed
 * tableau cards, and appending the prior state to `history` for Unlimited Undo.
 */
export function executeMove(
  state: GameState,
  from: PileLocation,
  to: PileLocation
): GameState | null {
  if (state.isWon) return null;
  if (!isValidMove(state, from, to)) return null;

  const prevSnapshot = cloneSnapshot(state);
  const next = cloneSnapshot(state);

  let moving: Card[] = [];

  if (from.zone === 'waste') {
    moving = [next.waste.pop()!];
  } else if (from.zone === 'foundation') {
    moving = [next.foundations[from.index!].pop()!];
  } else if (from.zone === 'tableau') {
    const pile = next.tableau[from.index!];
    const startIdx = from.cardIndex ?? pile.length - 1;
    moving = pile.splice(startIdx);
    // Flip newly exposed card if face-down
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
      next.score += 5;
    }
  }

  if (to.zone === 'foundation') {
    next.foundations[to.index!].push(moving[0]);
    if (from.zone === 'waste' || from.zone === 'tableau') {
      next.score += 10;
    }
  } else if (to.zone === 'tableau') {
    next.tableau[to.index!].push(...moving);
    if (from.zone === 'waste') {
      next.score += 5;
    } else if (from.zone === 'foundation') {
      next.score = Math.max(0, next.score - 15);
    }
  }

  next.moves += 1;
  const won = isGameWon(next.foundations);

  return {
    ...state,
    ...next,
    isWon: won,
    history: [...state.history, prevSnapshot],
  };
}

/**
 * Unlimited Undo: restores the most recent snapshot while keeping elapsed timer.
 */
export function undoMove(state: GameState): GameState {
  if (state.history.length === 0) return state;
  const history = state.history.slice(0, -1);
  const previous = cloneSnapshot(state.history[state.history.length - 1]);

  return {
    ...state,
    ...previous,
    isWon: isGameWon(previous.foundations),
    history,
  };
}

/**
 * Smart Tap-to-Move: finds the best legal destination when a player taps a card or stack.
 * Priority:
 *  1. Foundation (if single card from waste or tableau)
 *  2. Non-empty Tableau column
 *  3. Empty Tableau column (for Kings, skipping no-op King already at base index 0)
 */
export function findSmartMoveForLocation(
  state: GameSnapshot,
  from: PileLocation
): PileLocation | null {
  const moving = getMovingCards(state, from);
  if (!moving || moving.length === 0) return null;

  // 1. Try Foundation if moving a single card from waste or tableau
  if (moving.length === 1 && from.zone !== 'foundation') {
    // Prefer matching non-empty foundation first, then first empty foundation
    for (let f = 0; f < 4; f++) {
      if (state.foundations[f].length > 0 && canMoveToFoundation(moving[0], state.foundations[f])) {
        return { zone: 'foundation', index: f };
      }
    }
    for (let f = 0; f < 4; f++) {
      if (state.foundations[f].length === 0 && canMoveToFoundation(moving[0], state.foundations[f])) {
        return { zone: 'foundation', index: f };
      }
    }
  }

  // 2. Try non-empty Tableau columns
  for (let col = 0; col < 7; col++) {
    if (from.zone === 'tableau' && from.index === col) continue;
    if (state.tableau[col].length > 0 && canMoveToTableau(moving[0], state.tableau[col])) {
      return { zone: 'tableau', index: col };
    }
  }

  // 3. Try empty Tableau column for Kings (skip if King is already sitting at base index 0)
  const isBaseKing =
    from.zone === 'tableau' && (from.cardIndex ?? state.tableau[from.index!].length - 1) === 0;
  if (!isBaseKing) {
    for (let col = 0; col < 7; col++) {
      if (from.zone === 'tableau' && from.index === col) continue;
      if (state.tableau[col].length === 0 && canMoveToTableau(moving[0], state.tableau[col])) {
        return { zone: 'tableau', index: col };
      }
    }
  }

  return null;
}

export interface HintSuggestion {
  from: PileLocation;
  to?: PileLocation;
  description: string;
}

/**
 * Finds a constructive hint for the player (avoids lateral lateral shuffling between
 * identical-rank parents unless it uncovers a face-down card or frees an empty column).
 */
export function findHint(state: GameState): HintSuggestion | null {
  if (state.isWon) return null;

  // 1. Top of Waste -> Foundation
  if (state.waste.length > 0) {
    const wasteCard = state.waste[state.waste.length - 1];
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(wasteCard, state.foundations[f])) {
        return {
          from: { zone: 'waste' },
          to: { zone: 'foundation', index: f },
          description: `Move ${RANK_LABEL[wasteCard.rank]}${SUIT_SYMBOL[wasteCard.suit]} from Waste to Foundation`,
        };
      }
    }
  }

  // 2. Top of Tableau -> Foundation
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(topCard, state.foundations[f])) {
        return {
          from: { zone: 'tableau', index: col, cardIndex: pile.length - 1 },
          to: { zone: 'foundation', index: f },
          description: `Move ${RANK_LABEL[topCard.rank]}${SUIT_SYMBOL[topCard.suit]} to Foundation`,
        };
      }
    }
  }

  // 3. Tableau stack -> Tableau that reveals a face-down card or frees a column for a King
  const hasWaitingKing =
    (state.waste.length > 0 && state.waste[state.waste.length - 1].rank === 13) ||
    state.tableau.some((p) =>
      p.some((c, idx) => c.faceUp && c.rank === 13 && idx > 0)
    );

  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    const firstFaceUpIdx = pile.findIndex((c) => c.faceUp);
    if (firstFaceUpIdx === -1) continue;

    const revealsFaceDown = firstFaceUpIdx > 0;
    const freesColumnForKing = firstFaceUpIdx === 0 && pile[0].rank !== 13 && hasWaitingKing;

    if (!revealsFaceDown && !freesColumnForKing) continue;

    const bottomMoving = pile[firstFaceUpIdx];
    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (targetCol === col) continue;
      if (canMoveToTableau(bottomMoving, state.tableau[targetCol])) {
        return {
          from: { zone: 'tableau', index: col, cardIndex: firstFaceUpIdx },
          to: { zone: 'tableau', index: targetCol },
          description: `Move ${RANK_LABEL[bottomMoving.rank]}${SUIT_SYMBOL[bottomMoving.suit]} to Column ${targetCol + 1}`,
        };
      }
    }
  }

  // 4. Waste -> Tableau
  if (state.waste.length > 0) {
    const wasteCard = state.waste[state.waste.length - 1];
    for (let col = 0; col < 7; col++) {
      if (canMoveToTableau(wasteCard, state.tableau[col])) {
        return {
          from: { zone: 'waste' },
          to: { zone: 'tableau', index: col },
          description: `Play ${RANK_LABEL[wasteCard.rank]}${SUIT_SYMBOL[wasteCard.suit]} from Waste to Column ${col + 1}`,
        };
      }
    }
  }

  // 5. Stock draw / recycle
  if (state.stock.length > 0) {
    return {
      from: { zone: 'stock' },
      description: 'Tap the Stock deck to draw more cards',
    };
  }
  if (state.waste.length > 0) {
    return {
      from: { zone: 'stock' },
      description: 'Tap the empty Stock slot to recycle the Waste pile',
    };
  }

  return null;
}

/**
 * Performs a single greedy step toward Auto-Complete (lowest-rank legal foundation move first,
 * otherwise drawing/recycling stock). Returns null if no greedy step exists.
 */
export function stepAutoComplete(state: GameState): GameState | null {
  if (state.isWon) return null;

  // Gather all single-card foundation moves and pick lowest rank first so piles stay balanced
  const candidates: { from: PileLocation; to: PileLocation; rank: number }[] = [];

  if (state.waste.length > 0) {
    const c = state.waste[state.waste.length - 1];
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(c, state.foundations[f])) {
        candidates.push({
          from: { zone: 'waste' },
          to: { zone: 'foundation', index: f },
          rank: c.rank,
        });
        break;
      }
    }
  }

  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    if (pile.length === 0) continue;
    const c = pile[pile.length - 1];
    if (!c.faceUp) continue;
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(c, state.foundations[f])) {
        candidates.push({
          from: { zone: 'tableau', index: col, cardIndex: pile.length - 1 },
          to: { zone: 'foundation', index: f },
          rank: c.rank,
        });
        break;
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.rank - b.rank);
    return executeMove(state, candidates[0].from, candidates[0].to);
  }

  if (state.stock.length > 0 || state.waste.length > 0) {
    return drawOrRecycleStock(state);
  }

  return null;
}

/**
 * Checks whether all hidden tableau cards are revealed AND greedy foundation stepping
 * cleanly finishes all 52 cards (prevents offering Auto-Complete if Draw-3 stock is deadlocked).
 */
export function canAutoComplete(state: GameState): boolean {
  if (state.isWon) return false;
  const allTableauRevealed = state.tableau.every((pile) => pile.every((c) => c.faceUp));
  if (!allTableauRevealed) return false;

  // Fast Path: no stock or waste cards left -> mathematically 100% auto-completable
  if (state.stock.length === 0 && state.waste.length === 0) {
    return true;
  }

  // Simulate greedy auto-complete up to 160 steps to confirm stock/waste won't deadlock
  let sim: GameState = {
    ...cloneSnapshot(state),
    seed: state.seed,
    drawMode: state.drawMode,
    dealType: state.dealType,
    elapsedSeconds: state.elapsedSeconds,
    isWon: false,
    history: [],
  };
  let foundationTotal = sim.foundations.reduce((sum, p) => sum + p.length, 0);
  let stepsSinceFoundationProgress = 0;

  for (let step = 0; step < 180; step++) {
    const next = stepAutoComplete({ ...sim, history: [] });
    if (!next) return false;
    if (next.isWon) return true;
    const newTotal = next.foundations.reduce((sum, p) => sum + p.length, 0);
    if (newTotal > foundationTotal) {
      foundationTotal = newTotal;
      stepsSinceFoundationProgress = 0;
    } else {
      stepsSinceFoundationProgress += 1;
      // If we cycled the entire stock+waste without advancing any foundation, stop
      if (stepsSinceFoundationProgress > next.stock.length + next.waste.length + 2) {
        return false;
      }
    }
    sim = { ...next, history: [] };
  }

  return false;
}

/**
 * Rewarded Power-Up: Reshuffles all remaining Stock & Waste cards into a fresh
 * Stock order without losing Tableau/Foundation progress (and pushes a snapshot
 * onto history so it remains undoable).
 */
export function rescueShuffleStock(state: GameState): GameState {
  if (state.isWon) return state;
  const combined = [...state.stock, ...state.waste];
  if (combined.length < 2) return state;

  const prevSnapshot = cloneSnapshot(state);
  const next = cloneSnapshot(state);
  const reshuffled = shuffleWithSeed(
    combined.map((c) => ({ ...c, faceUp: false })),
    randomSeed()
  );

  next.stock = reshuffled;
  next.waste = [];
  next.moves += 1;

  return {
    ...state,
    ...next,
    history: [...state.history, prevSnapshot],
  };
}
