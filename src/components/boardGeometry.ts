import { Card, GameSnapshot } from '../engine/types';

export interface BoardMetrics {
  boardWidth: number;
  cardWidth: number;
  cardHeight: number;
  colGap: number;
  topPadding: number;
  sectionGap: number;
  tableauTop: number;
  availableTableauHeight: number;
  wasteFanStep: number;
  slotRadius: number;
  colX: (col: number) => number;
}

export interface CardBoardPose {
  x: number;
  y: number;
  faceUp: boolean;
  zone: 'stock' | 'waste' | 'foundation' | 'tableau';
  pileIndex: number;
  zOrder: number;
}

export function computeBoardMetrics(width: number, height: number): BoardMetrics {
  const horizontalPad = 10;
  const usableWidth = Math.min(540, Math.max(300, width)) - horizontalPad * 2;
  const colGap = usableWidth > 440 ? 8 : 5;
  const cardWidth = Math.floor((usableWidth - colGap * 6) / 7);
  const cardHeight = Math.round(cardWidth * 1.42);
  const topPadding = 8;
  const sectionGap = Math.max(12, Math.round(cardHeight * 0.18));
  const tableauTop = topPadding + cardHeight + sectionGap;
  const availableTableauHeight = Math.max(
    cardHeight * 2.4,
    height - tableauTop - 10
  );
  const wasteFanStep = Math.round(cardWidth * 0.34);
  const slotRadius = Math.max(6, Math.round(cardWidth * 0.12));
  const colX = (col: number) => col * (cardWidth + colGap);

  return {
    boardWidth: cardWidth * 7 + colGap * 6,
    cardWidth,
    cardHeight,
    colGap,
    topPadding,
    sectionGap,
    tableauTop,
    availableTableauHeight,
    wasteFanStep,
    slotRadius,
    colX,
  };
}

export function computeColumnOffsets(pile: Card[], m: BoardMetrics): number[] {
  if (pile.length <= 1) return [0];

  const defaultDown = Math.max(8, Math.round(m.cardHeight * 0.14));
  const defaultUp = Math.max(20, Math.round(m.cardHeight * 0.31));

  let downCount = 0;
  let upCount = 0;
  for (let i = 0; i < pile.length - 1; i++) {
    if (pile[i].faceUp) upCount++;
    else downCount++;
  }

  const needed = downCount * defaultDown + upCount * defaultUp + m.cardHeight;
  let scale = 1;
  if (needed > m.availableTableauHeight && needed > m.cardHeight) {
    scale = (m.availableTableauHeight - m.cardHeight) / (needed - m.cardHeight);
  }

  const stepDown = Math.max(5, Math.floor(defaultDown * scale));
  const stepUp = Math.max(14, Math.floor(defaultUp * scale));

  const offsets: number[] = [0];
  let acc = 0;
  for (let i = 0; i < pile.length - 1; i++) {
    acc += pile[i].faceUp ? stepUp : stepDown;
    offsets.push(acc);
  }
  return offsets;
}

/**
 * Computes the exact resting (x, y) board coordinate for every card in a GameSnapshot.
 */
export function computeAllCardPoses(
  state: GameSnapshot,
  drawMode: 1 | 3,
  m: BoardMetrics
): Map<string, CardBoardPose> {
  const poses = new Map<string, CardBoardPose>();

  // 1. Stock (col 0)
  const stockX = m.colX(0);
  state.stock.forEach((card, idx) => {
    poses.set(card.id, {
      x: stockX,
      y: m.topPadding,
      faceUp: card.faceUp,
      zone: 'stock',
      pileIndex: 0,
      zOrder: idx,
    });
  });

  // 2. Waste (col 1, top 1 or 3 fanned)
  const visibleCount =
    drawMode === 3
      ? Math.min(3, state.waste.length)
      : Math.min(1, state.waste.length);
  const firstVisibleIdx = state.waste.length - visibleCount;

  state.waste.forEach((card, idx) => {
    const fanSlot = idx < firstVisibleIdx ? 0 : idx - firstVisibleIdx;
    poses.set(card.id, {
      x: m.colX(1) + fanSlot * m.wasteFanStep,
      y: m.topPadding,
      faceUp: card.faceUp,
      zone: 'waste',
      pileIndex: 0,
      zOrder: 10 + idx,
    });
  });

  // 3. Foundations (cols 3..6)
  state.foundations.forEach((pile, fIdx) => {
    const fx = m.colX(3 + fIdx);
    pile.forEach((card, idx) => {
      poses.set(card.id, {
        x: fx,
        y: m.topPadding,
        faceUp: card.faceUp,
        zone: 'foundation',
        pileIndex: fIdx,
        zOrder: 40 + idx,
      });
    });
  });

  // 4. Tableau (cols 0..6)
  state.tableau.forEach((pile, colIdx) => {
    const tx = m.colX(colIdx);
    const offsets = computeColumnOffsets(pile, m);
    pile.forEach((card, cIdx) => {
      poses.set(card.id, {
        x: tx,
        y: m.tableauTop + (offsets[cIdx] ?? 0),
        faceUp: card.faceUp,
        zone: 'tableau',
        pileIndex: colIdx,
        zOrder: 100 + cIdx,
      });
    });
  });

  return poses;
}
