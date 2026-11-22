import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
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
import {
  BoardMetrics,
  computeAllCardPoses,
  computeBoardMetrics,
  computeColumnOffsets,
} from './boardGeometry';
import { PlayingCard } from './PlayingCard';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const FOUNDATION_WATERMARKS = ['♠', '♥', '♣', '♦'];

export interface DragOriginMap {
  [cardId: string]: { x: number; y: number };
}

export interface GameBoardHandle {
  animateTransition: (
    prevGame: GameState,
    nextGame: GameState,
    customOrigins?: DragOriginMap
  ) => void;
  animateFreshDeal: (nextGame: GameState) => void;
}

export interface GameBoardProps {
  game: GameState;
  theme: AppTheme;
  activeHint: HintSuggestion | null;
  onStockPress: () => void;
  onSmartTap: (from: PileLocation) => void;
  onDropMove: (
    from: PileLocation,
    to: PileLocation,
    dragOrigins: DragOriginMap
  ) => void;
}

interface DragSession {
  from: PileLocation;
  cards: Card[];
  originX: number;
  originY: number;
  cardOffsetY: number;
}

interface FlightAnimItem {
  key: string;
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  arcLift: number;
  peakScale: number;
  flipFromBack: boolean;
  flipToBack: boolean;
  zOrder: number;
  progress: Animated.Value;
}

interface FlipAnimItem {
  key: string;
  card: Card;
  x: number;
  y: number;
  toFaceUp: boolean;
  progress: Animated.Value;
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

function collectCardsMap(state: GameState): Map<string, Card> {
  const map = new Map<string, Card>();
  state.stock.forEach((c) => map.set(c.id, c));
  state.waste.forEach((c) => map.set(c.id, c));
  state.foundations.forEach((p) => p.forEach((c) => map.set(c.id, c)));
  state.tableau.forEach((p) => p.forEach((c) => map.set(c.id, c)));
  return map;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(
  function GameBoard(
    { game, theme, activeHint, onStockPress, onSmartTap, onDropMove },
    ref
  ) {
    const [layout, setLayout] = useState({ width: 375, height: 520 });
    const [dragSession, setDragSession] = useState<DragSession | null>(null);
    const [hoverTarget, setHoverTarget] = useState<PileLocation | null>(null);
    const [dragPan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

    const [flights, setFlights] = useState<FlightAnimItem[]>([]);
    const [flips, setFlips] = useState<FlipAnimItem[]>([]);
    const [foundationPulses] = useState(() => [
      new Animated.Value(1),
      new Animated.Value(1),
      new Animated.Value(1),
      new Animated.Value(1),
    ]);

    const dragSessionRef = useRef<DragSession | null>(null);
    const animCounterRef = useRef(0);
    const lastDealtKeyRef = useRef<string | null>(null);

    const metrics: BoardMetrics = useMemo(
      () => computeBoardMetrics(layout.width, layout.height),
      [layout.width, layout.height]
    );

    const gameRef = useRef(game);
    const metricsRef = useRef(metrics);

    useEffect(() => {
      gameRef.current = game;
      metricsRef.current = metrics;
    }, [game, metrics]);

    const pulseFoundation = useCallback(
      (fIdx: number) => {
        const val = foundationPulses[fIdx];
        if (!val) return;
        val.setValue(1);
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1.075,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(val, {
            toValue: 1,
            damping: 12,
            stiffness: 260,
            mass: 0.6,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      },
      [foundationPulses]
    );

    const spawnFlightsAndFlips = useCallback(
      (
        newFlights: {
          item: FlightAnimItem;
          delayMs: number;
          durationMs: number;
          useSpring?: boolean;
          landingFoundationIdx?: number;
        }[],
        newFlips: { item: FlipAnimItem; delayMs: number }[]
      ) => {
        if (newFlights.length > 0) {
          const movingCardIds = new Set(newFlights.map((f) => f.item.card.id));
          setFlights((prev) => [
            ...prev.filter((p) => !movingCardIds.has(p.card.id)),
            ...newFlights.map((f) => f.item),
          ]);

          newFlights.forEach(
            ({ item, delayMs, durationMs, useSpring, landingFoundationIdx }) => {
              const anim = useSpring
                ? Animated.sequence([
                    ...(delayMs > 0 ? [Animated.delay(delayMs)] : []),
                    Animated.spring(item.progress, {
                      toValue: 1,
                      damping: 22,
                      stiffness: 290,
                      mass: 0.72,
                      useNativeDriver: USE_NATIVE_DRIVER,
                    }),
                  ])
                : Animated.timing(item.progress, {
                    toValue: 1,
                    duration: durationMs,
                    delay: delayMs,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: USE_NATIVE_DRIVER,
                  });

              anim.start(() => {
                if (landingFoundationIdx !== undefined) {
                  pulseFoundation(landingFoundationIdx);
                }
                setFlights((curr) => curr.filter((x) => x.key !== item.key));
              });
            }
          );
        }

        if (newFlips.length > 0) {
          const flippingIds = new Set(newFlips.map((f) => f.item.card.id));
          setFlips((prev) => [
            ...prev.filter((p) => !flippingIds.has(p.card.id)),
            ...newFlips.map((f) => f.item),
          ]);

          newFlips.forEach(({ item, delayMs }) => {
            Animated.timing(item.progress, {
              toValue: 1,
              duration: 215,
              delay: delayMs,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start(() => {
              setFlips((curr) => curr.filter((x) => x.key !== item.key));
            });
          });
        }
      },
      [pulseFoundation]
    );

    const animateTransition = useCallback(
      (
        prevGame: GameState,
        nextGame: GameState,
        customOrigins?: DragOriginMap
      ) => {
        const m = metricsRef.current;
        const prevPoses = computeAllCardPoses(prevGame, prevGame.drawMode, m);
        const nextPoses = computeAllCardPoses(nextGame, nextGame.drawMode, m);
        const nextCards = collectCardsMap(nextGame);

        const flightSpecs: {
          item: FlightAnimItem;
          delayMs: number;
          durationMs: number;
          useSpring?: boolean;
          landingFoundationIdx?: number;
        }[] = [];
        const flipSpecs: { item: FlipAnimItem; delayMs: number }[] = [];

        let stockToWasteCount = 0;
        let recycleCount = 0;

        nextPoses.forEach((nextPose, cardId) => {
          const prevPose = prevPoses.get(cardId);
          const card = nextCards.get(cardId);
          if (!prevPose || !card) return;

          const customOrigin = customOrigins?.[cardId];
          const fromX = customOrigin ? customOrigin.x : prevPose.x;
          const fromY = customOrigin ? customOrigin.y : prevPose.y;
          const dist = Math.hypot(nextPose.x - fromX, nextPose.y - fromY);

          if (dist > 2) {
            // Skip animating hidden interior cards of a huge stock recycle beyond top 4
            if (prevPose.zone === 'waste' && nextPose.zone === 'stock') {
              recycleCount++;
              if (recycleCount > 4) return;
            }

            const isStockDraw =
              prevPose.zone === 'stock' && nextPose.zone === 'waste';
            const staggerDelay = isStockDraw ? stockToWasteCount++ * 40 : 0;

            const isDragSettle = Boolean(customOrigin);
            const arcLift = isDragSettle
              ? 0
              : dist > 65
              ? Math.min(20, Math.round(dist * 0.085))
              : 0;
            const peakScale = isDragSettle ? 1.03 : dist > 45 ? 1.065 : 1.01;
            const durationMs = isDragSettle
              ? 165
              : Math.min(255, Math.max(175, Math.round(155 + dist * 0.25)));

            const key = `flight-${++animCounterRef.current}-${cardId}`;
            flightSpecs.push({
              item: {
                key,
                card,
                fromX,
                fromY,
                toX: nextPose.x,
                toY: nextPose.y,
                arcLift,
                peakScale,
                flipFromBack: !prevPose.faceUp && nextPose.faceUp,
                flipToBack: prevPose.faceUp && !nextPose.faceUp,
                zOrder: nextPose.zOrder + (nextPose.zone === 'foundation' ? 200 : 120),
                progress: new Animated.Value(0),
              },
              delayMs: staggerDelay,
              durationMs,
              useSpring: isDragSettle,
              landingFoundationIdx:
                nextPose.zone === 'foundation' ? nextPose.pileIndex : undefined,
            });
          } else if (prevPose.faceUp !== nextPose.faceUp && nextPose.zone === 'tableau') {
            // Stationary card flip on Tableau (e.g. newly uncovered card!)
            const key = `flip-${++animCounterRef.current}-${cardId}`;
            flipSpecs.push({
              item: {
                key,
                card,
                x: nextPose.x,
                y: nextPose.y,
                toFaceUp: nextPose.faceUp,
                progress: new Animated.Value(0),
              },
              delayMs: 35,
            });
          }
        });

        spawnFlightsAndFlips(flightSpecs, flipSpecs);
      },
      [spawnFlightsAndFlips]
    );

    const animateFreshDeal = useCallback(
      (nextGame: GameState, overrideMetrics?: BoardMetrics) => {
        const m = overrideMetrics ?? metricsRef.current;
        const nextPoses = computeAllCardPoses(nextGame, nextGame.drawMode, m);
        const stockOriginX = m.colX(0);
        const stockOriginY = m.topPadding;

        const flightSpecs: {
          item: FlightAnimItem;
          delayMs: number;
          durationMs: number;
        }[] = [];

        let dealOrder = 0;
        for (let col = 0; col < 7; col++) {
          const pile = nextGame.tableau[col];
          for (let row = 0; row < pile.length; row++) {
            const card = pile[row];
            const pose = nextPoses.get(card.id);
            if (!pose) continue;
            const key = `deal-${++animCounterRef.current}-${card.id}`;
            flightSpecs.push({
              item: {
                key,
                card,
                fromX: stockOriginX,
                fromY: stockOriginY,
                toX: pose.x,
                toY: pose.y,
                arcLift: 10,
                peakScale: 1.03,
                flipFromBack: card.faceUp,
                flipToBack: false,
                zOrder: 100 + row + col * 10,
                progress: new Animated.Value(0),
              },
              delayMs: dealOrder * 14,
              durationMs: 225,
            });
            dealOrder++;
          }
        }

        setFlips([]);
        setFlights(flightSpecs.map((f) => f.item));
        flightSpecs.forEach(({ item, delayMs, durationMs }) => {
          Animated.timing(item.progress, {
            toValue: 1,
            duration: durationMs,
            delay: delayMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start(() => {
            setFlights((curr) => curr.filter((x) => x.key !== item.key));
          });
        });
      },
      []
    );

    useImperativeHandle(
      ref,
      () => ({
        animateTransition,
        animateFreshDeal: (nextGame: GameState) => animateFreshDeal(nextGame),
      }),
      [animateTransition, animateFreshDeal]
    );

    const computeDropTarget = useCallback(
      (from: PileLocation, centerX: number, centerY: number): PileLocation | null => {
        const m = metricsRef.current;
        const current = gameRef.current;

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

    const handleGestureStartCheck = useCallback(
      (from: PileLocation) => {
        dragPan.setValue({ x: 0, y: 0 });
        const cards = getMovingCards(gameRef.current, from);
        return Boolean(cards && cards.length > 0);
      },
      [dragPan]
    );

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

        const releaseOrigins: DragOriginMap = {};
        active.cards.forEach((c, idx) => {
          releaseOrigins[c.id] = {
            x: active.originX + dx,
            y: active.originY + dy + idx * active.cardOffsetY,
          };
        });

        if (target) {
          onDropMove(active.from, target, releaseOrigins);
        } else {
          // Smooth spring snap-back to original resting coordinates
          const snapSpecs = active.cards.map((c, idx) => {
            const key = `snap-${++animCounterRef.current}-${c.id}`;
            return {
              item: {
                key,
                card: c,
                fromX: active.originX + dx,
                fromY: active.originY + dy + idx * active.cardOffsetY,
                toX: active.originX,
                toY: active.originY + idx * active.cardOffsetY,
                arcLift: 0,
                peakScale: 1.02,
                flipFromBack: false,
                flipToBack: false,
                zOrder: 300 + idx,
                progress: new Animated.Value(0),
              },
              delayMs: 0,
              durationMs: 195,
              useSpring: true,
            };
          });
          spawnFlightsAndFlips(snapSpecs, []);
        }
      },
      [computeDropTarget, dragPan, onDropMove, onSmartTap, spawnFlightsAndFlips]
    );

    const handleGestureTerminate = useCallback(() => {
      dragSessionRef.current = null;
      setDragSession(null);
      setHoverTarget(null);
      dragPan.setValue({ x: 0, y: 0 });
    }, [dragPan]);

    const handleLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setLayout({ width, height });
        const dealKey = `${game.seed}:${game.drawMode}:${game.dealType}`;
        if (
          game.moves === 0 &&
          game.elapsedSeconds === 0 &&
          lastDealtKeyRef.current !== dealKey
        ) {
          lastDealtKeyRef.current = dealKey;
          const freshMetrics = computeBoardMetrics(width, height);
          animateFreshDeal(game, freshMetrics);
        }
      }
    };

    const hiddenAnimatedIds = useMemo(() => {
      const set = new Set<string>();
      dragSession?.cards.forEach((c) => set.add(c.id));
      flights.forEach((f) => set.add(f.card.id));
      flips.forEach((fl) => set.add(fl.card.id));
      return set;
    }, [dragSession, flights, flips]);

    const isHintSource = (
      zone: PileLocation['zone'],
      index?: number,
      cardIndex?: number
    ) => {
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

    // Waste fan: in Draw 1, keep under-card visible while newly drawn top card is in flight!
    const visibleWasteCount =
      game.drawMode === 3
        ? Math.min(3, game.waste.length)
        : Math.min(1, game.waste.length);
    const visibleWaste = game.waste.slice(game.waste.length - visibleWasteCount);
    const draw1UnderWaste =
      game.drawMode === 1 &&
      game.waste.length >= 2 &&
      hiddenAnimatedIds.has(game.waste[game.waste.length - 1].id)
        ? game.waste[game.waste.length - 2]
        : null;

    const sortedFlights = useMemo(
      () => [...flights].sort((a, b) => a.zOrder - b.zOrder),
      [flights]
    );

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
                  borderRadius: metrics.slotRadius,
                  backgroundColor: theme.slotBg,
                  borderColor: isHintSource('stock')
                    ? theme.hintGlow
                    : theme.slotBorder,
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
                width: metrics.cardWidth + metrics.wasteFanStep * 2,
              }}
            >
              {visibleWaste.length === 0 ? (
                <View
                  style={[
                    styles.slotBase,
                    {
                      width: metrics.cardWidth,
                      height: metrics.cardHeight,
                      borderRadius: metrics.slotRadius,
                      backgroundColor: theme.slotBg,
                      borderColor: theme.slotBorder,
                      opacity: 0.45,
                    },
                  ]}
                />
              ) : (
                <>
                  {draw1UnderWaste && !hiddenAnimatedIds.has(draw1UnderWaste.id) && (
                    <View
                      style={{ position: 'absolute', left: 0, top: 0 }}
                      pointerEvents="none"
                    >
                      <PlayingCard
                        card={draw1UnderWaste}
                        width={metrics.cardWidth}
                        height={metrics.cardHeight}
                        theme={theme}
                      />
                    </View>
                  )}
                  {visibleWaste.map((card, i) => {
                    const isTopWaste = i === visibleWaste.length - 1;
                    const xOffset = i * metrics.wasteFanStep;
                    const hidden = hiddenAnimatedIds.has(card.id);

                    if (!isTopWaste) {
                      return (
                        <View
                          key={card.id}
                          style={{
                            position: 'absolute',
                            left: xOffset,
                            top: 0,
                            opacity: hidden ? 0 : 1,
                          }}
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
                          opacity: hidden ? 0 : 1,
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
                  })}
                </>
              )}
            </View>

            {/* 4 Foundation Slots (cols 3..6) */}
            {game.foundations.map((pile, fIdx) => {
              const left = metrics.colX(3 + fIdx);
              const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
              const underCard = pile.length > 1 ? pile[pile.length - 2] : null;
              const highlightedSlot =
                isHoveredDest('foundation', fIdx) || isHintDest('foundation', fIdx);

              const topHidden = topCard ? hiddenAnimatedIds.has(topCard.id) : false;
              const displayCard = topHidden
                ? underCard && !hiddenAnimatedIds.has(underCard.id)
                  ? underCard
                  : null
                : topCard;

              const slotStyle: StyleProp<ViewStyle> = [
                styles.slotBase,
                {
                  left,
                  width: metrics.cardWidth,
                  height: metrics.cardHeight,
                  borderRadius: metrics.slotRadius,
                  backgroundColor: highlightedSlot
                    ? theme.accentSoft
                    : theme.slotBg,
                  borderColor: highlightedSlot ? theme.hintGlow : theme.slotBorder,
                  borderWidth: highlightedSlot ? 2 : 1.2,
                },
              ];

              const inner = (
                <Animated.View
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: foundationPulses[fIdx] }],
                  }}
                >
                  {displayCard ? (
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
                  )}
                </Animated.View>
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
              const offsets = computeColumnOffsets(pile, metrics);
              const highlightedCol =
                isHoveredDest('tableau', colIdx) || isHintDest('tableau', colIdx);
              const stepUpOffset =
                pile.length > 1
                  ? Math.max(
                      16,
                      offsets[offsets.length - 1] - offsets[offsets.length - 2]
                    )
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
                  <View
                    style={[
                      styles.slotBase,
                      {
                        width: metrics.cardWidth,
                        height: metrics.cardHeight,
                        borderRadius: metrics.slotRadius,
                        backgroundColor: highlightedCol
                          ? theme.accentSoft
                          : theme.slotBg,
                        borderColor: highlightedCol
                          ? theme.hintGlow
                          : theme.slotBorder,
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

                  {pile.map((card, cIdx) => {
                    const isHidden = hiddenAnimatedIds.has(card.id);
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
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: yOffset,
                            opacity: isHidden ? 0 : 1,
                          }}
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
                          opacity: isHidden ? 0 : 1,
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

          {/* STATIONARY 3D CARD FLIP OVERLAY (Newly Revealed Tableau Cards) */}
          {flips.map((flip) => {
            const scaleX = flip.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 0.04, 1],
            });
            const scaleY = flip.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.06, 1],
            });
            const firstHalfOpacity = flip.progress.interpolate({
              inputRange: [0, 0.49, 0.5, 1],
              outputRange: [1, 1, 0, 0],
            });
            const secondHalfOpacity = flip.progress.interpolate({
              inputRange: [0, 0.49, 0.5, 1],
              outputRange: [0, 0, 1, 1],
            });

            const startFaceUp = !flip.toFaceUp;

            return (
              <Animated.View
                key={flip.key}
                pointerEvents="none"
                style={[
                  styles.animLayerItem,
                  {
                    left: flip.x,
                    top: flip.y,
                    width: metrics.cardWidth,
                    height: metrics.cardHeight,
                    transform: [{ scaleX }, { scaleY }],
                  },
                ]}
              >
                <Animated.View
                  style={[StyleSheet.absoluteFill, { opacity: firstHalfOpacity }]}
                >
                  <PlayingCard
                    card={{ ...flip.card, faceUp: startFaceUp }}
                    width={metrics.cardWidth}
                    height={metrics.cardHeight}
                    theme={theme}
                  />
                </Animated.View>
                <Animated.View
                  style={[StyleSheet.absoluteFill, { opacity: secondHalfOpacity }]}
                >
                  <PlayingCard
                    card={{ ...flip.card, faceUp: flip.toFaceUp }}
                    width={metrics.cardWidth}
                    height={metrics.cardHeight}
                    theme={theme}
                  />
                </Animated.View>
              </Animated.View>
            );
          })}

          {/* CONCURRENT IN-FLIGHT CARDS OVERLAY (Tap, Draw, Undo, Auto-Complete, Snap) */}
          {sortedFlights.map((flight) => {
            const translateX = flight.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [flight.fromX, flight.toX],
            });
            const midY = (flight.fromY + flight.toY) * 0.5 - flight.arcLift;
            const translateY = flight.progress.interpolate({
              inputRange: [0, 0.48, 1],
              outputRange: [flight.fromY, midY, flight.toY],
            });
            const scale = flight.progress.interpolate({
              inputRange: [0, 0.48, 1],
              outputRange: [1, flight.peakScale, 1],
            });

            const isMidAirFlip = flight.flipFromBack || flight.flipToBack;
            const scaleX = isMidAirFlip
              ? flight.progress.interpolate({
                  inputRange: [0, 0.46, 1],
                  outputRange: [1, 0.05, 1],
                })
              : 1;

            const backOpacity = flight.flipFromBack
              ? flight.progress.interpolate({
                  inputRange: [0, 0.45, 0.47, 1],
                  outputRange: [1, 1, 0, 0],
                })
              : flight.progress.interpolate({
                  inputRange: [0, 0.45, 0.47, 1],
                  outputRange: [0, 0, 1, 1],
                });

            const faceOpacity = flight.flipFromBack
              ? flight.progress.interpolate({
                  inputRange: [0, 0.45, 0.47, 1],
                  outputRange: [0, 0, 1, 1],
                })
              : flight.progress.interpolate({
                  inputRange: [0, 0.45, 0.47, 1],
                  outputRange: [1, 1, 0, 0],
                });

            return (
              <Animated.View
                key={flight.key}
                pointerEvents="none"
                style={[
                  styles.animLayerItem,
                  {
                    left: 0,
                    top: 0,
                    width: metrics.cardWidth,
                    height: metrics.cardHeight,
                    transform: [
                      { translateX },
                      { translateY },
                      { scale },
                      ...(typeof scaleX === 'number' ? [] : [{ scaleX }]),
                    ],
                  },
                ]}
              >
                {isMidAirFlip ? (
                  <>
                    <Animated.View
                      style={[StyleSheet.absoluteFill, { opacity: backOpacity }]}
                    >
                      <PlayingCard
                        card={{ ...flight.card, faceUp: false }}
                        width={metrics.cardWidth}
                        height={metrics.cardHeight}
                        theme={theme}
                      />
                    </Animated.View>
                    <Animated.View
                      style={[StyleSheet.absoluteFill, { opacity: faceOpacity }]}
                    >
                      <PlayingCard
                        card={{ ...flight.card, faceUp: true }}
                        width={metrics.cardWidth}
                        height={metrics.cardHeight}
                        theme={theme}
                      />
                    </Animated.View>
                  </>
                ) : (
                  <PlayingCard
                    card={flight.card}
                    width={metrics.cardWidth}
                    height={metrics.cardHeight}
                    theme={theme}
                  />
                )}
              </Animated.View>
            );
          })}

          {/* ACTIVE FINGER DRAG OVERLAY */}
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
                    { scale: 1.045 },
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
);

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
  animLayerItem: {
    position: 'absolute',
    zIndex: 850,
    elevation: 12,
  },
  floatingDragLayer: {
    position: 'absolute',
    zIndex: 999,
    elevation: 16,
  },
});
