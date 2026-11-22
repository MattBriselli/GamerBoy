import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createOrderedDeck,
  getMovingCards,
  HintSuggestion,
  isValidMove,
} from '../engine/klondike';
import { Card, GameState, PileLocation } from '../engine/types';
import { AppTheme } from '../theme/themes';
import {
  BoardMetrics,
  CardBoardPose,
  computeAllCardPoses,
  computeBoardMetrics,
} from './boardGeometry';
import { PlayingCard } from './PlayingCard';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const FOUNDATION_WATERMARKS = ['♠', '♥', '♣', '♦'];
const ORDERED_CARDS = createOrderedDeck();

export interface GameBoardProps {
  game: GameState;
  theme: AppTheme;
  activeHint: HintSuggestion | null;
  elevatedIds: ReadonlySet<string>;
  onElevateIds: (ids: string[]) => void;
  onStockPress: () => void;
  onSmartTap: (from: PileLocation) => void;
  onDropMove: (from: PileLocation, to: PileLocation) => void;
}

interface CardAnimController {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  flipScaleX: Animated.Value;
  currentX: number;
  currentY: number;
  initialized: boolean;
  lastFaceUp: boolean;
}

type HitResult =
  | { type: 'stock' }
  | { type: 'card'; from: PileLocation; cards: Card[] }
  | null;

interface ActiveGesture {
  hit: HitResult;
  dragging: boolean;
  basePositions: { id: string; x: number; y: number }[];
}

function createAnimControllers(): Record<string, CardAnimController> {
  const map: Record<string, CardAnimController> = {};
  for (const c of ORDERED_CARDS) {
    map[c.id] = {
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      flipScaleX: new Animated.Value(1),
      currentX: 0,
      currentY: 0,
      initialized: false,
      lastFaceUp: false,
    };
  }
  return map;
}

function collectCardsRecord(state: GameState): Record<string, Card> {
  const rec: Record<string, Card> = {};
  for (const c of state.stock) rec[c.id] = c;
  for (const c of state.waste) rec[c.id] = c;
  for (const p of state.foundations) {
    for (const c of p) rec[c.id] = c;
  }
  for (const p of state.tableau) {
    for (const c of p) rec[c.id] = c;
  }
  return rec;
}

function hitTestBoard(
  bx: number,
  by: number,
  game: GameState,
  m: BoardMetrics,
  poses: Map<string, CardBoardPose>
): HitResult {
  // 1. Top row: Stock, Waste, Foundations
  if (by >= m.topPadding - 8 && by <= m.topPadding + m.cardHeight + 8) {
    // Stock slot (col 0)
    if (bx >= m.colX(0) - 6 && bx <= m.colX(0) + m.cardWidth + 6) {
      return { type: 'stock' };
    }

    // Top Waste card
    if (game.waste.length > 0) {
      const topWaste = game.waste[game.waste.length - 1];
      const wPose = poses.get(topWaste.id);
      if (
        wPose &&
        bx >= wPose.x - 4 &&
        bx <= wPose.x + m.cardWidth + 4
      ) {
        return {
          type: 'card',
          from: { zone: 'waste' },
          cards: [topWaste],
        };
      }
    }

    // Foundations 0..3 (cols 3..6)
    for (let f = 0; f < 4; f++) {
      const fx = m.colX(3 + f);
      if (bx >= fx - 4 && bx <= fx + m.cardWidth + 4) {
        const pile = game.foundations[f];
        if (pile.length > 0) {
          return {
            type: 'card',
            from: { zone: 'foundation', index: f },
            cards: [pile[pile.length - 1]],
          };
        }
      }
    }
  }

  // 2. Tableau columns 0..6 (walk top-most card down to index 0)
  if (by >= m.tableauTop - 8) {
    for (let col = 0; col < 7; col++) {
      const cx = m.colX(col);
      if (bx >= cx - m.colGap * 0.5 && bx <= cx + m.cardWidth + m.colGap * 0.5) {
        const pile = game.tableau[col];
        for (let cIdx = pile.length - 1; cIdx >= 0; cIdx--) {
          const card = pile[cIdx];
          const pose = poses.get(card.id);
          if (!pose) continue;
          if (by >= pose.y && by <= pose.y + m.cardHeight) {
            if (!card.faceUp) return null;
            const from: PileLocation = {
              zone: 'tableau',
              index: col,
              cardIndex: cIdx,
            };
            const moving = getMovingCards(game, from);
            if (moving && moving.length > 0) {
              return { type: 'card', from, cards: moving };
            }
            return null;
          }
        }
      }
    }
  }

  return null;
}

function computeDropTarget(
  game: GameState,
  m: BoardMetrics,
  from: PileLocation,
  centerX: number,
  centerY: number
): PileLocation | null {
  if (centerY < m.tableauTop - m.sectionGap * 0.25) {
    let bestFoundation: { loc: PileLocation; dist: number } | null = null;
    for (let f = 0; f < 4; f++) {
      const slotCenterX = m.colX(3 + f) + m.cardWidth / 2;
      const slotCenterY = m.topPadding + m.cardHeight / 2;
      const dist = Math.hypot(centerX - slotCenterX, centerY - slotCenterY);
      const candidate: PileLocation = { zone: 'foundation', index: f };
      if (dist < m.cardWidth * 1.15 && isValidMove(game, from, candidate)) {
        if (!bestFoundation || dist < bestFoundation.dist) {
          bestFoundation = { loc: candidate, dist };
        }
      }
    }
    if (bestFoundation) return bestFoundation.loc;
  }

  let bestTableau: { loc: PileLocation; dist: number } | null = null;
  for (let col = 0; col < 7; col++) {
    const slotCenterX = m.colX(col) + m.cardWidth / 2;
    const dist = Math.abs(centerX - slotCenterX);
    const candidate: PileLocation = { zone: 'tableau', index: col };
    if (dist < m.cardWidth * 0.95 && isValidMove(game, from, candidate)) {
      if (!bestTableau || dist < bestTableau.dist) {
        bestTableau = { loc: candidate, dist };
      }
    }
  }

  return bestTableau ? bestTableau.loc : null;
}

export const GameBoard = memo(function GameBoard({
  game,
  theme,
  activeHint,
  elevatedIds,
  onElevateIds,
  onStockPress,
  onSmartTap,
  onDropMove,
}: GameBoardProps) {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(
    null
  );
  const [animControllers] = useState(createAnimControllers);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const metrics: BoardMetrics = useMemo(
    () => computeBoardMetrics(layout?.width ?? 375, layout?.height ?? 520),
    [layout]
  );

  const poses = useMemo(
    () => computeAllCardPoses(game, game.drawMode, metrics),
    [game, metrics]
  );

  const cardsById = useMemo(() => collectCardsRecord(game), [game]);

  const latestRef = useRef({
    game,
    metrics,
    poses,
    onElevateIds,
    onStockPress,
    onSmartTap,
    onDropMove,
  });

  useEffect(() => {
    latestRef.current = {
      game,
      metrics,
      poses,
      onElevateIds,
      onStockPress,
      onSmartTap,
      onDropMove,
    };
  });

  const gestureRef = useRef<ActiveGesture | null>(null);
  const hoverKeyRef = useRef<string | null>(null);
  const prevLayoutKeyRef = useRef<string | null>(null);
  const prevDealKeyRef = useRef<string | null>(null);

  // Synchronize persistent card Animated.Values whenever poses or layout update
  useLayoutEffect(() => {
    if (!layout) return;

    const layoutKey = `${layout.width}x${layout.height}`;
    const dealKey = `${game.seed}:${game.drawMode}:${game.dealType}`;
    const layoutChanged = prevLayoutKeyRef.current !== layoutKey;
    const isFreshDeal =
      prevDealKeyRef.current !== null &&
      prevDealKeyRef.current !== dealKey &&
      game.moves === 0;

    prevLayoutKeyRef.current = layoutKey;
    prevDealKeyRef.current = dealKey;

    const stockX = metrics.colX(0);
    const stockY = metrics.topPadding;

    let staggerIdx = 0;

    for (const baseCard of ORDERED_CARDS) {
      const id = baseCard.id;
      const ctrl = animControllers[id];
      const pose = poses.get(id);
      const card = cardsById[id];
      if (!ctrl || !pose || !card) continue;

      // Snap immediately on initial measurement or viewport resize
      if (!ctrl.initialized || layoutChanged) {
        ctrl.x.stopAnimation();
        ctrl.y.stopAnimation();
        ctrl.scale.stopAnimation();
        ctrl.flipScaleX.stopAnimation();
        ctrl.x.setValue(pose.x);
        ctrl.y.setValue(pose.y);
        ctrl.scale.setValue(1);
        ctrl.flipScaleX.setValue(1);
        ctrl.currentX = pose.x;
        ctrl.currentY = pose.y;
        ctrl.lastFaceUp = card.faceUp;
        ctrl.initialized = true;
        continue;
      }

      // Staggered deal cascade when starting a new deal inside GameScreen
      if (isFreshDeal) {
        ctrl.x.stopAnimation();
        ctrl.y.stopAnimation();
        ctrl.scale.setValue(1);
        ctrl.flipScaleX.setValue(1);
        ctrl.lastFaceUp = card.faceUp;

        if (pose.zone === 'tableau') {
          ctrl.x.setValue(stockX);
          ctrl.y.setValue(stockY);
          ctrl.currentX = pose.x;
          ctrl.currentY = pose.y;
          const delay = staggerIdx++ * 12;
          Animated.parallel([
            Animated.timing(ctrl.x, {
              toValue: pose.x,
              duration: 190,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(ctrl.y, {
              toValue: pose.y,
              duration: 190,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]).start();
        } else {
          ctrl.x.setValue(pose.x);
          ctrl.y.setValue(pose.y);
          ctrl.currentX = pose.x;
          ctrl.currentY = pose.y;
        }
        continue;
      }

      // Smoothly glide any card whose resting coordinate changed
      const dist = Math.hypot(pose.x - ctrl.currentX, pose.y - ctrl.currentY);
      if (dist > 0.5) {
        ctrl.x.stopAnimation();
        ctrl.y.stopAnimation();
        ctrl.scale.stopAnimation();

        ctrl.currentX = pose.x;
        ctrl.currentY = pose.y;

        const duration = Math.min(220, Math.max(145, Math.round(135 + dist * 0.22)));

        Animated.parallel([
          Animated.timing(ctrl.x, {
            toValue: pose.x,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(ctrl.y, {
            toValue: pose.y,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(ctrl.scale, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      } else {
        ctrl.x.setValue(pose.x);
        ctrl.y.setValue(pose.y);
        ctrl.scale.setValue(1);
        ctrl.currentX = pose.x;
        ctrl.currentY = pose.y;
      }

      // Subtle card turn pulse when a stationary tableau card flips face-up
      if (ctrl.lastFaceUp !== card.faceUp) {
        ctrl.lastFaceUp = card.faceUp;
        if (dist <= 0.5 && pose.zone === 'tableau') {
          ctrl.flipScaleX.stopAnimation();
          ctrl.flipScaleX.setValue(0.12);
          Animated.spring(ctrl.flipScaleX, {
            toValue: 1,
            damping: 16,
            stiffness: 280,
            mass: 0.6,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
        }
      }
    }
  }, [animControllers, cardsById, game, layout, metrics, poses]);

  // Single persistent board-level PanResponder — never recreated across renders
  const boardPanHandlers = useMemo(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 4,
      onPanResponderGrant: (evt) => {
        const { game: curGame, metrics: m, poses: curPoses } = latestRef.current;
        const bx = evt.nativeEvent.locationX;
        const by = evt.nativeEvent.locationY;
        const hit = hitTestBoard(bx, by, curGame, m, curPoses);

        if (!hit) {
          gestureRef.current = null;
          return;
        }

        if (hit.type === 'stock') {
          gestureRef.current = { hit, dragging: false, basePositions: [] };
          return;
        }

        const basePositions = hit.cards.map((c) => {
          const p = curPoses.get(c.id);
          return { id: c.id, x: p?.x ?? 0, y: p?.y ?? 0 };
        });

        gestureRef.current = {
          hit,
          dragging: false,
          basePositions,
        };
      },
      onPanResponderMove: (_, g) => {
        const active = gestureRef.current;
        if (!active || active.hit?.type !== 'card') return;

        const dist = Math.hypot(g.dx, g.dy);
        if (!active.dragging && dist >= 6) {
          active.dragging = true;
          const ids = active.basePositions.map((b) => b.id);
          for (const b of active.basePositions) {
            const ctrl = animControllers[b.id];
            if (ctrl) {
              ctrl.x.stopAnimation();
              ctrl.y.stopAnimation();
              ctrl.scale.stopAnimation();
              ctrl.scale.setValue(1.04);
            }
          }
          setDraggingIds(ids);
        }

        if (active.dragging) {
          for (const b of active.basePositions) {
            const ctrl = animControllers[b.id];
            if (ctrl) {
              const nx = b.x + g.dx;
              const ny = b.y + g.dy;
              ctrl.x.setValue(nx);
              ctrl.y.setValue(ny);
              ctrl.currentX = nx;
              ctrl.currentY = ny;
            }
          }

          const { game: curGame, metrics: m } = latestRef.current;
          const lead = active.basePositions[0];
          const target = computeDropTarget(
            curGame,
            m,
            active.hit.from,
            lead.x + g.dx + m.cardWidth / 2,
            lead.y + g.dy + m.cardHeight / 2
          );
          const nextHoverKey = target ? `${target.zone}:${target.index}` : null;
          if (hoverKeyRef.current !== nextHoverKey) {
            hoverKeyRef.current = nextHoverKey;
            setHoverKey(nextHoverKey);
          }
        }
      },
      onPanResponderRelease: (_, g) => {
        const active = gestureRef.current;
        gestureRef.current = null;

        if (hoverKeyRef.current !== null) {
          hoverKeyRef.current = null;
          setHoverKey(null);
        }

        if (!active || !active.hit) return;

        const dist = Math.hypot(g.dx, g.dy);
        const {
          game: curGame,
          metrics: m,
          onElevateIds: elevate,
          onStockPress: triggerStock,
          onSmartTap: triggerTap,
          onDropMove: triggerDrop,
        } = latestRef.current;

        // Tap (< 7px movement)
        if (!active.dragging || dist < 7) {
          setDraggingIds([]);
          if (active.hit.type === 'stock') {
            triggerStock();
          } else {
            triggerTap(active.hit.from);
          }
          return;
        }

        setDraggingIds([]);
        if (active.hit.type !== 'card') return;

        const lead = active.basePositions[0];
        const target = computeDropTarget(
          curGame,
          m,
          active.hit.from,
          lead.x + g.dx + m.cardWidth / 2,
          lead.y + g.dy + m.cardHeight / 2
        );

        const movedIds = active.basePositions.map((b) => b.id);
        elevate(movedIds);

        if (target) {
          triggerDrop(active.hit.from, target);
        } else {
          // Smooth spring snap-back to original slot
          for (const b of active.basePositions) {
            const ctrl = animControllers[b.id];
            if (!ctrl) continue;
            ctrl.currentX = b.x;
            ctrl.currentY = b.y;
            Animated.parallel([
              Animated.timing(ctrl.x, {
                toValue: b.x,
                duration: 175,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(ctrl.y, {
                toValue: b.y,
                duration: 175,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(ctrl.scale, {
                toValue: 1,
                duration: 175,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        const active = gestureRef.current;
        gestureRef.current = null;
        hoverKeyRef.current = null;
        setHoverKey(null);
        setDraggingIds([]);

        if (active?.dragging) {
          for (const b of active.basePositions) {
            const ctrl = animControllers[b.id];
            if (!ctrl) continue;
            ctrl.currentX = b.x;
            ctrl.currentY = b.y;
            ctrl.x.setValue(b.x);
            ctrl.y.setValue(b.y);
            ctrl.scale.setValue(1);
          }
        }
      },
    });
    return responder.panHandlers;
  }, [animControllers]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    }
  };

  const draggingSet = useMemo(() => new Set(draggingIds), [draggingIds]);

  const hintedCardIds = useMemo(() => {
    const set = new Set<string>();
    if (!activeHint) return set;
    const f = activeHint.from;
    if (f.zone === 'stock' && game.stock.length > 0) {
      set.add(game.stock[game.stock.length - 1].id);
    } else if (f.zone === 'waste' && game.waste.length > 0) {
      set.add(game.waste[game.waste.length - 1].id);
    } else if (f.zone === 'tableau' && f.index !== undefined) {
      const pile = game.tableau[f.index];
      const start = f.cardIndex ?? pile.length - 1;
      for (let i = start; i < pile.length; i++) {
        if (pile[i]) set.add(pile[i].id);
      }
    }
    return set;
  }, [activeHint, game]);

  const isDestHighlighted = (zone: 'foundation' | 'tableau', index: number) => {
    if (hoverKey === `${zone}:${index}`) return true;
    return activeHint?.to?.zone === zone && activeHint?.to?.index === index;
  };

  const stockHinted = activeHint?.from.zone === 'stock';

  return (
    <View style={styles.outerWrapper} onLayout={handleLayout}>
      {layout && (
        <View
          {...boardPanHandlers}
          style={[styles.boardInner, { width: metrics.boardWidth }]}
        >
          {/* STATIC EMPTY SLOTS LAYER */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* Stock Empty / Recycle Base Slot */}
            <View
              style={[
                styles.slotBase,
                {
                  left: metrics.colX(0),
                  top: metrics.topPadding,
                  width: metrics.cardWidth,
                  height: metrics.cardHeight,
                  borderRadius: metrics.slotRadius,
                  backgroundColor: theme.slotBg,
                  borderColor: stockHinted ? theme.hintGlow : theme.slotBorder,
                  borderWidth: stockHinted ? 2 : 1.2,
                },
              ]}
            >
              <Text style={[styles.recycleGlyph, { color: theme.textSecondary }]}>
                ↻
              </Text>
            </View>

            {/* Waste Empty Base Slot */}
            <View
              style={[
                styles.slotBase,
                {
                  left: metrics.colX(1),
                  top: metrics.topPadding,
                  width: metrics.cardWidth,
                  height: metrics.cardHeight,
                  borderRadius: metrics.slotRadius,
                  backgroundColor: theme.slotBg,
                  borderColor: theme.slotBorder,
                  opacity: 0.45,
                },
              ]}
            />

            {/* 4 Foundation Base Slots */}
            {[0, 1, 2, 3].map((fIdx) => {
              const highlighted = isDestHighlighted('foundation', fIdx);
              return (
                <View
                  key={`f-slot-${fIdx}`}
                  style={[
                    styles.slotBase,
                    {
                      left: metrics.colX(3 + fIdx),
                      top: metrics.topPadding,
                      width: metrics.cardWidth,
                      height: metrics.cardHeight,
                      borderRadius: metrics.slotRadius,
                      backgroundColor: highlighted
                        ? theme.accentSoft
                        : theme.slotBg,
                      borderColor: highlighted
                        ? theme.hintGlow
                        : theme.slotBorder,
                      borderWidth: highlighted ? 2 : 1.2,
                    },
                  ]}
                >
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
                </View>
              );
            })}

            {/* 7 Tableau Empty Column Base Slots */}
            {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => {
              const highlighted = isDestHighlighted('tableau', colIdx);
              return (
                <View
                  key={`t-slot-${colIdx}`}
                  style={[
                    styles.slotBase,
                    {
                      left: metrics.colX(colIdx),
                      top: metrics.tableauTop,
                      width: metrics.cardWidth,
                      height: metrics.cardHeight,
                      borderRadius: metrics.slotRadius,
                      backgroundColor: highlighted
                        ? theme.accentSoft
                        : theme.slotBg,
                      borderColor: highlighted
                        ? theme.hintGlow
                        : theme.slotBorder,
                      borderWidth: highlighted ? 2 : 1.2,
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
              );
            })}
          </View>

          {/* 52 PERSISTENT ANIMATED PLAYING CARDS (Never cloned or unmounted) */}
          {ORDERED_CARDS.map((base) => {
            const card = cardsById[base.id];
            const pose = poses.get(base.id);
            const ctrl = animControllers[base.id];
            if (!card || !pose || !ctrl) return null;

            // Hide buried cards in Stock or Foundation (>2 deep) so shadows don't stack dark
            let buried = false;
            if (pose.zone === 'stock') {
              buried = pose.zOrder < game.stock.length - 2;
            } else if (pose.zone === 'foundation') {
              const fPile = game.foundations[pose.pileIndex];
              buried = pose.zOrder - 40 < fPile.length - 2;
            } else if (pose.zone === 'waste') {
              const visCount = game.drawMode === 3 ? 3 : 2;
              buried = pose.zOrder - 10 < game.waste.length - visCount;
            }

            const isDragging = draggingSet.has(card.id);
            const isElevated = elevatedIds.has(card.id);
            const zIndex = isDragging
              ? 1000 + pose.zOrder
              : isElevated
              ? 500 + pose.zOrder
              : pose.zOrder;

            return (
              <Animated.View
                key={card.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: metrics.cardWidth,
                  height: metrics.cardHeight,
                  zIndex,
                  opacity: buried && !isElevated ? 0 : 1,
                  transform: [
                    { translateX: ctrl.x },
                    { translateY: ctrl.y },
                    { scale: ctrl.scale },
                    { scaleX: ctrl.flipScaleX },
                  ],
                }}
              >
                <PlayingCard
                  card={card}
                  width={metrics.cardWidth}
                  height={metrics.cardHeight}
                  theme={theme}
                  highlighted={hintedCardIds.has(card.id)}
                  selected={isDragging}
                />
              </Animated.View>
            );
          })}

          {/* Stock Remaining Count Pill */}
          {game.stock.length > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.stockCountBadge,
                {
                  left: metrics.colX(0) + metrics.cardWidth - 24,
                  top: metrics.topPadding + metrics.cardHeight - 19,
                },
              ]}
            >
              <Text style={styles.stockCountText}>{game.stock.length}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  boardInner: {
    flex: 1,
    position: 'relative',
    userSelect: 'none',
  },
  slotBase: {
    position: 'absolute',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockCountBadge: {
    position: 'absolute',
    zIndex: 490,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stockCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
});
