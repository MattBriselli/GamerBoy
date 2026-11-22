import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  getMovingCards,
  HintSuggestion,
  isValidMove,
} from '../engine/klondike';
import { Card, GameState, PileLocation } from '../engine/types';
import { AppTheme } from '../theme/themes';
import { PlayingCard } from './PlayingCard';

export interface GameBoardProps {
  game: GameState;
  theme: AppTheme;
  activeHint: HintSuggestion | null;
  onStockPress: () => void;
  onSmartTap: (from: PileLocation) => void;
  onDropMove: (from: PileLocation, to: PileLocation) => void;
}

interface DragSession {
  from: PileLocation;
  cards: Card[];
  originX: number;
  originY: number;
  cardOffsetY: number;
}

interface InteractiveCardSlotProps {
  from: PileLocation;
  originX: number;
  originY: number;
  cardOffsetY?: number;
  style?: StyleProp<ViewStyle>;
  onGestureStartCheck: (from: PileLocation) => boolean;
  onGestureMove: (
    from: PileLocation,
    originX: number,
    originY: number,
    cardOffsetY: number,
    dx: number,
    dy: number
  ) => void;
  onGestureRelease: (from: PileLocation, dx: number, dy: number) => void;
  onGestureTerminate: () => void;
  children: React.ReactNode;
}

function InteractiveCardSlot({
  from,
  originX,
  originY,
  cardOffsetY = 22,
  style,
  onGestureStartCheck,
  onGestureMove,
  onGestureRelease,
  onGestureTerminate,
  children,
}: InteractiveCardSlotProps) {
  const panHandlers = useMemo(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => onGestureStartCheck(from),
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        onGestureMove(
          from,
          originX,
          originY,
          cardOffsetY,
          gesture.dx,
          gesture.dy
        );
      },
      onPanResponderRelease: (_, gesture) => {
        onGestureRelease(from, gesture.dx, gesture.dy);
      },
      onPanResponderTerminate: () => {
        onGestureTerminate();
      },
    });
    return responder.panHandlers;
  }, [
    from,
    originX,
    originY,
    cardOffsetY,
    onGestureStartCheck,
    onGestureMove,
    onGestureRelease,
    onGestureTerminate,
  ]);

  return (
    <View {...panHandlers} style={style}>
      {children}
    </View>
  );
}

const FOUNDATION_WATERMARKS = ['♠', '♥', '♣', '♦'];

export function GameBoard({
  game,
  theme,
  activeHint,
  onStockPress,
  onSmartTap,
  onDropMove,
}: GameBoardProps) {
  const [layout, setLayout] = useState({ width: 375, height: 520 });
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [hoverTarget, setHoverTarget] = useState<PileLocation | null>(null);
  const [dragPan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  const dragSessionRef = useRef<DragSession | null>(null);

  const metrics = useMemo(() => {
    const horizontalPad = 10;
    const usableWidth = Math.min(540, Math.max(300, layout.width)) - horizontalPad * 2;
    const colGap = usableWidth > 440 ? 8 : 5;
    const cardWidth = Math.floor((usableWidth - colGap * 6) / 7);
    const cardHeight = Math.round(cardWidth * 1.42);
    const topPadding = 8;
    const sectionGap = Math.max(12, Math.round(cardHeight * 0.18));
    const tableauTop = topPadding + cardHeight + sectionGap;
    const availableTableauHeight = Math.max(
      cardHeight * 2.4,
      layout.height - tableauTop - 10
    );

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
      colX,
    };
  }, [layout.width, layout.height]);

  const gameRef = useRef(game);
  const metricsRef = useRef(metrics);

  useEffect(() => {
    gameRef.current = game;
    metricsRef.current = metrics;
  }, [game, metrics]);

  const computeDropTarget = useCallback(
    (from: PileLocation, centerX: number, centerY: number): PileLocation | null => {
      const m = metricsRef.current;
      const current = gameRef.current;

      // Check Foundation row if dragged near the top right (cols 3..6)
      if (centerY < m.tableauTop - m.sectionGap * 0.25) {
        let bestFoundation: { loc: PileLocation; dist: number } | null = null;
        for (let f = 0; f < 4; f++) {
          const slotCenterX = m.colX(3 + f) + m.cardWidth / 2;
          const slotCenterY = m.topPadding + m.cardHeight / 2;
          const dist = Math.hypot(centerX - slotCenterX, centerY - slotCenterY);
          const candidate: PileLocation = { zone: 'foundation', index: f };
          if (dist < m.cardWidth * 1.15 && isValidMove(current, from, candidate)) {
            if (!bestFoundation || dist < bestFoundation.dist) {
              bestFoundation = { loc: candidate, dist };
            }
          }
        }
        if (bestFoundation) return bestFoundation.loc;
      }

      // Check 7 Tableau columns horizontally
      let bestTableau: { loc: PileLocation; dist: number } | null = null;
      for (let col = 0; col < 7; col++) {
        const slotCenterX = m.colX(col) + m.cardWidth / 2;
        const dist = Math.abs(centerX - slotCenterX);
        const candidate: PileLocation = { zone: 'tableau', index: col };
        if (dist < m.cardWidth * 0.95 && isValidMove(current, from, candidate)) {
          if (!bestTableau || dist < bestTableau.dist) {
            bestTableau = { loc: candidate, dist };
          }
        }
      }

      return bestTableau ? bestTableau.loc : null;
    },
    []
  );

  const handleGestureStartCheck = useCallback((from: PileLocation) => {
    dragPan.setValue({ x: 0, y: 0 });
    const cards = getMovingCards(gameRef.current, from);
    return Boolean(cards && cards.length > 0);
  }, [dragPan]);

  const handleGestureMove = useCallback(
    (
      from: PileLocation,
      originX: number,
      originY: number,
      cardOffsetY: number,
      dx: number,
      dy: number
    ) => {
      const dist = Math.hypot(dx, dy);
      if (!dragSessionRef.current && dist >= 6) {
        const cards = getMovingCards(gameRef.current, from);
        if (!cards || cards.length === 0) return;
        const session: DragSession = {
          from,
          cards,
          originX,
          originY,
          cardOffsetY,
        };
        dragSessionRef.current = session;
        setDragSession(session);
      }

      if (dragSessionRef.current) {
        dragPan.setValue({ x: dx, y: dy });
        const m = metricsRef.current;
        const centerX = originX + dx + m.cardWidth / 2;
        const centerY = originY + dy + m.cardHeight / 2;
        setHoverTarget(computeDropTarget(from, centerX, centerY));
      }
    },
    [computeDropTarget, dragPan]
  );

  const handleGestureRelease = useCallback(
    (from: PileLocation, dx: number, dy: number) => {
      const active = dragSessionRef.current;
      const dist = Math.hypot(dx, dy);

      dragSessionRef.current = null;
      setDragSession(null);
      setHoverTarget(null);
      dragPan.setValue({ x: 0, y: 0 });

      if (!active || dist < 7) {
        onSmartTap(from);
        return;
      }

      const m = metricsRef.current;
      const centerX = active.originX + dx + m.cardWidth / 2;
      const centerY = active.originY + dy + m.cardHeight / 2;
      const target = computeDropTarget(active.from, centerX, centerY);
      if (target) {
        onDropMove(active.from, target);
      }
    },
    [computeDropTarget, dragPan, onDropMove, onSmartTap]
  );

  const handleGestureTerminate = useCallback(() => {
    dragSessionRef.current = null;
    setDragSession(null);
    setHoverTarget(null);
    dragPan.setValue({ x: 0, y: 0 });
  }, [dragPan]);

  const getColumnOffsets = (pile: Card[]) => {
    const m = metrics;
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
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  };

  const isDraggingCardId = (id: string): boolean => {
    if (!dragSession) return false;
    return dragSession.cards.some((c) => c.id === id);
  };

  const isHintSource = (zone: PileLocation['zone'], index?: number, cardIndex?: number) => {
    if (!activeHint) return false;
    if (activeHint.from.zone !== zone) return false;
    if (index !== undefined && activeHint.from.index !== index) return false;
    if (cardIndex !== undefined && activeHint.from.cardIndex !== undefined) {
      return cardIndex >= activeHint.from.cardIndex;
    }
    return true;
  };

  const isHintDest = (zone: PileLocation['zone'], index: number) => {
    if (!activeHint?.to) return false;
    return activeHint.to.zone === zone && activeHint.to.index === index;
  };

  const isHoveredDest = (zone: PileLocation['zone'], index: number) => {
    if (!hoverTarget) return false;
    return hoverTarget.zone === zone && hoverTarget.index === index;
  };

  const visibleWasteCount =
    game.drawMode === 3
      ? Math.min(3, game.waste.length)
      : Math.min(1, game.waste.length);
  const visibleWaste = game.waste.slice(game.waste.length - visibleWasteCount);
  const wasteFanStep = Math.round(metrics.cardWidth * 0.34);
  const slotRadius = Math.max(6, Math.round(metrics.cardWidth * 0.12));

  return (
    <View style={styles.outerWrapper} onLayout={handleLayout}>
      <View style={[styles.boardInner, { width: metrics.boardWidth }]}>
        {/* TOP ROW: Stock (col 0), Waste (cols 1-2), Foundations (cols 3-6) */}
        <View
          style={{
            height: metrics.cardHeight,
            marginTop: metrics.topPadding,
            position: 'relative',
          }}
        >
          {/* Stock Slot (col 0) */}
          <Pressable
            onPress={onStockPress}
            style={[
              styles.slotBase,
              {
                left: metrics.colX(0),
                width: metrics.cardWidth,
                height: metrics.cardHeight,
                borderRadius: slotRadius,
                backgroundColor: theme.slotBg,
                borderColor: isHintSource('stock') ? theme.hintGlow : theme.slotBorder,
                borderWidth: isHintSource('stock') ? 2 : 1.2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              game.stock.length > 0
                ? `Draw from stock, ${game.stock.length} cards remaining`
                : 'Recycle waste pile into stock'
            }
          >
            {game.stock.length > 0 ? (
              <View style={{ position: 'relative' }}>
                <PlayingCard
                  card={game.stock[game.stock.length - 1]}
                  width={metrics.cardWidth}
                  height={metrics.cardHeight}
                  theme={theme}
                  highlighted={isHintSource('stock')}
                />
                <View
                  style={[
                    styles.stockCountBadge,
                    { backgroundColor: 'rgba(0,0,0,0.62)' },
                  ]}
                >
                  <Text style={styles.stockCountText}>{game.stock.length}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.recycleIconBox}>
                <Text style={[styles.recycleGlyph, { color: theme.textSecondary }]}>
                  ↻
                </Text>
              </View>
            )}
          </Pressable>

          {/* Waste Pile (starts at col 1) */}
          <View
            style={{
              position: 'absolute',
              left: metrics.colX(1),
              top: 0,
              height: metrics.cardHeight,
              width: metrics.cardWidth + wasteFanStep * 2,
            }}
          >
            {visibleWaste.length === 0 ? (
              <View
                style={[
                  styles.slotBase,
                  {
                    width: metrics.cardWidth,
                    height: metrics.cardHeight,
                    borderRadius: slotRadius,
                    backgroundColor: theme.slotBg,
                    borderColor: theme.slotBorder,
                    opacity: 0.45,
                  },
                ]}
              />
            ) : (
              visibleWaste.map((card, i) => {
                const isTopWaste = i === visibleWaste.length - 1;
                const xOffset = i * wasteFanStep;
                const hiddenByDrag = isTopWaste && isDraggingCardId(card.id);

                if (!isTopWaste) {
                  return (
                    <View
                      key={card.id}
                      style={{ position: 'absolute', left: xOffset, top: 0 }}
                      pointerEvents="none"
                    >
                      <PlayingCard
                        card={card}
                        width={metrics.cardWidth}
                        height={metrics.cardHeight}
                        theme={theme}
                      />
                    </View>
                  );
                }

                return (
                  <InteractiveCardSlot
                    key={card.id}
                    from={{ zone: 'waste' }}
                    originX={metrics.colX(1) + xOffset}
                    originY={metrics.topPadding}
                    onGestureStartCheck={handleGestureStartCheck}
                    onGestureMove={handleGestureMove}
                    onGestureRelease={handleGestureRelease}
                    onGestureTerminate={handleGestureTerminate}
                    style={{
                      position: 'absolute',
                      left: xOffset,
                      top: 0,
                      opacity: hiddenByDrag ? 0 : 1,
                    }}
                  >
                    <PlayingCard
                      card={card}
                      width={metrics.cardWidth}
                      height={metrics.cardHeight}
                      theme={theme}
                      highlighted={isHintSource('waste')}
                    />
                  </InteractiveCardSlot>
                );
              })
            )}
          </View>

          {/* 4 Foundation Slots (cols 3..6) */}
          {game.foundations.map((pile, fIdx) => {
            const left = metrics.colX(3 + fIdx);
            const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
            const underCard = pile.length > 1 ? pile[pile.length - 2] : null;
            const highlightedSlot =
              isHoveredDest('foundation', fIdx) || isHintDest('foundation', fIdx);

            const draggingTop = topCard ? isDraggingCardId(topCard.id) : false;
            const displayCard = draggingTop ? underCard : topCard;

            const slotStyle: StyleProp<ViewStyle> = [
              styles.slotBase,
              {
                left,
                width: metrics.cardWidth,
                height: metrics.cardHeight,
                borderRadius: slotRadius,
                backgroundColor: highlightedSlot ? theme.accentSoft : theme.slotBg,
                borderColor: highlightedSlot ? theme.hintGlow : theme.slotBorder,
                borderWidth: highlightedSlot ? 2 : 1.2,
              },
            ];

            const inner = displayCard ? (
              <PlayingCard
                card={displayCard}
                width={metrics.cardWidth}
                height={metrics.cardHeight}
                theme={theme}
                highlighted={highlightedSlot}
              />
            ) : (
              <Text
                style={[
                  styles.foundationWatermark,
                  {
                    color: theme.slotBorder,
                    fontSize: Math.round(metrics.cardWidth * 0.42),
                  },
                ]}
              >
                {FOUNDATION_WATERMARKS[fIdx]}
              </Text>
            );

            if (!topCard) {
              return (
                <View key={`foundation-${fIdx}`} style={slotStyle}>
                  {inner}
                </View>
              );
            }

            return (
              <InteractiveCardSlot
                key={`foundation-${fIdx}`}
                from={{ zone: 'foundation', index: fIdx }}
                originX={left}
                originY={metrics.topPadding}
                onGestureStartCheck={handleGestureStartCheck}
                onGestureMove={handleGestureMove}
                onGestureRelease={handleGestureRelease}
                onGestureTerminate={handleGestureTerminate}
                style={slotStyle}
              >
                {inner}
              </InteractiveCardSlot>
            );
          })}
        </View>

        {/* TABLEAU: 7 Columns */}
        <View
          style={{
            marginTop: metrics.sectionGap,
            flex: 1,
            position: 'relative',
          }}
        >
          {game.tableau.map((pile, colIdx) => {
            const left = metrics.colX(colIdx);
            const offsets = getColumnOffsets(pile);
            const highlightedCol =
              isHoveredDest('tableau', colIdx) || isHintDest('tableau', colIdx);
            const stepUpOffset =
              pile.length > 1
                ? Math.max(16, offsets[offsets.length - 1] - offsets[offsets.length - 2])
                : 22;

            return (
              <View
                key={`col-${colIdx}`}
                style={{
                  position: 'absolute',
                  left,
                  top: 0,
                  width: metrics.cardWidth,
                  bottom: 0,
                }}
              >
                {/* Empty column base slot */}
                <View
                  style={[
                    styles.slotBase,
                    {
                      width: metrics.cardWidth,
                      height: metrics.cardHeight,
                      borderRadius: slotRadius,
                      backgroundColor: highlightedCol ? theme.accentSoft : theme.slotBg,
                      borderColor: highlightedCol ? theme.hintGlow : theme.slotBorder,
                      borderWidth: highlightedCol ? 2 : 1.2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.kingWatermark,
                      {
                        color: theme.slotBorder,
                        fontSize: Math.round(metrics.cardWidth * 0.34),
                      },
                    ]}
                  >
                    K
                  </Text>
                </View>

                {/* Cards in column */}
                {pile.map((card, cIdx) => {
                  if (isDraggingCardId(card.id)) return null;

                  const yOffset = offsets[cIdx] ?? 0;
                  const cardOriginY = metrics.tableauTop + yOffset;
                  const isTopOfCol = cIdx === pile.length - 1;
                  const cardHighlighted =
                    isHintSource('tableau', colIdx, cIdx) ||
                    (isTopOfCol && highlightedCol);

                  if (!card.faceUp) {
                    return (
                      <View
                        key={card.id}
                        style={{ position: 'absolute', left: 0, top: yOffset }}
                        pointerEvents="none"
                      >
                        <PlayingCard
                          card={card}
                          width={metrics.cardWidth}
                          height={metrics.cardHeight}
                          theme={theme}
                        />
                      </View>
                    );
                  }

                  return (
                    <InteractiveCardSlot
                      key={card.id}
                      from={{ zone: 'tableau', index: colIdx, cardIndex: cIdx }}
                      originX={left}
                      originY={cardOriginY}
                      cardOffsetY={stepUpOffset}
                      onGestureStartCheck={handleGestureStartCheck}
                      onGestureMove={handleGestureMove}
                      onGestureRelease={handleGestureRelease}
                      onGestureTerminate={handleGestureTerminate}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: yOffset,
                      }}
                    >
                      <PlayingCard
                        card={card}
                        width={metrics.cardWidth}
                        height={metrics.cardHeight}
                        theme={theme}
                        highlighted={cardHighlighted}
                      />
                    </InteractiveCardSlot>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* FLOATING DRAG LAYER */}
        {dragSession && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingDragLayer,
              {
                left: dragSession.originX,
                top: dragSession.originY,
                transform: [
                  { translateX: dragPan.x },
                  { translateY: dragPan.y },
                  { scale: 1.04 },
                ],
              },
            ]}
          >
            {dragSession.cards.map((card, idx) => (
              <View
                key={`drag-${card.id}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: idx * dragSession.cardOffsetY,
                }}
              >
                <PlayingCard
                  card={card}
                  width={metrics.cardWidth}
                  height={metrics.cardHeight}
                  theme={theme}
                  selected
                />
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  boardInner: {
    flex: 1,
    position: 'relative',
  },
  slotBase: {
    position: 'absolute',
    top: 0,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stockCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  recycleIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recycleGlyph: {
    fontSize: 26,
    fontWeight: '700',
  },
  foundationWatermark: {
    fontWeight: '700',
    opacity: 0.7,
  },
  kingWatermark: {
    fontWeight: '800',
    opacity: 0.55,
  },
  floatingDragLayer: {
    position: 'absolute',
    zIndex: 999,
    elevation: 16,
  },
});
