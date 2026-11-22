import {
  canAutoComplete,
  createOrderedDeck,
  dealKlondike,
  drawOrRecycleStock,
  executeMove,
  stepAutoComplete,
  undoMove,
} from '../src/engine/klondike';
import {
  getDailyWinningSeed,
  isSeedWinnable,
  VERIFIED_WINNING_SEEDS,
} from '../src/engine/solver';
import { Card, GameState } from '../src/engine/types';

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const suites: { name: string; fn: () => void }[] = [];
function runTest(name: string, fn: () => void) {
  suites.push({ name, fn });
}

runTest('Klondike deal contains 52 unique cards in classic 1..7 + 24 layout', () => {
  const game = dealKlondike({ seed: 42, drawMode: 1, dealType: 'standard' });

  expect(game.stock.length === 24, 'stock should have 24 cards');
  expect(game.waste.length === 0, 'waste should start empty');
  expect(game.tableau.length === 7, 'tableau should have 7 columns');

  const seen = new Set<string>();
  game.stock.forEach((c) => {
    expect(c.faceUp === false, 'stock cards should be face down');
    seen.add(c.id);
  });

  game.tableau.forEach((pile, colIdx) => {
    expect(pile.length === colIdx + 1, `column ${colIdx} length`);
    pile.forEach((c, rowIdx) => {
      expect(c.faceUp === (rowIdx === colIdx), 'only top tableau card is face up');
      seen.add(c.id);
    });
  });

  expect(seen.size === 52, 'all 52 unique cards present');
});

runTest('Draw 3 and recycle preserves exact deck order and Unlimited Undo restores state', () => {
  const initial = dealKlondike({ seed: 10027, drawMode: 3, dealType: 'winning' });
  const originalStockIds = initial.stock.map((c) => c.id).join(',');

  let state = initial;
  for (let i = 0; i < 8; i++) {
    state = drawOrRecycleStock(state);
  }
  expect(state.stock.length === 0, 'stock emptied after 8 Draw-3 pulls');
  expect(state.waste.length === 24, 'all 24 cards in waste');
  expect(state.moves === 8, '8 moves recorded');

  state = drawOrRecycleStock(state);
  expect(state.stock.length === 24, 'recycled back to 24 stock cards');
  expect(state.waste.length === 0, 'waste emptied on recycle');
  expect(state.recycleCount === 1, 'recycleCount incremented');
  expect(
    state.stock.map((c) => c.id).join(',') === originalStockIds,
    'recycled stock order matches initial stock order'
  );

  for (let i = 0; i < 9; i++) {
    state = undoMove(state);
  }
  expect(state.moves === 0, 'moves undone back to 0');
  expect(state.history.length === 0, 'history stack emptied');
  expect(
    state.stock.map((c) => c.id).join(',') === originalStockIds,
    'undone stock matches original'
  );
});

runTest('Tableau enforces alternating colors, descending ranks, and King-only empty columns', () => {
  const base = dealKlondike({ seed: 99, drawMode: 1, dealType: 'standard' });
  const redQueen: Card = {
    id: 'hearts-12',
    suit: 'hearts',
    rank: 12,
    color: 'red',
    faceUp: true,
  };
  const blackKing: Card = {
    id: 'spades-13',
    suit: 'spades',
    rank: 13,
    color: 'black',
    faceUp: true,
  };
  const redKing: Card = {
    id: 'diamonds-13',
    suit: 'diamonds',
    rank: 13,
    color: 'red',
    faceUp: true,
  };

  base.tableau = [[], [blackKing], [redKing], [], [], [], []];
  base.waste = [redQueen];

  expect(
    executeMove(base, { zone: 'waste' }, { zone: 'tableau', index: 0 }) === null,
    'non-King rejected on empty column'
  );
  expect(
    executeMove(base, { zone: 'waste' }, { zone: 'tableau', index: 2 }) === null,
    'same-color move rejected'
  );

  const moved = executeMove(base, { zone: 'waste' }, { zone: 'tableau', index: 1 });
  if (!moved) throw new Error('Expected valid Red Queen onto Black King move');
  expect(moved.tableau[1].length === 2, 'Red Queen placed on Black King');
  expect(moved.score === 5, '+5 points for Waste to Tableau');

  const stackMoved = executeMove(
    moved,
    { zone: 'tableau', index: 1, cardIndex: 0 },
    { zone: 'tableau', index: 0 }
  );
  if (!stackMoved) throw new Error('Expected valid King+Queen stack move to empty col');
  expect(stackMoved.tableau[0].length === 2, '2-card stack moved to empty col 0');
  expect(stackMoved.tableau[1].length === 0, 'source col 1 now empty');
});

runTest('Auto-Complete detects revealed board and cascades all 52 cards to victory', () => {
  const ordered = createOrderedDeck().map((c) => ({ ...c, faceUp: true }));
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  for (let s = 0; s < 4; s++) {
    tableau[s] = ordered.slice(s * 13, (s + 1) * 13).reverse();
  }

  let state: GameState = {
    ...dealKlondike({ seed: 1, drawMode: 1, dealType: 'winning' }),
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };

  expect(canAutoComplete(state) === true, 'board should be auto-completable');

  let steps = 0;
  while (!state.isWon && steps < 60) {
    const next = stepAutoComplete(state);
    if (!next) throw new Error('Expected greedy auto-complete step');
    state = next;
    steps++;
  }

  expect(state.isWon === true, 'game won after auto-complete');
  expect(steps === 52, 'took exact 52 foundation placements');
  expect(state.score === 520, '52 * 10 = 520 foundation points');
});

runTest('Verified Winning Seeds and Daily Challenge seeds are deterministic and solvable', () => {
  for (const seed of VERIFIED_WINNING_SEEDS.slice(0, 6)) {
    expect(isSeedWinnable(seed, 1, 2500), `seed ${seed} winnable in Draw 1`);
    expect(isSeedWinnable(seed, 3, 2500), `seed ${seed} winnable in Draw 3`);
  }

  const dailyA = getDailyWinningSeed('2026-11-22', 1);
  const dailyB = getDailyWinningSeed('2026-11-22', 1);
  expect(dailyA === dailyB, 'Daily Challenge seed is deterministic');
  expect(isSeedWinnable(dailyA, 1, 2500), 'Daily Challenge seed is winnable');
});

// Execute all tests
let passed = 0;
for (const s of suites) {
  s.fn();
  passed++;
  // eslint-disable-next-line no-console
  console.log(`✔ ${s.name}`);
}
// eslint-disable-next-line no-console
console.log(`\nAll ${passed}/${suites.length} Klondike engine suites passed.`);
