import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  DragOriginMap,
  GameBoard,
  GameBoardHandle,
} from '../components/GameBoard';
import { formatDuration, TopHud } from '../components/TopHud';
import {
  canAutoComplete,
  drawOrRecycleStock,
  executeMove,
  findHint,
  findSmartMoveForLocation,
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

  const boardRef = useRef<GameBoardHandle | null>(null);
  const wonReportedSeedRef = useRef<string | null>(null);
  const latestGameRef = useRef(game);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  // Report win once per completed deal
  useEffect(() => {
    const winKey = `${game.seed}:${game.moves}`;
    if (game.isWon && wonReportedSeedRef.current !== winKey) {
      wonReportedSeedRef.current = winKey;
      triggerSuccessHaptic(hapticsEnabled);
      onGameWon(game);
    }
  }, [game.isWon, game, hapticsEnabled, onGameWon]);

  const hasMoves = game.moves > 0;

  // Game clock starts after first move and pauses on win or modal
  useEffect(() => {
    if (game.isWon || !hasMoves || dealMenuVisible) return;
    const timer = setInterval(() => {
      onUpdateGame((prev) =>
        prev.isWon ? prev : { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [game.isWon, hasMoves, dealMenuVisible, onUpdateGame]);

  // Auto-clear hint highlight after 3.2s
  useEffect(() => {
    if (!activeHint) return;
    const t = setTimeout(() => setActiveHint(null), 3200);
    return () => clearTimeout(t);
  }, [activeHint]);

  // Cascading Auto-Complete stepper with smooth overlapping card flights
  useEffect(() => {
    if (!isAutoCompleting || game.isWon) return;
    const stepTimer = setTimeout(() => {
      const current = latestGameRef.current;
      const next = stepAutoComplete(current);
      if (!next) {
        setIsAutoCompleting(false);
        return;
      }
      triggerLightHaptic(hapticsEnabled);
      boardRef.current?.animateTransition(current, next);
      onUpdateGame(() => next);
    }, 95);
    return () => clearTimeout(stepTimer);
  }, [isAutoCompleting, game, hapticsEnabled, onUpdateGame]);

  const autoCompleteReady = useMemo(() => canAutoComplete(game), [game]);

  const triggerFreshDealWithAnim = (dealFactory: () => GameState) => {
    setDealMenuVisible(false);
    setIsAutoCompleting(false);
    setActiveHint(null);
    const fresh = dealFactory();
    boardRef.current?.animateFreshDeal(fresh);
  };

  const handleStockPress = () => {
    if (isAutoCompleting || game.isWon) return;
    setActiveHint(null);
    const next = drawOrRecycleStock(game);
    if (next !== game) {
      triggerLightHaptic(hapticsEnabled);
      boardRef.current?.animateTransition(game, next);
      onUpdateGame(() => next);
    }
  };

  const handleSmartTap = (from: PileLocation) => {
    if (isAutoCompleting || game.isWon) return;
    setActiveHint(null);

    const target = findSmartMoveForLocation(game, from);
    if (!target) {
      triggerWarningHaptic(hapticsEnabled);
      return;
    }

    const next = executeMove(game, from, target);
    if (next) {
      if (target.zone === 'foundation') {
        triggerMediumHaptic(hapticsEnabled);
      } else {
        triggerLightHaptic(hapticsEnabled);
      }
      boardRef.current?.animateTransition(game, next);
      onUpdateGame(() => next);
    }
  };

  const handleDropMove = (
    from: PileLocation,
    to: PileLocation,
    dragOrigins: DragOriginMap
  ) => {
    if (isAutoCompleting || game.isWon) return;
    setActiveHint(null);

    const next = executeMove(game, from, to);
    if (next) {
      if (to.zone === 'foundation') {
        triggerMediumHaptic(hapticsEnabled);
      } else {
        triggerLightHaptic(hapticsEnabled);
      }
      boardRef.current?.animateTransition(game, next, dragOrigins);
      onUpdateGame(() => next);
    } else {
      triggerWarningHaptic(hapticsEnabled);
    }
  };

  const handleUndo = () => {
    if (isAutoCompleting || game.history.length === 0) return;
    setActiveHint(null);
    const next = undoMove(game);
    triggerLightHaptic(hapticsEnabled);
    boardRef.current?.animateTransition(game, next);
    onUpdateGame(() => next);
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

  const isNewHighScore = game.isWon && game.score >= highScore && game.score > 0;

  return (
    <LinearGradient colors={theme.tableGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <TopHud
          theme={theme}
          score={game.score}
          moves={game.moves}
          elapsedSeconds={game.elapsedSeconds}
          dealType={game.dealType}
          drawMode={game.drawMode}
          dailyDate={game.dailyDate}
          onBackToMenu={onBackToMenu}
          onOpenStats={onOpenStats}
        />

        <GameBoard
          ref={boardRef}
          game={game}
          theme={theme}
          activeHint={activeHint}
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
              onPress={() => triggerFreshDealWithAnim(onNewWinningDeal)}
              style={[styles.sheetPrimaryBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.sheetPrimaryText, { color: theme.accentText }]}>
                ✦ New Winning Deal
              </Text>
            </Pressable>

            <Pressable
              onPress={() => triggerFreshDealWithAnim(onNewStandardDeal)}
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
              onPress={() => triggerFreshDealWithAnim(onReplayCurrentSeed)}
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
        onRequestClose={onBackToMenu}
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
                  {formatDuration(game.elapsedSeconds)}
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
              onPress={() => triggerFreshDealWithAnim(onNewWinningDeal)}
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
              onPress={onBackToMenu}
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
