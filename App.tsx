import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { dealKlondike } from './src/engine/klondike';
import { randomSeed } from './src/engine/prng';
import { generateWinningSeed, getDailyWinningSeed } from './src/engine/solver';
import { DealType, DrawMode, GameState } from './src/engine/types';
import { DailyScreen } from './src/screens/DailyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { StatsModal } from './src/screens/StatsModal';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  loadActiveGame,
  loadSettings,
  loadStats,
  PlayerStats,
  saveActiveGame,
  saveSettings,
  saveStats,
  UserSettings,
} from './src/storage/persistence';
import { THEMES, ThemeId } from './src/theme/themes';

type ActiveRoute = 'home' | 'game' | 'daily';

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [route, setRoute] = useState<ActiveRoute>('home');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // Hydrate persisted state on cold boot
  useEffect(() => {
    Promise.all([loadSettings(), loadStats(), loadActiveGame()])
      .then(([loadedSettings, loadedStats, loadedGame]) => {
        setSettings(loadedSettings);
        setStats(loadedStats);
        setActiveGame(loadedGame);
      })
      .finally(() => setHydrated(true));
  }, []);

  // Persist active game whenever it changes (debounced 250ms)
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      saveActiveGame(activeGame);
    }, 250);
    return () => clearTimeout(t);
  }, [activeGame, hydrated]);

  const theme = THEMES[settings.themeId] ?? THEMES.emerald;

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const recordNewDealStarted = useCallback((seedUsed?: number) => {
    setStats((prev) => {
      const recentSeeds = seedUsed
        ? [...prev.recentSeeds.filter((s) => s !== seedUsed), seedUsed].slice(-20)
        : prev.recentSeeds;
      const next: PlayerStats = {
        ...prev,
        gamesStarted: prev.gamesStarted + 1,
        recentSeeds,
      };
      saveStats(next);
      return next;
    });
  }, []);

  const startDeal = useCallback(
    (dealType: DealType, customSeed?: number, dailyDate?: string): GameState => {
      const drawMode = settings.drawMode;
      let seed = customSeed;
      if (seed === undefined) {
        if (dealType === 'daily' && dailyDate) {
          seed = getDailyWinningSeed(dailyDate, drawMode);
        } else if (dealType === 'winning') {
          seed = generateWinningSeed(drawMode, stats.recentSeeds);
        } else {
          seed = randomSeed();
        }
      }

      const freshGame = dealKlondike({
        seed,
        drawMode,
        dealType,
        dailyDate,
      });

      setActiveGame(freshGame);
      recordNewDealStarted(seed);
      setRoute('game');
      return freshGame;
    },
    [settings.drawMode, stats.recentSeeds, recordNewDealStarted]
  );

  const handleUpdateGame = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setActiveGame((prev) => (prev ? updater(prev) : null));
    },
    []
  );

  const handleGameWon = useCallback((finalGame: GameState) => {
    setStats((prev) => {
      const newStreak = prev.currentStreak + 1;
      const completedDailyDates =
        finalGame.dealType === 'daily' &&
        finalGame.dailyDate &&
        !prev.completedDailyDates.includes(finalGame.dailyDate)
          ? [...prev.completedDailyDates, finalGame.dailyDate].sort()
          : prev.completedDailyDates;

      const next: PlayerStats = {
        ...prev,
        gamesWon: prev.gamesWon + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        highScore: Math.max(prev.highScore, finalGame.score),
        bestTimeSeconds:
          prev.bestTimeSeconds === null
            ? finalGame.elapsedSeconds
            : Math.min(prev.bestTimeSeconds, finalGame.elapsedSeconds),
        fewestMoves:
          prev.fewestMoves === null
            ? finalGame.moves
            : Math.min(prev.fewestMoves, finalGame.moves),
        completedDailyDates,
      };
      saveStats(next);
      return next;
    });
  }, []);

  const handleResetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
    saveStats(DEFAULT_STATS);
  }, []);

  if (!hydrated) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: THEMES.emerald.tableGradient[1] },
        ]}
      >
        <ActivityIndicator size="large" color={THEMES.emerald.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      {route === 'home' && (
        <HomeScreen
          theme={theme}
          settings={settings}
          stats={stats}
          savedGame={activeGame && !activeGame.isWon ? activeGame : null}
          onResumeGame={() => setRoute('game')}
          onStartWinningDeal={() => startDeal('winning')}
          onStartStandardDeal={() => startDeal('standard')}
          onOpenDailyChallenge={() => setRoute('daily')}
          onOpenStats={() => setStatsModalVisible(true)}
          onChangeDrawMode={(drawMode: DrawMode) => updateSettings({ drawMode })}
          onChangeTheme={(themeId: ThemeId) => updateSettings({ themeId })}
        />
      )}

      {route === 'daily' && (
        <DailyScreen
          theme={theme}
          drawMode={settings.drawMode}
          stats={stats}
          onBack={() => setRoute('home')}
          onPlayDailyDate={(dateStr: string) =>
            startDeal('daily', undefined, dateStr)
          }
        />
      )}

      {route === 'game' && activeGame && (
        <GameScreen
          game={activeGame}
          theme={theme}
          hapticsEnabled={settings.hapticsEnabled}
          highScore={stats.highScore}
          onUpdateGame={handleUpdateGame}
          onGameWon={handleGameWon}
          onNewWinningDeal={() => startDeal('winning')}
          onNewStandardDeal={() => startDeal('standard')}
          onReplayCurrentSeed={() =>
            startDeal(activeGame.dealType, activeGame.seed, activeGame.dailyDate)
          }
          onBackToMenu={() => {
            if (activeGame.isWon) {
              setActiveGame(null);
            }
            setRoute('home');
          }}
          onOpenStats={() => setStatsModalVisible(true)}
        />
      )}

      <StatsModal
        visible={statsModalVisible}
        theme={theme}
        settings={settings}
        stats={stats}
        onClose={() => setStatsModalVisible(false)}
        onUpdateSettings={updateSettings}
        onResetStats={handleResetStats}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
