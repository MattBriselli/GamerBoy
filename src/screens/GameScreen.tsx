import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBoard } from '../components/GameBoard';
import { formatDuration, TopHud } from '../components/TopHud';
import {
  canAutoComplete,
  drawOrRecycleStock,
  executeMove,
  findHint,
  findSmartMoveForLocation,
  getMovingCards,
  HintSuggestion,
  stepAutoComplete,
  undoMove,
} from '../engine/klondike';
import { GameState, PileLocation } from '../engine/types';
import { AppTheme } from '../theme/themes';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '../utils/haptics';

export interface GameScreenProps {
  game: GameState;
  theme: AppTheme;
  hapticsEnabled: boolean;
  highScore: number;
  onUpdateGame: (updater: (prev: GameState) => GameState) => void;
  onGameWon: (finalGame: GameState) => void;
  onNewWinningDeal: () => GameState;
  onNewStandardDeal: () => GameState;
  onReplayCurrentSeed: () => GameState;
  onBackToMenu: () => void;
  onOpenStats: () => void;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

export function GameScreen({
  game,
  theme,
  hapticsEnabled,
  highScore,
  onUpdateGame,
  onGameWon,
  onNewWinningDeal,
  onNewStandardDeal,
  onReplayCurrentSeed,
  onBackToMenu,
  onOpenStats,
}: GameScreenProps) {
  const [activeHint, setActiveHint] = useState<HintSuggestion | null>(null);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [dealMenuVisible, setDealMenuVisible] = useState(false);
  const [elevatedIds, setElevatedIds] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [liveSeconds, setLiveSeconds] = useState(game.elapsedSeconds);

  const wonReportedSeedRef = useRef<string | null>(null);
  const latestGameRef = useRef(game);
  const liveSecondsRef = useRef(liveSeconds);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    liveSecondsRef.current = liveSeconds;
  }, [liveSeconds]);

  // Report win once per completed deal
  useEffect(() => {
    const winKey = `${game.seed}:${game.moves}`;
    if (game.isWon && wonReportedSeedRef.current !== winKey) {
      wonReportedSeedRef.current = winKey;
      triggerSuccessHaptic(hapticsEnabled);
      onGameWon({ ...game, elapsedSeconds: liveSecondsRef.current });
    }
  }, [game.isWon, game, hapticsEnabled, onGameWon]);

  const hasMoves = game.moves > 0;

  // Lightweight local 1-second clock — updates TopHud ONLY without re-rendering GameBoard!
  useEffect(() => {
    if (game.isWon || !hasMoves || dealMenuVisible) return;
    const timer = setInterval(() => {
      setLiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [game.isWon, hasMoves, dealMenuVisible]);

  // Auto-clear hint highlight after 3.2s
  useEffect(() => {
    if (!activeHint) return;
    const t = setTimeout(() => setActiveHint(null), 3200);
    return () => clearTimeout(t);
  }, [activeHint]);

  // Cascading Auto-Complete stepper
  useEffect(() => {
    if (!isAutoCompleting || game.isWon) return;
    const stepTimer = setTimeout(() => {
      const current = latestGameRef.current;
      const next = stepAutoComplete(current);
      if (!next) {
        setIsAutoCompleting(false);
        return;
      }
      // Find which card just landed on a foundation so it stays elevated during flight
      const prevFoundationIds = new Set(
        current.foundations.flatMap((p) => p.map((c) => c.id))
      );
      const newlyPlaced = next.foundations
        .flatMap((p) => p.map((c) => c.id))
        .filter((id) => !prevFoundationIds.has(id));

      if (newlyPlaced.length > 0) {
        setElevatedIds(new Set(newlyPlaced));
      }
      triggerLightHaptic(hapticsEnabled);
      onUpdateGame(() => ({
        ...next,
        elapsedSeconds: liveSecondsRef.current,
      }));
    }, 105);
    return () => clearTimeout(stepTimer);
  }, [isAutoCompleting, game, hapticsEnabled, onUpdateGame]);

  const autoCompleteReady = useMemo(() => canAutoComplete(game), [game]);

  const triggerFreshDeal = (dealFactory: () => GameState) => {
    setDealMenuVisible(false);
    setIsAutoCompleting(false);
    setActiveHint(null);
    setElevatedIds(EMPTY_SET);
    const fresh = dealFactory();
    setLiveSeconds(fresh.elapsedSeconds);
  };

  const handleElevateIds = useCallback((ids: string[]) => {
    setElevatedIds(ids.length > 0 ? new Set(ids) : EMPTY_SET);
  }, []);

  const handleStockPress = useCallback(() => {
    const cur = latestGameRef.current;
    if (cur.isWon) return;
    setActiveHint(null);

    const movedIds =
      cur.stock.length > 0
        ? cur.stock.slice(-cur.drawMode).map((c) => c.id)
        : cur.waste.slice(-2).map((c) => c.id);

    const next = drawOrRecycleStock(cur);
    if (next !== cur) {
      setElevatedIds(new Set(movedIds));
      triggerLightHaptic(hapticsEnabled);
      onUpdateGame(() => ({
        ...next,
        elapsedSeconds: liveSecondsRef.current,
      }));
    }
  }, [hapticsEnabled, onUpdateGame]);

  const handleSmartTap = useCallback(
    (from: PileLocation) => {
      const cur = latestGameRef.current;
      if (cur.isWon) return;
      setActiveHint(null);

      const target = findSmartMoveForLocation(cur, from);
      if (!target) {
        triggerWarningHaptic(hapticsEnabled);
        return;
      }

      const moving = getMovingCards(cur, from) ?? [];
      const next = executeMove(cur, from, target);
      if (next) {
        setElevatedIds(new Set(moving.map((c) => c.id)));
        if (target.zone === 'foundation') {
          triggerMediumHaptic(hapticsEnabled);
        } else {
          triggerLightHaptic(hapticsEnabled);
        }
        onUpdateGame(() => ({
          ...next,
          elapsedSeconds: liveSecondsRef.current,
        }));
      }
    },
    [hapticsEnabled, onUpdateGame]
  );

  const handleDropMove = useCallback(
    (from: PileLocation, to: PileLocation) => {
      const cur = latestGameRef.current;
      if (cur.isWon) return;
      setActiveHint(null);

      const moving = getMovingCards(cur, from) ?? [];
      const next = executeMove(cur, from, to);
      if (next) {
        setElevatedIds(new Set(moving.map((c) => c.id)));
        if (to.zone === 'foundation') {
          triggerMediumHaptic(hapticsEnabled);
        } else {
          triggerLightHaptic(hapticsEnabled);
        }
        onUpdateGame(() => ({
          ...next,
          elapsedSeconds: liveSecondsRef.current,
        }));
      } else {
        triggerWarningHaptic(hapticsEnabled);
      }
    },
    [hapticsEnabled, onUpdateGame]
  );

  const handleUndo = () => {
    if (isAutoCompleting || game.history.length === 0) return;
    setActiveHint(null);
    const next = undoMove(game);

    // Elevate cards whose zone/column changed during undo so they fly cleanly above piles
    const prevZoneOf = new Map<string, string>();
    game.stock.forEach((c) => prevZoneOf.set(c.id, 's'));
    game.waste.forEach((c) => prevZoneOf.set(c.id, 'w'));
    game.foundations.forEach((p, i) => p.forEach((c) => prevZoneOf.set(c.id, `f${i}`)));
    game.tableau.forEach((p, i) => p.forEach((c) => prevZoneOf.set(c.id, `t${i}`)));

    const movedBack: string[] = [];
    next.stock.slice(-2).forEach((c) => {
      if (prevZoneOf.get(c.id) !== 's') movedBack.push(c.id);
    });
    next.waste.slice(-3).forEach((c) => {
      if (prevZoneOf.get(c.id) !== 'w') movedBack.push(c.id);
    });
    next.foundations.forEach((p, i) =>
      p.forEach((c) => {
        if (prevZoneOf.get(c.id) !== `f${i}`) movedBack.push(c.id);
      })
    );
    next.tableau.forEach((p, i) =>
      p.forEach((c) => {
        if (prevZoneOf.get(c.id) !== `t${i}`) movedBack.push(c.id);
      })
    );
    setElevatedIds(movedBack.length > 0 ? new Set(movedBack) : EMPTY_SET);

    triggerLightHaptic(hapticsEnabled);
    onUpdateGame(() => ({
      ...next,
      elapsedSeconds: liveSecondsRef.current,
    }));
  };

  const handleHint = () => {
    if (isAutoCompleting || game.isWon) return;
    const suggestion = findHint(game);
    if (suggestion) {
      triggerLightHaptic(hapticsEnabled);
      setActiveHint(suggestion);
    } else {
      triggerWarningHaptic(hapticsEnabled);
      setActiveHint({
        from: { zone: 'stock' },
        description: 'No constructive moves left — try Undo or a New Deal',
      });
    }
  };

  const handleLeaveToMenu = () => {
    if (!game.isWon && liveSecondsRef.current !== game.elapsedSeconds) {
      onUpdateGame((prev) => ({
        ...prev,
        elapsedSeconds: liveSecondsRef.current,
      }));
    }
    onBackToMenu();
  };

  const isNewHighScore = game.isWon && game.score >= highScore && game.score > 0;

  return (
    <LinearGradient colors={theme.tableGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <TopHud
          theme={theme}
          score={game.score}
          moves={game.moves}
          elapsedSeconds={liveSeconds}
          dealType={game.dealType}
          drawMode={game.drawMode}
          dailyDate={game.dailyDate}
          onBackToMenu={handleLeaveToMenu}
          onOpenStats={onOpenStats}
        />

        <GameBoard
          game={game}
          theme={theme}
          activeHint={activeHint}
          elevatedIds={elevatedIds}
          onElevateIds={handleElevateIds}
          onStockPress={handleStockPress}
          onSmartTap={handleSmartTap}
          onDropMove={handleDropMove}
        />

        <BottomToolbar
          theme={theme}
          canUndo={game.history.length > 0}
          undoCount={game.history.length}
          showAutoComplete={autoCompleteReady && !game.isWon}
          isAutoCompleting={isAutoCompleting && !game.isWon}
          hintMessage={activeHint?.description ?? null}
          onNewDealPress={() => setDealMenuVisible(true)}
          onSettingsPress={onOpenStats}
          onHintPress={handleHint}
          onUndoPress={handleUndo}
          onAutoCompletePress={() => setIsAutoCompleting(true)}
        />
      </SafeAreaView>

      {/* New Deal Action Sheet */}
      <Modal
        visible={dealMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDealMenuVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setDealMenuVisible(false)}
        >
          <Pressable
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.surfaceBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
              Deal Options
            </Text>
            <Text style={[styles.sheetSub, { color: theme.textMuted }]}>
              Seed #{game.seed} • Draw {game.drawMode}
            </Text>

            <Pressable
              onPress={() => triggerFreshDeal(onNewWinningDeal)}
              style={[styles.sheetPrimaryBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.sheetPrimaryText, { color: theme.accentText }]}>
                ✦ New Winning Deal
              </Text>
            </Pressable>

            <Pressable
              onPress={() => triggerFreshDeal(onNewStandardDeal)}
              style={[
                styles.sheetOptionBtn,
                { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
              ]}
            >
              <Text style={[styles.sheetOptionText, { color: theme.textPrimary }]}>
                🃏 Classic Random Deal
              </Text>
            </Pressable>

            <Pressable
              onPress={() => triggerFreshDeal(onReplayCurrentSeed)}
              style={[
                styles.sheetOptionBtn,
                { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
              ]}
            >
              <Text style={[styles.sheetOptionText, { color: theme.textPrimary }]}>
                ↻ Restart Current Board
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDealMenuVisible(false)}
              style={styles.sheetCancelBtn}
            >
              <Text style={[styles.sheetCancelText, { color: theme.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Victory Summary Modal (includes Non-Gameplay AdMob Banner) */}
      <Modal
        visible={game.isWon}
        transparent
        animationType="fade"
        onRequestClose={handleLeaveToMenu}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.victoryCard,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.accent,
              },
            ]}
          >
            <Text style={styles.victoryTrophy}>
              {game.dealType === 'daily' ? '👑' : '🏆'}
            </Text>
            <Text style={[styles.victoryTitle, { color: theme.textPrimary }]}>
              {game.dealType === 'daily' ? 'Daily Crown Earned!' : 'You Won!'}
            </Text>
            {isNewHighScore && (
              <View
                style={[styles.highScorePill, { backgroundColor: theme.accentSoft }]}
              >
                <Text style={[styles.highScoreText, { color: theme.accent }]}>
                  ★ NEW HIGH SCORE
                </Text>
              </View>
            )}

            <View
              style={[
                styles.victoryStatsRow,
                { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
              ]}
            >
              <View style={styles.victoryStatCol}>
                <Text style={[styles.victoryStatLabel, { color: theme.textMuted }]}>
                  SCORE
                </Text>
                <Text style={[styles.victoryStatVal, { color: theme.textPrimary }]}>
                  {game.score}
                </Text>
              </View>
              <View style={styles.victoryStatCol}>
                <Text style={[styles.victoryStatLabel, { color: theme.textMuted }]}>
                  TIME
                </Text>
                <Text style={[styles.victoryStatVal, { color: theme.textPrimary }]}>
                  {formatDuration(liveSeconds)}
                </Text>
              </View>
              <View style={styles.victoryStatCol}>
                <Text style={[styles.victoryStatLabel, { color: theme.textMuted }]}>
                  MOVES
                </Text>
                <Text style={[styles.victoryStatVal, { color: theme.textPrimary }]}>
                  {game.moves}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => triggerFreshDeal(onNewWinningDeal)}
              style={[
                styles.sheetPrimaryBtn,
                { backgroundColor: theme.accent, width: '100%' },
              ]}
            >
              <Text style={[styles.sheetPrimaryText, { color: theme.accentText }]}>
                ✦ Play Next Winning Deal
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLeaveToMenu}
              style={[
                styles.sheetOptionBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  width: '100%',
                },
              ]}
            >
              <Text style={[styles.sheetOptionText, { color: theme.textPrimary }]}>
                Back to Main Menu
              </Text>
            </Pressable>

            <View style={{ width: '100%', marginTop: 14 }}>
              <AdBanner theme={theme} placement="victory" />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  sheetSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetPrimaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetPrimaryText: {
    fontSize: 15,
    fontWeight: '900',
  },
  sheetOptionBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  victoryCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  victoryTrophy: {
    fontSize: 44,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  highScorePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  highScoreText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  victoryStatsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  victoryStatCol: {
    alignItems: 'center',
  },
  victoryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  victoryStatVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
